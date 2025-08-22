/**
 * ReadabilityScorer - Implements Flesch-Kincaid and other readability metrics
 */

import type { QualityMetrics } from '../types';

export class ReadabilityScorer {
  /**
   * Calculate comprehensive readability metrics for text
   */
  public calculateMetrics(text: string): QualityMetrics {
    const sentences = this.countSentences(text);
    const words = this.countWords(text);
    const syllables = this.countSyllables(text);
    
    const averageWordsPerSentence = sentences > 0 ? words / sentences : 0;
    const averageSyllablesPerWord = words > 0 ? syllables / words : 0;
    
    const fleschScore = this.calculateFleschReadingEase(
      averageWordsPerSentence,
      averageSyllablesPerWord
    );
    
    const fleschKincaidLevel = this.calculateFleschKincaidGradeLevel(
      averageWordsPerSentence,
      averageSyllablesPerWord
    );

    return {
      readabilityScore: fleschScore,
      fleschKincaidLevel,
      averageWordsPerSentence,
      averageSyllablesPerWord,
      complexity: this.determineComplexity(fleschScore),
      spacingIssues: this.countSpacingIssues(text),
      brokenWords: this.countBrokenWords(text),
      sentenceCount: sentences,
      wordCount: words,
      syllableCount: syllables
    };
  }

  /**
   * Calculate Flesch Reading Ease score (0-100, higher = easier)
   */
  private calculateFleschReadingEase(
    averageWordsPerSentence: number,
    averageSyllablesPerWord: number
  ): number {
    const score = 206.835 - (1.015 * averageWordsPerSentence) - (84.6 * averageSyllablesPerWord);
    return Math.max(0, Math.min(100, Math.round(score * 10) / 10));
  }

  /**
   * Calculate Flesch-Kincaid Grade Level
   */
  private calculateFleschKincaidGradeLevel(
    averageWordsPerSentence: number,
    averageSyllablesPerWord: number
  ): number {
    const grade = (0.39 * averageWordsPerSentence) + (11.8 * averageSyllablesPerWord) - 15.59;
    return Math.max(0, Math.round(grade * 10) / 10);
  }

  /**
   * Count sentences in text
   */
  private countSentences(text: string): number {
    // Match sentence endings, avoiding abbreviations
    const sentences = text.match(/[.!?]+(?=\s+[A-Z]|$)/g);
    return sentences ? sentences.length : 1;
  }

  /**
   * Count words in text
   */
  private countWords(text: string): number {
    const words = text.match(/\b\w+\b/g);
    return words ? words.length : 0;
  }

  /**
   * Count syllables in text using various heuristics
   */
  private countSyllables(text: string): number {
    const words = text.match(/\b\w+\b/g);
    if (!words) return 0;

    return words.reduce((total, word) => {
      return total + this.countSyllablesInWord(word.toLowerCase());
    }, 0);
  }

  /**
   * Count syllables in a single word
   */
  private countSyllablesInWord(word: string): number {
    if (word.length <= 3) return 1;

    // Remove common suffixes that don't add syllables
    word = word.replace(/(?:ed|es|ly|ing)$/i, '');
    
    // Count vowel groups
    const vowelGroups = word.match(/[aeiouy]+/g);
    let syllableCount = vowelGroups ? vowelGroups.length : 0;
    
    // Adjust for silent 'e'
    if (word.endsWith('e')) {
      syllableCount--;
    }
    
    // Ensure minimum of 1 syllable
    return Math.max(1, syllableCount);
  }

  /**
   * Determine text complexity based on Flesch score
   */
  private determineComplexity(fleschScore: number): QualityMetrics['complexity'] {
    if (fleschScore >= 90) return 'simple';
    if (fleschScore >= 70) return 'moderate';
    if (fleschScore >= 50) return 'complex';
    return 'very-complex';
  }

  /**
   * Count spacing issues in text
   */
  private countSpacingIssues(text: string): number {
    const patterns = [
      /\s{2,}/g,              // Multiple spaces
      /\s+([,.!?;:])/g,       // Space before punctuation
      /([,.!?;:])([A-Za-z])/g, // Missing space after punctuation
      /[ \t]+$/gm,            // Trailing whitespace
    ];

    return patterns.reduce((count, pattern) => {
      const matches = text.match(pattern);
      return count + (matches ? matches.length : 0);
    }, 0);
  }

  /**
   * Count broken words in text
   */
  private countBrokenWords(text: string): number {
    const brokenWordPatterns = [
      /\bthe\s+re\b/gi,
      /\bto\s+day\b/gi,
      /\bto\s+night\b/gi,
      /\bsome\s+thing\b/gi,
      /\bany\s+thing\b/gi,
      /(\w+)-\s*\n\s*(\w+)/g,
    ];

    return brokenWordPatterns.reduce((count, pattern) => {
      const matches = text.match(pattern);
      return count + (matches ? matches.length : 0);
    }, 0);
  }

  /**
   * Calculate improvement potential score
   */
  public calculateImprovementPotential(metrics: QualityMetrics): number {
    let potential = 0;

    // Readability improvement potential (inverse of current score)
    potential += (100 - metrics.readabilityScore) * 0.4;

    // Spacing and broken word issues
    potential += (metrics.spacingIssues + metrics.brokenWords) * 5;

    // Sentence length issues
    if (metrics.averageWordsPerSentence > 20) {
      potential += (metrics.averageWordsPerSentence - 20) * 2;
    }

    // Syllable complexity
    if (metrics.averageSyllablesPerWord > 1.5) {
      potential += (metrics.averageSyllablesPerWord - 1.5) * 10;
    }

    return Math.min(100, Math.max(0, potential));
  }

  /**
   * Compare two sets of metrics and calculate improvement
   */
  public calculateImprovement(before: QualityMetrics, after: QualityMetrics): number {
    const readabilityImprovement = after.readabilityScore - before.readabilityScore;
    const spacingImprovement = before.spacingIssues - after.spacingIssues;
    const brokenWordImprovement = before.brokenWords - after.brokenWords;
    
    // Weighted improvement score
    return (
      readabilityImprovement * 0.5 +
      spacingImprovement * 2 +
      brokenWordImprovement * 3
    );
  }
}