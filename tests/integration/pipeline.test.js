/**
 * Integration tests for the complete knowledge extraction pipeline
 * Tests end-to-end processing from transcript to documentation
 */

const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');
const path = require('path');
const fs = require('fs').promises;

// Import pipeline components
const TranscriptProcessor = require('../../src/processors/transcript-processor');
const ContentSegmenter = require('../../src/processors/content-segmenter');
const ContentClassifier = require('../../src/extractors/content-classifier');
const InsightExtractor = require('../../src/extractors/insight-extractor');
const QuoteVerifier = require('../../src/validators/quote-verifier');
const SourceAttribution = require('../../src/validators/source-attribution');
const DocumentationGenerator = require('../../src/generators/documentation-generator');
const KnowledgeExtractionPipeline = require('../../src/pipeline/knowledge-extraction-pipeline');

describe('Knowledge Extraction Pipeline Integration', () => {
  let pipeline;
  let testDataDir;
  let outputDir;

  beforeEach(async () => {
    // Set up test directories
    testDataDir = path.join(__dirname, '../fixtures');
    outputDir = path.join(__dirname, '../output');
    
    // Initialize pipeline
    pipeline = new KnowledgeExtractionPipeline({
      inputDir: testDataDir,
      outputDir: outputDir,
      verificationEnabled: true,
      generateDocs: true
    });

    // Create test directories
    await fs.mkdir(testDataDir, { recursive: true });
    await fs.mkdir(outputDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up test files
    try {
      await fs.rmdir(outputDir, { recursive: true });
      await fs.rmdir(testDataDir, { recursive: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Full Pipeline Processing', () => {
    test('should process complete transcript through entire pipeline', async () => {
      const sampleTranscript = `[00:00:30] Welcome to this Claude Flow tutorial. Today we'll learn about Docker setup.
[00:01:15] First, make sure you have Docker installed and running on your system.
[00:01:45] You can download Docker Desktop from the official website at docker.com.
[00:02:30] Warning: never run Claude with the dangerously-skip-permissions flag outside of a sandbox.
[00:03:15] This could expose your credentials and potentially brick your machine by editing system drivers.
[00:04:00] Pro tip: always use containerized environments for better isolation and security.
[00:04:30] Question: What if I don't have Docker installed? Answer: You can use GitHub Codespaces instead.
[00:05:00] Think of Claude Flow like a pipeline where data flows through different processing stages.`;

      // Write test transcript to file
      const transcriptFile = path.join(testDataDir, 'test-tutorial.txt');
      await fs.writeFile(transcriptFile, sampleTranscript);

      // Process through pipeline
      const results = await pipeline.processFile(transcriptFile);

      // Verify results structure
      expect(results).toBeDefined();
      expect(results.transcript).toBeDefined();
      expect(results.insights).toBeInstanceOf(Array);
      expect(results.insights.length).toBeGreaterThan(0);
      expect(results.verificationReport).toBeDefined();
      expect(results.documentationGenerated).toBe(true);

      // Verify transcript processing
      expect(results.transcript.id).toBeDefined();
      expect(results.transcript.filename).toBe('test-tutorial.txt');
      expect(results.transcript.content.length).toBe(8);
      expect(results.transcript.metadata.has_timestamps).toBe(true);

      // Verify insights extraction
      const categories = results.insights.map(insight => insight.category);
      expect(categories).toContain('how-to');
      expect(categories).toContain('gotcha');
      expect(categories).toContain('tip');
      expect(categories).toContain('qa');
      expect(categories).toContain('mental-model');

      // Verify each insight has required fields
      results.insights.forEach(insight => {
        global.testUtils.assertValidInsight(insight);
        expect(insight.verification_status).toBeDefined();
      });

      // Verify verification report
      expect(results.verificationReport.totalQuotes).toBeGreaterThan(0);
      expect(results.verificationReport.verificationRate).toBeGreaterThan(0.8);
      expect(results.verificationReport.potentialHallucinations).toBe(0);

      // Verify documentation generation
      const docFiles = await fs.readdir(outputDir);
      expect(docFiles.length).toBeGreaterThan(0);
      expect(docFiles.some(file => file.endsWith('.md'))).toBe(true);
    });

    test('should handle multiple transcript files in batch', async () => {
      const transcripts = {
        'docker-setup.txt': `[00:00:30] Install Docker Desktop from the official website.
[00:01:15] Warning: never skip security permissions in production.`,
        
        'github-integration.txt': `[00:00:30] Configure GitHub OAuth tokens for repository access.
[00:01:15] Pro tip: use environment variables for sensitive credentials.`,
        
        'troubleshooting.txt': `[00:00:30] Question: Why is my build failing? Answer: Check your Docker daemon status.
[00:01:15] Common issue: make sure ports are not already in use.`
      };

      // Write test transcripts
      for (const [filename, content] of Object.entries(transcripts)) {
        await fs.writeFile(path.join(testDataDir, filename), content);
      }

      // Process all files
      const results = await pipeline.processBatch(testDataDir);

      expect(results).toHaveLength(3);
      
      // Verify each file was processed
      results.forEach(result => {
        expect(result.transcript).toBeDefined();
        expect(result.insights).toBeInstanceOf(Array);
        expect(result.insights.length).toBeGreaterThan(0);
        expect(result.verificationReport.verificationRate).toBeGreaterThan(0.5);
      });

      // Verify cross-reference generation
      const crossRefs = pipeline.generateCrossReferences(results);
      expect(crossRefs).toBeDefined();
      expect(crossRefs.length).toBeGreaterThan(0);
    });

    test('should maintain source attribution throughout pipeline', async () => {
      const transcript = `[00:00:30] Docker setup requires careful configuration.
[00:01:15] First, install Docker Desktop and ensure it's running properly.`;

      const transcriptFile = path.join(testDataDir, 'attribution-test.txt');
      await fs.writeFile(transcriptFile, transcript);

      const results = await pipeline.processFile(transcriptFile);

      // Verify each insight maintains complete source attribution
      results.insights.forEach(insight => {
        expect(insight.quotes).toBeInstanceOf(Array);
        expect(insight.quotes.length).toBeGreaterThan(0);
        
        insight.quotes.forEach(quote => {
          expect(quote.source_file).toBe('attribution-test.txt');
          expect(quote.line_start).toBeGreaterThan(0);
          expect(quote.confidence).toBeGreaterThan(0.7);
        });
      });

      // Verify attribution records were created
      expect(results.attributions).toBeDefined();
      expect(results.attributions.length).toBe(results.insights.length);
      
      results.attributions.forEach(attr => {
        expect(attr.attribution_id).toBeDefined();
        expect(attr.source_references.length).toBeGreaterThan(0);
        expect(attr.transcript_metadata.filename).toBe('attribution-test.txt');
      });
    });

    test('should detect and flag potential hallucinations', async () => {
      // Create transcript with quotes that might be misinterpreted
      const transcript = `[00:00:30] This is a simple tutorial.
[00:01:15] Basic information about setup procedures.`;

      const transcriptFile = path.join(testDataDir, 'hallucination-test.txt');
      await fs.writeFile(transcriptFile, transcript);

      // Mock the extractor to potentially create problematic quotes
      const originalExtract = pipeline.insightExtractor.extractInsight;
      pipeline.insightExtractor.extractInsight = jest.fn().mockResolvedValue({
        insight_id: 'test-123',
        category: 'how-to',
        title: 'Advanced Docker Configuration',
        summary: 'Complex setup procedures for production environments.',
        quotes: [{
          text: 'Run advanced configuration commands with root privileges.',
          source_file: 'hallucination-test.txt',
          line_start: 1,
          line_end: 1,
          confidence: 0.6
        }]
      });

      const results = await pipeline.processFile(transcriptFile);

      // Verify hallucination detection
      expect(results.verificationReport.potentialHallucinations).toBeGreaterThan(0);
      expect(results.qualityIssues).toBeDefined();
      expect(results.qualityIssues.some(issue => issue.type === 'potential_hallucination')).toBe(true);

      // Restore original method
      pipeline.insightExtractor.extractInsight = originalExtract;
    });

    test('should handle malformed transcript gracefully', async () => {
      const malformedTranscript = `Invalid format without timestamps
Random text here
No structure at all
[Partial timestamp missing content`;

      const transcriptFile = path.join(testDataDir, 'malformed.txt');
      await fs.writeFile(transcriptFile, malformedTranscript);

      const results = await pipeline.processFile(transcriptFile);

      expect(results).toBeDefined();
      expect(results.transcript).toBeDefined();
      expect(results.transcript.metadata.has_timestamps).toBe(false);
      expect(results.insights).toBeInstanceOf(Array);
      expect(results.warnings).toBeDefined();
      expect(results.warnings.some(w => w.includes('timestamp'))).toBe(true);
    });

    test('should generate comprehensive documentation structure', async () => {
      const transcript = `[00:00:30] Welcome to Claude Flow setup tutorial.
[00:01:15] First, install Docker Desktop from docker.com.
[00:02:00] Warning: never use dangerous permissions in production.
[00:02:30] Pro tip: use environment variables for configuration.
[00:03:00] Question: How do I troubleshoot connection issues?
[00:03:30] Answer: Check your network settings and firewall rules.
[00:04:00] Think of Claude Flow as a data processing pipeline.`;

      const transcriptFile = path.join(testDataDir, 'documentation-test.txt');
      await fs.writeFile(transcriptFile, transcript);

      const results = await pipeline.processFile(transcriptFile);

      // Check generated documentation structure
      const files = await fs.readdir(outputDir);
      const categories = ['how-to', 'gotchas', 'tips', 'qa', 'mental-models'];
      
      categories.forEach(category => {
        expect(files.some(file => file.includes(category))).toBe(true);
      });

      // Verify index file generation
      expect(files.some(file => file.includes('index'))).toBe(true);

      // Verify content quality in generated docs
      const howToFile = files.find(file => file.includes('how-to'));
      if (howToFile) {
        const content = await fs.readFile(path.join(outputDir, howToFile), 'utf8');
        expect(content).toContain('## How-To');
        expect(content).toContain('Docker');
        expect(content).toContain('Source:');
        expect(content).toContain('Line');
      }
    });
  });

  describe('Pipeline Error Handling', () => {
    test('should continue processing when single component fails', async () => {
      const transcript = `[00:00:30] Valid content for testing error handling.
[00:01:15] More valid content to process.`;

      const transcriptFile = path.join(testDataDir, 'error-test.txt');
      await fs.writeFile(transcriptFile, transcript);

      // Mock classifier to throw error
      const originalClassify = pipeline.contentClassifier.classifyContent;
      pipeline.contentClassifier.classifyContent = jest.fn()
        .mockRejectedValueOnce(new Error('Classification failed'))
        .mockImplementation(originalClassify);

      const results = await pipeline.processFile(transcriptFile);

      expect(results).toBeDefined();
      expect(results.errors).toBeDefined();
      expect(results.errors.length).toBeGreaterThan(0);
      expect(results.insights).toBeInstanceOf(Array);
      // Should still process remaining content
    });

    test('should handle file system errors gracefully', async () => {
      const nonExistentFile = path.join(testDataDir, 'does-not-exist.txt');

      await expect(pipeline.processFile(nonExistentFile)).rejects.toThrow('File not found');
    });

    test('should validate configuration on initialization', () => {
      expect(() => new KnowledgeExtractionPipeline({}))
        .toThrow('inputDir is required');
        
      expect(() => new KnowledgeExtractionPipeline({ inputDir: '/tmp' }))
        .toThrow('outputDir is required');
    });
  });

  describe('Pipeline Performance', () => {
    test('should process large transcript efficiently', async () => {
      // Generate large transcript (1000 lines)
      const largeTranscript = Array(1000).fill(0).map((_, i) => 
        `[00:${String(Math.floor(i/60)).padStart(2, '0')}:${String(i%60).padStart(2, '0')}] Line ${i} with some meaningful content about Docker setup and configuration.`
      ).join('\\n');

      const transcriptFile = path.join(testDataDir, 'large-transcript.txt');
      await fs.writeFile(transcriptFile, largeTranscript);

      const startTime = Date.now();
      const results = await pipeline.processFile(transcriptFile);
      const processingTime = Date.now() - startTime;

      // Should process within reasonable time (< 30 seconds)
      expect(processingTime).toBeLessThan(30000);
      expect(results.insights.length).toBeGreaterThan(10);
      expect(results.verificationReport.totalQuotes).toBeGreaterThan(10);
    });

    test('should handle concurrent processing correctly', async () => {
      const transcripts = Array(5).fill(0).map((_, i) => ({
        filename: `concurrent-${i}.txt`,
        content: `[00:00:30] Tutorial ${i} content here.
[00:01:15] Step by step instructions for setup.
[00:02:00] Warning: be careful with configuration.`
      }));

      // Write all test files
      await Promise.all(transcripts.map(({ filename, content }) =>
        fs.writeFile(path.join(testDataDir, filename), content)
      ));

      // Process all concurrently
      const promises = transcripts.map(({ filename }) =>
        pipeline.processFile(path.join(testDataDir, filename))
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(5);
      results.forEach((result, index) => {
        expect(result.transcript.filename).toBe(`concurrent-${index}.txt`);
        expect(result.insights.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Quality Assurance Integration', () => {
    test('should maintain quality thresholds throughout pipeline', async () => {
      const transcript = `[00:00:30] High-quality tutorial content with clear instructions.
[00:01:15] First, carefully install Docker Desktop following the official guide.
[00:02:00] Warning: never compromise security by skipping permission checks.
[00:02:30] Pro tip: use automated testing to verify your setup works correctly.`;

      const transcriptFile = path.join(testDataDir, 'quality-test.txt');
      await fs.writeFile(transcriptFile, transcript);

      const results = await pipeline.processFile(transcriptFile);

      // Verify quality metrics meet thresholds
      expect(results.qualityMetrics.averageConfidence).toBeGreaterThan(0.8);
      expect(results.verificationReport.verificationRate).toBeGreaterThan(0.9);
      expect(results.qualityMetrics.completeness).toBeGreaterThan(0.8);
      
      // No quality issues should be flagged for high-quality content
      expect(results.qualityIssues.length).toBe(0);
    });

    test('should flag content requiring human review', async () => {
      const ambiguousTranscript = `[00:00:30] Some unclear instructions here.
[00:01:15] Maybe do this or that, depending on your setup.
[00:02:00] This might work in some cases but not others.`;

      const transcriptFile = path.join(testDataDir, 'ambiguous-test.txt');
      await fs.writeFile(transcriptFile, ambiguousTranscript);

      const results = await pipeline.processFile(transcriptFile);

      expect(results.humanReviewRequired).toBe(true);
      expect(results.qualityIssues.some(issue => issue.type === 'low_confidence')).toBe(true);
      expect(results.qualityMetrics.averageConfidence).toBeLessThan(0.7);
    });
  });
});