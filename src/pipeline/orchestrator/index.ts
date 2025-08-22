import {
  PipelineConfig,
  PipelineExecutionResult,
  PipelineResult,
  PipelineError,
  PipelineStageError,
  TranscriptInput,
  GeneratedDocument
} from '../types';
import { IngestionStage } from '../stages/ingestion';
import { SegmentationStage } from '../stages/segmentation';
import { ClassificationStage } from '../stages/classification';
import { ExtractionStage } from '../stages/extraction';
import { VerificationStage } from '../stages/verification';
import { GenerationStage } from '../stages/generation';

export class PipelineOrchestrator {
  private ingestionStage: IngestionStage;
  private segmentationStage: SegmentationStage;
  private classificationStage: ClassificationStage;
  private extractionStage: ExtractionStage;
  private verificationStage: VerificationStage;
  private generationStage: GenerationStage;

  private isExecuting = false;
  private executionId = '';

  constructor(private config: PipelineConfig) {
    this.initializeStages();
  }

  private initializeStages(): void {
    this.ingestionStage = new IngestionStage(this.config.stages.ingestion);
    this.segmentationStage = new SegmentationStage(this.config.stages.segmentation);
    this.classificationStage = new ClassificationStage(this.config.stages.classification);
    this.extractionStage = new ExtractionStage(this.config.stages.extraction);
    this.verificationStage = new VerificationStage(this.config.stages.verification);
    this.generationStage = new GenerationStage(this.config.stages.generation);
  }

