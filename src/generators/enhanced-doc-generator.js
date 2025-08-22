/**
 * EnhancedDocumentationGenerator - Complete documentation generation system
 * Integrates MarkdownProcessor, ContentCategorizer, and source attribution
 */

const fs = require('fs').promises;
const path = require('path');
const MarkdownProcessor = require('./markdown-processor');
const ContentCategorizer = require('./content-categorizer');
const { v4: uuidv4 } = require('uuid');

class EnhancedDocumentationGenerator {
  constructor(config = {}) {
    this.config = {
      outputDir: './docs/claude-flow-knowledge',
      includeSourceLinks: true,
      generateIndex: true,
      categoryDirectories: true,
      maxInsightsPerFile: 30,
      generateAnalytics: true,
      createSearchIndex: true,
      includeDiagrams: true,
      ...config
    };
    
    this.markdownProcessor = new MarkdownProcessor(this.config);
    this.contentCategorizer = new ContentCategorizer(this.config);
    this.generationStats = {
      startTime: Date.now(),
      filesGenerated: 0,
      insightsProcessed: 0,
      categoriesCreated: 0
    };
  }

  /**
   * Main generation method - processes transcripts and creates documentation
   */
  async generateDocumentation(insights, transcriptSources = []) {
    console.log(`🚀 Starting documentation generation for ${insights.length} insights...`);
    
    try {
      // Ensure output directory structure
      await this.setupDirectoryStructure();
      
      // Categorize insights
      console.log('📋 Categorizing insights...');
      const categorizedInsights = this.contentCategorizer.categorizeInsights(insights);
      const categoryAnalysis = this.contentCategorizer.analyzeContentPatterns(insights);
      
      // Generate category-specific documentation
      console.log('📝 Generating category documentation...');
      const generatedFiles = [];
      
      for (const [category, categoryInsights] of Object.entries(categorizedInsights)) {
        if (categoryInsights.length === 0) continue;
        
        const files = await this.generateCategoryDocumentation(
          category, 
          categoryInsights
        );
        generatedFiles.push(...files);
        this.generationStats.categoriesCreated++;
      }
      
      // Generate master index
      console.log('📖 Creating master index...');
      const indexFile = await this.generateMasterIndex(categorizedInsights, categoryAnalysis);
      generatedFiles.push(indexFile);
      
      // Generate source attribution index
      console.log('🔗 Creating source index...');
      const sourceIndex = await this.generateSourceIndex(insights, transcriptSources);
      generatedFiles.push(sourceIndex);
      
      // Generate search index
      if (this.config.createSearchIndex) {
        console.log('🔍 Creating search index...');
        const searchIndex = await this.generateSearchIndex(insights);
        generatedFiles.push(searchIndex);
      }
      
      // Generate analytics dashboard
      if (this.config.generateAnalytics) {
        console.log('📊 Creating analytics dashboard...');
        const analyticsFile = await this.generateAnalyticsDashboard(categoryAnalysis, insights);
        generatedFiles.push(analyticsFile);
      }
      
      // Generate README for the knowledge base
      const readmeFile = await this.generateKnowledgeBaseReadme(categorizedInsights, categoryAnalysis);
      generatedFiles.push(readmeFile);
      
      this.generationStats.endTime = Date.now();
      this.generationStats.filesGenerated = generatedFiles.length;
      this.generationStats.insightsProcessed = insights.length;
      
      console.log(`✅ Documentation generation completed in ${this.generationStats.endTime - this.generationStats.startTime}ms`);
      
      return {
        success: true,
        filesGenerated: generatedFiles,
        stats: this.generationStats,
        categoryAnalysis
      };
      
    } catch (error) {
      console.error('❌ Documentation generation failed:', error);
      return {
        success: false,
        error: error.message,
        stats: this.generationStats
      };
    }
  }

