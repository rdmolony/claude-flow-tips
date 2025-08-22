/**
 * Quality Improvement System - Main Entry Point
 * Provides text normalization, readability scoring, and recursive improvement
 */

const AdvancedTextNormalizer = require('./advanced-normalizer');

class TextNormalizer extends AdvancedTextNormalizer {
  normalize(text, options = {}) {
    if (!text) return '';
    
    let normalized = text;
    
    // Fix multiple spaces
    normalized = normalized.replace(/\s+/g, ' ');
    
    // Fix broken words (common patterns)
    const brokenWordPatterns = [
      [/\bt h e\b/gi, 'the'],
      [/\ba n d\b/gi, 'and'],
      [/\bf o r\b/gi, 'for'],
      [/\bw i t h\b/gi, 'with'],
      [/\bt o\b/gi, 'to'],
      [/\bi n\b/gi, 'in'],
      [/\bo f\b/gi, 'of'],
      [/\bi s\b/gi, 'is'],
      [/\ba r e\b/gi, 'are'],
      [/\bw a s\b/gi, 'was'],
      [/\bb e\b/gi, 'be'],
      [/\bh a v e\b/gi, 'have'],
      [/\bh a s\b/gi, 'has'],
      [/\bd o\b/gi, 'do'],
      [/\bs a i d\b/gi, 'said'],
      [/\bc a n\b/gi, 'can'],
      [/\bw i l l\b/gi, 'will'],
      [/\bo n e\b/gi, 'one'],
      [/\bt w o\b/gi, 'two'],
      [/\bt h r e e\b/gi, 'three'],
      [/\bs o m e\b/gi, 'some'],
      [/\bt i m e\b/gi, 'time'],
      [/\bv e r y\b/gi, 'very'],
      [/\bw h e n\b/gi, 'when'],
      [/\bm a k e\b/gi, 'make'],
      [/\bt h e m\b/gi, 'them'],
      [/\bm a n y\b/gi, 'many'],
      [/\bo v e r\b/gi, 'over'],
      [/\bs u c h\b/gi, 'such'],
      [/\bt h a t\b/gi, 'that'],
      [/\bt h i s\b/gi, 'this'],
      [/\bw h a t\b/gi, 'what'],
      [/\ba l l\b/gi, 'all'],
      [/\bw o u l d\b/gi, 'would'],
      [/\bt h e r e\b/gi, 'there'],
      [/\bt h e i r\b/gi, 'their']
    ];
    
    for (const [pattern, replacement] of brokenWordPatterns) {
      normalized = normalized.replace(pattern, replacement);
    }
    
    // Fix punctuation spacing
    normalized = normalized.replace(/\s+([.,!?;:])/g, '$1');
    normalized = normalized.replace(/([.,!?;:])\s*([a-zA-Z])/g, '$1 $2');
    
    // Fix sentence capitalization
    normalized = normalized.replace(/(^|\. |\? |! )([a-z])/g, (match, p1, p2) => p1 + p2.toUpperCase());
    
    // Aggressive normalization if enabled
    if (options.enableAggressiveNormalization) {
      // Fix common OCR/transcription errors
      normalized = normalized.replace(/\bl\s+'/gi, "I'");
      normalized = normalized.replace(/\bi\s+t\s+'/gi, "it'");
      normalized = normalized.replace(/\bd o n\s+'\s+t\b/gi, "don't");
      normalized = normalized.replace(/\bc a n\s+'\s+t\b/gi, "can't");
      normalized = normalized.replace(/\bw o n\s+'\s+t\b/gi, "won't");
      normalized = normalized.replace(/\bs h o u l d n\s+'\s+t\b/gi, "shouldn't");
      normalized = normalized.replace(/\bc o u l d n\s+'\s+t\b/gi, "couldn't");
      normalized = normalized.replace(/\bw o u l d n\s+'\s+t\b/gi, "wouldn't");
      
      // Fix common compound words
      normalized = normalized.replace(/\bn e u r a l\s+n e t w o r k/gi, 'neural network');
      normalized = normalized.replace(/\bs w a r m/gi, 'swarm');
      normalized = normalized.replace(/\ba g e n t/gi, 'agent');
      normalized = normalized.replace(/\bc l o u d\s+f l o w/gi, 'Claude Flow');
      normalized = normalized.replace(/\bm c p/gi, 'MCP');
    }
    
    // Trim and clean up
    normalized = normalized.trim();
    normalized = normalized.replace(/\s+\n/g, '\n');
    normalized = normalized.replace(/\n+/g, '\n');
    
    return normalized;
  }
}

class ReadabilityScorer {
  calculateMetrics(text) {
    if (!text) {
      return {
        readabilityScore: 0,
        gradeLevel: 0,
        complexity: 'unknown',
        wordCount: 0,
        sentenceCount: 0,
        syllableCount: 0
      };
    }
    
    // Count words, sentences, and syllables
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const syllables = this.countSyllables(text);
    
    const wordCount = words.length;
    const sentenceCount = Math.max(sentences.length, 1);
    const syllableCount = syllables;
    
    // Calculate Flesch Reading Ease
    const avgSyllablesPerWord = syllableCount / Math.max(wordCount, 1);
    const avgWordsPerSentence = wordCount / sentenceCount;
    
    const readabilityScore = Math.max(0, Math.min(100,
      206.835 - 1.015 * avgWordsPerSentence - 84.6 * avgSyllablesPerWord
    ));
    
    // Calculate Flesch-Kincaid Grade Level
    const gradeLevel = Math.max(0,
      0.39 * avgWordsPerSentence + 11.8 * avgSyllablesPerWord - 15.59
    );
    
    // Determine complexity
    let complexity = 'simple';
    if (readabilityScore < 30) complexity = 'very-complex';
    else if (readabilityScore < 50) complexity = 'complex';
    else if (readabilityScore < 70) complexity = 'moderate';
    
    return {
      readabilityScore,
      gradeLevel,
      complexity,
      wordCount,
      sentenceCount,
      syllableCount,
      avgWordsPerSentence,
      avgSyllablesPerWord
    };
  }
  
  countSyllables(text) {
    const words = text.toLowerCase().split(/\s+/);
    let totalSyllables = 0;
    
    for (const word of words) {
      const cleaned = word.replace(/[^a-z]/g, '');
      if (cleaned.length === 0) continue;
      
      // Simple syllable counting algorithm
      let syllables = 0;
      let previousWasVowel = false;
      
      for (let i = 0; i < cleaned.length; i++) {
        const isVowel = /[aeiou]/.test(cleaned[i]);
        if (isVowel && !previousWasVowel) {
          syllables++;
        }
        previousWasVowel = isVowel;
      }
      
      // Adjust for silent e
      if (cleaned.endsWith('e') && syllables > 1) {
        syllables--;
      }
      
      // Ensure at least one syllable per word
      if (syllables === 0) syllables = 1;
      
      totalSyllables += syllables;
    }
    
    return totalSyllables;
  }
}

class TextImprover {
  constructor(normalizer, scorer) {
    this.normalizer = normalizer;
    this.scorer = scorer;
  }
  
  async improve(text, options = {}) {
    const maxIterations = options.maxIterations || 5;
    const targetScore = options.targetReadabilityScore || 70;
    
    let currentText = text;
    let bestText = text;
    let bestScore = 0;
    let iterations = 0;
    
    while (iterations < maxIterations) {
      // Normalize text
      currentText = this.normalizer.normalize(currentText, options);
      
      // Calculate metrics
      const metrics = this.scorer.calculateMetrics(currentText);
      
      // Check if we've improved
      if (metrics.readabilityScore > bestScore) {
        bestScore = metrics.readabilityScore;
        bestText = currentText;
      }
      
      // Check if we've reached target
      if (metrics.readabilityScore >= targetScore) {
        break;
      }
      
      // Apply improvements
      currentText = this.applyImprovements(currentText, metrics);
      
      iterations++;
    }
    
    return {
      improvedText: bestText,
      metrics: this.scorer.calculateMetrics(bestText),
      iterations,
      improvement: ((bestScore - this.scorer.calculateMetrics(text).readabilityScore) / 
                    Math.max(this.scorer.calculateMetrics(text).readabilityScore, 1)) * 100
    };
  }
  
  applyImprovements(text, metrics) {
    let improved = text;
    
    // Break up long sentences
    if (metrics.avgWordsPerSentence > 20) {
      improved = this.breakLongSentences(improved);
    }
    
    // Simplify complex words
    improved = this.simplifyVocabulary(improved);
    
    return improved;
  }
  
  breakLongSentences(text) {
    const sentences = text.split(/([.!?]+)/);
    const result = [];
    
    for (let i = 0; i < sentences.length; i += 2) {
      const sentence = sentences[i];
      const punctuation = sentences[i + 1] || '';
      
      if (sentence.split(/\s+/).length > 25) {
        // Find conjunctions to break at
        const breakPoints = [', and ', ', but ', ', or ', ', so ', ', because ', ', which ', ', that '];
        let broken = false;
        
        for (const breakPoint of breakPoints) {
          if (sentence.includes(breakPoint)) {
            const parts = sentence.split(breakPoint);
            if (parts.length === 2) {
              result.push(parts[0] + '.');
              result.push(' ');
              result.push(parts[1].charAt(0).toUpperCase() + parts[1].slice(1) + punctuation);
              result.push(' ');
              broken = true;
              break;
            }
          }
        }
        
        if (!broken) {
          result.push(sentence + punctuation);
          result.push(' ');
        }
      } else {
        result.push(sentence + punctuation);
        result.push(' ');
      }
    }
    
    return result.join('').trim();
  }
  
  simplifyVocabulary(text) {
    const replacements = {
      'utilize': 'use',
      'implement': 'use',
      'demonstrate': 'show',
      'approximately': 'about',
      'subsequent': 'next',
      'facilitate': 'help',
      'terminate': 'end',
      'initiate': 'start',
      'endeavor': 'try',
      'comprehensive': 'complete',
      'fundamental': 'basic',
      'establish': 'set up',
      'accomplish': 'do',
      'necessity': 'need',
      'acquire': 'get',
      'assistance': 'help',
      'contribute': 'help',
      'determine': 'find',
      'indicate': 'show',
      'regarding': 'about'
    };
    
    let simplified = text;
    for (const [complex, simple] of Object.entries(replacements)) {
      const regex = new RegExp(`\\b${complex}\\b`, 'gi');
      simplified = simplified.replace(regex, simple);
    }
    
    return simplified;
  }
}

class QualityValidator {
  validate(text, improvedText, options = {}) {
    const originalMetrics = new ReadabilityScorer().calculateMetrics(text);
    const improvedMetrics = new ReadabilityScorer().calculateMetrics(improvedText);
    
    const improvement = improvedMetrics.readabilityScore - originalMetrics.readabilityScore;
    const targetScore = options.targetReadabilityScore || 60;
    
    return {
      isValid: improvedMetrics.readabilityScore >= targetScore,
      improvement,
      originalScore: originalMetrics.readabilityScore,
      improvedScore: improvedMetrics.readabilityScore,
      meetsTarget: improvedMetrics.readabilityScore >= targetScore,
      issues: this.identifyIssues(improvedText, improvedMetrics)
    };
  }
  
  identifyIssues(text, metrics) {
    const issues = [];
    
    if (metrics.avgWordsPerSentence > 25) {
      issues.push('Sentences are too long');
    }
    
    if (metrics.readabilityScore < 30) {
      issues.push('Text is very difficult to read');
    }
    
    if (text.match(/\s{2,}/)) {
      issues.push('Contains irregular spacing');
    }
    
    if (text.match(/\b[a-z]\s[a-z]\s[a-z]\b/)) {
      issues.push('Contains broken words');
    }
    
    return issues;
  }
}

class QualitySystem {
  constructor(config = {}) {
    this.config = {
      maxIterations: 5,
      targetReadabilityScore: 70,
      enableAggressiveNormalization: true,
      ...config
    };
    
    this.normalizer = new TextNormalizer();
    this.scorer = new ReadabilityScorer();
    this.improver = new TextImprover(this.normalizer, this.scorer);
    this.validator = new QualityValidator();
  }
  
  async processText(text, options = {}) {
    const mergedOptions = { ...this.config, ...options, aggressive: true };
    
    // First pass: aggressive normalization
    const normalized = this.normalizer.normalize(text, mergedOptions);
    
    // Second pass: improve
    const improved = await this.improver.improve(normalized, mergedOptions);
    
    // Third pass: final normalization
    const finalText = this.normalizer.normalize(improved.improvedText, mergedOptions);
    
    // Validate
    const validation = this.validator.validate(text, finalText, mergedOptions);
    
    return {
      originalText: text,
      improvedText: finalText,
      metrics: this.scorer.calculateMetrics(finalText),
      improvement: validation.improvement,
      iterations: improved.iterations,
      isValid: validation.isValid,
      issues: validation.issues
    };
  }
}

module.exports = {
  QualitySystem,
  TextNormalizer,
  ReadabilityScorer,
  TextImprover,
  QualityValidator
};