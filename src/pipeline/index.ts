// Export all pipeline components for external use

// Core types and interfaces
export * from './types';

// Pipeline stages
export { IngestionStage } from './stages/ingestion';
export { SegmentationStage } from './stages/segmentation';
export { ClassificationStage } from './stages/classification';
export { ExtractionStage } from './stages/extraction';
export { VerificationStage } from './stages/verification';
export { GenerationStage } from './stages/generation';

// Main orchestrator
export { PipelineOrchestrator, defaultPipelineConfig } from './orchestrator';

// Utility functions for creating common configurations
export const createPipelineConfig = (overrides: any = {}): any => ({
  stages: {
    ingestion: {
      supportedFormats: ['txt', 'srt', 'vtt', 'json'],
      maxFileSize: 50 * 1024 * 1024, // 50MB
      preprocessingEnabled: true,
      ...overrides.ingestion
    },
    segmentation: {
      strategy: 'topic_based',
      minSegmentLength: 100,
      maxSegmentLength: 1000,
      overlapPercent: 15,
      ...overrides.segmentation
    },
    classification: {
      categories: ['technical', 'educational', 'tutorial', 'explanation', 'example', 'definition', 'process'],
      confidenceThreshold: 0.6,
      multiLabel: true,
      ...overrides.classification
    },
    extraction: {
      conceptTypes: ['definition', 'process', 'example', 'principle', 'fact'],
      relationshipTypes: ['depends_on', 'part_of', 'related_to', 'example_of', 'causes'],
      minConfidence: 0.5,
      contextWindow: 200,
      ...overrides.extraction
    },
    verification: {
      qualityThreshold: 0.7,
      enableCrossValidation: true,
      verificationMethods: ['consistency', 'completeness', 'accuracy'],
      ...overrides.verification
    },
    generation: {
      outputFormats: ['markdown'],
      includeMetadata: true,
      generateTOC: true,
      ...overrides.generation
    },
    ...overrides.stages
  },
  errorHandling: {
    retryAttempts: 2,
    retryDelay: 1000,
    continueOnError: false,
    logLevel: 'info',
    ...overrides.errorHandling
  }
});

// Pre-configured pipeline setups for common use cases
export const PipelineConfigurations = {
  // High-quality configuration with strict validation
  highQuality: createPipelineConfig({
    stages: {
      verification: {
        qualityThreshold: 0.8,
        enableCrossValidation: true,
        verificationMethods: ['consistency', 'completeness', 'accuracy']
      }
    },
    errorHandling: {
      retryAttempts: 3,
      continueOnError: false,
      logLevel: 'debug'
    }
  }),

  // Fast processing configuration with lower quality requirements
  fastProcessing: createPipelineConfig({
    stages: {
      segmentation: {
        strategy: 'time_based',
        minSegmentLength: 50,
        maxSegmentLength: 500
      },
      extraction: {
        minConfidence: 0.4,
        contextWindow: 100
      },
      verification: {
        qualityThreshold: 0.5,
        enableCrossValidation: false,
        verificationMethods: ['consistency']
      }
    },
    errorHandling: {
      retryAttempts: 1,
      continueOnError: true,
      logLevel: 'warn'
    }
  }),

  // Educational content focused configuration
  educational: createPipelineConfig({
    stages: {
      classification: {
        categories: ['educational', 'tutorial', 'explanation', 'example', 'definition'],
        confidenceThreshold: 0.5,
        multiLabel: true
      },
      extraction: {
        conceptTypes: ['definition', 'example', 'principle'],
        relationshipTypes: ['related_to', 'example_of', 'part_of'],
        minConfidence: 0.6
      }
    }
  }),

  // Technical documentation configuration
  technical: createPipelineConfig({
    stages: {
      classification: {
        categories: ['technical', 'process', 'definition', 'example'],
        confidenceThreshold: 0.7,
        multiLabel: true
      },
      extraction: {
        conceptTypes: ['definition', 'process', 'fact', 'principle'],
        relationshipTypes: ['depends_on', 'part_of', 'causes'],
        minConfidence: 0.7,
        contextWindow: 250
      },
      verification: {
        qualityThreshold: 0.8,
        enableCrossValidation: true,
        verificationMethods: ['consistency', 'completeness', 'accuracy']
      }
    }
  })
};