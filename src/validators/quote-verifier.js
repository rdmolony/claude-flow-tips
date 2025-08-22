/**
 * QuoteVerifier - Validates quotes against source transcripts
 */

class QuoteVerifier {
  constructor(config = {}) {
    this.config = {
      exactMatchWeight: 1.0,
      fuzzyMatchWeight: 0.8,
      partialMatchWeight: 0.6,
      minConfidenceThreshold: 0.7,
      maxLevenshteinDistance: 5,
      contextWindow: 2, // sentences
      ...config
    };
  }

  /**
   * Verify a quote against the source transcript
   */
  async verifyQuote(quote, transcript) {
    this.validateQuoteStructure(quote);
    
    const result = {
      isValid: false,
      confidence: 0,
      matchType: 'none',
      location: null,
      actualText: null,
      errors: []
    };

    try {
      // Check if line numbers are within range
      if (quote.line_start < 1 || quote.line_start > transcript.content.length) {
        result.errors.push('Line numbers out of range');
        return result;
      }

      // Find best match in transcript
      const match = this.findBestMatch(quote.text, transcript.content);
      
      if (!match) {
        result.errors.push('Quote not found in source');
        return result;
      }

      result.isValid = match.confidence >= this.config.minConfidenceThreshold;
      result.confidence = match.confidence;
      result.matchType = match.matchType;
      result.location = {
        line_number: match.line_number,
        line_start: quote.line_start,
        line_end: quote.line_end || quote.line_start
      };
      result.actualText = match.actualText;

      // Add corrections if fuzzy match
      if (match.matchType === 'fuzzy' && match.corrections) {
        result.corrections = match.corrections;
      }

      // Check for suspicious patterns that might indicate hallucinations
      if (this.detectPotentialHallucinations(result)) {
        result.suspiciousPatterns = this.identifySuspiciousPatterns(quote.text);
      }

    } catch (error) {
      result.errors.push(error.message);
    }

    return result;
  }

