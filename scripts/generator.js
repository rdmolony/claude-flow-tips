#!/usr/bin/env node

/**
 * Markdown Generator for Claude Flow Tips
 * Creates formatted documentation pages from extracted entries
 */

const fs = require('fs');
const path = require('path');

class MarkdownGenerator {
  constructor(options = {}) {
    this.outputDir = options.outputDir || path.join(__dirname, '../docs');
    this.templateDir = options.templateDir || path.join(__dirname, '../templates');
    this.baseUrl = options.baseUrl || '';
    this.projectName = options.projectName || 'Claude Flow Tips';
    this.debug = options.debug || false;
  }

  /**
   * Generate all documentation from entries
   */
  async generateAll(entries, options = {}) {
    console.log(`Generating documentation for ${entries.length} entries...`);

    // Create directory structure
    this.createDirectoryStructure();

    // Group entries by category
    const byCategory = this.groupByCategory(entries);

    // Generate category pages
    for (const [category, categoryEntries] of Object.entries(byCategory)) {
      await this.generateCategoryPage(category, categoryEntries);
      await this.generateEntryPages(category, categoryEntries);
    }

    // Generate main index page
    await this.generateIndexPage(entries, byCategory);

    // Generate search index
    await this.generateSearchIndex(entries);

    // Generate sitemap
    await this.generateSitemap(entries);

    // Generate metadata files
    await this.generateMetadata(entries);

    console.log('Documentation generation complete!');

    return {
      totalPages: entries.length + Object.keys(byCategory).length + 1,
      categories: Object.keys(byCategory),
      indexPath: path.join(this.outputDir, 'index.md')
    };
  }

