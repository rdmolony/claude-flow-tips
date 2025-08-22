/**
 * ContentCategorizer - Intelligent categorization of extracted insights
 */

const natural = require('natural');

class ContentCategorizer {
  constructor(config = {}) {
    this.config = {
      enableMLClassification: true,
      confidenceThreshold: 0.6,
      customRules: [],
      ...config
    };
    
    // Category patterns for rule-based classification
    this.categoryPatterns = {
      'how-to': [
        /how to/i, /step.*by.*step/i, /tutorial/i, /guide/i, /walkthrough/i,
        /implement/i, /setup/i, /configure/i, /install/i, /deploy/i
      ],
      'tip': [
        /tip/i, /trick/i, /best.*practice/i, /recommendation/i, /optimize/i,
        /performance/i, /efficient/i, /better.*way/i, /pro.*tip/i
      ],
      'gotcha': [
        /gotcha/i, /pitfall/i, /warning/i, /careful/i, /avoid/i, /mistake/i,
        /problem/i, /issue/i, /error/i, /bug/i, /caveat/i, /watch.*out/i
      ],
      'mental-model': [
        /mental.*model/i, /concept/i, /framework/i, /paradigm/i, /philosophy/i,
        /approach/i, /methodology/i, /principle/i, /theory/i
      ],
      'qa': [
        /question/i, /answer/i, /faq/i, /q&a/i, /why/i, /what.*is/i, /how.*does/i,
        /explain/i, /clarify/i, /discussion/i
      ],
      'use-case': [
        /use.*case/i, /scenario/i, /example/i, /application/i, /real.*world/i,
        /practical/i, /implementation/i, /deployment/i
      ],
      'troubleshooting': [
        /troubleshoot/i, /debug/i, /fix/i, /solve/i, /diagnose/i, /repair/i,
        /resolve/i, /issue/i, /problem/i, /error/i
      ]
    };
    
    // Keyword weights for scoring
    this.keywordWeights = {
      'claude-flow': 10,
      'swarm': 8,
      'agent': 8,
      'ai': 6,
      'neural': 7,
      'automation': 6,
      'workflow': 5,
      'api': 4,
      'cli': 4,
      'config': 3
    };
  }

  /**
   * Categorize insights using multiple strategies
   */
  categorizeInsights(insights) {
    const categorized = {};
    
    insights.forEach(insight => {
      const categories = this.classifyInsight(insight);
      const primaryCategory = categories[0] || 'general';
      
      if (!categorized[primaryCategory]) {
        categorized[primaryCategory] = [];
      }
      
      // Add secondary categories as metadata
      insight.categories = categories;
      insight.primary_category = primaryCategory;
      
      categorized[primaryCategory].push(insight);
    });
    
    return categorized;
  }

  /**
   * Classify a single insight into categories
   */
  classifyInsight(insight) {
    const scores = {};
    
    // Initialize category scores
    Object.keys(this.categoryPatterns).forEach(category => {
      scores[category] = 0;
    });
    
    // Rule-based classification
    const text = `${insight.title} ${insight.summary}`.toLowerCase();
    
    Object.entries(this.categoryPatterns).forEach(([category, patterns]) => {
      patterns.forEach(pattern => {
        if (pattern.test(text)) {
          scores[category] += 1;
        }
      });
    });
    
    // Keyword-based scoring
    Object.entries(this.keywordWeights).forEach(([keyword, weight]) => {
      const regex = new RegExp(keyword, 'gi');
      const matches = text.match(regex) || [];
      scores['concept'] += matches.length * weight * 0.1;
    });
    
    // Context-based classification
    if (insight.quotes) {
      insight.quotes.forEach(quote => {
        const context = quote.context || '';
        scores['qa'] += (context.match(/\?/g) || []).length * 0.5;
        scores['how-to'] += (context.match(/step/gi) || []).length * 0.3;
      });
    }
    
    // Tag-based classification
    if (insight.tags) {
      insight.tags.forEach(tag => {
        const tagLower = tag.toLowerCase();
        if (tagLower.includes('tutorial') || tagLower.includes('guide')) {
          scores['how-to'] += 2;
        }
        if (tagLower.includes('tip') || tagLower.includes('best')) {
          scores['tip'] += 2;
        }
        if (tagLower.includes('warning') || tagLower.includes('error')) {
          scores['gotcha'] += 2;
        }
      });
    }
    
    // Custom rules
    this.config.customRules.forEach(rule => {
      if (rule.condition(insight)) {
        scores[rule.category] += rule.weight || 1;
      }
    });
    
    // Sort categories by score and return above threshold
    const sortedCategories = Object.entries(scores)
      .filter(([, score]) => score >= this.config.confidenceThreshold)
      .sort(([, a], [, b]) => b - a)
      .map(([category]) => category);
    
    return sortedCategories.length > 0 ? sortedCategories : ['general'];
  }

