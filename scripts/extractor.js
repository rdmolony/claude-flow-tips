#!/usr/bin/env node

/**
 * Main Extraction Pipeline for Claude Flow Tips
 * Orchestrates all components to extract and generate documentation
 */

const fs = require('fs');
const path = require('path');
const TranscriptParser = require('./parser');
const ContentClassifier = require('./classifier');
const ReferenceLinker = require('./linker');
const Verifier = require('./verifier');
const MarkdownGenerator = require('./generator');

class TipsExtractor {
  constructor(options = {}) {
    this.transcriptDir = options.transcriptDir || path.join(__dirname, '../transcripts');
    this.outputDir = options.outputDir || path.join(__dirname, '../docs');
    this.debug = options.debug || false;
    this.verbose = options.verbose || false;
    
    // Initialize components
    this.parser = new TranscriptParser({
      contextWindow: 7,
      minConfidence: 0.6,
      debug: this.debug
    });
    
    this.classifier = new ContentClassifier({
      confidenceThreshold: 0.7,
      multiCategoryThreshold: 0.85,
      debug: this.debug
    });
    
    this.linker = new ReferenceLinker({
      transcriptPath: '../transcripts',
      validateLinks: true,
      debug: this.debug
    });
    
    this.verifier = new Verifier({
      transcriptDir: this.transcriptDir,
      strictMode: true,
      debug: this.debug
    });
    
    this.generator = new MarkdownGenerator({
      outputDir: this.outputDir,
      projectName: 'Claude Flow Tips & Guides',
      debug: this.debug
    });
    
    this.entries = [];
    this.stats = {
      filesProcessed: 0,
      segmentsExtracted: 0,
      entriesCreated: 0,
      categoryCounts: {},
      errors: [],
      startTime: Date.now()
    };
  }

  /**
   * Main extraction pipeline
   */
  async extract() {
    console.log('🚀 Starting Claude Flow Tips Extraction Pipeline');
    console.log('=' .repeat(50));

    try {
      // Phase 1: Parse transcripts
      console.log('\n📄 Phase 1: Parsing Transcripts');
      await this.parseAllTranscripts();

      // Phase 2: Generate documentation
      console.log('\n📝 Phase 2: Generating Documentation');
      await this.generateDocumentation();

      // Phase 3: Verify results
      console.log('\n✅ Phase 3: Verifying Results');
      await this.verifyResults();

      // Phase 4: Generate reports
      console.log('\n📊 Phase 4: Generating Reports');
      await this.generateReports();

      // Complete
      this.printSummary();
      
      return {
        success: true,
        entries: this.entries.length,
        stats: this.stats
      };

    } catch (error) {
      console.error('❌ Extraction failed:', error);
      this.stats.errors.push(error.message);
      
      return {
        success: false,
        error: error.message,
        stats: this.stats
      };
    }
  }

  /**
   * Parse all transcript files
   */
  async parseAllTranscripts() {
    const files = this.getTranscriptFiles();
    console.log(`Found ${files.length} transcript files`);

    for (const file of files) {
      await this.processTranscriptFile(file);
    }

    console.log(`✓ Extracted ${this.entries.length} total entries`);
  }

  /**
   * Get list of transcript files
   */
  getTranscriptFiles() {
    try {
      const files = fs.readdirSync(this.transcriptDir)
        .filter(f => f.endsWith('.txt') || f.endsWith('.md'))
        .map(f => path.join(this.transcriptDir, f));
      
      return files;
    } catch (error) {
      console.error('Error reading transcript directory:', error);
      return [];
    }
  }

  /**
   * Process a single transcript file
   */
  async processTranscriptFile(filePath) {
    const fileName = path.basename(filePath);
    
    if (this.verbose) {
      console.log(`\nProcessing: ${fileName}`);
    }

    try {
      // Parse transcript
      const segments = this.parser.parseTranscript(filePath);
      
      if (this.verbose) {
        console.log(`  → Found ${segments.length} segments`);
      }

      // Process each segment
      let entriesFromFile = 0;
      
      for (const segment of segments) {
        const entry = await this.processSegment(segment, fileName);
        
        if (entry) {
          this.entries.push(entry);
          entriesFromFile++;
          
          // Update category counts
          this.stats.categoryCounts[entry.category] = 
            (this.stats.categoryCounts[entry.category] || 0) + 1;
        }
      }

      this.stats.filesProcessed++;
      this.stats.segmentsExtracted += segments.length;
      this.stats.entriesCreated += entriesFromFile;

      if (this.verbose) {
        console.log(`  ✓ Created ${entriesFromFile} entries`);
      }

    } catch (error) {
      console.error(`Error processing ${fileName}:`, error.message);
      this.stats.errors.push(`${fileName}: ${error.message}`);
    }
  }

