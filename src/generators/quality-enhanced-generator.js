/**
 * Quality-Enhanced Documentation Generator
 * Integrates quality improvement system for better readability
 */

const fs = require('fs').promises;
const path = require('path');
const { QualitySystem } = require('../quality');
const EnhancedDocumentationGenerator = require('./enhanced-doc-generator');

class QualityEnhancedGenerator extends EnhancedDocumentationGenerator {
  constructor(config = {}) {
    super(config);
    this.qualitySystem = new QualitySystem({
      maxIterations: 5,
      targetReadabilityScore: 70,
      enableAggressiveNormalization: true
    });
    
    this.qualityStats = {
      totalImproved: 0,
      averageImprovement: 0,
      failedImprovements: 0
    };
  }

  /**
   * Process insights with quality improvement
   */
  async improveInsightQuality(insights) {
    console.log('✨ Applying recursive quality improvement...');
    const improvedInsights = [];
    const improvements = [];
    
    for (const insight of insights) {
      try {
        // Improve main content
        const improvedInsight = await this.improveInsight(insight);
        improvedInsights.push(improvedInsight);
        
        if (improvedInsight.qualityImproved) {
          this.qualityStats.totalImproved++;
          improvements.push(improvedInsight.improvement || 0);
        }
      } catch (error) {
        console.warn(`  ⚠️ Could not improve insight: ${error.message}`);
        this.qualityStats.failedImprovements++;
        improvedInsights.push(insight);
      }
    }
    
    if (improvements.length > 0) {
      this.qualityStats.averageImprovement = 
        improvements.reduce((a, b) => a + b, 0) / improvements.length;
    }
    
    console.log(`📊 Quality improvements: ${this.qualityStats.totalImproved}/${insights.length} enhanced`);
    console.log(`   Average improvement: ${this.qualityStats.averageImprovement.toFixed(1)}%`);
    
    return improvedInsights;
  }

  /**
   * Improve individual insight
   */
  async improveInsight(insight) {
    // Process main content
    let improvedContent = insight.content || insight.summary || '';
    let contentResult = null;
    
    if (improvedContent) {
      contentResult = await this.qualitySystem.processText(improvedContent);
      improvedContent = contentResult.improvedText;
    }
    
    // Process title
    let improvedTitle = insight.title || '';
    if (improvedTitle && this.needsImprovement(improvedTitle)) {
      const titleResult = await this.qualitySystem.processText(improvedTitle, {
        maxIterations: 3,
        targetReadabilityScore: 80
      });
      improvedTitle = titleResult.improvedText;
    }
    
    // Process quotes
    const improvedQuotes = [];
    for (const quote of (insight.quotes || [])) {
      if (quote.text && this.needsImprovement(quote.text)) {
        const quoteResult = await this.qualitySystem.processText(quote.text);
        improvedQuotes.push({
          ...quote,
          text: quoteResult.improvedText,
          originalText: quote.text,
          readabilityScore: quoteResult.metrics.readabilityScore
        });
      } else {
        improvedQuotes.push(quote);
      }
    }
    
    // Build improved insight
    return {
      ...insight,
      title: improvedTitle,
      content: improvedContent,
      summary: improvedContent,
      originalContent: insight.content || insight.summary,
      quotes: improvedQuotes,
      readabilityScore: contentResult?.metrics?.readabilityScore || 0,
      improvement: contentResult?.improvement || 0,
      qualityImproved: contentResult?.improvement > 0
    };
  }

  /**
   * Check if text needs improvement
   */
  needsImprovement(text) {
    if (!text) return false;
    
    // Check for spacing issues
    const spacingIssues = /\s{2,}|[a-z]\s[a-z]\s[a-z]/.test(text);
    
    // Check for broken words
    const brokenWords = /\b[a-z]{1,2}\s[a-z]{1,2}\b/.test(text);
    
    // Check for readability
    const sentences = text.split(/[.!?]+/).filter(s => s.trim());
    const avgSentenceLength = text.split(/\s+/).length / Math.max(sentences.length, 1);
    const tooLong = avgSentenceLength > 25;
    
    return spacingIssues || brokenWords || tooLong;
  }

