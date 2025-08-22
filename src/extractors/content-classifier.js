/**
 * ContentClassifier - Categorizes content into predefined knowledge types
 */

class ContentClassifier {
  constructor(config = {}) {
    this.categories = [
      'how-to',
      'tip', 
      'gotcha',
      'mental-model',
      'qa',
      'concept',
      'general'
    ];

    this.patterns = {
      'how-to': {
        keywords: ['first', 'next', 'then', 'finally', 'step', 'install', 'setup', 'configure', 'run'],
        indicators: ['sequential_steps', 'action_verbs', 'step_indicators'],
        weight: 1.0
      },
      'gotcha': {
        keywords: ['warning', 'never', 'don\'t', 'avoid', 'careful', 'dangerous', 'critical', 'security'],
        indicators: ['warning_language', 'risk_indicators', 'imperative_tone'],
        weight: 1.2
      },
      'tip': {
        keywords: ['pro tip', 'tip', 'best practice', 'recommend', 'should', 'better', 'optimize'],
        indicators: ['best_practice', 'recommendation'],
        weight: 0.9
      },
      'qa': {
        keywords: ['question', 'answer', 'what', 'how', 'why', 'when', 'where'],
        indicators: ['question_answer_pattern', 'interrogative', 'question_pattern'],
        weight: 1.1
      },
      'mental-model': {
        keywords: ['think of', 'like', 'imagine', 'consider', 'framework', 'concept', 'model'],
        indicators: ['metaphor', 'conceptual_framework', 'analogy_language'],
        weight: 0.8
      },
      'concept': {
        keywords: ['define', 'means', 'is', 'stands for', 'definition', 'term'],
        indicators: ['definition', 'acronym_expansion', 'explanation'],
        weight: 0.9
      }
    };

    this.config = {
      minConfidenceThreshold: 0.5,
      ...config
    };
  }

  /**
   * Classify content into categories
   */
  async classifyContent(content) {
    if (!content || typeof content !== 'string') {
      throw new Error('Invalid content for classification');
    }

    const features = this.extractFeatures(content);
    const scores = this.calculateCategoryScores(content, features);
    
    const sortedScores = Object.entries(scores)
      .sort(([,a], [,b]) => b - a);
    
    const [primaryCategory, primaryScore] = sortedScores[0];
    const confidence = this.calculateConfidence(features, primaryCategory);
    
    const alternativeCategories = sortedScores
      .slice(1, 3)
      .filter(([, score]) => score > this.config.minConfidenceThreshold * 0.7)
      .map(([category]) => category);

    const result = {
      category: primaryCategory,
      confidence,
      features,
      alternativeCategories: alternativeCategories.length > 0 ? alternativeCategories : undefined
    };

    this.validateClassification(result);
    return result;
  }