  /**
   * Analyze content patterns for better categorization
   */
  analyzeContentPatterns(insights) {
    const analysis = {
      totalInsights: insights.length,
      categoryDistribution: {},
      commonKeywords: {},
      tagFrequency: {},
      sourceDistribution: {}
    };
    
    insights.forEach(insight => {
      // Category distribution
      const category = insight.primary_category || 'general';
      analysis.categoryDistribution[category] = (analysis.categoryDistribution[category] || 0) + 1;
      
      // Keyword frequency
      const text = `${insight.title} ${insight.summary}`.toLowerCase();
      Object.keys(this.keywordWeights).forEach(keyword => {
        const matches = text.match(new RegExp(keyword, 'gi')) || [];
        if (matches.length > 0) {
          analysis.commonKeywords[keyword] = (analysis.commonKeywords[keyword] || 0) + matches.length;
        }
      });
      
      // Tag frequency
      if (insight.tags) {
        insight.tags.forEach(tag => {
          analysis.tagFrequency[tag] = (analysis.tagFrequency[tag] || 0) + 1;
        });
      }
      
      // Source distribution
      if (insight.quotes) {
        insight.quotes.forEach(quote => {
          const source = quote.source_file;
          analysis.sourceDistribution[source] = (analysis.sourceDistribution[source] || 0) + 1;
        });
      }
    });
    
    return analysis;
  }

  /**
   * Suggest category improvements based on analysis
   */
  suggestImprovements(insights) {
    const analysis = this.analyzeContentPatterns(insights);
    const suggestions = [];
    
    // Check for imbalanced categories
    const totalInsights = analysis.totalInsights;
    Object.entries(analysis.categoryDistribution).forEach(([category, count]) => {
      const percentage = (count / totalInsights) * 100;
      if (percentage > 50) {
        suggestions.push({
          type: 'category_imbalance',
          message: `Category '${category}' has ${percentage.toFixed(1)}% of insights. Consider splitting into subcategories.`,
          category,
          percentage
        });
      }
    });
    
    // Check for uncategorized content
    const generalCount = analysis.categoryDistribution.general || 0;
    if (generalCount > totalInsights * 0.2) {
      suggestions.push({
        type: 'uncategorized_content',
        message: `${generalCount} insights are in 'general' category. Review classification rules.`,
        count: generalCount
      });
    }
    
    // Suggest new categories based on common keywords
    const topKeywords = Object.entries(analysis.commonKeywords)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);
    
    topKeywords.forEach(([keyword, frequency]) => {
      if (frequency > totalInsights * 0.1) {
        suggestions.push({
          type: 'new_category_suggestion',
          message: `Consider creating a category for '${keyword}' (appears in ${frequency} insights)`,
          keyword,
          frequency
        });
      }
    });
    
    return suggestions;
  }

  /**
   * Generate category-specific metadata
   */
  generateCategoryMetadata(category, insights) {
    const metadata = {
      category,
      count: insights.length,
      averageConfidence: 0,
      commonTags: [],
      topSources: [],
      difficultyDistribution: {}
    };
    
    let totalConfidence = 0;
    const tagFreq = {};
    const sourceFreq = {};
    
    insights.forEach(insight => {
      // Calculate average confidence
      if (insight.confidence) {
        totalConfidence += insight.confidence;
      }
      
      // Tag frequency
      if (insight.tags) {
        insight.tags.forEach(tag => {
          tagFreq[tag] = (tagFreq[tag] || 0) + 1;
        });
      }
      
      // Source frequency
      if (insight.quotes) {
        insight.quotes.forEach(quote => {
          sourceFreq[quote.source_file] = (sourceFreq[quote.source_file] || 0) + 1;
        });
      }
      
      // Difficulty distribution
      if (insight.difficulty) {
        metadata.difficultyDistribution[insight.difficulty] = 
          (metadata.difficultyDistribution[insight.difficulty] || 0) + 1;
      }
    });
    
    metadata.averageConfidence = totalConfidence / insights.length;
    metadata.commonTags = Object.entries(tagFreq)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([tag]) => tag);
    
    metadata.topSources = Object.entries(sourceFreq)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([source]) => source);
    
    return metadata;
  }
}

module.exports = ContentCategorizer;