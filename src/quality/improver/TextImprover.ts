/**
 * TextImprover - Recursive improvement loop engine
 */

import { TextNormalizer } from '../normalizer/TextNormalizer';
import { ReadabilityScorer } from '../scorer/ReadabilityScorer';
import type { QualityReport, ImprovementConfig, ImprovementSuggestion, QualityMetrics } from '../types';

export class TextImprover {
  private readonly normalizer: TextNormalizer;
  private readonly scorer: ReadabilityScorer;

  constructor() {
    this.normalizer = new TextNormalizer();
    this.scorer = new ReadabilityScorer();
  }

  /**
   * Improve text quality through recursive enhancement
   */
  public async improveText(
    text: string,
    config: ImprovementConfig = {}
  ): Promise<QualityReport> {
    const startTime = performance.now();
    const defaultConfig = {
      maxIterations: 5,
      minImprovementThreshold: 1.0,
      targetReadabilityScore: 70,
      enableAggressiveNormalization: false,
      preserveOriginalMeaning: true,
      ...config
    };

    const originalMetrics = this.scorer.calculateMetrics(text);
    let currentText = text;
    let currentMetrics = originalMetrics;
    let iterations = 0;
    const allImprovements: ImprovementSuggestion[] = [];

    // Initial normalization
    const normalizationResult = defaultConfig.enableAggressiveNormalization
      ? this.normalizer.aggressiveNormalize(currentText)
      : this.normalizer.normalize(currentText);
    
    currentText = normalizationResult.text;
    
    // Convert normalization changes to improvement suggestions
    const normalizationSuggestions = normalizationResult.changes.map(change => ({
      type: change.type as ImprovementSuggestion['type'],
      description: `Fixed ${change.type} issue`,
      originalText: change.original,
      suggestedText: change.fixed,
      confidence: 0.9,
      impact: change.type === 'word-repair' ? 3 : 2
    }));
    
    allImprovements.push(...normalizationSuggestions);

    // Recursive improvement loop
    while (iterations < defaultConfig.maxIterations) {
      iterations++;
      
      const previousText = currentText;
      const improvementResult = await this.performImprovementIteration(
        currentText,
        currentMetrics,
        defaultConfig
      );

      currentText = improvementResult.text;
      const newMetrics = this.scorer.calculateMetrics(currentText);
      
      const improvement = this.scorer.calculateImprovement(currentMetrics, newMetrics);
      
      if (improvement < defaultConfig.minImprovementThreshold) {
        break; // No significant improvement, stop iterating
      }

      if (newMetrics.readabilityScore >= defaultConfig.targetReadabilityScore) {
        break; // Target readability achieved
      }

      allImprovements.push(...improvementResult.suggestions);
      currentMetrics = newMetrics;

      // Safety check to prevent infinite loops
      if (previousText === currentText) {
        break;
      }
    }

    const finalMetrics = this.scorer.calculateMetrics(currentText);
    const processingTime = performance.now() - startTime;

    return {
      originalText: text,
      improvedText: currentText,
      metrics: {
        before: originalMetrics,
        after: finalMetrics
      },
      improvements: allImprovements,
      iterations,
      processingTime
    };
  }

  /**
   * Perform a single iteration of text improvement
   */
  private async performImprovementIteration(
    text: string,
    metrics: QualityMetrics,
    config: ImprovementConfig
  ): Promise<{ text: string; suggestions: ImprovementSuggestion[] }> {
    const suggestions: ImprovementSuggestion[] = [];
    let improvedText = text;

    // Improve sentence length
    if (metrics.averageWordsPerSentence > 25) {
      const sentenceResult = this.improveSentenceLength(improvedText);
      improvedText = sentenceResult.text;
      suggestions.push(...sentenceResult.suggestions);
    }

    // Improve vocabulary complexity
    if (metrics.averageSyllablesPerWord > 1.8) {
      const vocabularyResult = this.simplifyVocabulary(improvedText);
      improvedText = vocabularyResult.text;
      suggestions.push(...vocabularyResult.suggestions);
    }

    // Fix any remaining spacing or formatting issues
    const additionalNormalization = this.normalizer.normalize(improvedText);
    if (additionalNormalization.changes.length > 0) {
      improvedText = additionalNormalization.text;
      const additionalSuggestions = additionalNormalization.changes.map(change => ({
        type: change.type as ImprovementSuggestion['type'],
        description: `Additional ${change.type} fix`,
        originalText: change.original,
        suggestedText: change.fixed,
        confidence: 0.8,
        impact: 1
      }));
      suggestions.push(...additionalSuggestions);
    }

    return { text: improvedText, suggestions };
  }

