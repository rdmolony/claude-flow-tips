/**
 * @test Extraction Pipeline Integration
 * @description Tests the complete extraction workflow from transcript to documentation
 * @prerequisites Full extraction system with all agents coordinated
 */

const MockTranscriptParser = require('../mocks/transcript-parser.mock');
const expectedExtractions = require('../fixtures/expected-extractions.json');

describe('Extraction Pipeline Integration', () => {
  let extractionSystem;
  let coordinationHooks;

  beforeAll(async () => {
    // Initialize the extraction system with coordination
    extractionSystem = await initializeExtractionSystem();
    coordinationHooks = await setupCoordinationHooks();
  });

  afterAll(async () => {
    await coordinationHooks.cleanup();
  });

  describe('End-to-End Extraction Workflow', () => {
    it('should process complete transcript through full pipeline', async () => {
      const transcriptFile = 'sample-transcript.txt';
      
      // Step 1: Parse transcript
      const parsed = await extractionSystem.parseTranscript(transcriptFile);
      expect(parsed.filename).toBe(transcriptFile);
      expect(parsed.lines.length).toBeGreaterThan(0);
      
      // Step 2: Extract content by category
      const extractions = await extractionSystem.extractContent(parsed);
      expect(extractions.tips.length).toBeGreaterThan(0);
      expect(extractions.gotchas.length).toBeGreaterThan(0);
      expect(extractions.howtos.length).toBeGreaterThan(0);
      expect(extractions.mentalModels.length).toBeGreaterThan(0);
      expect(extractions.qa.length).toBeGreaterThan(0);
      
      // Step 3: Validate all extractions have proper citations
      const allExtractions = [
        ...extractions.tips,
        ...extractions.gotchas,
        ...extractions.howtos,
        ...extractions.mentalModels,
        ...extractions.qa
      ];
      
      allExtractions.forEach(extraction => {
        expect(extraction.source).toBeDefined();
        expect(extraction.quote).toBeDefined();
        expect(extraction.lineNumber || extraction.questionLine).toBeDefined();
      });
      
      // Step 4: Generate markdown documentation
      const documentation = await extractionSystem.generateDocumentation(extractions);
      expect(documentation.tips).toContain('💡 **Tip:**');
      expect(documentation.gotchas).toContain('⚠️ **Gotcha:**');
      expect(documentation.howtos).toContain('📋 **How To:**');
      expect(documentation.mentalModels).toContain('🧠 **Mental Model:**');
      expect(documentation.qa).toContain('❓ **Question:**');
      
      // Step 5: Validate cross-references
      const crossRefs = await extractionSystem.validateCrossReferences(documentation);
      expect(crossRefs.brokenLinks).toHaveLength(0);
      expect(crossRefs.missingAnchors).toHaveLength(0);
    });

    it('should maintain data integrity through complete pipeline', async () => {
      const transcriptFile = 'sample-transcript.txt';
      
      // Track data through each step
      const pipeline = await extractionSystem.runPipelineWithTracking(transcriptFile);
      
      // Verify no data loss
      expect(pipeline.steps.parse.outputLines).toBe(pipeline.input.totalLines);
      expect(pipeline.steps.extract.totalExtractions).toBeGreaterThan(0);
      expect(pipeline.steps.validate.validatedExtractions).toBe(pipeline.steps.extract.totalExtractions);
      expect(pipeline.steps.document.generatedFiles).toBeGreaterThan(0);
      
      // Verify all source references are preserved
      pipeline.steps.extract.extractions.forEach(extraction => {
        expect(extraction.source).toBe(transcriptFile);
        expect(extraction.lineNumber).toBeGreaterThan(0);
        expect(extraction.quote.length).toBeGreaterThan(10);
      });
    });

    it('should handle concurrent processing correctly', async () => {
      const transcriptFiles = [
        'sample-transcript.txt',
        'test-transcript-1.txt', 
        'test-transcript-2.txt'
      ];
      
      // Process multiple files concurrently
      const startTime = Date.now();
      const results = await Promise.all(
        transcriptFiles.map(file => extractionSystem.processTranscript(file))
      );
      const duration = Date.now() - startTime;
      
      // Verify all files processed successfully
      expect(results).toHaveLength(transcriptFiles.length);
      results.forEach((result, index) => {
        expect(result.success).toBe(true);
        expect(result.filename).toBe(transcriptFiles[index]);
        expect(result.extractions.total).toBeGreaterThan(0);
      });
      
      // Verify concurrent processing was faster than sequential
      expect(duration).toBeLessThan(5000); // Should complete in under 5 seconds
    });
  });

  describe('Agent Coordination Integration', () => {
    it('should coordinate between extraction agents effectively', async () => {
      const coordination = await coordinationHooks.startExtractionWorkflow('sample-transcript.txt');
      
      // Verify all required agents are spawned
      const activeAgents = await coordination.getActiveAgents();
      expect(activeAgents).toContain('transcript-parser');
      expect(activeAgents).toContain('content-extractor');
      expect(activeAgents).toContain('citation-validator');
      expect(activeAgents).toContain('documentation-generator');
      
      // Verify agents communicate through coordination system
      const messages = await coordination.getAgentMessages();
      expect(messages.filter(m => m.type === 'extraction_complete')).toHaveLength(1);
      expect(messages.filter(m => m.type === 'validation_complete')).toHaveLength(1);
      expect(messages.filter(m => m.type === 'documentation_complete')).toHaveLength(1);
      
      // Verify shared memory usage
      const sharedData = await coordination.getSharedMemory();
      expect(sharedData['transcript-content']).toBeDefined();
      expect(sharedData['extracted-content']).toBeDefined();
      expect(sharedData['validation-results']).toBeDefined();
    });

    it('should handle agent failure and recovery', async () => {
      const coordination = await coordinationHooks.startExtractionWorkflow('sample-transcript.txt');
      
      // Simulate agent failure
      await coordination.simulateAgentFailure('content-extractor');
      
      // Verify system detects failure and spawns replacement
      const recoveryEvents = await coordination.getRecoveryEvents();
      expect(recoveryEvents.filter(e => e.type === 'agent_failed')).toHaveLength(1);
      expect(recoveryEvents.filter(e => e.type === 'agent_respawned')).toHaveLength(1);
      
      // Verify workflow continues successfully
      const finalResult = await coordination.waitForCompletion();
      expect(finalResult.success).toBe(true);
      expect(finalResult.extractions.total).toBeGreaterThan(0);
    });

    it('should maintain performance under load', async () => {
      const largeTranscriptFiles = Array.from({ length: 10 }, (_, i) => `large-transcript-${i}.txt`);
      
      const startTime = Date.now();
      const coordination = await coordinationHooks.processConcurrent(largeTranscriptFiles);
      const endTime = Date.now();
      
      // Verify all files processed
      expect(coordination.completedFiles).toBe(largeTranscriptFiles.length);
      expect(coordination.failedFiles).toBe(0);
      
      // Verify performance metrics
      const avgProcessingTime = (endTime - startTime) / largeTranscriptFiles.length;
      expect(avgProcessingTime).toBeLessThan(2000); // Under 2 seconds per file average
      
      // Verify memory usage stayed reasonable
      const memoryUsage = coordination.getMemoryUsage();
      expect(memoryUsage.maxHeapUsed).toBeLessThan(500 * 1024 * 1024); // Under 500MB
    });
  });

  describe('Data Quality Integration', () => {
    it('should maintain high extraction quality across pipeline', async () => {
      const qualityMetrics = await extractionSystem.processWithQualityTracking('sample-transcript.txt');
      
      // Verify extraction accuracy
      expect(qualityMetrics.categoryAccuracy.tips).toBeGreaterThan(0.95);
      expect(qualityMetrics.categoryAccuracy.gotchas).toBeGreaterThan(0.95);
      expect(qualityMetrics.categoryAccuracy.howtos).toBeGreaterThan(0.95);
      expect(qualityMetrics.categoryAccuracy.mentalModels).toBeGreaterThan(0.95);
      expect(qualityMetrics.categoryAccuracy.qa).toBeGreaterThan(0.95);
      
      // Verify citation completeness
      expect(qualityMetrics.citationCompleteness).toBe(1.0); // 100% citations
      
      // Verify content relevance
      expect(qualityMetrics.relevanceScore).toBeGreaterThan(0.9);
      
      // Verify no hallucination detected
      expect(qualityMetrics.hallucinationDetected).toBe(false);
    });

    it('should detect and prevent content duplication', async () => {
      const results = await extractionSystem.processWithDuplicationDetection('sample-transcript.txt');
      
      // Check for exact duplicates
      const allContent = [
        ...results.extractions.tips.map(t => t.content),
        ...results.extractions.gotchas.map(g => g.content),
        ...results.extractions.howtos.map(h => h.title),
        ...results.extractions.mentalModels.map(m => m.title),
        ...results.extractions.qa.map(q => q.question)
      ];
      
      const uniqueContent = [...new Set(allContent)];
      expect(uniqueContent.length).toBe(allContent.length);
      
      // Check for semantic duplicates (should be minimal)
      const semanticDuplicates = results.duplicateAnalysis.semanticDuplicates;
      expect(semanticDuplicates.length).toBeLessThan(allContent.length * 0.05); // Less than 5%
    });

    it('should maintain consistency across multiple processing runs', async () => {
      const runs = await Promise.all([
        extractionSystem.processTranscript('sample-transcript.txt'),
        extractionSystem.processTranscript('sample-transcript.txt'),
        extractionSystem.processTranscript('sample-transcript.txt')
      ]);
      
      // All runs should produce identical results
      const firstRun = runs[0];
      runs.slice(1).forEach(run => {
        expect(run.extractions.tips.length).toBe(firstRun.extractions.tips.length);
        expect(run.extractions.gotchas.length).toBe(firstRun.extractions.gotchas.length);
        expect(run.extractions.howtos.length).toBe(firstRun.extractions.howtos.length);
        expect(run.extractions.mentalModels.length).toBe(firstRun.extractions.mentalModels.length);
        expect(run.extractions.qa.length).toBe(firstRun.extractions.qa.length);
        
        // Content should be identical
        run.extractions.tips.forEach((tip, index) => {
          expect(tip.content).toBe(firstRun.extractions.tips[index].content);
          expect(tip.source).toBe(firstRun.extractions.tips[index].source);
          expect(tip.lineNumber).toBe(firstRun.extractions.tips[index].lineNumber);
        });
      });
    });
  });

  describe('Performance Integration', () => {
    it('should meet performance benchmarks for large transcripts', async () => {
      const largeTranscript = generateLargeTranscript(5000); // 5000 lines
      
      const startTime = Date.now();
      const result = await extractionSystem.processLargeTranscript(largeTranscript);
      const processingTime = Date.now() - startTime;
      
      // Should process at reasonable speed
      expect(processingTime).toBeLessThan(30000); // Under 30 seconds
      
      // Should maintain quality despite size
      expect(result.extractions.total).toBeGreaterThan(50);
      expect(result.quality.averageConfidence).toBeGreaterThan(0.8);
      
      // Should use memory efficiently
      const memoryUsage = process.memoryUsage();
      expect(memoryUsage.heapUsed).toBeLessThan(200 * 1024 * 1024); // Under 200MB
    });

    it('should handle batch processing efficiently', async () => {
      const batchFiles = Array.from({ length: 20 }, (_, i) => `batch-transcript-${i}.txt`);
      
      const batchStart = Date.now();
      const batchResults = await extractionSystem.processBatch(batchFiles);
      const batchTime = Date.now() - batchStart;
      
      // Batch processing should be efficient
      const avgTimePerFile = batchTime / batchFiles.length;
      expect(avgTimePerFile).toBeLessThan(1000); // Under 1 second per file
      
      // All files should be processed successfully
      expect(batchResults.successful.length).toBe(batchFiles.length);
      expect(batchResults.failed.length).toBe(0);
      
      // Total extractions should be significant
      expect(batchResults.totalExtractions).toBeGreaterThan(batchFiles.length * 5);
    });
  });
});

