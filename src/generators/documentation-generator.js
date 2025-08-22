/**
 * DocumentationGenerator - Creates structured Markdown documentation from insights
 */

const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class DocumentationGenerator {
  constructor(config = {}) {
    this.config = {
      includeSourceLinks: true,
      generateIndex: true,
      markdownFormat: true,
      categoryDirectories: true,
      maxInsightsPerFile: 50,
      ...config
    };
    
    this.categoryMappings = {
      'how-to': 'how-to',
      'tip': 'tips', 
      'gotcha': 'gotchas',
      'mental-model': 'mental-models',
      'qa': 'qa',
      'concept': 'concepts'
    };
  }

  /**
   * Generate structured documentation from insights
   */
  async generateDocumentation(insights, outputDir) {
    await this.ensureOutputDirectory(outputDir);
    
    // Group insights by category
    const categorizedInsights = this.categorizeInsights(insights);
    
    // Generate category-specific documentation
    const generatedFiles = [];
    
    for (const [category, categoryInsights] of Object.entries(categorizedInsights)) {
      if (categoryInsights.length === 0) continue;
      
      const files = await this.generateCategoryDocumentation(
        category, 
        categoryInsights, 
        outputDir
      );
      generatedFiles.push(...files);
    }
    
    // Generate master index
    if (this.config.generateIndex) {
      const indexFile = await this.generateMasterIndex(categorizedInsights, outputDir);
      generatedFiles.push(indexFile);
    }
    
    // Generate source index
    const sourceIndexFile = await this.generateSourceIndex(insights, outputDir);
    generatedFiles.push(sourceIndexFile);
    
    return {
      filesGenerated: generatedFiles,
      totalInsights: insights.length,
      categories: Object.keys(categorizedInsights)
    };
  }

  async ensureOutputDirectory(outputDir) {
    try {
      await fs.access(outputDir);
    } catch (error) {
      await fs.mkdir(outputDir, { recursive: true });
    }
    
    // Create category subdirectories if enabled
    if (this.config.categoryDirectories) {
      for (const categoryDir of Object.values(this.categoryMappings)) {
        const dirPath = path.join(outputDir, categoryDir);
        try {
          await fs.access(dirPath);
        } catch (error) {
          await fs.mkdir(dirPath, { recursive: true });
        }
      }
    }
  }

  categorizeInsights(insights) {
    const categories = {};
    
    // Initialize all categories
    for (const category of Object.keys(this.categoryMappings)) {
      categories[category] = [];
    }
    
    // Categorize insights
    for (const insight of insights) {
      const category = insight.category || 'general';
      if (categories[category]) {
        categories[category].push(insight);
      } else {
        // Handle unknown categories
        if (!categories['general']) categories['general'] = [];
        categories['general'].push(insight);
      }
    }
    
    return categories;
  }

  async generateCategoryDocumentation(category, insights, outputDir) {
    const categoryDir = this.categoryMappings[category] || 'general';
    const files = [];
    
    // Split insights into files if too many
    const insightChunks = this.chunkInsights(insights, this.config.maxInsightsPerFile);
    
    for (let chunkIndex = 0; chunkIndex < insightChunks.length; chunkIndex++) {
      const chunk = insightChunks[chunkIndex];
      const filename = chunkIndex === 0 ? 
        `${categoryDir}.md` : 
        `${categoryDir}-${chunkIndex + 1}.md`;
      
      const filepath = this.config.categoryDirectories ?
        path.join(outputDir, categoryDir, filename) :
        path.join(outputDir, filename);
      
      const markdown = this.generateCategoryMarkdown(category, chunk);
      await fs.writeFile(filepath, markdown);
      
      files.push(filepath);
    }
    
    return files;
  }

  chunkInsights(insights, chunkSize) {
    const chunks = [];
    for (let i = 0; i < insights.length; i += chunkSize) {
      chunks.push(insights.slice(i, i + chunkSize));
    }
    return chunks;
  }

  generateCategoryMarkdown(category, insights) {
    const categoryName = this.formatCategoryName(category);
    let markdown = `# ${categoryName}\\n\\n`;
    
    markdown += this.generateCategoryDescription(category);
    markdown += `\\n\\n---\\n\\n`;
    
    for (const insight of insights) {
      markdown += this.generateInsightMarkdown(insight);
      markdown += `\\n\\n---\\n\\n`;
    }
    
    return markdown;
  }

  formatCategoryName(category) {
    const nameMap = {
      'how-to': 'How-To Guides',
      'tip': 'Tips & Best Practices',
      'gotcha': 'Gotchas & Warnings', 
      'mental-model': 'Mental Models',
      'qa': 'Questions & Answers',
      'concept': 'Concepts & Definitions'
    };
    
    return nameMap[category] || category.charAt(0).toUpperCase() + category.slice(1);
  }

  generateCategoryDescription(category) {
    const descriptions = {
      'how-to': 'Step-by-step guides and instructions for implementing Claude Flow features.',
      'tip': 'Best practices and optimization recommendations for better Claude Flow usage.',
      'gotcha': 'Important warnings and common pitfalls to avoid when using Claude Flow.',
      'mental-model': 'Conceptual frameworks and mental models for understanding Claude Flow architecture.',
      'qa': 'Common questions and their answers from the Claude Flow community.',
      'concept': 'Key concepts and definitions essential for understanding Claude Flow.'
    };
    
    return descriptions[category] || 'Additional insights and information about Claude Flow.';
  }

  generateInsightMarkdown(insight) {
    let markdown = `## ${insight.title}\\n\\n`;
    
    // Add summary
    markdown += `${insight.summary}\\n\\n`;
    
    // Add tags
    if (insight.tags && insight.tags.length > 0) {
      markdown += `**Tags:** ${insight.tags.map(tag => `\`${tag}\``).join(', ')}\\n\\n`;
    }
    
    // Add source references in collapsible section
    if (this.config.includeSourceLinks && insight.quotes && insight.quotes.length > 0) {
      markdown += `<details>\\n<summary>📖 Source Reference</summary>\\n\\n`;
      
      for (const quote of insight.quotes) {
        markdown += `> ${quote.text}\\n>\\n`;
        markdown += `> **Source:** \`${quote.source_file}\``;
        
        if (quote.line_start) {
          const lineRange = quote.line_end && quote.line_end !== quote.line_start ?
            `${quote.line_start}-${quote.line_end}` :
            quote.line_start;
          markdown += ` - Line ${lineRange}`;
        }
        
        if (quote.timestamp) {
          markdown += ` / Timestamp ${quote.timestamp}`;
        }
        
        markdown += `\\n`;
        
        if (quote.confidence) {
          markdown += `> **Confidence:** ${(quote.confidence * 100).toFixed(1)}%\\n`;
        }
        
        markdown += `\\n`;
      }
      
      markdown += `</details>\\n`;
    }
    
    return markdown;
  }

  async generateMasterIndex(categorizedInsights, outputDir) {
    const indexPath = path.join(outputDir, 'index.md');
    
    let markdown = `# Claude Flow Knowledge Base\\n\\n`;
    markdown += `This knowledge base was automatically generated from Claude Flow community video transcripts.\\n\\n`;
    markdown += `## Categories\\n\\n`;
    
    for (const [category, insights] of Object.entries(categorizedInsights)) {
      if (insights.length === 0) continue;
      
      const categoryName = this.formatCategoryName(category);
      const categoryFile = this.categoryMappings[category] || category;
      
      markdown += `### [${categoryName}](${categoryFile}.md)\\n`;
      markdown += `${this.generateCategoryDescription(category)}\\n`;
      markdown += `*${insights.length} insights*\\n\\n`;
    }
    
    markdown += `## Statistics\\n\\n`;
    const totalInsights = Object.values(categorizedInsights).reduce((sum, insights) => sum + insights.length, 0);
    markdown += `- **Total Insights:** ${totalInsights}\\n`;
    markdown += `- **Categories:** ${Object.keys(categorizedInsights).filter(cat => categorizedInsights[cat].length > 0).length}\\n`;
    markdown += `- **Generated:** ${new Date().toISOString().split('T')[0]}\\n\\n`;
    
    markdown += `---\\n\\n`;
    markdown += `*Generated automatically by Claude Flow Knowledge Extractor*\\n`;
    
    await fs.writeFile(indexPath, markdown);
    return indexPath;
  }

  async generateSourceIndex(insights, outputDir) {
    const indexPath = path.join(outputDir, 'sources.md');
    
    // Group insights by source file
    const sourceGroups = {};
    
    for (const insight of insights) {
      for (const quote of insight.quotes || []) {
        const sourceFile = quote.source_file;
        if (!sourceGroups[sourceFile]) {
          sourceGroups[sourceFile] = [];
        }
        sourceGroups[sourceFile].push({
          insight,
          quote
        });
      }
    }
    
    let markdown = `# Source Index\\n\\n`;
    markdown += `This index maps all insights back to their original source transcripts.\\n\\n`;
    
    for (const [sourceFile, sourceInsights] of Object.entries(sourceGroups)) {
      markdown += `## ${sourceFile}\\n\\n`;
      
      const uniqueInsights = [...new Set(sourceInsights.map(si => si.insight.insight_id))]
        .map(id => sourceInsights.find(si => si.insight.insight_id === id).insight);
      
      markdown += `**Insights extracted:** ${uniqueInsights.length}\\n\\n`;
      
      for (const insight of uniqueInsights) {
        const categoryName = this.formatCategoryName(insight.category);
        markdown += `- [${insight.title}](${this.categoryMappings[insight.category] || insight.category}.md) *(${categoryName})*\\n`;
      }
      
      markdown += `\\n`;
    }
    
    await fs.writeFile(indexPath, markdown);
    return indexPath;
  }

  /**
   * Generate quick reference documentation
   */
  async generateQuickReference(insights, outputDir) {
    const quickRefPath = path.join(outputDir, 'quick-reference.md');
    
    let markdown = `# Quick Reference\\n\\n`;
    
    // Group by tags for quick lookup
    const tagGroups = {};
    
    for (const insight of insights) {
      for (const tag of insight.tags || []) {
        if (!tagGroups[tag]) {
          tagGroups[tag] = [];
        }
        tagGroups[tag].push(insight);
      }
    }
    
    // Sort tags by frequency
    const sortedTags = Object.keys(tagGroups).sort((a, b) => 
      tagGroups[b].length - tagGroups[a].length
    );
    
    for (const tag of sortedTags.slice(0, 20)) { // Top 20 tags
      markdown += `## ${tag}\\n\\n`;
      
      for (const insight of tagGroups[tag].slice(0, 5)) { // Top 5 insights per tag
        markdown += `- **${insight.title}** - ${insight.summary.slice(0, 100)}...\\n`;
      }
      
      markdown += `\\n`;
    }
    
    await fs.writeFile(quickRefPath, markdown);
    return quickRefPath;
  }
}

module.exports = DocumentationGenerator;