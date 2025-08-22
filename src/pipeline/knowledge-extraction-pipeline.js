/**
 * KnowledgeExtractionPipeline - Main pipeline orchestrator
 */

const fs = require('fs').promises;
const path = require('path');

const TranscriptProcessor = require('../processors/transcript-processor');
const ContentSegmenter = require('../processors/content-segmenter');
const ContentClassifier = require('../extractors/content-classifier');
const InsightExtractor = require('../extractors/insight-extractor');
const QuoteVerifier = require('../validators/quote-verifier');
const SourceAttribution = require('../validators/source-attribution');
const DocumentationGenerator = require('../generators/documentation-generator');

class KnowledgeExtractionPipeline {
  constructor(config = {}) {
    if (!config.inputDir) {
      throw new Error('inputDir is required');
    }
    
    if (!config.outputDir) {
      throw new Error('outputDir is required');
    }

    this.config = {
      maxConcurrentFiles: 3,
      verificationEnabled: true,
      generateDocs: true,
      qualityThresholds: {
        minVerificationRate: 0.8,
        minConfidence: 0.7
      },
      ...config
    };

    // Initialize components
    this.transcriptProcessor = new TranscriptProcessor();
    this.contentSegmenter = new ContentSegmenter();
    this.contentClassifier = new ContentClassifier();
    this.insightExtractor = new InsightExtractor();
    this.quoteVerifier = new QuoteVerifier();
    this.sourceAttribution = new SourceAttribution();
    this.documentationGenerator = new DocumentationGenerator();
  }