  extractFeatures(content) {
    const features = [];
    const lowerContent = content.toLowerCase();

    // Sequential step indicators
    if (/\b(first|1\.|step 1|next|then|finally|last)\b/.test(lowerContent)) {
      features.push('sequential_steps');
    }

    // Action verbs
    if (/\b(install|setup|configure|run|execute|create|build|deploy)\b/.test(lowerContent)) {
      features.push('action_verbs');
    }

    // Step indicators
    if (/\b(step \d+|\d+\.|first|second|third)\b/.test(lowerContent)) {
      features.push('step_indicators');
    }

    // Warning language
    if (/\b(warning|danger|careful|never|don't|avoid)\b/.test(lowerContent)) {
      features.push('warning_language');
    }

    // Risk indicators
    if (/\b(security|risk|unsafe|vulnerable|expose|damage|brick)\b/.test(lowerContent)) {
      features.push('risk_indicators');
    }

    // Best practice language
    if (/\b(pro tip|tip|best|recommend|should|practice|optimize)\b/.test(lowerContent)) {
      features.push('best_practice');
    }

    // Question patterns
    if (/\b(question|what|how|why|when|where)\b/.test(lowerContent) && content.includes('?')) {
      features.push('question_pattern');
    }

    // Question-answer pattern
    if (/\b(question|answer)\b.*\b(answer|question)\b/i.test(content)) {
      features.push('question_answer_pattern');
    }

    // Interrogative words
    if (/^(what|how|why|when|where|which|who)\b/i.test(content.trim())) {
      features.push('interrogative');
    }

    // Metaphor language
    if (/\b(like|think of|imagine|similar to|as if)\b/.test(lowerContent)) {
      features.push('metaphor');
    }

    // Conceptual framework
    if (/\b(framework|model|concept|approach|methodology)\b/.test(lowerContent)) {
      features.push('conceptual_framework');
    }

    // Analogy language
    if (/\b(analogy|comparison|compare|contrast)\b/.test(lowerContent)) {
      features.push('analogy_language');
    }

    // Definition patterns
    if (/\b(define|definition|means|is|stands for)\b/.test(lowerContent)) {
      features.push('definition');
    }

    // Acronym expansion
    if (/\b[A-Z]{2,}\b.*\bstands for\b|\b[A-Z]{2,}\b.*\bmeans\b/.test(content)) {
      features.push('acronym_expansion');
    }

    // Technical terms
    if (/\b(docker|api|oauth|jwt|sql|html|css|javascript|python|git)\b/.test(lowerContent)) {
      features.push('technical_terms');
    }

    // Commands
    if (/\b(npm|docker|git|pip|yarn)\s+\w+/.test(lowerContent)) {
      features.push('commands');
    }

    // Imperative tone
    if (/^(do|don't|make sure|ensure|verify|check|run|install)\b/i.test(content.trim())) {
      features.push('imperative_tone');
    }

    return features.length > 0 ? features : ['general_text'];
  }

  calculateCategoryScores(content, features) {
    const scores = {};
    
    for (const category of this.categories) {
      if (category === 'general') {
        scores[category] = 0.1; // Default low score
        continue;
      }

      const pattern = this.patterns[category];
      if (!pattern) continue;

      let score = 0;

      // Keyword matching
      for (const keyword of pattern.keywords) {
        if (content.toLowerCase().includes(keyword)) {
          score += 0.3;
        }
      }

      // Feature matching
      for (const indicator of pattern.indicators) {
        if (features.includes(indicator)) {
          score += 0.4;
        }
      }

      // Apply category weight
      score *= pattern.weight;
      
      scores[category] = Math.min(score, 1.0);
    }

    return scores;
  }

  calculateConfidence(features, category) {
    const pattern = this.patterns[category];
    if (!pattern) return 0.5;

    const relevantFeatures = features.filter(f => pattern.indicators.includes(f));
    const featureRatio = relevantFeatures.length / pattern.indicators.length;
    
    let confidence = 0.5 + (featureRatio * 0.4);
    
    // Boost confidence for strong indicators
    if (features.includes('sequential_steps') && category === 'how-to') {
      confidence += 0.2;
    }
    if (features.includes('warning_language') && category === 'gotcha') {
      confidence += 0.3;
    }
    if (features.includes('question_answer_pattern') && category === 'qa') {
      confidence += 0.25;
    }

    return Math.min(confidence, 1.0);
  }

  getAlternativeCategories(features, primaryCategory) {
    const alternatives = [];
    
    // Cross-category relationships
    if (features.includes('sequential_steps') && features.includes('best_practice')) {
      if (primaryCategory === 'how-to') alternatives.push('tip');
      if (primaryCategory === 'tip') alternatives.push('how-to');
    }

    if (features.includes('warning_language') && features.includes('action_verbs')) {
      if (primaryCategory === 'gotcha') alternatives.push('how-to');
    }

    return alternatives.filter(cat => cat !== primaryCategory);
  }

  validateClassification(classification) {
    const requiredFields = ['category', 'confidence', 'features'];
    
    for (const field of requiredFields) {
      if (classification[field] === undefined) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    if (!this.categories.includes(classification.category)) {
      throw new Error(`Invalid category: ${classification.category}`);
    }

    if (classification.confidence < 0 || classification.confidence > 1) {
      throw new Error('Confidence must be between 0 and 1');
    }

    if (!Array.isArray(classification.features)) {
      throw new Error('Features must be an array');
    }
  }

  /**
   * Classify multiple content items efficiently
   */
  async batchClassify(contentItems) {
    if (!Array.isArray(contentItems)) {
      throw new Error('Content items must be an array');
    }

    const results = [];
    
    for (let i = 0; i < contentItems.length; i++) {
      try {
        const result = await this.classifyContent(contentItems[i]);
        results.push({
          ...result,
          originalIndex: i
        });
      } catch (error) {
        results.push({
          category: 'general',
          confidence: 0,
          features: ['error'],
          error: error.message,
          originalIndex: i
        });
      }
    }

    return results;
  }
}

module.exports = ContentClassifier;