/**
 * Text Quality Improvement System
 * 
 * A comprehensive system for improving text quality through normalization,
 * readability scoring, recursive improvement, and validation.
 */

export { TextNormalizer } from './normalizer/TextNormalizer';
export { ReadabilityScorer } from './scorer/ReadabilityScorer';
export { TextImprover } from './improver/TextImprover';
export { QualityValidator } from './validator/QualityValidator';

export type {
  QualityMetrics,
  ImprovementSuggestion,
  QualityReport,
  NormalizationResult,
  ReadabilityConfig,
  ImprovementConfig,
  ValidationResult
} from './types';

/**
 * Main entry point for the quality improvement system
 */
export class QualitySystem {
  private readonly improver: TextImprover;
  private readonly validator: QualityValidator;

  constructor() {
    this.improver = new TextImprover();
    this.validator = new QualityValidator();
  }

  /**
   * Complete quality improvement workflow
   */
  public async processText(
    text: string,
    improvementConfig: ImprovementConfig = {},
    validationConfig: ReadabilityConfig = {}
  ) {
    // Improve the text
    const report = await this.improver.improveText(text, improvementConfig);
    
    // Validate the results
    const validation = this.validator.validateImprovement(report);
    
    // Final quality check
    const finalQuality = this.validator.validateQuality(report.improvedText, validationConfig);

    return {
      report,
      validation,
      finalQuality,
      summary: {
        improvement: this.improver.generateImprovementSummary(report),
        validation: this.validator.generateValidationSummary(validation),
        finalScore: finalQuality.score
      }
    };
  }
}

// Import the components for use
import { TextImprover } from './improver/TextImprover';
import { QualityValidator } from './validator/QualityValidator';
import type { ImprovementConfig, ReadabilityConfig } from './types';