  /**
   * Create directory structure
   */
  createDirectoryStructure() {
    const dirs = [
      this.outputDir,
      path.join(this.outputDir, 'gotchas'),
      path.join(this.outputDir, 'tips'),
      path.join(this.outputDir, 'how-to'),
      path.join(this.outputDir, 'qa'),
      path.join(this.outputDir, 'mental-models'),
      path.join(this.outputDir, 'internals'),
      path.join(this.outputDir, 'assets'),
      path.join(this.outputDir, 'search')
    ];

    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * Group entries by category
   */
  groupByCategory(entries) {
    return entries.reduce((acc, entry) => {
      const category = entry.category || 'uncategorized';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(entry);
      return acc;
    }, {});
  }

  /**
   * Generate category page
   */
  async generateCategoryPage(category, entries) {
    const categoryPath = this.getCategoryPath(category);
    const categoryDir = path.join(this.outputDir, categoryPath);
    
    // Sort entries by confidence and title
    entries.sort((a, b) => {
      const confDiff = (b.confidence || 0) - (a.confidence || 0);
      if (confDiff !== 0) return confDiff;
      return a.title.localeCompare(b.title);
    });

    const content = `# ${this.getCategoryTitle(category)}

${this.getCategoryDescription(category)}

**${entries.length} entries** in this category

---

## Navigation
[← Back to Home](../index.md) | ${this.generateCategoryNav(category)}

---

## Entries

${this.generateCategoryTOC(entries)}

---

## By Topic

${this.generateTopicGroups(entries)}

---

## By Difficulty

${this.generateDifficultyGroups(entries)}

---

## Statistics

${this.generateCategoryStats(entries)}

---

*Last updated: ${new Date().toISOString().split('T')[0]}*
`;

    const indexPath = path.join(categoryDir, 'index.md');
    fs.writeFileSync(indexPath, content);

    if (this.debug) {
      console.log(`Generated category page: ${indexPath}`);
    }
  }

  /**
   * Generate individual entry pages
   */
  async generateEntryPages(category, entries) {
    const categoryPath = this.getCategoryPath(category);
    const categoryDir = path.join(this.outputDir, categoryPath);

    for (const entry of entries) {
      await this.generateEntryPage(entry, categoryDir);
    }
  }

  /**
   * Generate single entry page
   */
  async generateEntryPage(entry, categoryDir) {
    const content = `# ${entry.category === 'gotcha' ? '🚨 ' : 
                        entry.category === 'tip' ? '💡 ' :
                        entry.category === 'howTo' ? '🔧 ' :
                        entry.category === 'qa' ? '❓ ' :
                        entry.category === 'mentalModel' ? '🧠 ' :
                        entry.category === 'internals' ? '⚙️ ' : ''}${entry.title}

${this.generateBreadcrumb(entry)}

---

${this.generateQuickInfo(entry)}

## Summary
${entry.summary || this.generateSummary(entry)}

## Details
${this.formatContent(entry.content)}

${this.generateCodeSection(entry)}

${this.generateCommandSection(entry)}

## Sources
${this.generateSources(entry)}

${this.generateRelatedSection(entry)}

---

### Metadata
${this.generateMetadataSection(entry)}

---

*Entry ID: ${entry.id} | Extracted: ${entry.metadata?.extracted || 'Unknown'} | ${entry.metadata?.verified ? '✅ Verified' : '⚠️ Unverified'}*
`;

    const filePath = path.join(categoryDir, `${entry.id}.md`);
    fs.writeFileSync(filePath, content);

    if (this.debug) {
      console.log(`Generated entry page: ${filePath}`);
    }
  }

  /**
   * Generate main index page
   */
  async generateIndexPage(entries, byCategory) {
    const content = `# ${this.projectName}

> Actionable knowledge extracted from Claude Flow community video transcripts

## 🎯 Quick Start

${this.generateQuickLinks()}

## 📊 Overview

- **Total Entries:** ${entries.length}
- **Categories:** ${Object.keys(byCategory).length}
- **Last Updated:** ${new Date().toISOString().split('T')[0]}

## 📚 Browse by Category

${this.generateCategoryCards(byCategory)}

## 🔍 Search

<div class="search-container">
  <input type="text" id="search-input" placeholder="Search tips, gotchas, how-tos..." />
  <div id="search-results"></div>
</div>

## 🏷️ Popular Topics

${this.generateTopicCloud(entries)}

## 🛠️ Most Referenced Tools

${this.generateToolsList(entries)}

## 📈 Recent Additions

${this.generateRecentEntries(entries, 10)}

## 🎓 Learning Paths

${this.generateLearningPaths()}

## 📖 About

This documentation is automatically generated from community video transcripts about Claude Flow. Each entry includes:

- **Verified quotes** from the original transcript
- **Source links** with exact line numbers
- **Related entries** for deeper exploration
- **Metadata** including topics, tools, and difficulty level

## 🤝 Contributing

Found an issue or want to add content? Please check our [contribution guidelines](contributing.md).

---

<script src="assets/search.js"></script>
<link rel="stylesheet" href="assets/style.css">
`;

    const indexPath = path.join(this.outputDir, 'index.md');
    fs.writeFileSync(indexPath, content);

    if (this.debug) {
      console.log(`Generated index page: ${indexPath}`);
    }
  }

  /**
   * Generate search index
   */
  async generateSearchIndex(entries) {
    const searchData = entries.map(entry => ({
      id: entry.id,
      title: entry.title,
      category: entry.category,
      content: entry.content.substring(0, 500),
      summary: entry.summary || '',
      topics: entry.metadata?.topics || [],
      keywords: entry.metadata?.keywords || [],
      url: `${this.getCategoryPath(entry.category)}/${entry.id}.html`
    }));

    const searchIndexPath = path.join(this.outputDir, 'search', 'index.json');
    fs.writeFileSync(searchIndexPath, JSON.stringify(searchData, null, 2));

    // Generate search JavaScript
    const searchJS = this.generateSearchScript();
    const searchScriptPath = path.join(this.outputDir, 'assets', 'search.js');
    fs.writeFileSync(searchScriptPath, searchJS);

    if (this.debug) {
      console.log(`Generated search index: ${searchIndexPath}`);
    }
  }

  /**
   * Generate search script
   */
  generateSearchScript() {
    return `// Search functionality for Claude Flow Tips
(function() {
  let searchIndex = null;
  let fuse = null;

  // Load search index
  async function loadSearchIndex() {
    try {
      const response = await fetch('/search/index.json');
      searchIndex = await response.json();
      
      // Initialize Fuse.js for fuzzy search
      fuse = new Fuse(searchIndex, {
        keys: ['title', 'content', 'summary', 'topics', 'keywords'],
        threshold: 0.3,
        includeScore: true
      });
    } catch (error) {
      console.error('Failed to load search index:', error);
    }
  }

  // Perform search
  function search(query) {
    if (!fuse || !query) return [];
    
    const results = fuse.search(query);
    return results.slice(0, 10).map(r => r.item);
  }

  // Display results
  function displayResults(results) {
    const container = document.getElementById('search-results');
    if (!container) return;

    if (results.length === 0) {
      container.innerHTML = '<p class="no-results">No results found</p>';
      return;
    }

    const html = results.map(result => \`
      <div class="search-result">
        <h3><a href="\${result.url}">\${result.title}</a></h3>
        <p class="category">\${result.category}</p>
        <p class="summary">\${result.summary}</p>
        <p class="topics">\${result.topics.join(', ')}</p>
      </div>
    \`).join('');

    container.innerHTML = html;
  }

  // Initialize on page load
  document.addEventListener('DOMContentLoaded', async () => {
    await loadSearchIndex();

    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      let debounceTimer;
      
      searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          const query = e.target.value.trim();
          if (query.length > 2) {
            const results = search(query);
            displayResults(results);
          } else {
            document.getElementById('search-results').innerHTML = '';
          }
        }, 300);
      });
    }
  });
})();
`;
  }

  /**
   * Generate sitemap
   */
  async generateSitemap(entries) {
    const urls = [
      { url: '/index.html', priority: 1.0 }
    ];

    // Add category pages
    const categories = [...new Set(entries.map(e => e.category))];
    categories.forEach(category => {
      urls.push({
        url: `/${this.getCategoryPath(category)}/index.html`,
        priority: 0.8
      });
    });

    // Add entry pages
    entries.forEach(entry => {
      urls.push({
        url: `/${this.getCategoryPath(entry.category)}/${entry.id}.html`,
        priority: 0.6
      });
    });

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(item => `  <url>
    <loc>${this.baseUrl}${item.url}</loc>
    <priority>${item.priority}</priority>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
  </url>`).join('\n')}
</urlset>`;

    const sitemapPath = path.join(this.outputDir, 'sitemap.xml');
    fs.writeFileSync(sitemapPath, sitemap);

    if (this.debug) {
      console.log(`Generated sitemap: ${sitemapPath}`);
    }
  }

  /**
   * Generate metadata files
   */
  async generateMetadata(entries) {
    const metadata = {
      generated: new Date().toISOString(),
      stats: {
        totalEntries: entries.length,
        categories: this.getCategoryStats(entries),
        topics: this.getTopicStats(entries),
        tools: this.getToolStats(entries),
        speakers: this.getSpeakerStats(entries)
      },
      quality: {
        verified: entries.filter(e => e.metadata?.verified).length,
        highConfidence: entries.filter(e => e.confidence > 0.8).length,
        withCode: entries.filter(e => e.metadata?.codeSnippets?.length > 0).length,
        actionable: entries.filter(e => e.metadata?.actionable).length
      }
    };

    const metadataPath = path.join(this.outputDir, 'metadata.json');
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

    if (this.debug) {
      console.log(`Generated metadata: ${metadataPath}`);
    }
  }

  // Helper methods

  getCategoryPath(category) {
    const paths = {
      gotcha: 'gotchas',
      tip: 'tips',
      howTo: 'how-to',
      qa: 'qa',
      mentalModel: 'mental-models',
      internals: 'internals'
    };
    return paths[category] || category;
  }

  getCategoryTitle(category) {
    const titles = {
      gotcha: '🚨 Gotchas & Warnings',
      tip: '💡 Tips & Best Practices',
      howTo: '🔧 How-To Guides',
      qa: '❓ Questions & Answers',
      mentalModel: '🧠 Mental Models',
      internals: '⚙️ Internals & Architecture'
    };
    return titles[category] || category;
  }

  getCategoryDescription(category) {
    const descriptions = {
      gotcha: 'Critical warnings and potential pitfalls to avoid when using Claude Flow.',
      tip: 'Best practices and optimization strategies for effective Claude Flow usage.',
      howTo: 'Step-by-step guides for implementing features and solving problems.',
      qa: 'Community questions with expert answers about Claude Flow.',
      mentalModel: 'Conceptual frameworks for understanding Claude Flow architecture.',
      internals: 'Technical explanations of how Claude Flow works under the hood.'
    };
    return descriptions[category] || '';
  }

  generateCategoryNav(currentCategory) {
    const categories = ['gotcha', 'tip', 'howTo', 'qa', 'mentalModel', 'internals'];
    return categories.map(cat => {
      if (cat === currentCategory) {
        return `**${this.getCategoryTitle(cat).split(' ')[0]}**`;
      }
      return `[${this.getCategoryTitle(cat).split(' ')[0]}](../${this.getCategoryPath(cat)}/)`;
    }).join(' | ');
  }

  generateCategoryTOC(entries) {
    return entries.map(entry => {
      const confidence = entry.confidence ? ` (${(entry.confidence * 100).toFixed(0)}%)` : '';
      const verified = entry.metadata?.verified ? ' ✅' : '';
      return `- [${entry.title}](./${entry.id}.md)${confidence}${verified}`;
    }).join('\n');
  }

  generateTopicGroups(entries) {
    const byTopic = {};
    
    entries.forEach(entry => {
      const topics = entry.metadata?.topics || ['general'];
      topics.forEach(topic => {
        if (!byTopic[topic]) {
          byTopic[topic] = [];
        }
        byTopic[topic].push(entry);
      });
    });

    return Object.entries(byTopic)
      .sort((a, b) => b[1].length - a[1].length)
      .map(([topic, entries]) => 
        `### ${topic} (${entries.length})\n${entries.slice(0, 5).map(e => 
          `- [${e.title}](./${e.id}.md)`
        ).join('\n')}`
      ).join('\n\n');
  }

  generateDifficultyGroups(entries) {
    const byDifficulty = {
      beginner: [],
      intermediate: [],
      advanced: []
    };

    entries.forEach(entry => {
      const difficulty = entry.metadata?.difficulty || 'intermediate';
      byDifficulty[difficulty].push(entry);
    });

    return Object.entries(byDifficulty)
      .filter(([_, entries]) => entries.length > 0)
      .map(([difficulty, entries]) => 
        `### ${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} (${entries.length})\n${entries.slice(0, 5).map(e => 
          `- [${e.title}](./${e.id}.md)`
        ).join('\n')}`
      ).join('\n\n');
  }

  generateCategoryStats(entries) {
    const stats = {
      total: entries.length,
      verified: entries.filter(e => e.metadata?.verified).length,
      highConfidence: entries.filter(e => e.confidence > 0.8).length,
      withCode: entries.filter(e => e.metadata?.codeSnippets?.length > 0).length
    };

    return `- Total Entries: ${stats.total}