  async execute(input: TranscriptInput): Promise<PipelineExecutionResult> {
    if (this.isExecuting) {
      throw new Error('Pipeline is already executing. Wait for completion or use a new instance.');
    }

    this.isExecuting = true;
    this.executionId = `exec-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    
    const startTime = new Date().toISOString();
    const results: PipelineResult<any>[] = [];
    const errors: PipelineError[] = [];
    let finalOutput: GeneratedDocument | undefined;

    this.log('info', `Starting pipeline execution ${this.executionId}`);

    try {
      // Stage 1: Ingestion
      const ingestionResult = await this.executeStage(
        'ingestion',
        this.ingestionStage,
        input
      );
      results.push(ingestionResult);

      if (!ingestionResult.success) {
        throw new Error('Ingestion stage failed - cannot continue pipeline');
      }

      // Stage 2: Segmentation
      const segmentationResult = await this.executeStage(
        'segmentation',
        this.segmentationStage,
        ingestionResult.data
      );
      results.push(segmentationResult);

      if (!segmentationResult.success) {
        throw new Error('Segmentation stage failed - cannot continue pipeline');
      }

      // Stage 3: Classification
      const classificationResult = await this.executeStage(
        'classification',
        this.classificationStage,
        segmentationResult.data
      );
      results.push(classificationResult);

      if (!classificationResult.success) {
        throw new Error('Classification stage failed - cannot continue pipeline');
      }

      // Stage 4: Extraction
      const extractionResult = await this.executeStage(
        'extraction',
        this.extractionStage,
        classificationResult.data
      );
      results.push(extractionResult);

      if (!extractionResult.success) {
        throw new Error('Extraction stage failed - cannot continue pipeline');
      }

      // Stage 5: Verification
      const verificationResult = await this.executeStage(
        'verification',
        this.verificationStage,
        extractionResult.data
      );
      results.push(verificationResult);

      if (!verificationResult.success) {
        throw new Error('Verification stage failed - cannot continue pipeline');
      }

      // Stage 6: Generation
      const generationResult = await this.executeStage(
        'generation',
        this.generationStage,
        verificationResult.data
      );
      results.push(generationResult);

      if (!generationResult.success) {
        throw new Error('Generation stage failed - cannot continue pipeline');
      }

      finalOutput = generationResult.data as GeneratedDocument;

      // Collect all errors from stage results
      results.forEach(result => {
        if (result.error) {
          errors.push(result.error);
        }
      });

      const endTime = new Date().toISOString();
      const totalDuration = new Date(endTime).getTime() - new Date(startTime).getTime();

      this.log('info', `Pipeline execution ${this.executionId} completed successfully in ${totalDuration}ms`);

      return {
        id: this.executionId,
        success: true,
        results,
        finalOutput,
        totalDuration,
        startTime,
        endTime,
        errors
      };

    } catch (error) {
      const endTime = new Date().toISOString();
      const totalDuration = new Date(endTime).getTime() - new Date(startTime).getTime();

      let pipelineError: PipelineError;
      if (error instanceof PipelineStageError) {
        pipelineError = error;
      } else {
        pipelineError = {
          name: 'PipelineExecutionError',
          message: error instanceof Error ? error.message : 'Unknown pipeline error',
          stage: 'orchestrator',
          code: 'EXECUTION_FAILED',
          details: { error, executionId: this.executionId },
          recoverable: false
        };
      }

      errors.push(pipelineError);

      this.log('error', `Pipeline execution ${this.executionId} failed: ${pipelineError.message}`);

      return {
        id: this.executionId,
        success: false,
        results,
        finalOutput,
        totalDuration,
        startTime,
        endTime,
        errors
      };

    } finally {
      this.isExecuting = false;
    }
  }

  private async executeStage<TInput, TOutput>(
    stageName: string,
    stage: { process: (input: TInput) => Promise<TOutput>; validate?: (input: TInput) => Promise<boolean> },
    input: TInput
  ): Promise<PipelineResult<TOutput>> {
    const stageStartTime = Date.now();
    let attempt = 0;

    this.log('info', `Starting stage: ${stageName}`);

    while (attempt <= this.config.errorHandling.retryAttempts) {
      try {
        // Validate input if validation is available
        if (stage.validate && !(await stage.validate(input))) {
          throw new PipelineStageError(
            `Input validation failed for stage ${stageName}`,
            stageName,
            'INPUT_VALIDATION_FAILED',
            input,
            false
          );
        }

        // Execute the stage
        const output = await stage.process(input);
        const duration = Date.now() - stageStartTime;

        this.log('info', `Stage ${stageName} completed successfully in ${duration}ms`);

        return {
          success: true,
          data: output,
          stage: stageName,
          timestamp: new Date().toISOString(),
          duration
        };

      } catch (error) {
        attempt++;
        const isRecoverable = error instanceof PipelineStageError ? error.recoverable : true;
        
        this.log('error', `Stage ${stageName} failed (attempt ${attempt}): ${error instanceof Error ? error.message : 'Unknown error'}`);

        if (attempt > this.config.errorHandling.retryAttempts || !isRecoverable) {
          const duration = Date.now() - stageStartTime;
          
          let stageError: PipelineError;
          if (error instanceof PipelineStageError) {
            stageError = error;
          } else {
            stageError = {
              name: 'StageExecutionError',
              message: error instanceof Error ? error.message : 'Unknown stage error',
              stage: stageName,
              code: 'STAGE_EXECUTION_FAILED',
              details: { error, attempt, input },
              recoverable: isRecoverable
            };
          }

          if (!this.config.errorHandling.continueOnError) {
            throw stageError;
          }

          return {
            success: false,
            error: stageError,
            stage: stageName,
            timestamp: new Date().toISOString(),
            duration
          };
        }

        // Wait before retry
        if (attempt <= this.config.errorHandling.retryAttempts) {
          this.log('info', `Retrying stage ${stageName} in ${this.config.errorHandling.retryDelay}ms (attempt ${attempt + 1})`);
          await this.delay(this.config.errorHandling.retryDelay);
        }
      }
    }

    // This should never be reached, but included for completeness
    const duration = Date.now() - stageStartTime;
    const exhaustedError: PipelineError = {
      name: 'RetryExhaustedError',
      message: `Stage ${stageName} failed after ${this.config.errorHandling.retryAttempts} attempts`,
      stage: stageName,
      code: 'RETRY_EXHAUSTED',
      details: { attempts: this.config.errorHandling.retryAttempts, input },
      recoverable: false
    };

    return {
      success: false,
      error: exhaustedError,
      stage: stageName,
      timestamp: new Date().toISOString(),
      duration
    };
  }

  async cleanup(): Promise<void> {
    this.log('info', 'Cleaning up pipeline resources');

    try {
      // Cleanup all stages
      await Promise.all([
        this.ingestionStage.cleanup?.() || Promise.resolve(),
        this.segmentationStage.cleanup?.() || Promise.resolve(),
        this.classificationStage.cleanup?.() || Promise.resolve(),
        this.extractionStage.cleanup?.() || Promise.resolve(),
        this.verificationStage.cleanup?.() || Promise.resolve(),
        this.generationStage.cleanup?.() || Promise.resolve()
      ]);

      this.log('info', 'Pipeline cleanup completed');
    } catch (error) {
      this.log('error', `Pipeline cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  getExecutionStatus(): {
    isExecuting: boolean;
    executionId: string;
  } {
    return {
      isExecuting: this.isExecuting,
      executionId: this.executionId
    };
  }

  updateConfig(newConfig: Partial<PipelineConfig>): void {
    if (this.isExecuting) {
      throw new Error('Cannot update configuration while pipeline is executing');
    }

    this.config = { ...this.config, ...newConfig };
    this.initializeStages();
    this.log('info', 'Pipeline configuration updated');
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string): void {
    const logLevels = ['debug', 'info', 'warn', 'error'];
    const configLevel = this.config.errorHandling.logLevel;
    const configLevelIndex = logLevels.indexOf(configLevel);
    const messageLevelIndex = logLevels.indexOf(level);

    if (messageLevelIndex >= configLevelIndex) {
      const timestamp = new Date().toISOString();
      const logMessage = `[${timestamp}] [${level.toUpperCase()}] [${this.executionId || 'pipeline'}] ${message}`;
      
      switch (level) {
        case 'error':
          console.error(logMessage);
          break;
        case 'warn':
          console.warn(logMessage);
          break;
        case 'debug':
          console.debug(logMessage);
          break;
        default:
          console.log(logMessage);
      }
    }
  }
}

// Export default pipeline configuration
export const defaultPipelineConfig: PipelineConfig = {
  stages: {
    ingestion: {
      supportedFormats: ['txt', 'srt', 'vtt', 'json'],
      maxFileSize: 50 * 1024 * 1024, // 50MB
      preprocessingEnabled: true
    },
    segmentation: {
      strategy: 'topic_based',
      minSegmentLength: 100,
      maxSegmentLength: 1000,
      overlapPercent: 15
    },
    classification: {
      categories: ['technical', 'educational', 'tutorial', 'explanation', 'example', 'definition', 'process'],
      confidenceThreshold: 0.6,
      multiLabel: true
    },
    extraction: {
      conceptTypes: ['definition', 'process', 'example', 'principle', 'fact'],
      relationshipTypes: ['depends_on', 'part_of', 'related_to', 'example_of', 'causes'],
      minConfidence: 0.5,
      contextWindow: 200
    },
    verification: {
      qualityThreshold: 0.7,
      enableCrossValidation: true,
      verificationMethods: ['consistency', 'completeness', 'accuracy']
    },
    generation: {
      outputFormats: ['markdown'],
      includeMetadata: true,
      generateTOC: true
    }
  },
  errorHandling: {
    retryAttempts: 2,
    retryDelay: 1000,
    continueOnError: false,
    logLevel: 'info'
  }
};