  /**
   * Process a single segment into an entry
   */
  async processSegment(segment, fileName) {
    // Classify the segment
    const classification = this.classifier.classify(segment);
    
    // Skip low-confidence segments
    if (classification.primaryConfidence < 0.6) {
      if (this.debug) {
        console.log(`  Skipping low-confidence segment (${classification.primaryConfidence.toFixed(2)})`);
      }
      return null;
    }

    // Create entry
    const entryId = this.generateEntryId(classification.primary);
    
    const entry = {
      id: entryId,
      category: classification.primary,
      secondaryCategory: classification.secondary,
      title: this.generateTitle(segment, classification),
      summary: this.generateSummary(segment),
      content: segment.content,
      sourceFile: fileName,
      lineStart: segment.lineStart,
      lineEnd: segment.lineEnd,
      centerLine: segment.centerLine,
      exactQuote: segment.exactQuote,
      confidence: segment.confidence,
      speaker: segment.speaker,
      timestamp: segment.timestamp,
      sources: [],
      metadata: {
        ...classification.metadata,
        extracted: new Date().toISOString().split('T')[0],
        verified: false,
        confidence: segment.confidence,
        classificationConfidence: classification.primaryConfidence,
        isMultiCategory: classification.isMultiCategory,
        multiCategories: classification.multiCategories,
        speakerContext: segment.speakerContext,
        conversationType: segment.conversationType,
        technicalLevel: segment.technicalLevel
      }
    };

    // Generate source links
    const sourceLink = this.linker.createSourceLink(segment);
    entry.sources.push({
      file: fileName,
      link: sourceLink.fullLink,
      quote: segment.exactQuote,
      verified: false
    });

    return entry;
  }

  /**
   * Generate unique entry ID
   */
  generateEntryId(category) {
    const count = (this.stats.categoryCounts[category] || 0) + 1;
    const paddedCount = count.toString().padStart(3, '0');
    return `${category}-${paddedCount}`;
  }

  /**
   * Generate title from segment
   */
  generateTitle(segment, classification) {
    // Try to extract a meaningful title
    const content = segment.exactQuote || segment.content;
    
    // Remove speaker markers
    const cleaned = content.replace(/^\[.*?\]:\s*/, '');
    
    // Take first meaningful phrase
    const phrases = cleaned.split(/[.!?]/);
    let title = phrases[0].trim();
    
    // Limit length
    if (title.length > 80) {
      title = title.substring(0, 77) + '...';
    }
    
    // Ensure minimum length
    if (title.length < 10) {
      title = `${classification.primary.charAt(0).toUpperCase() + classification.primary.slice(1)} #${this.entries.length + 1}`;
    }
    
    return title;
  }

  /**
   * Generate summary from segment
   */
  generateSummary(segment) {
    const content = segment.content;
    
    // Find the most relevant sentence
    const sentences = content.split(/[.!?]/).filter(s => s.trim().length > 20);
    
    if (sentences.length > 0) {
      // Use the sentence that contains the exact quote if possible
      const quoteSentence = sentences.find(s => 
        segment.exactQuote && s.includes(segment.exactQuote.substring(0, 30))
      );
      
      if (quoteSentence) {
        return quoteSentence.trim() + '.';
      }
      
      // Otherwise use the first substantial sentence
      return sentences[0].trim() + '.';
    }
    
    // Fallback to truncated content
    return content.substring(0, 150).trim() + '...';
  }

  /**
   * Generate documentation
   */
  async generateDocumentation() {
    // Build cross-references
    console.log('Building cross-references...');
    this.linker.buildCrossReferences(this.entries);
    
    // Generate all documentation
    console.log('Generating documentation pages...');
    const result = await this.generator.generateAll(this.entries);
    
    console.log(`✓ Generated ${result.totalPages} pages`);
    console.log(`✓ Categories: ${result.categories.join(', ')}`);
  }

  /**
   * Verify results
   */
  async verifyResults() {
    console.log('Running verification...');
    
    const verificationResults = this.verifier.verifyAll(this.entries);
    
    console.log(`✓ Verified ${verificationResults.valid}/${verificationResults.total} entries`);
    console.log(`  Success rate: ${verificationResults.successRate}%`);
    
    if (verificationResults.warnings > 0) {
      console.log(`  ⚠️  ${verificationResults.warnings} warnings`);
    }
    
    if (verificationResults.invalid > 0) {
      console.log(`  ❌ ${verificationResults.invalid} invalid entries`);
      
      if (this.verbose) {
        verificationResults.errors.slice(0, 5).forEach(error => {
          console.log(`    - ${error.entryId}: ${error.errors[0]}`);
        });
      }
    }
    
    this.verificationResults = verificationResults;
  }

