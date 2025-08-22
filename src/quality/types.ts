/**
 * Core types for the text quality improvement system
 */

export interface QualityMetrics {
  readabilityScore: number;
  fleschKincaidLevel: number;
  averageWordsPerSentence: number;
  averageSyllablesPerWord: number;
  complexity: 'simple' | 'moderate' | 'complex' | 'very-complex';
  spacingIssues: number;
  brokenWords: number;
  sentenceCount: number;
  wordCount: number;
  syllableCount: number;
}

export interface ImprovementSuggestion {
  type: 'spacing' | 'word-break' | 'sentence-length' | 'vocabulary' | 'clarity';
  description: string;
  originalText: string;
  suggestedText: string;
  confidence: number;
  impact: number;
}

export interface QualityReport {
  originalText: string;
  improvedText: string;
  metrics: {
    before: QualityMetrics;
    after: QualityMetrics;
  };
  improvements: ImprovementSuggestion[];
  iterations: number;
  processingTime: number;
}

export interface NormalizationResult {
  text: string;
  changes: Array<{
    type: 'spacing' | 'word-repair' | 'punctuation' | 'case';
    original: string;
    fixed: string;
    position: number;
  }>;
}

export interface ReadabilityConfig {
  targetLevel?: number; // Grade level (1-20)
  maxSentenceLength?: number;
  preferSimpleWords?: boolean;
  allowedComplexity?: QualityMetrics['complexity'];
}

export interface ImprovementConfig {
  maxIterations?: number;
  minImprovementThreshold?: number;
  targetReadabilityScore?: number;
  enableAggressiveNormalization?: boolean;
  preserveOriginalMeaning?: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  score: number;
  issues: string[];
  warnings: string[];
  passed: boolean;
}