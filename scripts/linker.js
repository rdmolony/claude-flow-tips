#!/usr/bin/env node

/**
 * Reference Linker for Claude Flow Tips
 * Creates GitHub-compatible source links and manages cross-references
 */

const fs = require('fs');
const path = require('path');

class ReferenceLinker {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || '';
    this.transcriptPath = options.transcriptPath || '../transcripts';
    this.validateLinks = options.validateLinks !== false;
    this.crossReferences = new Map();
    this.debug = options.debug || false;
  }

  /**
   * Generate GitHub-compatible source link
   */
  createSourceLink(segment, options = {}) {
    const { 
      sourceFile, 
      lineStart, 
      lineEnd,
      centerLine 
    } = segment;

    // Build the relative path
    let linkPath = path.join(this.transcriptPath, sourceFile);
    
    // If baseUrl is provided (for GitHub), use it
    if (this.baseUrl) {
      linkPath = `${this.baseUrl}/transcripts/${sourceFile}`;
    }

    // Format line numbers for GitHub
    let lineRef = '';
    if (centerLine && options.useCenterLine) {
      lineRef = `#L${centerLine}`;
    } else if (lineStart === lineEnd) {
      lineRef = `#L${lineStart}`;
    } else {
      lineRef = `#L${lineStart}-L${lineEnd}`;
    }

    const fullLink = `${linkPath}${lineRef}`;

    // Validate if requested
    if (this.validateLinks && !this.baseUrl) {
      const valid = this.validateLink(segment);
      if (!valid) {
        console.warn(`Warning: Invalid link generated for ${sourceFile}${lineRef}`);
      }
    }

    return {
      path: linkPath,
      lineRef: lineRef,
      fullLink: fullLink,
      markdown: `[${sourceFile}${lineRef}](${fullLink})`,
      html: `<a href="${fullLink}">${sourceFile}${lineRef}</a>`
    };
  }

  /**
   * Create multiple source links for merged segments
   */
  createMultiSourceLinks(segment) {
    const links = [];
    
    if (segment.mergedCount && segment.mergedCount > 1) {
      // For merged segments, create a link for the full range
      const mainLink = this.createSourceLink(segment);
      links.push({
        type: 'full-range',
        ...mainLink
      });

      // If we have individual segment info, add those too
      if (segment.individualSegments) {
        segment.individualSegments.forEach((subSegment, index) => {
          const subLink = this.createSourceLink(subSegment, { useCenterLine: true });
          links.push({
            type: 'sub-segment',
            index: index + 1,
            ...subLink
          });
        });
      }
    } else {
      // Single segment
      const link = this.createSourceLink(segment);
      links.push({
        type: 'single',
        ...link
      });
    }

    return links;
  }

  /**
   * Validate that a link points to valid content
   */
  validateLink(segment) {
    try {
      const filePath = path.join(
        path.dirname(this.transcriptPath),
        'transcripts',
        segment.sourceFile
      );

      if (!fs.existsSync(filePath)) {
        if (this.debug) {
          console.log(`File not found: ${filePath}`);
        }
        return false;
      }

      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');

      // Check if line numbers are valid
      if (segment.lineStart > lines.length || segment.lineEnd > lines.length) {
        if (this.debug) {
          console.log(`Line numbers out of range: ${segment.lineStart}-${segment.lineEnd} (file has ${lines.length} lines)`);
        }
        return false;
      }

      // Check if the exact quote exists
      if (segment.exactQuote) {
        const quoteLine = lines[segment.centerLine - 1] || lines[segment.lineStart - 1];
        if (quoteLine && !quoteLine.includes(segment.exactQuote.substring(0, 50))) {
          if (this.debug) {
            console.log(`Quote not found at specified line`);
          }
          return false;
        }
      }

      return true;
    } catch (error) {
      if (this.debug) {
        console.error(`Error validating link: ${error.message}`);
      }
      return false;
    }
  }

  /**
   * Build cross-references between related entries
   */
  buildCrossReferences(entries) {
    this.crossReferences.clear();

    // Build reference map
    entries.forEach(entry => {
      // Index by category
      const categoryKey = `category:${entry.category}`;
      if (!this.crossReferences.has(categoryKey)) {
        this.crossReferences.set(categoryKey, []);
      }
      this.crossReferences.get(categoryKey).push(entry.id);

      // Index by topics
      if (entry.metadata && entry.metadata.topics) {
        entry.metadata.topics.forEach(topic => {
          const topicKey = `topic:${topic}`;
          if (!this.crossReferences.has(topicKey)) {
            this.crossReferences.set(topicKey, []);
          }
          this.crossReferences.get(topicKey).push(entry.id);
        });
      }

      // Index by tools
      if (entry.metadata && entry.metadata.tools) {
        entry.metadata.tools.forEach(tool => {
          const toolKey = `tool:${tool}`;
          if (!this.crossReferences.has(toolKey)) {
            this.crossReferences.set(toolKey, []);
          }
          this.crossReferences.get(toolKey).push(entry.id);
        });
      }

      // Index by speaker
      if (entry.speaker && entry.speaker !== 'Unknown') {
        const speakerKey = `speaker:${entry.speaker}`;
        if (!this.crossReferences.has(speakerKey)) {
          this.crossReferences.set(speakerKey, []);
        }
        this.crossReferences.get(speakerKey).push(entry.id);
      }

      // Index by difficulty
      if (entry.metadata && entry.metadata.difficulty) {
        const difficultyKey = `difficulty:${entry.metadata.difficulty}`;
        if (!this.crossReferences.has(difficultyKey)) {
          this.crossReferences.set(difficultyKey, []);
        }
        this.crossReferences.get(difficultyKey).push(entry.id);
      }
    });

    // Find related entries for each entry
    entries.forEach(entry => {
      entry.related = this.findRelatedEntries(entry, entries);
    });

    return this.crossReferences;
  }

  /**
   * Find entries related to a given entry
   */
  findRelatedEntries(targetEntry, allEntries) {
    const related = new Map();  // Use Map to track scores
    const entryMap = new Map(allEntries.map(e => [e.id, e]));

    // Helper to add related entry with score
    const addRelated = (entryId, score, reason) => {
      if (entryId === targetEntry.id) return;  // Skip self
      
      if (!related.has(entryId)) {
        related.set(entryId, { score: 0, reasons: [] });
      }
      
      const entry = related.get(entryId);
      entry.score += score;
      entry.reasons.push(reason);
    };

    // Same category (lower weight)
    const categoryEntries = this.crossReferences.get(`category:${targetEntry.category}`) || [];
    categoryEntries.forEach(id => addRelated(id, 1, 'same category'));

    // Same topics (higher weight)
    if (targetEntry.metadata && targetEntry.metadata.topics) {
      targetEntry.metadata.topics.forEach(topic => {
        const topicEntries = this.crossReferences.get(`topic:${topic}`) || [];
        topicEntries.forEach(id => addRelated(id, 3, `topic: ${topic}`));
      });
    }

    // Same tools (medium weight)
    if (targetEntry.metadata && targetEntry.metadata.tools) {
      targetEntry.metadata.tools.forEach(tool => {
        const toolEntries = this.crossReferences.get(`tool:${tool}`) || [];
        toolEntries.forEach(id => addRelated(id, 2, `tool: ${tool}`));
      });
    }

    // Secondary category matches
    if (targetEntry.secondaryCategory) {
      const secondaryEntries = this.crossReferences.get(`category:${targetEntry.secondaryCategory}`) || [];
      secondaryEntries.forEach(id => addRelated(id, 2, 'secondary category match'));
    }

    // Same speaker (medium weight)
    if (targetEntry.speaker && targetEntry.speaker !== 'Unknown') {
      const speakerEntries = this.crossReferences.get(`speaker:${targetEntry.speaker}`) || [];
      speakerEntries.forEach(id => addRelated(id, 2, 'same speaker'));
    }

    // Keyword overlap
    if (targetEntry.metadata && targetEntry.metadata.keywords) {
      const targetKeywords = new Set(targetEntry.metadata.keywords);
      
      allEntries.forEach(entry => {
        if (entry.id === targetEntry.id) return;
        
        if (entry.metadata && entry.metadata.keywords) {
          const overlap = entry.metadata.keywords.filter(k => targetKeywords.has(k));
          if (overlap.length > 2) {
            addRelated(entry.id, overlap.length, `${overlap.length} keyword matches`);
          }
        }
      });
    }

    // Sort by score and return top related
    const sortedRelated = Array.from(related.entries())
      .sort((a, b) => b[1].score - a[1].score)
      .slice(0, 5)  // Top 5 related entries
      .map(([id, data]) => ({
        id,
        score: data.score,
        reasons: data.reasons,
        entry: entryMap.get(id)
      }));

    return sortedRelated;
  }

  /**
   * Generate navigation links for categories
   */
  generateCategoryNav(currentCategory) {
    const categories = ['gotcha', 'tip', 'howTo', 'qa', 'mentalModel', 'internals'];
    const nav = [];

    categories.forEach(category => {
      const displayName = this.getCategoryDisplayName(category);
      const path = category === 'howTo' ? 'how-to' : 
                   category === 'mentalModel' ? 'mental-models' :
                   category === 'qa' ? 'qa' :
                   category;

      if (category === currentCategory) {
        nav.push(`**${displayName}**`);
      } else {
        nav.push(`[${displayName}](../${path}/)`);
      }
    });

    return nav.join(' | ');
  }

  /**
   * Get display name for category
   */
  getCategoryDisplayName(category) {
    const names = {
      gotcha: '🚨 Gotchas',
      tip: '💡 Tips',
      howTo: '🔧 How To',
      qa: '❓ Q&A',
      mentalModel: '🧠 Mental Models',
      internals: '⚙️ Internals'
    };

    return names[category] || category;
  }

  /**
   * Generate breadcrumb navigation
   */
  generateBreadcrumb(entry) {
    const parts = [
      '[Home](../index.md)',
      `[${this.getCategoryDisplayName(entry.category)}](./)`,
      `**${entry.title}**`
    ];

    return parts.join(' › ');
  }

  /**
   * Create a link to another entry
   */
  createEntryLink(fromEntry, toEntryId, toEntry = null) {
    if (!toEntry) {
      // Need to look up the entry
      console.warn(`Entry ${toEntryId} not provided for linking`);
      return `[Related: ${toEntryId}](../${toEntryId}.md)`;
    }

    const fromCategory = fromEntry.category;
    const toCategory = toEntry.category;

    // Determine relative path
    let relativePath = '';
    if (fromCategory === toCategory) {
      // Same category, same directory
      relativePath = `./${toEntryId}.md`;
    } else {
      // Different category, need to go up and into other directory
      const toCategoryPath = toCategory === 'howTo' ? 'how-to' :
                            toCategory === 'mentalModel' ? 'mental-models' :
                            toCategory;
      relativePath = `../${toCategoryPath}/${toEntryId}.md`;
    }

    return `[${toEntry.title}](${relativePath})`;
  }

  /**
   * Generate table of contents for a category
   */
  generateCategoryTOC(entries, category) {
    const categoryEntries = entries.filter(e => e.category === category);
    
    // Group by difficulty if available
    const byDifficulty = {
      beginner: [],
      intermediate: [],
      advanced: [],
      general: []
    };

    categoryEntries.forEach(entry => {
      const difficulty = entry.metadata?.difficulty || 'general';
      byDifficulty[difficulty].push(entry);
    });

    // Build TOC
    const toc = [];
    
    for (const [difficulty, entries] of Object.entries(byDifficulty)) {
      if (entries.length === 0) continue;
      
      if (difficulty !== 'general') {
        toc.push(`\n### ${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} Level\n`);
      }
      
      entries.forEach(entry => {
        const link = `./${entry.id}.md`;
        const topics = entry.metadata?.topics?.join(', ') || '';
        toc.push(`- [${entry.title}](${link})${topics ? ` - *${topics}*` : ''}`);
      });
    }

    return toc.join('\n');
  }

  /**
   * Generate a sitemap for all entries
   */
  generateSitemap(entries) {
    const sitemap = {
      categories: {},
      topics: {},
      tools: {},
      total: entries.length
    };

    entries.forEach(entry => {
      // By category
      if (!sitemap.categories[entry.category]) {
        sitemap.categories[entry.category] = [];
      }
      sitemap.categories[entry.category].push({
        id: entry.id,
        title: entry.title
      });

      // By topic
      if (entry.metadata?.topics) {
        entry.metadata.topics.forEach(topic => {
          if (!sitemap.topics[topic]) {
            sitemap.topics[topic] = [];
          }
          sitemap.topics[topic].push({
            id: entry.id,
            title: entry.title,
            category: entry.category
          });
        });
      }

      // By tool
      if (entry.metadata?.tools) {
        entry.metadata.tools.forEach(tool => {
          if (!sitemap.tools[tool]) {
            sitemap.tools[tool] = [];
          }
          sitemap.tools[tool].push({
            id: entry.id,
            title: entry.title,
            category: entry.category
          });
        });
      }
    });

    return sitemap;
  }

  /**
   * Validate all links in a set of entries
   */
  validateAllLinks(entries) {
    const results = {
      total: 0,
      valid: 0,
      invalid: 0,
      errors: []
    };

    entries.forEach(entry => {
      results.total++;
      
      const isValid = this.validateLink({
        sourceFile: entry.sourceFile,
        lineStart: entry.lineStart,
        lineEnd: entry.lineEnd,
        centerLine: entry.centerLine,
        exactQuote: entry.exactQuote
      });

      if (isValid) {
        results.valid++;
      } else {
        results.invalid++;
        results.errors.push({
          entryId: entry.id,
          file: entry.sourceFile,
          lines: `${entry.lineStart}-${entry.lineEnd}`,
          reason: 'Link validation failed'
        });
      }
    });

    results.percentage = ((results.valid / results.total) * 100).toFixed(1);

    return results;
  }

  /**
   * Create anchor links for heading navigation
   */
  createAnchorLink(text) {
    // Convert to GitHub-compatible anchor format
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')  // Remove special characters
      .replace(/\s+/g, '-')       // Replace spaces with hyphens
      .replace(/-+/g, '-')        // Replace multiple hyphens with single
      .trim();
  }

  /**
   * Generate in-page navigation for long entries
   */
  generateInPageNav(entry) {
    const sections = [
      { title: 'Summary', anchor: 'summary' },
      { title: 'Details', anchor: 'details' }
    ];

    if (entry.metadata?.codeSnippets?.length > 0) {
      sections.push({ title: 'Code Examples', anchor: 'code-examples' });
    }

    if (entry.metadata?.commands?.length > 0) {
      sections.push({ title: 'Commands', anchor: 'commands' });
    }

    sections.push({ title: 'Sources', anchor: 'sources' });

    if (entry.related?.length > 0) {
      sections.push({ title: 'Related', anchor: 'related' });
    }

    const navItems = sections.map(section => 
      `[${section.title}](#${section.anchor})`
    );

    return `**Quick Navigation:** ${navItems.join(' | ')}`;
  }
}

module.exports = ReferenceLinker;