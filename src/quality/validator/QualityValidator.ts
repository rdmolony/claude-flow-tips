/**
 * QualityValidator - Validation system for quality improvements
 */

import { ReadabilityScorer } from '../scorer/ReadabilityScorer';
import type { ValidationResult, QualityMetrics, QualityReport, ReadabilityConfig } from '../types';

export class QualityValidator {
  private readonly scorer: ReadabilityScorer;

  constructor() {
    this.scorer = new ReadabilityScorer();
  }

  /**
   * Validate text quality against specified criteria
   */
  public validateQuality(
    text: string,
    config: ReadabilityConfig = {}
  ): ValidationResult {
    const metrics = this.scorer.calculateMetrics(text);
    const issues: string[] = [];
    const warnings: string[] = [];

    const criteria = {
      targetLevel: config.targetLevel ?? 12,
      maxSentenceLength: config.maxSentenceLength ?? 25,
      allowedComplexity: config.allowedComplexity ?? 'complex',
      preferSimpleWords: config.preferSimpleWords ?? true,
      ...config
    };

    // Check readability level
    if (metrics.fleschKincaidLevel > criteria.targetLevel) {
      issues.push(
        `Reading level (${metrics.fleschKincaidLevel}) exceeds target (${criteria.targetLevel})`
      );
    }

    // Check sentence length
    if (metrics.averageWordsPerSentence > criteria.maxSentenceLength) {
      issues.push(
        `Average sentence length (${Math.round(metrics.averageWordsPerSentence)} words) exceeds maximum (${criteria.maxSentenceLength})`
      );
    }

    // Check complexity
    const complexityOrder = ['simple', 'moderate', 'complex', 'very-complex'];
    const currentComplexityIndex = complexityOrder.indexOf(metrics.complexity);
    const allowedComplexityIndex = complexityOrder.indexOf(criteria.allowedComplexity);
    
    if (currentComplexityIndex > allowedComplexityIndex) {
      issues.push(
        `Text complexity (${metrics.complexity}) exceeds allowed level (${criteria.allowedComplexity})`
      );
    }

    // Check for formatting issues
    if (metrics.spacingIssues > 0) {
      issues.push(`Found ${metrics.spacingIssues} spacing issues`);
    }

    if (metrics.brokenWords > 0) {
      issues.push(`Found ${metrics.brokenWords} broken words`);
    }

    // Warnings for potential improvements
    if (metrics.readabilityScore < 50) {
      warnings.push('Text may be difficult to read (Flesch score < 50)');
    }

    if (metrics.averageSyllablesPerWord > 2.0) {
      warnings.push('Text uses complex vocabulary (high syllable count per word)');
    }

    if (metrics.sentenceCount === 0) {
      issues.push('No valid sentences found in text');
    }

    // Calculate overall quality score (0-100)
    const score = this.calculateQualityScore(metrics, criteria);

    return {
      isValid: issues.length === 0,
      score,
      issues,
      warnings,
      passed: issues.length === 0 && score >= 70
    };
  }

  /**
   * Validate improvement results
   */
  public validateImprovement(report: QualityReport): ValidationResult {
    const { before, after } = report.metrics;
    const issues: string[] = [];
    const warnings: string[] = [];

    // Check that improvements actually occurred
    if (after.readabilityScore <= before.readabilityScore) {
      if (before.spacingIssues === 0 && before.brokenWords === 0) {
        warnings.push('No readability improvement detected');
      }
    }

    // Check that text wasn't oversimplified
    if (after.readabilityScore > 90 && before.readabilityScore < 70) {
      warnings.push('Text may have been oversimplified');
    }

    // Check for regression in quality
    if (after.spacingIssues > before.spacingIssues) {
      issues.push('Spacing issues increased during improvement');
    }

    if (after.brokenWords > before.brokenWords) {
      issues.push('Broken words increased during improvement');
    }

    // Check processing efficiency
    if (report.processingTime > 5000) { // 5 seconds
      warnings.push('Processing time was longer than expected');
    }

    if (report.iterations >= 5) {
      warnings.push('Maximum iterations reached - may need manual review');
    }

    // Validate that significant changes were made for poor quality text
    const significantImprovementNeeded = before.readabilityScore < 50 || 
                                       before.spacingIssues > 5 || 
                                       before.brokenWords > 0;
    
    if (significantImprovementNeeded && report.improvements.length === 0) {
      issues.push('Expected improvements were not made for low-quality text');
    }

    // Calculate improvement score
    const improvementScore = this.calculateImprovementValidationScore(report);

    return {
      isValid: issues.length === 0,
      score: improvementScore,
      issues,
      warnings,
      passed: issues.length === 0 && improvementScore >= 60
    };
  }