  /**
   * Setup directory structure for the knowledge base
   */
  async setupDirectoryStructure() {
    const directories = [
      this.config.outputDir,
      path.join(this.config.outputDir, 'concepts'),
      path.join(this.config.outputDir, 'how-to'),
      path.join(this.config.outputDir, 'tips'),
      path.join(this.config.outputDir, 'gotchas'),
      path.join(this.config.outputDir, 'mental-models'),
      path.join(this.config.outputDir, 'qa'),
      path.join(this.config.outputDir, 'use-cases'),
      path.join(this.config.outputDir, 'tutorials'),
      path.join(this.config.outputDir, 'troubleshooting'),
      path.join(this.config.outputDir, 'best-practices'),
      path.join(this.config.outputDir, 'general'), // Add general category
      path.join(this.config.outputDir, 'sources'),
      path.join(this.config.outputDir, '_assets'),
      path.join(this.config.outputDir, '_search')
    ];

    for (const dir of directories) {
      try {
        await fs.access(dir);
      } catch (error) {
        await fs.mkdir(dir, { recursive: true });
      }
    }
  }

  /**
   * Generate documentation for a specific category
   */
  async generateCategoryDocumentation(category, insights) {
    const categoryDir = path.join(this.config.outputDir, category);
    const files = [];
    
    // Split insights into manageable chunks
    const chunks = this.chunkArray(insights, this.config.maxInsightsPerFile);
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const filename = i === 0 ? 'index.md' : `page-${i + 1}.md`;
      const filepath = path.join(categoryDir, filename);
      
      let markdown = this.generateCategoryHeader(category, chunk.length, i + 1, chunks.length);
      
      // Add table of contents for the page
      if (chunk.length > 5) {
        markdown += this.markdownProcessor.generateTableOfContents(chunk, 'Contents');
      }
      
      // Add concept diagram for mental models and concepts
      if ((category === 'mental-models' || category === 'concepts') && this.config.includeDiagrams) {
        markdown += this.markdownProcessor.generateConceptDiagram(chunk);
      }
      
      // Generate insights documentation
      chunk.forEach(insight => {
        markdown += this.markdownProcessor.generateInsightMarkdown(insight);
        markdown += `\n---\n\n`;
      });
      
      // Add navigation footer
      markdown += this.generateNavigationFooter(category, i + 1, chunks.length);
      
      await fs.writeFile(filepath, markdown);
      files.push(filepath);
    }
    