  /**
   * Generate reports
   */
  async generateReports() {
    // Verification report
    const verificationReport = this.verifier.generateReport(this.verificationResults);
    const verificationPath = path.join(this.outputDir, '.verification', 'report.md');
    
    // Ensure directory exists
    const verificationDir = path.dirname(verificationPath);
    if (!fs.existsSync(verificationDir)) {
      fs.mkdirSync(verificationDir, { recursive: true });
    }
    
    fs.writeFileSync(verificationPath, verificationReport);
    console.log(`✓ Verification report: ${verificationPath}`);
    
    // Statistics report
    const statsReport = this.generateStatsReport();
    const statsPath = path.join(this.outputDir, '.verification', 'stats.json');
    fs.writeFileSync(statsPath, JSON.stringify(statsReport, null, 2));
    console.log(`✓ Statistics report: ${statsPath}`);
    
    // Extraction data (remove circular references)
    const dataPath = path.join(this.outputDir, '.verification', 'extracted-data.json');
    const entriesForExport = this.entries.map(entry => {
      const exportEntry = { ...entry };
      // Remove circular references from related entries
      if (exportEntry.related) {
        exportEntry.related = exportEntry.related.map(rel => ({
          id: rel.id,
          score: rel.score,
          reasons: rel.reasons
          // Omit the 'entry' property to avoid circular reference
        }));
      }
      return exportEntry;
    });
    fs.writeFileSync(dataPath, JSON.stringify(entriesForExport, null, 2));
    console.log(`✓ Extraction data: ${dataPath}`);
  }

  /**
   * Generate statistics report
   */
  generateStatsReport() {
    const elapsed = Date.now() - this.stats.startTime;
    
    return {
      timestamp: new Date().toISOString(),
      duration: `${(elapsed / 1000).toFixed(1)} seconds`,
      files: {
        processed: this.stats.filesProcessed,
        total: this.getTranscriptFiles().length
      },
      extraction: {
        segments: this.stats.segmentsExtracted,
        entries: this.stats.entriesCreated,
        ratio: this.stats.segmentsExtracted > 0 ? 
          (this.stats.entriesCreated / this.stats.segmentsExtracted).toFixed(2) : 0
      },
      categories: this.stats.categoryCounts,
      quality: {
        verified: this.verificationResults?.valid || 0,
        invalid: this.verificationResults?.invalid || 0,
        successRate: this.verificationResults?.successRate || 0
      },
      topics: this.getTopicStats(),
      errors: this.stats.errors
    };
  }

  /**
   * Get topic statistics
   */
  getTopicStats() {
    const topics = {};
    
    this.entries.forEach(entry => {
      (entry.metadata?.topics || []).forEach(topic => {
        topics[topic] = (topics[topic] || 0) + 1;
      });
    });
    
    return topics;
  }

  /**
   * Print summary
   */
  printSummary() {
    const elapsed = Date.now() - this.stats.startTime;
    
    console.log('\n' + '=' .repeat(50));
    console.log('✨ EXTRACTION COMPLETE');
    console.log('=' .repeat(50));
    
    console.log('\n📊 Summary:');
    console.log(`  Files processed: ${this.stats.filesProcessed}`);
    console.log(`  Segments extracted: ${this.stats.segmentsExtracted}`);
    console.log(`  Entries created: ${this.stats.entriesCreated}`);
    console.log(`  Time elapsed: ${(elapsed / 1000).toFixed(1)} seconds`);
    
    console.log('\n📁 Categories:');
    Object.entries(this.stats.categoryCounts).forEach(([cat, count]) => {
      console.log(`  ${cat}: ${count}`);
    });
    
    console.log('\n✅ Quality:');
    if (this.verificationResults) {
      console.log(`  Verified: ${this.verificationResults.valid}/${this.verificationResults.total}`);
      console.log(`  Success rate: ${this.verificationResults.successRate}%`);
    }
    
    if (this.stats.errors.length > 0) {
      console.log('\n⚠️  Errors:');
      this.stats.errors.slice(0, 5).forEach(error => {
        console.log(`  - ${error}`);
      });
    }
    
    console.log('\n📍 Output location:');
    console.log(`  ${this.outputDir}`);
    
    console.log('\n🎉 Documentation is ready!');
    console.log(`  Open ${path.join(this.outputDir, 'index.md')} to browse`);
  }
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);
  
  const options = {
    debug: args.includes('--debug'),
    verbose: args.includes('--verbose') || args.includes('-v'),
    transcriptDir: args.find(a => a.startsWith('--input='))?.split('=')[1],
    outputDir: args.find(a => a.startsWith('--output='))?.split('=')[1]
  };
  
  const extractor = new TipsExtractor(options);
  
  extractor.extract()
    .then(result => {
      if (result.success) {
        process.exit(0);
      } else {
        console.error('Extraction failed:', result.error);
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('Unexpected error:', error);
      process.exit(1);
    });
}

module.exports = TipsExtractor;