  /**
   * Batch validate multiple texts
   */
  public async validateBatch(
    texts: string[],
    config: ReadabilityConfig = {}
  ): Promise<ValidationResult[]> {
    return Promise.all(
      texts.map(text => this.validateQuality(text, config))
    );
  }

  /**
   * Calculate overall quality score based on metrics and criteria
   */
  private calculateQualityScore(
    metrics: QualityMetrics,
    criteria: Required<ReadabilityConfig>
  ): number {
    let score = 100;

    // Penalty for poor readability
    if (metrics.readabilityScore < 50) {
      score -= (50 - metrics.readabilityScore) * 0.5;
    }

    // Penalty for exceeding grade level
    if (metrics.fleschKincaidLevel > criteria.targetLevel) {
      score -= (metrics.fleschKincaidLevel - criteria.targetLevel) * 3;
    }

    // Penalty for long sentences
    if (metrics.averageWordsPerSentence > criteria.maxSentenceLength) {
      score -= (metrics.averageWordsPerSentence - criteria.maxSentenceLength) * 2;
    }

    // Penalty for formatting issues
    score -= metrics.spacingIssues * 5;
    score -= metrics.brokenWords * 10;

    // Penalty for complexity
    const complexityPenalty = {
      'simple': 0,
      'moderate': 5,
      'complex': 15,
      'very-complex': 30
    }[metrics.complexity];

    const allowedPenalty = {
      'simple': 0,
      'moderate': 5,
      'complex': 15,
      'very-complex': 30
    }[criteria.allowedComplexity];

    if (complexityPenalty > allowedPenalty) {
      score -= (complexityPenalty - allowedPenalty);
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Calculate validation score for improvement results
   */
  private calculateImprovementValidationScore(report: QualityReport): number {
    const { before, after } = report.metrics;
    let score = 50; // Base score

    // Bonus for readability improvement
    const readabilityImprovement = after.readabilityScore - before.readabilityScore;
    score += readabilityImprovement * 0.5;

    // Bonus for fixing issues
    score += (before.spacingIssues - after.spacingIssues) * 5;
    score += (before.brokenWords - after.brokenWords) * 10;

    // Bonus for sentence length improvement
    if (before.averageWordsPerSentence > 25) {
      const sentenceImprovement = before.averageWordsPerSentence - after.averageWordsPerSentence;
      score += sentenceImprovement * 2;
    }

    // Penalty for processing inefficiency
    if (report.processingTime > 3000) {
      score -= 5;
    }

    if (report.iterations >= 5) {
      score -= 5;
    }

    // Bonus for meaningful improvements
    if (report.improvements.length > 0) {
      const highImpactChanges = report.improvements.filter(imp => imp.impact >= 2).length;
      score += highImpactChanges * 2;
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Generate validation report summary
   */
  public generateValidationSummary(result: ValidationResult): string {
    const status = result.passed ? 'PASSED' : result.isValid ? 'VALID' : 'FAILED';
    const lines = [
      `Quality Validation: ${status}`,
      `Score: ${result.score}/100`,
      ''
    ];

    if (result.issues.length > 0) {
      lines.push('Issues:');
      result.issues.forEach(issue => lines.push(`  × ${issue}`));
      lines.push('');
    }

    if (result.warnings.length > 0) {
      lines.push('Warnings:');
      result.warnings.forEach(warning => lines.push(`  ⚠ ${warning}`));
    }

    return lines.join('\n');
  }
}