- Verified: ${stats.verified} (${((stats.verified / stats.total) * 100).toFixed(0)}%)
- High Confidence: ${stats.highConfidence} (${((stats.highConfidence / stats.total) * 100).toFixed(0)}%)
- With Code Examples: ${stats.withCode}`;
  }

  generateBreadcrumb(entry) {
    return `[Home](../index.md) › [${this.getCategoryTitle(entry.category).split(' ')[0]}](./) › **${entry.title}**`;
  }

  generateQuickInfo(entry) {
    const info = [];
    
    if (entry.metadata?.difficulty) {
      info.push(`**Difficulty:** ${entry.metadata.difficulty}`);
    }
    
    if (entry.speaker && entry.speaker !== 'Unknown') {
      info.push(`**Speaker:** ${entry.speaker}`);
    }
    
    if (entry.timestamp) {
      info.push(`**Timestamp:** ${entry.timestamp}`);
    }
    
    if (entry.confidence) {
      info.push(`**Confidence:** ${(entry.confidence * 100).toFixed(0)}%`);
    }

    return info.length > 0 ? info.join(' | ') + '\n\n---\n' : '';
  }

  generateSummary(entry) {
    // Auto-generate summary from content if not provided
    const firstSentence = entry.content.match(/^[^.!?]+[.!?]/);
    return firstSentence ? firstSentence[0] : entry.content.substring(0, 150) + '...';
  }

  formatContent(content) {
    // Clean up and format content
    return content
      .replace(/\n{3,}/g, '\n\n')  // Remove excessive newlines
      .replace(/^\s+/gm, '')        // Remove leading whitespace
      .trim();
  }

  generateCodeSection(entry) {
    if (!entry.metadata?.codeSnippets || entry.metadata.codeSnippets.length === 0) {
      return '';
    }

    return `## Code Examples