  /**
   * Override parent's generateInsightMarkdown for better formatting
   */
  generateInsightMarkdown(insight) {
    let markdown = '';
    
    // Add anchor for navigation
    if (insight.insight_id) {
      markdown += `<div id="${insight.insight_id}"></div>\n\n`;
    }
    
    // Add title with proper formatting
    const title = insight.title || insight.content?.substring(0, 60) || 'Insight';
    markdown += `## ${title}\n\n`;
    
    // Add quality badge if improved
    if (insight.qualityImproved && insight.readabilityScore) {
      const score = insight.readabilityScore.toFixed(0);
      let badge = '';
      if (score >= 70) badge = '✅ High Quality';
      else if (score >= 50) badge = '📊 Good Quality';
      else badge = '⚠️ Complex';
      
      markdown += `*${badge} - Readability Score: ${score}/100*\n\n`;
    }
    
    // Add main content
    const content = insight.content || insight.summary || '';
    if (content) {
      markdown += `${content}\n\n`;
    }
    
    // Add tags
    if (insight.tags && insight.tags.length > 0) {
      markdown += '**Tags:** ';
      insight.tags.forEach(tag => {
        markdown += `![${tag}](https://img.shields.io/badge/-${tag}-blue?style=flat-square) `;
      });
      markdown += '\n\n';
    }
    
    // Add source references with improved quotes
    if (insight.quotes && insight.quotes.length > 0) {
      markdown += '<details>\n';
      markdown += `<summary>📖 Source References (${insight.quotes.length})</summary>\n\n`;
      
      insight.quotes.forEach((quote, index) => {
        markdown += `#### Reference ${index + 1}\n\n`;
        markdown += `> ${quote.text}\n>\n`;
        markdown += `> **Source:** \`${quote.source_file}\` - Line ${quote.line_number}\n`;
        
        if (quote.confidence) {
          const conf = (quote.confidence * 100).toFixed(1);
          const barLength = Math.round(quote.confidence * 10);
          const bar = '█'.repeat(barLength) + '░'.repeat(10 - barLength);
          markdown += `> **Confidence:** ${conf}% \`${bar}\`\n`;
        }
        
        if (quote.readabilityScore) {
          markdown += `> **Readability:** ${quote.readabilityScore.toFixed(0)}/100\n`;
        }
        
        markdown += '>\n';
        
        if (quote.context) {
          markdown += `> **Context:** ${quote.context.substring(0, 200)}...\n\n`;
        }
      });
      
      markdown += '</details>\n\n';
    }
    
    return markdown;
  }

  /**
   * Override generateCategoryDocumentation to use improved content
   */
  async generateCategoryDocumentation(category, insights) {
    // First improve the insights
    const improvedInsights = await this.improveInsightQuality(insights);
    
    const categoryDir = path.join(this.config.outputDir, category);
    const files = [];
    
    // Split insights into manageable chunks
    const chunks = this.chunkArray(improvedInsights, this.config.maxInsightsPerFile);
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const filename = i === 0 ? 'index.md' : `page-${i + 1}.md`;
      const filepath = path.join(categoryDir, filename);
      
      let markdown = this.generateCategoryHeader(category, chunk.length, i + 1, chunks.length);
      
      // Add quality summary
      const avgReadability = chunk
        .filter(i => i.readabilityScore)
        .reduce((sum, i) => sum + i.readabilityScore, 0) / chunk.length;
      
      if (avgReadability > 0) {
        markdown += `📊 **Average Readability:** ${avgReadability.toFixed(0)}/100\n\n`;
        markdown += '---\n\n';
      }
      
      // Add table of contents with improved titles
      if (chunk.length > 5) {
        markdown += '## Contents\n\n';
        chunk.forEach((insight, idx) => {
          const title = insight.title || `Insight ${idx + 1}`;
          markdown += `${idx + 1}. [${title}](#${insight.insight_id})\n`;
        });
        markdown += '\n';
      }
      
      // Generate insights documentation
      chunk.forEach(insight => {
        markdown += this.generateInsightMarkdown(insight);
        markdown += '\n---\n\n';
      });
      
      // Add navigation footer
      markdown += this.generateNavigationFooter(category, i + 1, chunks.length);
      
      await fs.writeFile(filepath, markdown);
      files.push(filepath);
    }
    
    return files;
  }

  /**
   * Main generation method with quality improvement
   */
  async generateDocumentation(insights, transcriptSources = []) {
    console.log('🚀 Starting Quality-Enhanced Documentation Generation');
    console.log(`📊 Processing ${insights.length} insights with quality improvement...`);
    
    // Track start time
    this.generationStats.startTime = Date.now();
    
    // Run parent generation with improved insights
    const result = await super.generateDocumentation(insights, transcriptSources);
    
    // Add quality stats to result
    result.qualityStats = this.qualityStats;
    
    // Log quality summary
    if (this.qualityStats.totalImproved > 0) {
      console.log('\n✨ Quality Enhancement Summary:');
      console.log(`   - Insights improved: ${this.qualityStats.totalImproved}`);
      console.log(`   - Average improvement: ${this.qualityStats.averageImprovement.toFixed(1)}%`);
      console.log(`   - Failed improvements: ${this.qualityStats.failedImprovements}`);
    }
    
    return result;
  }
}

module.exports = QualityEnhancedGenerator;