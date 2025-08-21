#!/usr/bin/env node

/**
 * Example Extraction Script for Claude Flow Tips
 * Demonstrates the extraction methodology with verification
 */

const fs = require('fs');
const path = require('path');

class TipsExtractor {
  constructor(transcriptDir = '../../transcripts', outputDir = '../') {
    this.transcriptDir = transcriptDir;
    this.outputDir = outputDir;
    this.entries = [];
  }

  /**
   * Category detection patterns
   */
  patterns = {
    gotcha: /\b(warning|careful|don't|avoid|dangerous|never|risk|security)\b/i,
    tip: /\b(recommend|suggest|better|should|best practice|pro tip|advice)\b/i,
    howTo: /\b(steps|first|then|setup|configure|install|how to|guide)\b/i,
    qa: /\?|asked|answer|question|response|replied/i,
    mentalModel: /\b(think|understand|concept|mental model|paradigm|approach)\b/i,
    internals: /\b(how it works|under the hood|internally|mechanism|architecture)\b/i
  };

  /**
   * Parse a transcript file and extract relevant content
   */
  parseTranscript(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const fileName = path.basename(filePath);
    const extractedSegments = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check each pattern
      for (const [category, pattern] of Object.entries(this.patterns)) {
        if (pattern.test(line)) {
          // Extract context (5 lines before and after)
          const startLine = Math.max(0, i - 5);
          const endLine = Math.min(lines.length - 1, i + 5);
          const context = lines.slice(startLine, endLine + 1).join('\n');
          
          extractedSegments.push({
            category,
            content: context,
            sourceFile: fileName,
            lineStart: startLine + 1, // GitHub uses 1-based line numbers
            lineEnd: endLine + 1,
            exactQuote: line,
            confidence: this.calculateConfidence(line, category)
          });
        }
      }
    }

    return extractedSegments;
  }

  /**
   * Calculate confidence score for categorization
   */
  calculateConfidence(text, category) {
    const pattern = this.patterns[category];
    const matches = text.match(pattern) || [];
    const wordCount = text.split(/\s+/).length;
    
    // Simple confidence calculation
    const matchDensity = matches.length / wordCount;
    return Math.min(0.95, matchDensity * 10);
  }

  /**
   * Generate GitHub-compatible source link
   */
  createSourceLink(segment) {
    const { sourceFile, lineStart, lineEnd } = segment;
    const basePath = `../transcripts/${sourceFile}`;
    
    if (lineStart === lineEnd) {
      return `${basePath}#L${lineStart}`;
    } else {
      return `${basePath}#L${lineStart}-L${lineEnd}`;
    }
  }

  /**
   * Verify that quotes exist in source files
   */
  verifyQuote(segment) {
    const filePath = path.join(this.transcriptDir, segment.sourceFile);
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    
    // Check if the exact quote exists at the specified line
    const quoteLine = lines[segment.lineStart - 1];
    return quoteLine && quoteLine.includes(segment.exactQuote.trim());
  }

  /**
   * Format entry for output
   */
  formatEntry(segment, id) {
    const title = this.generateTitle(segment);
    const link = this.createSourceLink(segment);
    
    return {
      id: `${segment.category}-${id.toString().padStart(3, '0')}`,
      category: segment.category,
      title: title,
      summary: segment.exactQuote.substring(0, 100) + '...',
      content: segment.content,
      sources: [{
        file: segment.sourceFile,
        link: link,
        quote: segment.exactQuote,
        verified: this.verifyQuote(segment)
      }],
      metadata: {
        extracted: new Date().toISOString().split('T')[0],
        confidence: segment.confidence,
        verified: false
      }
    };
  }

  /**
   * Generate a descriptive title from content
   */
  generateTitle(segment) {
    // Simple title generation - can be enhanced with NLP
    const words = segment.exactQuote.split(/\s+/).slice(0, 5).join(' ');
    return words.charAt(0).toUpperCase() + words.slice(1);
  }