${entry.metadata.codeSnippets.map((snippet, index) => 
  `\`\`\`javascript
${snippet}
\`\`\``
).join('\n\n')}
`;
  }

  generateCommandSection(entry) {
    if (!entry.metadata?.commands || entry.metadata.commands.length === 0) {
      return '';
    }

    return `## Commands

${entry.metadata.commands.map(cmd => `- \`${cmd}\``).join('\n')}
`;
  }

  generateSources(entry) {
    if (!entry.sources || entry.sources.length === 0) {
      return 'No sources available';
    }

    return entry.sources.map(source => {
      const verified = source.verified ? '✅' : '⚠️';
      return `- [${source.file}](${source.link}) ${verified}\n  > "${source.quote}"`;
    }).join('\n\n');
  }

  generateRelatedSection(entry) {
    if (!entry.related || entry.related.length === 0) {
      return '';
    }

    return `## Related Entries

${entry.related.map(rel => {
      const path = rel.entry ? `../${this.getCategoryPath(rel.entry.category)}/${rel.id}.md` : `${rel.id}.md`;
      const title = rel.entry ? rel.entry.title : rel.id;
      const reasons = rel.reasons ? ` - *${rel.reasons.join(', ')}*` : '';
      return `- [${title}](${path})${reasons}`;
    }).join('\n')}