  /**
   * Improve sentence length by breaking up long sentences
   */
  private improveSentenceLength(text: string): { text: string; suggestions: ImprovementSuggestion[] } {
    const suggestions: ImprovementSuggestion[] = [];
    let improvedText = text;

    // Split long sentences at conjunctions
    const longSentencePattern = /([^.!?]{60,}?)(\s+(?:and|but|or|however|therefore|moreover|furthermore|nevertheless|consequently)\s+)([^.!?]+[.!?])/g;
    
    improvedText = improvedText.replace(longSentencePattern, (match, part1, conjunction, part2) => {
      const original = match;
      const improved = `${part1.trim()}.${conjunction.trim().charAt(0).toUpperCase() + conjunction.trim().slice(1)}${part2}`;
      
      suggestions.push({
        type: 'sentence-length',
        description: 'Split long sentence for better readability',
        originalText: original,
        suggestedText: improved,
        confidence: 0.7,
        impact: 2
      });
      
      return improved;
    });

    return { text: improvedText, suggestions };
  }

  /**
   * Simplify vocabulary by replacing complex words with simpler alternatives
   */
  private simplifyVocabulary(text: string): { text: string; suggestions: ImprovementSuggestion[] } {
    const suggestions: ImprovementSuggestion[] = [];
    let improvedText = text;

    // Common word replacements for simpler vocabulary
    const vocabularyReplacements = [
      { complex: /\butilize\b/gi, simple: 'use', confidence: 0.8 },
      { complex: /\bfacilitate\b/gi, simple: 'help', confidence: 0.7 },
      { complex: /\bdemonstrate\b/gi, simple: 'show', confidence: 0.8 },
      { complex: /\baccommodate\b/gi, simple: 'fit', confidence: 0.6 },
      { complex: /\binitiate\b/gi, simple: 'start', confidence: 0.8 },
      { complex: /\bterminate\b/gi, simple: 'end', confidence: 0.8 },
      { complex: /\bpurchase\b/gi, simple: 'buy', confidence: 0.9 },
      { complex: /\bassist\b/gi, simple: 'help', confidence: 0.8 },
      { complex: /\bobtain\b/gi, simple: 'get', confidence: 0.8 },
      { complex: /\benhance\b/gi, simple: 'improve', confidence: 0.7 },
    ];

    for (const { complex, simple, confidence } of vocabularyReplacements) {
      const matches = [...improvedText.matchAll(complex)];
      if (matches.length > 0) {
        matches.forEach(match => {
          suggestions.push({
            type: 'vocabulary',
            description: `Simplified complex word "${match[0]}" to "${simple}"`,
            originalText: match[0],
            suggestedText: simple,
            confidence,
            impact: 1
          });
        });
        improvedText = improvedText.replace(complex, simple);
      }
    }

    return { text: improvedText, suggestions };
  }

  /**
   * Calculate overall improvement score
   */
  public calculateImprovementScore(report: QualityReport): number {
    const { before, after } = report.metrics;
    
    const readabilityImprovement = after.readabilityScore - before.readabilityScore;
    const spacingImprovement = before.spacingIssues - after.spacingIssues;
    const brokenWordImprovement = before.brokenWords - after.brokenWords;
    const sentenceImprovement = Math.max(0, before.averageWordsPerSentence - after.averageWordsPerSentence);
    
    // Weighted score (0-100)
    const score = (
      readabilityImprovement * 0.4 +
      spacingImprovement * 5 +
      brokenWordImprovement * 8 +
      sentenceImprovement * 2
    );
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Generate human-readable improvement summary
   */
  public generateImprovementSummary(report: QualityReport): string {
    const { before, after } = report.metrics;
    const score = this.calculateImprovementScore(report);
    
    const improvements = [];
    
    if (after.readabilityScore > before.readabilityScore) {
      improvements.push(`Readability improved from ${before.readabilityScore} to ${after.readabilityScore}`);
    }
    
    if (before.spacingIssues > after.spacingIssues) {
      improvements.push(`Fixed ${before.spacingIssues - after.spacingIssues} spacing issues`);
    }
    
    if (before.brokenWords > after.brokenWords) {
      improvements.push(`Repaired ${before.brokenWords - after.brokenWords} broken words`);
    }
    
    if (before.averageWordsPerSentence > after.averageWordsPerSentence) {
      const reduction = Math.round((before.averageWordsPerSentence - after.averageWordsPerSentence) * 10) / 10;
      improvements.push(`Reduced average sentence length by ${reduction} words`);
    }
    
    return `Improvement Score: ${Math.round(score)}/100\n${improvements.join('\n')}`;
  }
}