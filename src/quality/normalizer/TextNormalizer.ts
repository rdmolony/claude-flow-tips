/**
 * TextNormalizer - Fixes spacing issues, broken words, and formatting problems
 */

import type { NormalizationResult } from '../types';

export class TextNormalizer {
  private readonly spacingPatterns = [
    // Multiple spaces to single space
    { pattern: /\s{2,}/g, replacement: ' ', type: 'spacing' as const },
    // Fix space before punctuation
    { pattern: /\s+([,.!?;:])/g, replacement: '$1', type: 'punctuation' as const },
    // Fix missing space after punctuation
    { pattern: /([,.!?;:])([A-Za-z])/g, replacement: '$1 $2', type: 'punctuation' as const },
    // Fix space around quotes
    { pattern: /"\s+([^"]*?)\s+"/g, replacement: '"$1"', type: 'punctuation' as const },
    // Remove trailing whitespace
    { pattern: /[ \t]+$/gm, replacement: '', type: 'spacing' as const },
    // Fix paragraph spacing
    { pattern: /\n{3,}/g, replacement: '\n\n', type: 'spacing' as const },
  ];

  private readonly wordRepairPatterns = [
    // Common broken words
    { pattern: /\bthe\s+re\b/gi, replacement: 'there', type: 'word-repair' as const },
    { pattern: /\bto\s+day\b/gi, replacement: 'today', type: 'word-repair' as const },
    { pattern: /\bto\s+night\b/gi, replacement: 'tonight', type: 'word-repair' as const },
    { pattern: /\bto\s+morrow\b/gi, replacement: 'tomorrow', type: 'word-repair' as const },
    { pattern: /\bcan\s+not\b/gi, replacement: 'cannot', type: 'word-repair' as const },
    { pattern: /\bsome\s+thing\b/gi, replacement: 'something', type: 'word-repair' as const },
    { pattern: /\bsome\s+one\b/gi, replacement: 'someone', type: 'word-repair' as const },
    { pattern: /\bany\s+thing\b/gi, replacement: 'anything', type: 'word-repair' as const },
    { pattern: /\bany\s+one\b/gi, replacement: 'anyone', type: 'word-repair' as const },
    { pattern: /\bevery\s+thing\b/gi, replacement: 'everything', type: 'word-repair' as const },
    { pattern: /\bevery\s+one\b/gi, replacement: 'everyone', type: 'word-repair' as const },
    // Fix words split by line breaks
    { pattern: /(\w+)-\s*\n\s*(\w+)/g, replacement: '$1$2', type: 'word-repair' as const },
    // Fix OCR common mistakes
    { pattern: /\bl\s+i\s+k\s+e\b/gi, replacement: 'like', type: 'word-repair' as const },
    { pattern: /\bw\s+h\s+a\s+t\b/gi, replacement: 'what', type: 'word-repair' as const },
  ];

  private readonly casePatterns = [
    // Fix sentence capitalization after periods
    { pattern: /\.\s+([a-z])/g, replacement: (match: string, letter: string) => `. ${letter.toUpperCase()}`, type: 'case' as const },
    // Fix capitalization at beginning of text
    { pattern: /^([a-z])/, replacement: (match: string, letter: string) => letter.toUpperCase(), type: 'case' as const },
  ];

  /**
   * Normalize text by fixing spacing, broken words, and formatting issues
   */
  public normalize(text: string): NormalizationResult {
    let normalizedText = text;
    const changes: NormalizationResult['changes'] = [];

    // Apply spacing fixes
    for (const { pattern, replacement, type } of this.spacingPatterns) {
      const matches = [...normalizedText.matchAll(pattern)];
      if (matches.length > 0) {
        matches.forEach(match => {
          if (match.index !== undefined) {
            changes.push({
              type,
              original: match[0],
              fixed: typeof replacement === 'string' ? replacement : replacement(match[0]),
              position: match.index
            });
          }
        });
        normalizedText = normalizedText.replace(pattern, replacement as string);
      }
    }

    // Apply word repair fixes
    for (const { pattern, replacement, type } of this.wordRepairPatterns) {
      const matches = [...normalizedText.matchAll(pattern)];
      if (matches.length > 0) {
        matches.forEach(match => {
          if (match.index !== undefined) {
            changes.push({
              type,
              original: match[0],
              fixed: typeof replacement === 'string' ? replacement : replacement(match[0]),
              position: match.index
            });
          }
        });
        normalizedText = normalizedText.replace(pattern, replacement as string);
      }
    }

    // Apply case fixes
    for (const { pattern, replacement, type } of this.casePatterns) {
      const matches = [...normalizedText.matchAll(pattern)];
      if (matches.length > 0) {
        matches.forEach(match => {
          if (match.index !== undefined) {
            changes.push({
              type,
              original: match[0],
              fixed: typeof replacement === 'function' ? replacement(match[0], match[1]) : replacement,
              position: match.index
            });
          }
        });
        normalizedText = normalizedText.replace(pattern, replacement as any);
      }
    }

    return {
      text: normalizedText.trim(),
      changes
    };
  }

  /**
   * Count spacing issues in text
   */
  public countSpacingIssues(text: string): number {
    let count = 0;
    
    for (const { pattern } of this.spacingPatterns) {
      const matches = text.match(pattern);
      if (matches) count += matches.length;
    }
    
    return count;
  }

  /**
   * Count broken words in text
   */
  public countBrokenWords(text: string): number {
    let count = 0;
    
    for (const { pattern } of this.wordRepairPatterns) {
      const matches = text.match(pattern);
      if (matches) count += matches.length;
    }
    
    return count;
  }

  /**
   * Aggressive normalization for severely corrupted text
   */
  public aggressiveNormalize(text: string): NormalizationResult {
    let normalizedText = text;
    const changes: NormalizationResult['changes'] = [];

    // First apply standard normalization
    const standardResult = this.normalize(text);
    normalizedText = standardResult.text;
    changes.push(...standardResult.changes);

    // Additional aggressive patterns
    const aggressivePatterns = [
      // Fix excessive punctuation
      { pattern: /[.]{3,}/g, replacement: '...', type: 'punctuation' as const },
      { pattern: /[!]{2,}/g, replacement: '!', type: 'punctuation' as const },
      { pattern: /[?]{2,}/g, replacement: '?', type: 'punctuation' as const },
      // Fix character encoding issues
      { pattern: /â€™/g, replacement: "'", type: 'spacing' as const },
      { pattern: /â€œ/g, replacement: '"', type: 'spacing' as const },
      { pattern: /â€\u009d/g, replacement: '"', type: 'spacing' as const },
      { pattern: /â€"/g, replacement: '-', type: 'spacing' as const },
      // Remove extra line breaks in middle of sentences
      { pattern: /(\w+)\n(\w+)/g, replacement: '$1 $2', type: 'spacing' as const },
    ];

    for (const { pattern, replacement, type } of aggressivePatterns) {
      const matches = [...normalizedText.matchAll(pattern)];
      if (matches.length > 0) {
        matches.forEach(match => {
          if (match.index !== undefined) {
            changes.push({
              type,
              original: match[0],
              fixed: replacement as string,
              position: match.index
            });
          }
        });
        normalizedText = normalizedText.replace(pattern, replacement);
      }
    }

    return {
      text: normalizedText.trim(),
      changes
    };
  }
}