  /**
   * Process a single transcript file
   */
  async processFile(filePath) {
    console.log(`Processing file: ${path.basename(filePath)}`);
    
    try {
      // Step 1: Read and process transcript
      const content = await fs.readFile(filePath, 'utf8');
      const transcript = await this.transcriptProcessor.processTranscript(content, path.basename(filePath));
      
      console.log(`  - Parsed ${transcript.content.length} lines`);

      // Step 2: Segment content
      const segments = await this.contentSegmenter.segmentContent(transcript);
      console.log(`  - Created ${segments.length} content segments`);

      // Step 3: Classify and extract insights
      const insights = [];
      const attributions = [];
      
      for (const segment of segments) {
        try {
          const classification = await this.contentClassifier.classifyContent(segment.text);
          
          const classifiedContent = {
            content: segment.text,
            classification,
            metadata: {
              source_file: transcript.filename,
              line_start: segment.line_start,
              line_end: segment.line_end,
              timestamp: segment.timestamp
            }
          };
          
          const insight = await this.insightExtractor.extractInsight(classifiedContent);
          
          // Step 4: Verify quotes if enabled
          if (this.config.verificationEnabled) {
            const verificationResults = await this.quoteVerifier.batchVerify(insight.quotes, transcript);
            const validQuotes = verificationResults.filter(r => r.isValid);
            
            if (validQuotes.length > 0) {
              insight.verification_status = 'verified';
              insights.push(insight);
              
              // Create attribution record
              const attribution = await this.sourceAttribution.createAttribution(insight, transcript);
              attributions.push(attribution);
            } else {
              insight.verification_status = 'failed';
              console.warn(`    - Insight failed verification: ${insight.title}`);
            }
          } else {
            insights.push(insight);
          }
          
        } catch (error) {
          console.warn(`    - Error processing segment: ${error.message}`);
        }
      }

      // Step 5: Generate verification report
      const allQuotes = insights.flatMap(insight => insight.quotes);
      const verificationReport = await this.quoteVerifier.generateVerificationReport(allQuotes, transcript);

      // Step 6: Generate documentation
      let documentationGenerated = false;
      if (this.config.generateDocs && insights.length > 0) {
        try {
          await this.documentationGenerator.generateDocumentation(insights, this.config.outputDir);
          documentationGenerated = true;
          console.log(`  - Generated documentation in ${this.config.outputDir}`);
        } catch (error) {
          console.warn(`    - Documentation generation failed: ${error.message}`);
        }
      }

      // Step 7: Quality assessment
      const qualityMetrics = this.calculateQualityMetrics(insights, verificationReport);
      const qualityIssues = this.identifyQualityIssues(insights, verificationReport, qualityMetrics);
      const humanReviewRequired = this.requiresHumanReview(qualityMetrics, qualityIssues);

      const result = {
        transcript,
        insights,
        attributions,
        verificationReport,
        qualityMetrics,
        qualityIssues,
        humanReviewRequired,
        documentationGenerated,
        warnings: this.collectWarnings(transcript, insights),
        errors: []
      };

      console.log(`  - Completed: ${insights.length} insights, ${(verificationReport.verificationRate * 100).toFixed(1)}% verified`);
      
      return result;

    } catch (error) {
      console.error(`  - Failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Process multiple transcript files
   */
  async processBatch(inputDir) {
    const files = await fs.readdir(inputDir);
    const transcriptFiles = files.filter(file => 
      /\.(txt|vtt|srt)$/i.test(file)
    );

    console.log(`Found ${transcriptFiles.length} transcript files`);
    
    const results = [];
    const batchSize = this.config.maxConcurrentFiles;
    
    for (let i = 0; i < transcriptFiles.length; i += batchSize) {
      const batch = transcriptFiles.slice(i, i + batchSize);
      const batchPromises = batch.map(file => 
        this.processFile(path.join(inputDir, file))
      );
      
      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          console.error(`Failed to process ${batch[index]}: ${result.reason.message}`);
          results.push({
            error: result.reason.message,
            file: batch[index]
          });
        }
      });
    }

    // Generate cross-references
    const crossReferences = this.generateCrossReferences(results.filter(r => !r.error));
    
    return results;
  }

  calculateQualityMetrics(insights, verificationReport) {
    const totalInsights = insights.length;
    const highConfidenceInsights = insights.filter(i => 
      i.quotes.some(q => q.confidence > 0.9)
    ).length;
    
    const averageConfidence = insights.length > 0 ? 
      insights.reduce((sum, insight) => {
        const avgQuoteConfidence = insight.quotes.reduce((qSum, q) => qSum + q.confidence, 0) / insight.quotes.length;
        return sum + avgQuoteConfidence;
      }, 0) / insights.length : 0;

    const completeness = verificationReport.validQuotes / Math.max(verificationReport.totalQuotes, 1);

    return {
      totalInsights,
      highConfidenceInsights,
      averageConfidence,
      completeness,
      verificationRate: verificationReport.verificationRate
    };
  }

  identifyQualityIssues(insights, verificationReport, qualityMetrics) {
    const issues = [];

    if (qualityMetrics.averageConfidence < this.config.qualityThresholds.minConfidence) {
      issues.push({
        type: 'low_confidence',
        severity: 'medium',
        description: `Average confidence ${(qualityMetrics.averageConfidence * 100).toFixed(1)}% below threshold`
      });
    }

    if (verificationReport.verificationRate < this.config.qualityThresholds.minVerificationRate) {
      issues.push({
        type: 'low_verification_rate',
        severity: 'high', 
        description: `Verification rate ${(verificationReport.verificationRate * 100).toFixed(1)}% below threshold`
      });
    }

    if (verificationReport.potentialHallucinations > 0) {
      issues.push({
        type: 'potential_hallucination',
        severity: 'critical',
        description: `${verificationReport.potentialHallucinations} potential hallucinations detected`
      });
    }

    return issues;
  }

  requiresHumanReview(qualityMetrics, qualityIssues) {
    return qualityIssues.some(issue => issue.severity === 'critical') ||
           qualityMetrics.averageConfidence < 0.6 ||
           qualityMetrics.verificationRate < 0.7;
  }

  collectWarnings(transcript, insights) {
    const warnings = [];

    if (!transcript.metadata.has_timestamps) {
      warnings.push('Transcript lacks timestamps - may affect quote attribution accuracy');
    }

    if (insights.length === 0) {
      warnings.push('No insights extracted from transcript');
    }

    const lowConfidenceInsights = insights.filter(i => 
      i.quotes.some(q => q.confidence < 0.7)
    ).length;
    
    if (lowConfidenceInsights > insights.length * 0.3) {
      warnings.push(`High proportion of low-confidence insights: ${lowConfidenceInsights}/${insights.length}`);
    }

    return warnings;
  }

  generateCrossReferences(results) {
    const crossRefs = [];
    
    // Find related insights across different transcripts
    for (let i = 0; i < results.length; i++) {
      for (let j = i + 1; j < results.length; j++) {
        const result1 = results[i];
        const result2 = results[j];
        
        // Find insights with similar tags or categories
        result1.insights.forEach(insight1 => {
          result2.insights.forEach(insight2 => {
            if (this.areInsightsRelated(insight1, insight2)) {
              crossRefs.push({
                insight1: insight1.insight_id,
                insight2: insight2.insight_id,
                relationship: 'related',
                source1: result1.transcript.filename,
                source2: result2.transcript.filename
              });
            }
          });
        });
      }
    }
    
    return crossRefs;
  }

  areInsightsRelated(insight1, insight2) {
    // Check if insights share common tags
    const commonTags = insight1.tags.filter(tag => insight2.tags.includes(tag));
    if (commonTags.length >= 2) return true;
    
    // Check if they're in the same category
    if (insight1.category === insight2.category && insight1.category !== 'general') {
      return true;
    }
    
    return false;
  }
}

module.exports = KnowledgeExtractionPipeline;