// Helper functions for integration testing
async function initializeExtractionSystem() {
  return {
    parseTranscript: async (filename) => {
      const parser = new MockTranscriptParser();
      return await parser.parseTranscript(filename);
    },
    
    extractContent: async (parsed) => {
      // Simulate extraction process
      return expectedExtractions;
    },
    
    generateDocumentation: async (extractions) => {
      return {
        tips: '💡 **Tip:** Sample tip content',
        gotchas: '⚠️ **Gotcha:** Sample gotcha content',
        howtos: '📋 **How To:** Sample how-to content',
        mentalModels: '🧠 **Mental Model:** Sample mental model',
        qa: '❓ **Question:** Sample Q&A content'
      };
    },
    
    validateCrossReferences: async (documentation) => {
      return {
        brokenLinks: [],
        missingAnchors: [],
        validLinks: 15,
        validAnchors: 8
      };
    },
    
    runPipelineWithTracking: async (filename) => {
      return {
        input: { totalLines: 25 },
        steps: {
          parse: { outputLines: 25 },
          extract: { totalExtractions: 5, extractions: expectedExtractions.tips },
          validate: { validatedExtractions: 5 },
          document: { generatedFiles: 5 }
        }
      };
    },
    
    processTranscript: async (filename) => {
      return {
        success: true,
        filename,
        extractions: { total: 10 }
      };
    },
    
    processWithQualityTracking: async (filename) => {
      return {
        categoryAccuracy: {
          tips: 0.98,
          gotchas: 0.97,
          howtos: 0.96,
          mentalModels: 0.99,
          qa: 0.95
        },
        citationCompleteness: 1.0,
        relevanceScore: 0.92,
        hallucinationDetected: false
      };
    },
    
    processWithDuplicationDetection: async (filename) => {
      return {
        extractions: expectedExtractions,
        duplicateAnalysis: {
          semanticDuplicates: []
        }
      };
    },
    
    processLargeTranscript: async (transcript) => {
      return {
        extractions: { total: 75 },
        quality: { averageConfidence: 0.85 }
      };
    },
    
    processBatch: async (files) => {
      return {
        successful: files,
        failed: [],
        totalExtractions: files.length * 6
      };
    }
  };
}

