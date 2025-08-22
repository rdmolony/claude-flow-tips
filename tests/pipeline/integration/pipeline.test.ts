import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { PipelineOrchestrator } from '../../../src/pipeline/orchestrator';
import { TranscriptInput, PipelineConfig } from '../../../src/pipeline/types';

describe('Pipeline Integration Tests', () => {
  let orchestrator: PipelineOrchestrator;
  let config: PipelineConfig;

  beforeEach(() => {
    config = {
      stages: {
        ingestion: {
          supportedFormats: ['txt', 'srt', 'vtt'],
          maxFileSize: 10 * 1024 * 1024,
          preprocessingEnabled: true
        },
        segmentation: {
          strategy: 'topic_based',
          minSegmentLength: 50,
          maxSegmentLength: 500,
          overlapPercent: 10
        },
        classification: {
          categories: ['technical', 'educational', 'tutorial', 'explanation'],
          confidenceThreshold: 0.7,
          multiLabel: true
        },
        extraction: {
          conceptTypes: ['definition', 'process', 'example', 'principle'],
          relationshipTypes: ['depends_on', 'part_of', 'related_to'],
          minConfidence: 0.6,
          contextWindow: 100
        },
        verification: {
          qualityThreshold: 0.8,
          enableCrossValidation: true,
          verificationMethods: ['consistency', 'completeness', 'accuracy']
        },
        generation: {
          outputFormats: ['markdown', 'html'],
          includeMetadata: true,
          generateTOC: true
        }
      },
      errorHandling: {
        retryAttempts: 3,
        retryDelay: 1000,
        continueOnError: false,
        logLevel: 'info'
      }
    };

    orchestrator = new PipelineOrchestrator(config);
  });

  afterEach(async () => {
    await orchestrator.cleanup();
  });

  describe('Full Pipeline Execution', () => {
    it('should process a complete transcript through all stages', async () => {
      const input: TranscriptInput = {
        id: 'integration-test-1',
        content: `
          Welcome to this tutorial on machine learning fundamentals. Today we'll cover the basics of supervised learning.

          Machine learning is a subset of artificial intelligence that enables computers to learn and improve from experience without being explicitly programmed. There are three main types of machine learning: supervised, unsupervised, and reinforcement learning.

          Supervised learning uses labeled training data to learn a mapping function from input variables to an output variable. For example, in email spam detection, we train the model with emails labeled as 'spam' or 'not spam'. The algorithm learns patterns that distinguish spam from legitimate emails.

          Let's look at a practical example. In image classification, we might have thousands of images labeled with their contents: 'cat', 'dog', 'car', etc. The supervised learning algorithm analyzes these labeled examples to learn features that distinguish each category.

          The process involves several steps: data collection, data preprocessing, model selection, training, validation, and testing. Each step is crucial for building an effective machine learning system.

          In conclusion, supervised learning is a powerful technique that forms the foundation of many AI applications we use daily, from recommendation systems to voice assistants.
        `,
        metadata: {
          source: 'ml-tutorial.txt',
          duration: 480,
          timestamp: '2024-01-01T10:00:00Z',
          format: 'txt'
        }
      };

      const result = await orchestrator.execute(input);

      expect(result.success).toBe(true);
      expect(result.finalOutput).toBeDefined();
      expect(result.results).toHaveLength(6); // All 6 stages
      expect(result.errors).toHaveLength(0);

      // Verify final document
      const document = result.finalOutput!;
      expect(document.title).toBeTruthy();
      expect(document.content).toBeTruthy();
      expect(document.sections.length).toBeGreaterThan(0);
      expect(document.metadata.sourceTranscript).toBe(input.id);
    });

    it('should handle stage failures gracefully', async () => {
      const invalidInput: TranscriptInput = {
        id: 'invalid-test',
        content: '', // Empty content should cause ingestion to fail
        metadata: {
          source: 'empty.txt',
          format: 'txt'
        }
      };

      const result = await orchestrator.execute(invalidInput);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].stage).toBe('ingestion');
    });

    it('should retry failed stages based on configuration', async () => {
      const retryConfig = {
        ...config,
        errorHandling: {
          ...config.errorHandling,
          retryAttempts: 2,
          continueOnError: true
        }
      };

      const retryOrchestrator = new PipelineOrchestrator(retryConfig);

      // Use content that might cause intermittent failures
      const input: TranscriptInput = {
        id: 'retry-test',
        content: 'x'.repeat(1000), // Minimal content that might cause issues
        metadata: {
          source: 'retry.txt',
          format: 'txt'
        }
      };

      const result = await retryOrchestrator.execute(input);

      // Should complete even if some stages failed and were retried
      expect(result.results.length).toBeGreaterThan(0);

      await retryOrchestrator.cleanup();
    });

    it('should preserve data flow between stages', async () => {
      const input: TranscriptInput = {
        id: 'dataflow-test',
        content: `
          Introduction to data structures. Arrays are fundamental data structures that store elements in contiguous memory locations.

          A linked list is another important data structure where elements are stored in nodes, and each node contains data and a reference to the next node.

          Hash tables provide fast access to data by using a hash function to map keys to array indices. This enables average O(1) lookup time.

          In summary, choosing the right data structure depends on your specific use case and performance requirements.
        `,
        metadata: {
          source: 'data-structures.txt',
          format: 'txt'
        }
      };

      const result = await orchestrator.execute(input);

      expect(result.success).toBe(true);

      // Verify data flows correctly through stages
      const stages = ['ingestion', 'segmentation', 'classification', 'extraction', 'verification', 'generation'];
      
      stages.forEach((stageName, index) => {
        const stageResult = result.results[index];
        expect(stageResult.stage).toBe(stageName);
        expect(stageResult.success).toBe(true);
        expect(stageResult.data).toBeDefined();
      });

      // Verify final output contains concepts from all segments
      const document = result.finalOutput!;
      expect(document.content).toContain('Arrays');
      expect(document.content).toContain('linked list');
      expect(document.content).toContain('Hash tables');
    });

    it('should generate proper metadata throughout pipeline', async () => {
      const input: TranscriptInput = {
        id: 'metadata-test',
        content: 'Test content for metadata verification and tracking through all pipeline stages.',
        metadata: {
          source: 'metadata-test.txt',
          duration: 60,
          timestamp: '2024-01-01T15:30:00Z',
          format: 'txt'
        }
      };

      const result = await orchestrator.execute(input);

      expect(result.success).toBe(true);

      // Check that original metadata is preserved
      const document = result.finalOutput!;
      expect(document.metadata.sourceTranscript).toBe(input.id);
      expect(document.metadata.generatedAt).toBeTruthy();
      expect(document.metadata.version).toBeTruthy();

      // Verify timing information
      expect(result.totalDuration).toBeGreaterThan(0);
      expect(new Date(result.startTime)).toBeInstanceOf(Date);
      expect(new Date(result.endTime)).toBeInstanceOf(Date);
    });
  });

  describe('Performance and Quality', () => {
    it('should complete processing within reasonable time', async () => {
      const input: TranscriptInput = {
        id: 'performance-test',
        content: 'Medium-length content '.repeat(100),
        metadata: {
          source: 'performance.txt',
          format: 'txt'
        }
      };

      const startTime = Date.now();
      const result = await orchestrator.execute(input);
      const duration = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(30000); // Should complete in under 30 seconds
    });

    it('should produce high-quality output', async () => {
      const input: TranscriptInput = {
        id: 'quality-test',
        content: `
          Quality assurance in software development is critical for delivering reliable applications. It involves systematic processes to ensure that software meets specified requirements and functions correctly.

          Testing is a key component of QA, including unit tests, integration tests, and end-to-end tests. Each type serves a specific purpose in validating different aspects of the software.

          Code reviews are another important QA practice where developers examine each other's code to identify bugs, improve code quality, and share knowledge.
        `,
        metadata: {
          source: 'qa-practices.txt',
          format: 'txt'
        }
      };

      const result = await orchestrator.execute(input);

      expect(result.success).toBe(true);

      const document = result.finalOutput!;
      
      // Check document structure
      expect(document.sections.length).toBeGreaterThan(2);
      expect(document.content.length).toBeGreaterThan(input.content.length * 0.5);
      
      // Check that key concepts are preserved
      expect(document.content.toLowerCase()).toContain('quality assurance');
      expect(document.content.toLowerCase()).toContain('testing');
      expect(document.content.toLowerCase()).toContain('code review');
    });
  });
});