/**
 * InsightExtractor - Extracts structured insights from classified content
 */

const { v4: uuidv4 } = require('uuid');

class InsightExtractor {
  constructor(config = {}) {
    this.config = {
      maxSummaryWords: 200,
      minSummaryWords: 20,
      maxTitleLength: 80,
      minQuoteLength: 20,
      maxQuoteLength: 300,
      maxTags: 10,
      ...config
    };

    this.templates = {
      'how-to': {
        titlePattern: /^(how to|setting up|configuring|installing)/i,
        requiredElements: ['steps', 'prerequisites', 'outcome'],
        minSteps: 3
      },
      'gotcha': {
        titlePattern: /^(warning|be careful|avoid|don't)/i,
        requiredElements: ['problem', 'impact', 'solution'],
        severity: ['low', 'medium', 'high', 'critical']
      },
      'tip': {
        titlePattern: /^(pro tip|tip|best practice)/i,
        requiredElements: ['recommendation', 'benefit']
      },
      'qa': {
        titlePattern: /^(how|what|why|when|where)/i,
        requiredElements: ['question', 'answer']
      }
    };
  }

  /**
   * Extract insight from classified content
   */
  async extractInsight(classifiedContent) {
    const { content, classification, metadata } = classifiedContent;
    
    if (!content || !classification || !metadata) {
      throw new Error('Invalid classified content structure');
    }

    const insight_id = uuidv4();
    const title = this.generateTitle(content, classification.category);
    const summary = this.generateSummary(content, classification.category);
    const quotes = this.selectQuotes(content, classification.category);
    const tags = this.extractTags(content);

    const insight = {
      insight_id,
      category: classification.category,
      title,
      summary,
      quotes: quotes.map((quoteText, index) => ({
        text: quoteText,
        source_file: metadata.source_file,
        line_start: metadata.line_start + index,
        line_end: metadata.line_end || metadata.line_start + index,
        timestamp: metadata.timestamp || null,
        confidence: classification.confidence
      })),
      tags,
      related_insights: [],
      verification_status: 'pending',
      extraction_date: new Date().toISOString(),
      classification_confidence: classification.confidence
    };

    this.validateInsight(insight);
    return insight;
  }

  generateTitle(content, category) {
    const words = content.split(/\\s+/);
    let title = '';

    switch (category) {
      case 'how-to':
        title = this.generateHowToTitle(content);
        break;
      case 'gotcha':
        title = this.generateGotchaTitle(content);
        break;
      case 'tip':
        title = this.generateTipTitle(content);
        break;
      case 'qa':
        title = this.generateQATitle(content);
        break;
      case 'mental-model':
        title = this.generateMentalModelTitle(content);
        break;
      case 'concept':
        title = this.generateConceptTitle(content);
        break;
      default:
        title = words.slice(0, 10).join(' ');
    }

    // Ensure title doesn't exceed maximum length
    if (title.length > this.config.maxTitleLength) {
      title = title.substring(0, this.config.maxTitleLength - 3) + '...';
    }

    return title.charAt(0).toUpperCase() + title.slice(1);
  }

  generateHowToTitle(content) {
    const lowerContent = content.toLowerCase();
    
    if (lowerContent.includes('docker')) {
      if (lowerContent.includes('install')) return 'Install Docker Desktop';
      if (lowerContent.includes('setup') || lowerContent.includes('configure')) return 'Setup Docker Environment';
    }
    
    if (lowerContent.includes('github')) {
      return 'Configure GitHub Integration';
    }
    
    if (lowerContent.includes('authentication') || lowerContent.includes('oauth')) {
      return 'Setup Authentication';
    }

    // Extract action verb and main subject
    const actionMatch = content.match(/\\b(install|setup|configure|create|build|deploy|run)\\s+([\\w\\s]{1,30})/i);
    if (actionMatch) {
      return `${actionMatch[1]} ${actionMatch[2]}`.trim();
    }

    return 'Setup and Configuration Guide';
  }

  generateGotchaTitle(content) {
    const lowerContent = content.toLowerCase();
    
    if (lowerContent.includes('permission') || lowerContent.includes('dangerous')) {
      return 'Security Risk with Permission Bypass';
    }
    
    if (lowerContent.includes('credential') || lowerContent.includes('api key')) {
      return 'Credential Exposure Warning';
    }

    if (lowerContent.includes('brick') || lowerContent.includes('damage')) {
      return 'System Damage Risk';
    }

    // Look for warning patterns
    const warningMatch = content.match(/warning:?\\s*(.{10,40})/i);
    if (warningMatch) {
      return `Warning: ${warningMatch[1].trim()}`;
    }

    return 'Security and Safety Warning';
  }

  generateTipTitle(content) {
    const lowerContent = content.toLowerCase();
    
    if (lowerContent.includes('container') || lowerContent.includes('docker')) {
      return 'Container Best Practices';
    }
    
    if (lowerContent.includes('environment') || lowerContent.includes('variable')) {
      return 'Environment Configuration Tips';
    }

    // Extract the main advice
    const tipMatch = content.match /(pro tip|tip):?\\s*(.{10,40})/i);
    if (tipMatch) {
      return tipMatch[2].trim();
    }

    return 'Best Practice Recommendation';
  }