    return files;
  }

  /**
   * Generate category header with metadata
   */
  generateCategoryHeader(category, insightCount, pageNum, totalPages) {
    const categoryName = this.markdownProcessor.formatCategoryName(category);
    
    let header = `# ${categoryName}`;
    if (totalPages > 1) {
      header += ` - Page ${pageNum}`;
    }
    header += `\n\n`;
    
    // Add category description
    const descriptions = {
      'concepts': 'Core concepts and fundamental principles of Claude Flow and swarm intelligence.',
      'how-to': 'Step-by-step guides for implementing Claude Flow features and workflows.',
      'tips': 'Best practices, optimization tips, and expert recommendations.',
      'gotchas': 'Important warnings, common pitfalls, and troubleshooting advice.',
      'mental-models': 'Conceptual frameworks for understanding and working with Claude Flow.',
      'qa': 'Frequently asked questions and community discussions.',
      'use-cases': 'Real-world applications and practical examples.',
      'tutorials': 'Comprehensive tutorials and learning resources.',
      'troubleshooting': 'Problem-solving guides and debugging techniques.',
      'best-practices': 'Proven methodologies and professional approaches.'
    };
    
    header += `${descriptions[category] || 'Additional insights and information about Claude Flow.'}\n\n`;
    
    // Add metadata
    header += `---\n`;
    header += `**📊 Page Stats:**\n`;
    header += `- Insights: ${insightCount}\n`;
    if (totalPages > 1) {
      header += `- Page: ${pageNum} of ${totalPages}\n`;
    }
    header += `- Last Updated: ${new Date().toISOString().split('T')[0]}\n\n`;
    header += `---\n\n`;
    
    return header;
  }

  /**
   * Generate master index with enhanced navigation
   */
  async generateMasterIndex(categorizedInsights, analysis) {
    const indexPath = path.join(this.config.outputDir, 'index.md');
    
    let markdown = `# 🌟 Claude Flow Knowledge Base\n\n`;
    markdown += `*Comprehensive documentation extracted from Claude Flow community videos and transcripts*\n\n`;
    
    // Add quick stats
    const totalInsights = Object.values(categorizedInsights).reduce((sum, insights) => sum + insights.length, 0);
    markdown += `## 📊 Quick Stats\n\n`;
    markdown += `| Metric | Value |\n|--------|-------|\n`;
    markdown += `| Total Insights | ${totalInsights} |\n`;
    markdown += `| Categories | ${Object.keys(categorizedInsights).filter(cat => categorizedInsights[cat].length > 0).length} |\n`;
    markdown += `| Sources | ${Object.keys(analysis.sourceDistribution || {}).length} |\n`;
    markdown += `| Generated | ${new Date().toISOString().split('T')[0]} |\n\n`;
    
    // Add navigation grid
    markdown += `## 🗺️ Navigation\n\n`;
    markdown += `<div class="category-grid">\n\n`;
    
    for (const [category, insights] of Object.entries(categorizedInsights)) {
      if (insights.length === 0) continue;
      
      const categoryName = this.markdownProcessor.formatCategoryName(category);
      const emoji = this.getCategoryEmoji(category);
      
      markdown += `### ${emoji} [${categoryName}](${category}/index.md)\n\n`;
      markdown += `${this.getCategoryDescription(category)}\n\n`;
      markdown += `**${insights.length} insights** • `;
      
      // Show top tags for this category
      const topTags = this.getTopTagsForCategory(insights, 3);
      if (topTags.length > 0) {
        markdown += `Tags: ${topTags.map(tag => `\`${tag}\``).join(' ')}\n\n`;
      } else {
        markdown += `\n\n`;
      }
    }
    
    markdown += `</div>\n\n`;
    
    // Add search and tools section
    markdown += `## 🔍 Tools & Search\n\n`;
    markdown += `- [📚 Source Index](sources/index.md) - Browse by original transcript\n`;
    markdown += `- [🔍 Search Index](_search/index.md) - Find insights by keyword\n`;
    markdown += `- [📊 Analytics Dashboard](_assets/analytics.md) - Usage statistics and trends\n`;
    markdown += `- [🏷️ Tag Cloud](_assets/tags.md) - Browse by tags\n\n`;
    
    // Add recent insights
    const recentInsights = Object.values(categorizedInsights)
      .flat()
      .filter(insight => insight.created_date)
      .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
      .slice(0, 5);
    
    if (recentInsights.length > 0) {
      markdown += `## 🆕 Recently Added\n\n`;
      recentInsights.forEach(insight => {
        const categoryName = this.markdownProcessor.formatCategoryName(insight.primary_category);
        markdown += `- [${insight.title}](${insight.primary_category}/index.md#${insight.insight_id}) *(${categoryName})*\n`;
      });
      markdown += `\n`;
    }
    
    // Add footer
    markdown += `---\n\n`;
    markdown += `*Generated automatically by Claude Flow Knowledge Extractor v2.0*\n\n`;
    markdown += `For questions or contributions, visit the [Claude Flow GitHub Repository](https://github.com/ruvnet/claude-flow).\n`;
    
    await fs.writeFile(indexPath, markdown);
    return indexPath;
  }

  /**
   * Generate enhanced source index
   */
  async generateSourceIndex(insights, transcriptSources) {
    const indexPath = path.join(this.config.outputDir, 'sources', 'index.md');
    
    let markdown = `# 📚 Source Index\n\n`;
    markdown += `This index maps all insights back to their original transcript sources.\n\n`;
    
    // Group insights by source
    const sourceGroups = {};
    insights.forEach(insight => {
      if (insight.quotes) {
        insight.quotes.forEach(quote => {
          const source = quote.source_file;
          if (!sourceGroups[source]) {
            sourceGroups[source] = new Set();
          }
          sourceGroups[source].add(insight);
        });
      }
    });
    
    // Generate source documentation
    for (const [sourceFile, sourceInsights] of Object.entries(sourceGroups)) {
      const insightArray = Array.from(sourceInsights);
      
      markdown += `## 📹 ${this.formatSourceName(sourceFile)}\n\n`;
      
      // Add source metadata
      const sourceInfo = transcriptSources.find(s => s.filename === sourceFile);
      if (sourceInfo) {
        markdown += `**Original:** \`${sourceFile}\`\n`;
        if (sourceInfo.date) markdown += `**Date:** ${sourceInfo.date}\n`;
        if (sourceInfo.duration) markdown += `**Duration:** ${sourceInfo.duration}\n`;
        if (sourceInfo.speakers) markdown += `**Speakers:** ${sourceInfo.speakers.join(', ')}\n`;
        markdown += `\n`;
      }
      
      markdown += `**📈 Statistics:**\n`;
      markdown += `- Insights extracted: ${insightArray.length}\n`;
      
      // Category breakdown
      const categoryBreakdown = {};
      insightArray.forEach(insight => {
        const cat = insight.primary_category || 'general';
        categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + 1;
      });
      
      markdown += `- Categories: ${Object.entries(categoryBreakdown)
        .map(([cat, count]) => `${this.markdownProcessor.formatCategoryName(cat)} (${count})`)
        .join(', ')}\n\n`;
      
      // List insights
      markdown += `### 📋 Extracted Insights\n\n`;
      insightArray.forEach(insight => {
        const categoryName = this.markdownProcessor.formatCategoryName(insight.primary_category);
        const categoryEmoji = this.getCategoryEmoji(insight.primary_category);
        markdown += `- ${categoryEmoji} [${insight.title}](../${insight.primary_category}/index.md#${insight.insight_id}) *(${categoryName})*\n`;
      });
      
      markdown += `\n---\n\n`;
    }
    
    await fs.writeFile(indexPath, markdown);
    return indexPath;
  }

  /**
   * Generate search index for keyword-based lookup
   */
  async generateSearchIndex(insights) {
    const searchPath = path.join(this.config.outputDir, '_search', 'index.md');
    const jsonPath = path.join(this.config.outputDir, '_search', 'search-data.json');
    
    // Create search data structure
    const searchData = insights.map(insight => ({
      id: insight.insight_id,
      title: insight.title,
      summary: insight.summary,
      category: insight.primary_category,
      tags: insight.tags || [],
      keywords: this.extractKeywords(insight),
      url: `../${insight.primary_category}/index.md#${insight.insight_id}`
    }));
    
    // Save JSON data
    await fs.writeFile(jsonPath, JSON.stringify(searchData, null, 2));
    
    // Create markdown index
    let markdown = `# 🔍 Search Index\n\n`;
    markdown += `Use this index to find insights by keywords, tags, or concepts.\n\n`;
    
    // Keyword index
    const keywordIndex = {};
    insights.forEach(insight => {
      const keywords = this.extractKeywords(insight);
      keywords.forEach(keyword => {
        if (!keywordIndex[keyword]) keywordIndex[keyword] = [];
        keywordIndex[keyword].push(insight);
      });
    });
    
    const topKeywords = Object.entries(keywordIndex)
      .sort(([,a], [,b]) => b.length - a.length)
      .slice(0, 50);
    
    markdown += `## 🏷️ Top Keywords\n\n`;
    topKeywords.forEach(([keyword, keywordInsights]) => {
      markdown += `### ${keyword}\n`;
      keywordInsights.slice(0, 10).forEach(insight => {
        markdown += `- [${insight.title}](../${insight.primary_category}/index.md#${insight.insight_id})\n`;
      });
      if (keywordInsights.length > 10) {
        markdown += `- *...and ${keywordInsights.length - 10} more*\n`;
      }
      markdown += `\n`;
    });
    
    await fs.writeFile(searchPath, markdown);
    return searchPath;
  }

  /**
   * Generate analytics dashboard
   */
  async generateAnalyticsDashboard(analysis, insights) {
    const analyticsPath = path.join(this.config.outputDir, '_assets', 'analytics.md');
    
    let markdown = `# 📊 Analytics Dashboard\n\n`;
    markdown += `Comprehensive analytics for the Claude Flow Knowledge Base.\n\n`;
    
    // Overview stats
    markdown += `## 📈 Overview\n\n`;
    markdown += `| Metric | Value |\n|--------|-------|\n`;
    markdown += `| Total Insights | ${analysis.totalInsights} |\n`;
    markdown += `| Categories | ${Object.keys(analysis.categoryDistribution).length} |\n`;
    markdown += `| Sources | ${Object.keys(analysis.sourceDistribution || {}).length} |\n`;
    markdown += `| Unique Tags | ${Object.keys(analysis.tagFrequency || {}).length} |\n`;
    markdown += `| Generation Time | ${this.generationStats.endTime - this.generationStats.startTime}ms |\n\n`;
    
    // Category distribution chart
    markdown += `## 📊 Category Distribution\n\n\`\`\`mermaid\npie title Category Distribution\n`;
    Object.entries(analysis.categoryDistribution).forEach(([category, count]) => {
      markdown += `    "${this.markdownProcessor.formatCategoryName(category)}" : ${count}\n`;
    });
    markdown += `\`\`\`\n\n`;
    
    // Top tags
    if (analysis.tagFrequency) {
      markdown += `## 🏷️ Most Common Tags\n\n`;
      const topTags = Object.entries(analysis.tagFrequency)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 20);
      
      topTags.forEach(([tag, count], index) => {
        const barLength = Math.round((count / topTags[0][1]) * 20);
        const bar = '█'.repeat(barLength) + '░'.repeat(20 - barLength);
        markdown += `${index + 1}. **${tag}** \`${bar}\` ${count}\n`;
      });
      markdown += `\n`;
    }
    
    // Source contribution
    if (analysis.sourceDistribution) {
      markdown += `## 📹 Source Contributions\n\n`;
      const topSources = Object.entries(analysis.sourceDistribution)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10);
      
      markdown += `| Source | Insights | Percentage |\n|--------|----------|------------|\n`;
      topSources.forEach(([source, count]) => {
        const percentage = ((count / analysis.totalInsights) * 100).toFixed(1);
        markdown += `| ${this.formatSourceName(source)} | ${count} | ${percentage}% |\n`;
      });
      markdown += `\n`;
    }
    
    await fs.writeFile(analyticsPath, markdown);
    return analyticsPath;
  }

  /**
   * Generate knowledge base README
   */
  async generateKnowledgeBaseReadme(categorizedInsights, analysis) {
    const readmePath = path.join(this.config.outputDir, 'README.md');
    
    let markdown = `# Claude Flow Knowledge Base\n\n`;
    markdown += `This knowledge base contains ${analysis.totalInsights} insights extracted from Claude Flow community videos and transcripts.\n\n`;
    
    markdown += `## 🚀 Quick Start\n\n`;
    markdown += `1. **Browse by Category:** Start with the [main index](index.md)\n`;
    markdown += `2. **Search by Topic:** Use the [search index](_search/index.md)\n`;
    markdown += `3. **Find by Source:** Check the [source index](sources/index.md)\n`;
    markdown += `4. **View Analytics:** See the [analytics dashboard](_assets/analytics.md)\n\n`;
    
    markdown += `## 📚 Categories\n\n`;
    Object.entries(categorizedInsights).forEach(([category, insights]) => {
      if (insights.length === 0) return;
      const emoji = this.getCategoryEmoji(category);
      const name = this.markdownProcessor.formatCategoryName(category);
      markdown += `- ${emoji} **[${name}](${category}/index.md)** - ${insights.length} insights\n`;
    });
    markdown += `\n`;
    
    markdown += `## 🔧 How It Works\n\n`;
    markdown += `This knowledge base is automatically generated from transcript analysis using:\n\n`;
    markdown += `- **Content Classification:** AI-powered categorization of insights\n`;
    markdown += `- **Source Attribution:** Every insight links back to original transcripts\n`;
    markdown += `- **Collapsible References:** Detailed source information in expandable sections\n`;
    markdown += `- **Cross-References:** Related insights are automatically linked\n`;
    markdown += `- **Search Integration:** Full-text search with keyword indexing\n\n`;
    
    markdown += `## 📊 Statistics\n\n`;
    markdown += `- **Generated:** ${new Date().toISOString().split('T')[0]}\n`;
    markdown += `- **Version:** 2.0\n`;
    markdown += `- **Sources:** ${Object.keys(analysis.sourceDistribution || {}).length} video transcripts\n`;
    markdown += `- **Processing Time:** ${this.generationStats.endTime - this.generationStats.startTime}ms\n\n`;
    
    await fs.writeFile(readmePath, markdown);
    return readmePath;
  }

  // Utility methods
  chunkArray(array, chunkSize) {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  getCategoryEmoji(category) {
    const emojiMap = {
      'concepts': '💡',
      'how-to': '🔧',
      'tips': '💎',
      'gotchas': '⚠️',
      'mental-models': '🧠',
      'qa': '❓',
      'use-cases': '🎯',
      'tutorials': '📚',
      'troubleshooting': '🛠️',
      'best-practices': '⭐'
    };
    return emojiMap[category] || '📝';
  }

  getCategoryDescription(category) {
    const descriptions = {
      'concepts': 'Core concepts and fundamental principles of Claude Flow.',
      'how-to': 'Step-by-step guides for implementing features and workflows.',
      'tips': 'Best practices, optimization tips, and expert recommendations.',
      'gotchas': 'Important warnings, common pitfalls, and troubleshooting advice.',
      'mental-models': 'Conceptual frameworks for understanding Claude Flow.',
      'qa': 'Frequently asked questions and community discussions.',
      'use-cases': 'Real-world applications and practical examples.',
      'tutorials': 'Comprehensive tutorials and learning resources.',
      'troubleshooting': 'Problem-solving guides and debugging techniques.',
      'best-practices': 'Proven methodologies and professional approaches.'
    };
    return descriptions[category] || 'Additional insights about Claude Flow.';
  }

  formatSourceName(filename) {
    return filename
      .replace(/^en-/, '')
      .replace(/\.(txt|mp4)$/, '')
      .replace(/_/g, ' ')
      .replace(/(\d{8})_(\d{6})/, '$1 $2')
      .trim();
  }

  extractKeywords(insight) {
    const text = `${insight.title} ${insight.summary}`.toLowerCase();
    const commonWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those']);
    
    return text
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 2 && !commonWords.has(word))
      .filter((word, index, array) => array.indexOf(word) === index) // unique
      .slice(0, 10); // top 10
  }

  getTopTagsForCategory(insights, limit = 5) {
    const tagFreq = {};
    insights.forEach(insight => {
      if (insight.tags) {
        insight.tags.forEach(tag => {
          tagFreq[tag] = (tagFreq[tag] || 0) + 1;
        });
      }
    });
    
    return Object.entries(tagFreq)
      .sort(([,a], [,b]) => b - a)
      .slice(0, limit)
      .map(([tag]) => tag);
  }

  generateNavigationFooter(category, pageNum, totalPages) {
    let footer = `\n---\n\n`;
    footer += `## Navigation\n\n`;
    
    if (totalPages > 1) {
      footer += `**Pages:** `;
      for (let i = 1; i <= totalPages; i++) {
        if (i === pageNum) {
          footer += `**${i}** `;
        } else {
          const filename = i === 1 ? 'index.md' : `page-${i}.md`;
          footer += `[${i}](${filename}) `;
        }
      }
      footer += `\n\n`;
    }
    
    footer += `**Browse:** [🏠 Home](../index.md) | [📚 All Categories](../index.md#navigation) | [🔍 Search](../_search/index.md)\n\n`;
    footer += `*Last updated: ${new Date().toISOString().split('T')[0]}*\n`;
    
    return footer;
  }
}

module.exports = EnhancedDocumentationGenerator;