  validateQuoteStructure(quote) {
    const requiredFields = ['text', 'source_file', 'line_start'];
    
    for (const field of requiredFields) {
      if (quote[field] === undefined) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    if (!quote.text || quote.text.trim().length === 0) {
      throw new Error('Quote text cannot be empty');
    }

    if (quote.line_end && quote.line_end < quote.line_start) {
      throw new Error('line_end must be >= line_start');
    }

    if (quote.confidence !== undefined) {
      if (quote.confidence < 0 || quote.confidence > 1) {
        throw new Error('Confidence must be between 0 and 1');
      }
    }
  }

  findBestMatch(searchText, transcriptContent) {
    let bestMatch = null;
    let bestScore = 0;

    const cleanSearchText = this.normalizeText(searchText);

    for (let i = 0; i < transcriptContent.length; i++) {
      const line = transcriptContent[i];
      const cleanLineText = this.normalizeText(line.text);

      // Try exact match first
      if (cleanLineText === cleanSearchText) {
        return {
          line_number: line.line_number,
          confidence: 1.0,
          matchType: 'exact',
          actualText: line.text
        };
      }

      // Try partial match (quote contained in line)
      if (cleanLineText.includes(cleanSearchText)) {
        const confidence = cleanSearchText.length / cleanLineText.length;
        if (confidence > bestScore) {
          bestMatch = {
            line_number: line.line_number,
            confidence: confidence * this.config.partialMatchWeight,
            matchType: 'partial',
            actualText: line.text
          };
          bestScore = confidence;
        }
      }

      // Try fuzzy match using similarity
      const similarity = this.calculateSimilarity(cleanSearchText, cleanLineText);
      if (similarity > 0.7 && similarity > bestScore) {
        bestMatch = {
          line_number: line.line_number,
          confidence: similarity * this.config.fuzzyMatchWeight,
          matchType: 'fuzzy',
          actualText: line.text,
          corrections: this.findCorrections(searchText, line.text)
        };
        bestScore = similarity;
      }

      // Try multi-line match for longer quotes
      if (i < transcriptContent.length - 1) {
        const multiLineText = cleanLineText + ' ' + this.normalizeText(transcriptContent[i + 1].text);
        if (multiLineText.includes(cleanSearchText)) {
          const confidence = cleanSearchText.length / multiLineText.length;
          if (confidence > bestScore) {
            bestMatch = {
              line_number: line.line_number,
              confidence: confidence * this.config.partialMatchWeight,
              matchType: 'partial',
              actualText: line.text + ' ' + transcriptContent[i + 1].text
            };
            bestScore = confidence;
          }
        }
      }
    }

    return bestMatch;
  }

  calculateSimilarity(text1, text2) {
    const longer = text1.length > text2.length ? text1 : text2;
    const shorter = text1.length > text2.length ? text2 : text1;
    
    if (longer.length === 0) return 1.0;
    
    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  levenshteinDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  normalizeText(text) {
    return text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')  // Remove punctuation
      .replace(/\s+/g, ' ')      // Normalize whitespace
      .trim();
  }

  findCorrections(originalText, actualText) {
    const corrections = [];
    const originalWords = originalText.split(/\s+/);
    const actualWords = actualText.split(/\s+/);
    
    for (let i = 0; i < Math.min(originalWords.length, actualWords.length); i++) {
      if (originalWords[i].toLowerCase() !== actualWords[i].toLowerCase()) {
        corrections.push({
          position: i,
          original: originalWords[i],
          actual: actualWords[i]
        });
      }
    }
    
    return corrections;
  }

  detectPotentialHallucinations(verificationResult) {
    // Low confidence indicates potential hallucination
    if (verificationResult.confidence < this.config.minConfidenceThreshold) {
      return true;
    }

    // Check for suspicious patterns
    if (verificationResult.suspiciousPatterns && verificationResult.suspiciousPatterns.length > 0) {
      return true;
    }

    return false;
  }

  identifySuspiciousPatterns(text) {
    const patterns = [];
    
    // Check for modern language in potentially older transcripts
    const modernTerms = ['blockchain', 'cryptocurrency', 'nft', 'metaverse'];
    for (const term of modernTerms) {
      if (text.toLowerCase().includes(term)) {
        patterns.push('modern_language');
        break;
      }
    }

    // Check for technical anachronisms
    const advancedTerms = ['quantum computing', 'neural networks', 'deep learning'];
    for (const term of advancedTerms) {
      if (text.toLowerCase().includes(term)) {
        patterns.push('technical_anachronism');
        break;
      }
    }

    // Check for overly complex language
    const words = text.split(/\s+/);
    const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length;
    if (avgWordLength > 7) {
      patterns.push('complex_language');
    }

    return patterns;
  }

  /**
   * Verify multiple quotes efficiently
   */
  async batchVerify(quotes, transcript) {
    if (!Array.isArray(quotes)) {
      throw new Error('Quotes must be an array');
    }

    const results = [];
    
    for (let i = 0; i < quotes.length; i++) {
      try {
        const result = await this.verifyQuote(quotes[i], transcript);
        results.push({
          ...result,
          originalIndex: i
        });
      } catch (error) {
        results.push({
          isValid: false,
          confidence: 0,
          matchType: 'error',
          errors: [error.message],
          originalIndex: i
        });
      }
    }

    return results;
  }

  /**
   * Generate comprehensive verification report
   */
  async generateVerificationReport(quotes, transcript) {
    const results = await this.batchVerify(quotes, transcript);
    
    const validQuotes = results.filter(r => r.isValid).length;
    const totalQuotes = results.length;
    const potentialHallucinations = results.filter(r => 
      this.detectPotentialHallucinations(r)
    ).length;
    
    const averageConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / totalQuotes;
    
    return {
      totalQuotes,
      validQuotes,
      invalidQuotes: totalQuotes - validQuotes,
      verificationRate: totalQuotes > 0 ? validQuotes / totalQuotes : 0,
      averageConfidence,
      potentialHallucinations,
      details: results,
      summary: {
        highConfidence: results.filter(r => r.confidence > 0.9).length,
        mediumConfidence: results.filter(r => r.confidence > 0.7 && r.confidence <= 0.9).length,
        lowConfidence: results.filter(r => r.confidence <= 0.7).length
      }
    };
  }
}

module.exports = QuoteVerifier;