  generateQATitle(content) {
    // Look for questions in the content
    const questionMatch = content.match(/\\b(how|what|why|when|where)\\s+(.{10,50})\\?/i);
    if (questionMatch) {
      return `${questionMatch[1]} ${questionMatch[2].trim()}?`.replace(/\\?+$/, '?');
    }

    // Look for "Question:" pattern
    const qPattern = content.match(/question:?\\s*(.{10,50})/i);
    if (qPattern) {
      return qPattern[1].trim();
    }

    return 'Common Question and Answer';
  }

  generateMentalModelTitle(content) {
    const lowerContent = content.toLowerCase();
    
    if (lowerContent.includes('pipeline')) {
      return 'Pipeline Mental Model';
    }
    
    if (lowerContent.includes('workflow')) {
      return 'Workflow Conceptual Framework';
    }

    // Look for "think of" patterns
    const thinkMatch = content.match(/think of\\s+(.{10,40})/i);
    if (thinkMatch) {
      return `Understanding ${thinkMatch[1].trim()}`;
    }

    return 'Conceptual Framework';
  }

  generateConceptTitle(content) {
    // Look for acronym definitions
    const acronymMatch = content.match(/\\b([A-Z]{2,})\\s+stands for\\s+(.{10,50})/);
    if (acronymMatch) {
      return `${acronymMatch[1]} Definition`;
    }

    // Look for definition patterns
    const defMatch = content.match(/\\b(\\w+)\\s+(means|is|defines)\\s+(.{10,40})/i);
    if (defMatch) {
      return `${defMatch[1]} Concept`;
    }

    return 'Concept Definition';
  }

  generateSummary(content, category) {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10);
    let summary = '';

    switch (category) {
      case 'how-to':
        summary = this.generateHowToSummary(sentences);
        break;
      case 'gotcha':
        summary = this.generateGotchaSummary(sentences);
        break;
      case 'tip':
        summary = this.generateTipSummary(sentences);
        break;
      case 'qa':
        summary = this.generateQASummary(sentences);
        break;
      default:
        summary = this.generateGenericSummary(sentences);
    }

    // Ensure summary meets word count requirements
    const words = summary.split(/\\s+/);
    if (words.length < this.config.minSummaryWords) {
      // Expand summary with additional context
      summary += ' This provides essential guidance for Claude Flow implementation.';
    }
    
    if (words.length > this.config.maxSummaryWords) {
      summary = words.slice(0, this.config.maxSummaryWords).join(' ') + '.';
    }

