/**
 * MarkdownProcessor - Enhanced Markdown generation with source attribution
 */

class MarkdownProcessor {
  constructor(config = {}) {
    this.config = {
      collapsibleReferences: true,
      sourceAttribution: true,
      crossReferences: true,
      includeMermaidDiagrams: true,
      generateTOC: true,
      ...config
    };
  }

  /**
   * Generate enhanced insight markdown with all features
   */
  generateInsightMarkdown(insight) {
    let markdown = `## ${insight.title}\n\n`;
    
    // Add insight ID for cross-referencing
    if (insight.insight_id) {
      markdown += `<div id="${insight.insight_id}"></div>\n\n`;
    }
    
    // Add summary with enhanced formatting
    markdown += `${insight.summary}\n\n`;
    
    // Add detailed content if available
    if (insight.details) {
      markdown += `### Details\n\n${insight.details}\n\n`;
    }
    
    // Add implementation example if available
    if (insight.example) {
      markdown += `### Example\n\n\`\`\`${insight.example_language || 'javascript'}\n${insight.example}\n\`\`\`\n\n`;
    }
    
    // Add tags with enhanced styling
    if (insight.tags && insight.tags.length > 0) {
      const tagBadges = insight.tags.map(tag => 
        `![${tag}](https://img.shields.io/badge/-${encodeURIComponent(tag)}-blue?style=flat-square)`
      ).join(' ');
      markdown += `**Tags:** ${tagBadges}\n\n`;
    }
    
    // Add difficulty level if available
    if (insight.difficulty) {
      const difficultyEmoji = this.getDifficultyEmoji(insight.difficulty);
      markdown += `**Difficulty:** ${difficultyEmoji} ${insight.difficulty}\n\n`;
    }
    
    // Add related insights
    if (insight.related && insight.related.length > 0) {
      markdown += `### Related\n\n`;
      for (const related of insight.related) {
        markdown += `- [${related.title}](#${related.insight_id})\n`;
      }
      markdown += `\n`;
    }
    
    // Add source references in enhanced collapsible section
    if (this.config.sourceAttribution && insight.quotes && insight.quotes.length > 0) {
      markdown += this.generateSourceReferences(insight.quotes);
    }
    
    return markdown;
  }

  /**
   * Generate collapsible source references section
   */
  generateSourceReferences(quotes) {
    let markdown = '';
    
    if (this.config.collapsibleReferences) {
      markdown += `<details>\n<summary>📖 Source References (${quotes.length})</summary>\n\n`;
    }
    
    quotes.forEach((quote, index) => {
      markdown += `#### Reference ${index + 1}\n\n`;
      markdown += `> ${quote.text}\n>\n`;
      
      // Source attribution
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
      
      markdown += `\n`;
      
      // Confidence score
      if (quote.confidence) {
        const confidenceBar = this.generateConfidenceBar(quote.confidence);
        markdown += `> **Confidence:** ${(quote.confidence * 100).toFixed(1)}% ${confidenceBar}\n`;
      }
      
      // Context if available
      if (quote.context) {
        markdown += `>\n> **Context:** ${quote.context}\n`;
      }
      
      markdown += `\n`;
    });
    
    if (this.config.collapsibleReferences) {
      markdown += `</details>\n\n`;
    }
    
    return markdown;
  }

  /**
   * Generate confidence visualization bar
   */
  generateConfidenceBar(confidence) {
    const blocks = Math.round(confidence * 10);
    const filledBlocks = '█'.repeat(blocks);
    const emptyBlocks = '░'.repeat(10 - blocks);
    return `\`${filledBlocks}${emptyBlocks}\``;
  }

  /**
   * Get difficulty level emoji
   */
  getDifficultyEmoji(difficulty) {
    const emojiMap = {
      'beginner': '🟢',
      'intermediate': '🟡',
      'advanced': '🟠',
      'expert': '🔴'
    };
    return emojiMap[difficulty.toLowerCase()] || '⚪';
  }

  /**
   * Generate table of contents
   */
  generateTableOfContents(insights, title = 'Table of Contents') {
    let toc = `## ${title}\n\n`;
    
    insights.forEach((insight, index) => {
      const anchor = insight.insight_id || this.slugify(insight.title);
      toc += `${index + 1}. [${insight.title}](#${anchor})\n`;
    });
    
    return toc + `\n`;
  }

  /**
   * Generate Mermaid diagram for concept relationships
   */
  generateConceptDiagram(insights, title = 'Concept Map') {
    let diagram = `## ${title}\n\n\`\`\`mermaid\ngraph TD\n`;
    
    insights.forEach(insight => {
      const nodeId = this.slugify(insight.title);
      diagram += `    ${nodeId}["${insight.title}"]\n`;
      
      if (insight.related && insight.related.length > 0) {
        insight.related.forEach(related => {
          const relatedId = this.slugify(related.title);
          diagram += `    ${nodeId} --> ${relatedId}\n`;
        });
      }
    });
    
    diagram += `\`\`\`\n\n`;
    return diagram;
  }

  /**
   * Generate cross-reference index
   */
  generateCrossReferenceIndex(insights) {
    let index = `## Cross References\n\n`;
    
    const tagIndex = new Map();
    const conceptIndex = new Map();
    
    insights.forEach(insight => {
      // Index by tags
      if (insight.tags) {
        insight.tags.forEach(tag => {
          if (!tagIndex.has(tag)) tagIndex.set(tag, []);
          tagIndex.get(tag).push(insight);
        });
      }
      
      // Index by concepts mentioned
      if (insight.concepts) {
        insight.concepts.forEach(concept => {
          if (!conceptIndex.has(concept)) conceptIndex.set(concept, []);
          conceptIndex.get(concept).push(insight);
        });
      }
    });
    
    // Generate tag index
    if (tagIndex.size > 0) {
      index += `### By Tag\n\n`;
      for (const [tag, tagInsights] of tagIndex) {
        index += `**${tag}:**\n`;
        tagInsights.forEach(insight => {
          const anchor = insight.insight_id || this.slugify(insight.title);
          index += `- [${insight.title}](#${anchor})\n`;
        });
        index += `\n`;
      }
    }
    
    return index;
  }

  /**
   * Create URL-friendly slug
   */
  slugify(text) {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim('-');
  }

  /**
   * Generate category navigation
   */
  generateCategoryNavigation(categories, currentCategory) {
    let nav = `<nav class="category-nav">\n`;
    
    categories.forEach(category => {
      const isActive = category === currentCategory;
      const className = isActive ? 'active' : '';
      nav += `  <a href="${category}.md" class="${className}">${this.formatCategoryName(category)}</a>\n`;
    });
    
    nav += `</nav>\n\n`;
    return nav;
  }

  /**
   * Format category name for display
   */
  formatCategoryName(category) {
    const nameMap = {
      'how-to': 'How-To Guides',
      'tip': 'Tips & Best Practices',
      'gotcha': 'Gotchas & Warnings', 
      'mental-model': 'Mental Models',
      'qa': 'Questions & Answers',
      'concept': 'Concepts & Definitions',
      'use-case': 'Use Cases',
      'tutorial': 'Tutorials',
      'troubleshooting': 'Troubleshooting',
      'best-practice': 'Best Practices'
    };
    
    return nameMap[category] || category.charAt(0).toUpperCase() + category.slice(1);
  }
}

module.exports = MarkdownProcessor;