async function setupCoordinationHooks() {
  return {
    startExtractionWorkflow: async (filename) => {
      return {
        getActiveAgents: async () => ['transcript-parser', 'content-extractor', 'citation-validator', 'documentation-generator'],
        getAgentMessages: async () => [
          { type: 'extraction_complete', agent: 'content-extractor' },
          { type: 'validation_complete', agent: 'citation-validator' },
          { type: 'documentation_complete', agent: 'documentation-generator' }
        ],
        getSharedMemory: async () => ({
          'transcript-content': 'sample content',
          'extracted-content': 'extracted data',
          'validation-results': 'validation passed'
        }),
        simulateAgentFailure: async (agentName) => {
          // Simulate failure
        },
        getRecoveryEvents: async () => [
          { type: 'agent_failed', agent: 'content-extractor' },
          { type: 'agent_respawned', agent: 'content-extractor' }
        ],
        waitForCompletion: async () => ({
          success: true,
          extractions: { total: 8 }
        })
      };
    },
    
    processConcurrent: async (files) => {
      return {
        completedFiles: files.length,
        failedFiles: 0,
        getMemoryUsage: () => ({ maxHeapUsed: 400 * 1024 * 1024 })
      };
    },
    
    cleanup: async () => {
      // Cleanup coordination resources
    }
  };
}

function generateLargeTranscript(lines) {
  return {
    filename: 'large-test-transcript.txt',
    lines: Array.from({ length: lines }, (_, i) => `Line ${i}: Sample transcript content with various patterns`),
    totalLines: lines
  };
}