    return summary.trim();
  }

  generateHowToSummary(sentences) {
    const keySteps = sentences.filter(s => 
      /\\b(first|next|then|step|install|configure|setup)\\b/i.test(s)
    );
    
    if (keySteps.length > 0) {
      return `Step-by-step guide covering ${keySteps.length} main procedures. ` + 
             keySteps.slice(0, 2).join('. ').trim() + '.';
    }

    return 'Comprehensive guide with detailed instructions for implementation.';
  }

  generateGotchaSummary(sentences) {
    const warningSentences = sentences.filter(s =>
      /\\b(warning|never|don't|avoid|dangerous|security|risk)\\b/i.test(s)
    );

    if (warningSentences.length > 0) {
      return 'Critical security warning: ' + warningSentences[0].trim() + 
             ' This prevents potential system damage and credential exposure.';
    }

    return 'Important security consideration to avoid potential risks.';
  }

  generateTipSummary(sentences) {
    const tipSentences = sentences.filter(s =>
      /\\b(tip|best|practice|recommend|should|better)\\b/i.test(s)
    );

    if (tipSentences.length > 0) {
      return 'Best practice recommendation: ' + tipSentences[0].trim() + 
             ' This improves security and reliability.';
    }

    return 'Optimization recommendation for better implementation practices.';
  }

  generateQASummary(sentences) {
    const questionSentence = sentences.find(s => s.includes('?'));
    const answerSentence = sentences.find(s => 
      !s.includes('?') && s.length > questionSentence?.length / 2
    );

    if (questionSentence && answerSentence) {
      return `Common question addressed: ${questionSentence.trim()}? ` +
             `Answer: ${answerSentence.trim()}.`;
    }

    return 'Frequently asked question with detailed explanation and solution.';
  }

  generateGenericSummary(sentences) {
    return sentences.slice(0, 2).join('. ').trim() + '.';
  }

  selectQuotes(content, category) {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length >= this.config.minQuoteLength);
    const quotes = [];

    // Select most relevant quotes based on category
    switch (category) {
      case 'how-to':
        quotes.push(...this.selectHowToQuotes(sentences));
        break;
      case 'gotcha':
        quotes.push(...this.selectGotchaQuotes(sentences));
        break;
      case 'tip':
        quotes.push(...this.selectTipQuotes(sentences));
        break;
      case 'qa':
        quotes.push(...this.selectQAQuotes(sentences));
        break;
      default:
        quotes.push(...this.selectGenericQuotes(sentences));
    }

    // Filter quotes by length and deduplicate
    return [...new Set(quotes)]
      .filter(quote => 
        quote.length >= this.config.minQuoteLength && 
        quote.length <= this.config.maxQuoteLength
      )
      .slice(0, 3); // Max 3 quotes
  }

  selectHowToQuotes(sentences) {
    return sentences.filter(s => 
      /\\b(first|install|configure|setup|step|make sure)\\b/i.test(s)
    ).slice(0, 2);
  }

  selectGotchaQuotes(sentences) {
    return sentences.filter(s =>
      /\\b(warning|never|dangerous|security|risk|careful)\\b/i.test(s)
    ).slice(0, 2);
  }

  selectTipQuotes(sentences) {
    return sentences.filter(s =>
      /\\b(pro tip|tip|best|recommend|should)\\b/i.test(s)
    ).slice(0, 2);
  }

  selectQAQuotes(sentences) {
    const quotes = [];
    const question = sentences.find(s => s.includes('?'));
    if (question) quotes.push(question.trim() + '?');
    
    const answer = sentences.find(s => !s.includes('?') && s.length > 20);
    if (answer) quotes.push(answer.trim());
    
    return quotes;
  }

  selectGenericQuotes(sentences) {
    return sentences.slice(0, 1);
  }

  extractTags(content) {
    const lowerContent = content.toLowerCase();
    const tags = new Set();

    // Technical terms
    const technicalTerms = [
      'docker', 'github', 'oauth', 'api', 'authentication', 'security',
      'setup', 'install', 'configure', 'deploy', 'testing', 'cicd',
      'container', 'sandbox', 'credentials', 'permissions', 'jwt',
      'environment', 'variable', 'token', 'key', 'ssl', 'https'
    ];

    technicalTerms.forEach(term => {
      if (lowerContent.includes(term)) {
        tags.add(term);
      }
    });

    // Action-based tags
    const actions = ['install', 'setup', 'configure', 'deploy', 'build', 'test', 'run'];
    actions.forEach(action => {
      if (lowerContent.includes(action)) {
        tags.add(action);
      }
    });

    // Extract quoted terms
    const quotedTerms = content.match(/"([^"]+)"/g);
    if (quotedTerms) {
      quotedTerms.forEach(term => {
        const cleaned = term.replace(/"/g, '').toLowerCase();
        if (cleaned.length > 2 && cleaned.length < 20) {
          tags.add(cleaned.replace(/\\s+/g, '-'));
        }
      });
    }

    // Limit number of tags
    const tagArray = Array.from(tags).slice(0, this.config.maxTags);
    return tagArray.length > 0 ? tagArray : ['general'];
  }

  validateInsight(insight) {
    const requiredFields = [
      'insight_id', 'category', 'title', 'summary', 'quotes', 
      'verification_status', 'extraction_date'
    ];
    
    for (const field of requiredFields) {
      if (insight[field] === undefined) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    if (!Array.isArray(insight.quotes) || insight.quotes.length === 0) {
      throw new Error('At least one quote is required');
    }

    // Validate quotes
    insight.quotes.forEach((quote, index) => {
      const requiredQuoteFields = ['text', 'source_file', 'line_start', 'confidence'];
      
      for (const field of requiredQuoteFields) {
        if (quote[field] === undefined) {
          throw new Error(`Quote ${index} missing required field: ${field}`);
        }
      }

      if (quote.confidence < 0 || quote.confidence > 1) {
        throw new Error(`Quote confidence must be between 0 and 1`);
      }
    });
  }

  /**
   * Extract insights from multiple classified contents
   */
  async batchExtract(classifiedContents) {
    if (!Array.isArray(classifiedContents)) {
      throw new Error('Classified contents must be an array');
    }

    const insights = [];
    
    for (let i = 0; i < classifiedContents.length; i++) {
      try {
        const insight = await this.extractInsight(classifiedContents[i]);
        insights.push(insight);
      } catch (error) {
        // Log error but continue processing
        console.warn(`Failed to extract insight from item ${i}:`, error.message);
      }
    }

    return insights;
  }
}

module.exports = InsightExtractor;