`;
  }

  generateMetadataSection(entry) {
    const metadata = entry.metadata || {};
    const items = [];

    if (metadata.topics?.length > 0) {
      items.push(`- **Topics:** ${metadata.topics.join(', ')}`);
    }

    if (metadata.keywords?.length > 0) {
      items.push(`- **Keywords:** ${metadata.keywords.slice(0, 10).join(', ')}`);
    }

    if (metadata.tools?.length > 0) {
      items.push(`- **Tools:** ${metadata.tools.join(', ')}`);
    }

    if (metadata.actionable !== undefined) {
      items.push(`- **Actionable:** ${metadata.actionable ? 'Yes' : 'No'}`);
    }

    return items.join('\n');
  }

  generateQuickLinks() {
    return `- [🚨 Latest Gotchas](gotchas/) - Critical warnings to avoid issues
- [💡 Top Tips](tips/) - Best practices from the community
- [🔧 How-To Guides](how-to/) - Step-by-step tutorials
- [❓ Common Questions](qa/) - Frequently asked questions`;
  }

  generateCategoryCards(byCategory) {
    return Object.entries(byCategory).map(([category, entries]) => {
      const title = this.getCategoryTitle(category);
      const path = this.getCategoryPath(category);
      const description = this.getCategoryDescription(category);
      const count = entries.length;
      
      return `### ${title}
${description}

**[Browse ${count} entries →](${path}/)**
`;
    }).join('\n');
  }

  generateTopicCloud(entries) {
    const topics = {};
    
    entries.forEach(entry => {
      (entry.metadata?.topics || []).forEach(topic => {
        topics[topic] = (topics[topic] || 0) + 1;
      });
    });

    return Object.entries(topics)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([topic, count]) => `\`${topic} (${count})\``)
      .join(' ');
  }

  generateToolsList(entries) {
    const tools = {};
    
    entries.forEach(entry => {
      (entry.metadata?.tools || []).forEach(tool => {
        tools[tool] = (tools[tool] || 0) + 1;
      });
    });

    return Object.entries(tools)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tool, count]) => `- **${tool}** (${count} references)`)
      .join('\n');
  }

  generateRecentEntries(entries, limit = 10) {
    // Sort by extraction date
    const sorted = entries
      .filter(e => e.metadata?.extracted)
      .sort((a, b) => new Date(b.metadata.extracted) - new Date(a.metadata.extracted))
      .slice(0, limit);

    return sorted.map(entry => {
      const categoryPath = this.getCategoryPath(entry.category);
      return `- [${entry.title}](${categoryPath}/${entry.id}.md) - ${entry.category}`;
    }).join('\n');
  }

  generateLearningPaths() {
    return `### 🎯 Getting Started
1. [Understanding Claude Flow Basics](mental-models/)
2. [Common Pitfalls to Avoid](gotchas/)
3. [Your First Claude Flow Project](how-to/)

### 🚀 Advanced Topics
1. [Swarm Intelligence](topics/swarm.md)
2. [Performance Optimization](tips/)
3. [Architecture Deep Dive](internals/)`;
  }

  getCategoryStats(entries) {
    const stats = {};
    entries.forEach(entry => {
      stats[entry.category] = (stats[entry.category] || 0) + 1;
    });
    return stats;
  }

  getTopicStats(entries) {
    const stats = {};
    entries.forEach(entry => {
      (entry.metadata?.topics || []).forEach(topic => {
        stats[topic] = (stats[topic] || 0) + 1;
      });
    });
    return stats;
  }

  getToolStats(entries) {
    const stats = {};
    entries.forEach(entry => {
      (entry.metadata?.tools || []).forEach(tool => {
        stats[tool] = (stats[tool] || 0) + 1;
      });
    });
    return stats;
  }

  getSpeakerStats(entries) {
    const stats = {};
    entries.forEach(entry => {
      if (entry.speaker && entry.speaker !== 'Unknown') {
        stats[entry.speaker] = (stats[entry.speaker] || 0) + 1;
      }
    });
    return stats;
  }
}

module.exports = MarkdownGenerator;