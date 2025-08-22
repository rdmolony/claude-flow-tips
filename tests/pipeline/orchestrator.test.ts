import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { PipelineOrchestrator, defaultPipelineConfig } from '../../src/pipeline/orchestrator';
import { TranscriptInput, PipelineConfig } from '../../src/pipeline/types';

describe('PipelineOrchestrator', () => {
  let orchestrator: PipelineOrchestrator;
  let config: PipelineConfig;

  beforeEach(() => {
    config = {
      ...defaultPipelineConfig,
      errorHandling: {
        ...defaultPipelineConfig.errorHandling,
        logLevel: 'error' // Reduce log noise during tests
      }
    };
    orchestrator = new PipelineOrchestrator(config);
  });

  afterEach(async () => {
    await orchestrator.cleanup();
  });

  describe('execute', () => {
    it('should successfully execute complete pipeline', async () => {
      const input: TranscriptInput = {
        id: 'test-complete-pipeline',
        content: `
          Introduction to machine learning fundamentals. Machine learning is a subset of artificial intelligence that enables computers to learn from data.

          Supervised learning is defined as a machine learning approach that uses labeled training data to train models. For example, email spam detection uses labeled emails to classify new incoming emails as spam or not spam.

          The machine learning process involves several steps: data collection, data preprocessing, model selection, training, validation, and testing. Each step is crucial for building effective models.

          Neural networks are a type of machine learning algorithm inspired by biological neural networks. Deep learning, which is part of neural networks, uses multiple layers for complex pattern recognition.

          In conclusion, machine learning has many practical applications including recommendation systems, image recognition, natural language processing, and autonomous vehicles.
        `,
        metadata: {
          source: 'ml-complete-tutorial.txt',
          duration: 600,
          timestamp: '2024-01-01T10:00:00Z',
          format: 'txt'
        }
      };

      const result = await orchestrator.execute(input);

      expect(result.success).toBe(true);
      expect(result.finalOutput).toBeDefined();
      expect(result.results).toHaveLength(6); // All 6 stages
      expect(result.errors).toHaveLength(0);
      expect(result.totalDuration).toBeGreaterThan(0);

      // Verify final document
      const document = result.finalOutput!;
      expect(document.title).toBeTruthy();
      expect(document.content).toContain('machine learning');
      expect(document.sections.length).toBeGreaterThan(2);
      expect(document.metadata.sourceTranscript).toBe(input.id);

      // Verify all stages completed successfully
      const stageNames = ['ingestion', 'segmentation', 'classification', 'extraction', 'verification', 'generation'];
      stageNames.forEach((stageName, index) => {
        const stageResult = result.results[index];
        expect(stageResult.stage).toBe(stageName);
        expect(stageResult.success).toBe(true);
        expect(stageResult.data).toBeDefined();
      });
    });

    it('should handle concurrent execution requests properly', async () => {
      const input: TranscriptInput = {
        id: 'concurrent-test',
        content: 'Simple content for concurrent testing.',
        metadata: {
          source: 'concurrent.txt',
          format: 'txt'
        }
      };

      // Start first execution
      const execution1Promise = orchestrator.execute(input);
      
      // Try to start second execution immediately
      await expect(orchestrator.execute({ ...input, id: 'concurrent-test-2' }))
        .rejects.toThrow('Pipeline is already executing');

      // Wait for first execution to complete
      const result1 = await execution1Promise;
      expect(result1.success).toBe(true);

      // Now second execution should work
      const result2 = await orchestrator.execute({ ...input, id: 'concurrent-test-2' });
      expect(result2.success).toBe(true);
    });

    it('should handle stage failures with retry mechanism', async () => {
      const retryConfig: PipelineConfig = {
        ...config,
        stages: {
          ...config.stages,
          ingestion: {
            ...config.stages.ingestion,
            maxFileSize: 1 // Very small size to trigger failure
          }
        },
        errorHandling: {
          ...config.errorHandling,
          retryAttempts: 2,
          retryDelay: 100,
          continueOnError: false
        }
      };

      const retryOrchestrator = new PipelineOrchestrator(retryConfig);

      const input: TranscriptInput = {
        id: 'retry-test',
        content: 'This content is definitely longer than 1 byte and should trigger a size validation failure',
        metadata: {
          source: 'large-file.txt',
          format: 'txt'
        }
      };

      const result = await retryOrchestrator.execute(input);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.results[0].stage).toBe('ingestion');
      expect(result.results[0].success).toBe(false);

      await retryOrchestrator.cleanup();
    });

    it('should continue execution with continueOnError enabled', async () => {
      const continueConfig: PipelineConfig = {
        ...config,
        errorHandling: {
          ...config.errorHandling,
          continueOnError: true,
          retryAttempts: 1
        }
      };

      const continueOrchestrator = new PipelineOrchestrator(continueConfig);

      // Use empty content to cause ingestion failure
      const input: TranscriptInput = {
        id: 'continue-test',
        content: '', // Empty content should cause ingestion to fail
        metadata: {
          source: 'empty-continue.txt',
          format: 'txt'
        }
      };

      const result = await continueOrchestrator.execute(input);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.results[0].success).toBe(false);
      // With continueOnError, it should still attempt subsequent stages (though they may also fail)

      await continueOrchestrator.cleanup();
    });

    it('should validate input at each stage', async () => {
      const input: TranscriptInput = {
        id: 'validation-test',
        content: 'Valid content for validation testing.',
        metadata: {
          source: 'validation.txt',
          format: 'json' // Unsupported format
        }
      };

      const result = await orchestrator.execute(input);

      expect(result.success).toBe(false);
      expect(result.results[0].stage).toBe('ingestion');
      expect(result.results[0].success).toBe(false);
      expect(result.errors[0].code).toBe('VALIDATION_FAILED');
    });

    it('should track execution timing and metadata', async () => {
      const input: TranscriptInput = {
        id: 'timing-test',
        content: 'Content for timing validation.',
        metadata: {
          source: 'timing.txt',
          format: 'txt'
        }
      };

      const startTime = Date.now();
      const result = await orchestrator.execute(input);
      const endTime = Date.now();

      expect(result.totalDuration).toBeGreaterThan(0);
      expect(result.totalDuration).toBeLessThan(endTime - startTime + 100); // Allow for some variance
      expect(new Date(result.startTime).getTime()).toBeGreaterThanOrEqual(startTime);
      expect(new Date(result.endTime).getTime()).toBeLessThanOrEqual(endTime);

      // Each stage should have timing information
      result.results.forEach(stageResult => {
        expect(stageResult.duration).toBeGreaterThan(0);
        expect(stageResult.timestamp).toBeTruthy();
      });
    });

    it('should generate comprehensive error information', async () => {
      const input: TranscriptInput = {
        id: 'error-info-test',
        content: '', // Empty content to trigger error
        metadata: {
          source: 'error-info.txt',
          format: 'txt'
        }
      };

      const result = await orchestrator.execute(input);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);

      const error = result.errors[0];
      expect(error.stage).toBeTruthy();
      expect(error.code).toBeTruthy();
      expect(error.message).toBeTruthy();
      expect(error.recoverable).toBeDefined();
      expect(error.details).toBeDefined();
    });
  });

  describe('getExecutionStatus', () => {
    it('should return correct execution status', async () => {
      const initialStatus = orchestrator.getExecutionStatus();
      expect(initialStatus.isExecuting).toBe(false);
      expect(initialStatus.executionId).toBe('');

      const input: TranscriptInput = {
        id: 'status-test',
        content: 'Content for status testing.',
        metadata: {
          source: 'status.txt',
          format: 'txt'
        }
      };

      // Start execution but don't wait
      const executionPromise = orchestrator.execute(input);

      // Check status during execution (may or may not catch it executing depending on timing)
      const duringStatus = orchestrator.getExecutionStatus();
      expect(duringStatus.executionId).toBeTruthy();

      // Wait for completion
      await executionPromise;

      const afterStatus = orchestrator.getExecutionStatus();
      expect(afterStatus.isExecuting).toBe(false);
    });
  });

  describe('updateConfig', () => {
    it('should update pipeline configuration when not executing', async () => {
      const newConfig = {
        stages: {
          ...config.stages,
          ingestion: {
            ...config.stages.ingestion,
            maxFileSize: 100 * 1024 * 1024 // 100MB
          }
        }
      };

      orchestrator.updateConfig(newConfig);

      // Config should be updated - verify by accessing private property via execution behavior
      const input: TranscriptInput = {
        id: 'config-update-test',
        content: 'A'.repeat(60 * 1024 * 1024), // 60MB content - should pass with new config
        metadata: {
          source: 'large-update.txt',
          format: 'txt'
        }
      };

      const result = await orchestrator.execute(input);
      
      // Should succeed with updated config (larger file size limit)
      expect(result.success).toBe(true);
    });

    it('should not allow config updates during execution', async () => {
      const input: TranscriptInput = {
        id: 'config-during-execution',
        content: 'Content for config update test.',
        metadata: {
          source: 'config-execution.txt',
          format: 'txt'
        }
      };

      // Start execution
      const executionPromise = orchestrator.execute(input);

      // Try to update config during execution
      expect(() => {
        orchestrator.updateConfig({ stages: { ...config.stages } });
      }).toThrow('Cannot update configuration while pipeline is executing');

      await executionPromise;
    });
  });

  describe('cleanup', () => {
    it('should cleanup resources properly', async () => {
      const input: TranscriptInput = {
        id: 'cleanup-test',
        content: 'Content for cleanup testing.',
        metadata: {
          source: 'cleanup.txt',
          format: 'txt'
        }
      };

      await orchestrator.execute(input);
      
      // Cleanup should not throw
      await expect(orchestrator.cleanup()).resolves.not.toThrow();
    });
  });

  describe('error recovery', () => {
    it('should handle recoverable errors appropriately', async () => {
      const recoverableConfig: PipelineConfig = {
        ...config,
        errorHandling: {
          ...config.errorHandling,
          retryAttempts: 3,
          retryDelay: 50,
          continueOnError: true
        }
      };

      const recoverableOrchestrator = new PipelineOrchestrator(recoverableConfig);

      const input: TranscriptInput = {
        id: 'recoverable-test',
        content: 'x'.repeat(10), // Minimal content that might cause issues but not catastrophic failures
        metadata: {
          source: 'recoverable.txt',
          format: 'txt'
        }
      };

      const result = await recoverableOrchestrator.execute(input);

      // Even with potential failures, should attempt recovery
      expect(result.id).toBeTruthy();
      expect(result.results.length).toBeGreaterThan(0);

      await recoverableOrchestrator.cleanup();
    });

    it('should respect retry delay configuration', async () => {
      const delayConfig: PipelineConfig = {
        ...config,
        stages: {
          ...config.stages,
          ingestion: {
            ...config.stages.ingestion,
            maxFileSize: 5 // Very small to trigger consistent failures
          }
        },
        errorHandling: {
          ...config.errorHandling,
          retryAttempts: 2,
          retryDelay: 200, // 200ms delay
          continueOnError: false
        }
      };

      const delayOrchestrator = new PipelineOrchestrator(delayConfig);

      const input: TranscriptInput = {
        id: 'delay-test',
        content: 'This content exceeds the very small file size limit',
        metadata: {
          source: 'delay.txt',
          format: 'txt'
        }
      };

      const startTime = Date.now();
      const result = await delayOrchestrator.execute(input);
      const totalTime = Date.now() - startTime;

      expect(result.success).toBe(false);
      // Should take at least retryAttempts * retryDelay time
      expect(totalTime).toBeGreaterThanOrEqual(2 * 200 - 50); // Allow some tolerance

      await delayOrchestrator.cleanup();
    });
  });

  describe('pipeline stage data flow', () => {
    it('should pass data correctly between stages', async () => {
      const input: TranscriptInput = {
        id: 'dataflow-test',
        content: 'Machine learning is a method of data analysis. Supervised learning uses labeled data for training models.',
        metadata: {
          source: 'dataflow.txt',
          format: 'txt'
        }
      };

      const result = await orchestrator.execute(input);

      expect(result.success).toBe(true);

      // Verify data flows through stages correctly
      const ingestionResult = result.results[0];
      expect(ingestionResult.data.content).toBeTruthy();

      const segmentationResult = result.results[1];
      expect(segmentationResult.data.segments).toBeDefined();
      expect(segmentationResult.data.segments.length).toBeGreaterThan(0);

      const classificationResult = result.results[2];
      expect(classificationResult.data.categories).toBeDefined();
      expect(classificationResult.data.segments[0].category).toBeTruthy();

      const extractionResult = result.results[3];
      expect(extractionResult.data.concepts).toBeDefined();
      expect(extractionResult.data.concepts.length).toBeGreaterThan(0);

      const verificationResult = result.results[4];
      expect(verificationResult.data.qualityScore).toBeDefined();
      expect(verificationResult.data.verificationReport).toBeDefined();

      const generationResult = result.results[5];
      expect(generationResult.data.content).toBeTruthy();
      expect(generationResult.data.title).toBeTruthy();
    });

    it('should maintain metadata throughout pipeline', async () => {
      const input: TranscriptInput = {
        id: 'metadata-flow-test',
        content: 'Content for metadata flow testing.',
        metadata: {
          source: 'metadata-flow.txt',
          duration: 120,
          timestamp: '2024-01-01T12:00:00Z',
          format: 'txt'
        }
      };

      const result = await orchestrator.execute(input);

      expect(result.success).toBe(true);

      // Check that metadata is preserved and enhanced through stages
      const finalDocument = result.finalOutput!;
      expect(finalDocument.metadata.sourceTranscript).toBe(input.id);
      expect(finalDocument.metadata.generatedAt).toBeTruthy();
      
      // Original metadata should be accessible through the pipeline results
      const extractionResult = result.results[3];
      expect(extractionResult.data.metadata.source).toBe(input.metadata.source);
      expect(extractionResult.data.metadata.duration).toBe(input.metadata.duration);
    });
  });
});