  /**
   * Main extraction process
   */
  async extract() {
    const transcriptFiles = fs.readdirSync(this.transcriptDir)
      .filter(f => f.endsWith('.md'));

    console.log(`Found ${transcriptFiles.length} transcript files`);

    let totalSegments = 0;
    const categoryCounts = {};

    for (const file of transcriptFiles) {
      const filePath = path.join(this.transcriptDir, file);
      console.log(`Processing: ${file}`);
      
      const segments = this.parseTranscript(filePath);
      totalSegments += segments.length;

      segments.forEach((segment, index) => {
        const entry = this.formatEntry(segment, this.entries.length + 1);
        this.entries.push(entry);
        
        // Track category counts
        categoryCounts[segment.category] = (categoryCounts[segment.category] || 0) + 1;
      });
    }

    console.log(`\nExtraction Complete:`);
    console.log(`- Total segments found: ${totalSegments}`);
    console.log(`- Categories:`, categoryCounts);

    return this.entries;
  }

  /**
   * Generate verification report
   */
  generateVerificationReport() {
    const verified = this.entries.filter(e => e.sources[0].verified);
    const unverified = this.entries.filter(e => !e.sources[0].verified);

    const report = `# Verification Report - ${new Date().toISOString().split('T')[0]}

## Summary
- Total Entries: ${this.entries.length}
- Verified: ${verified.length} (${((verified.length / this.entries.length) * 100).toFixed(1)}%)
- Unverified: ${unverified.length}

## Category Breakdown
${Object.entries(this.groupByCategory()).map(([cat, entries]) => 
  `- ${cat}: ${entries.length} entries`
).join('\n')}

## Unverified Entries
${unverified.map(e => `- [ ] ${e.id}: ${e.title}`).join('\n')}

## Next Steps
1. Review unverified entries manually
2. Check for quote accuracy
3. Validate source links
4. Merge related entries
`;

    return report;
  }

  /**
   * Group entries by category
   */
  groupByCategory() {
    return this.entries.reduce((acc, entry) => {
      acc[entry.category] = acc[entry.category] || [];
      acc[entry.category].push(entry);
      return acc;
    }, {});
  }

  /**
   * Save extracted entries to files
   */
  save() {
    // Save JSON data
    const dataPath = path.join(this.outputDir, 'extracted-data.json');
    fs.writeFileSync(dataPath, JSON.stringify(this.entries, null, 2));
    console.log(`\nSaved extracted data to: ${dataPath}`);

    // Save verification report
    const reportPath = path.join(this.outputDir, 'verification-report.md');
    fs.writeFileSync(reportPath, this.generateVerificationReport());
    console.log(`Saved verification report to: ${reportPath}`);

    // Create category directories and files
    const categoryGroups = this.groupByCategory();
    for (const [category, entries] of Object.entries(categoryGroups)) {
      const categoryDir = path.join(this.outputDir, category);
      
      if (!fs.existsSync(categoryDir)) {
        fs.mkdirSync(categoryDir, { recursive: true });
      }

      entries.forEach(entry => {
        const filePath = path.join(categoryDir, `${entry.id}.md`);
        const markdown = this.entryToMarkdown(entry);
        fs.writeFileSync(filePath, markdown);
      });

      console.log(`Created ${entries.length} files in ${category}/`);
    }
  }

  /**
   * Convert entry to markdown format
   */
  entryToMarkdown(entry) {
    return `# ${entry.category}: ${entry.title}

## Summary
${entry.summary}

## Details
${entry.content}

## Sources
${entry.sources.map(s => 
  `- [${s.file}](${s.link}) ${s.verified ? '✅' : '⚠️'} - "${s.quote}"`
).join('\n')}

---
*Extracted: ${entry.metadata.extracted} | Confidence: ${(entry.metadata.confidence * 100).toFixed(0)}% | Verified: ${entry.metadata.verified ? '✅' : '❌'}*
`;
  }
}

// Run extraction if called directly
if (require.main === module) {
  const extractor = new TipsExtractor();
  
  extractor.extract()
    .then(() => {
      extractor.save();
      console.log('\n✅ Extraction complete!');
    })
    .catch(err => {
      console.error('❌ Extraction failed:', err);
      process.exit(1);
    });
}

module.exports = TipsExtractor;