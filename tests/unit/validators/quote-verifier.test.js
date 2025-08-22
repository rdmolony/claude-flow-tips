/**
 * Unit tests for QuoteVerifier
 * Tests quote validation and verification against source transcripts
 */

const { describe, test, expect, beforeEach } = require('@jest/globals');
const QuoteVerifier = require('../../../src/validators/quote-verifier');

describe('QuoteVerifier', () => {
  let verifier;
  let mockTranscript;
  
  beforeEach(() => {
    verifier = new QuoteVerifier();
    mockTranscript = global.testUtils.createMockTranscript({
      content: [
        {
          line_number: 1,
          timestamp: '00:00:30',
          text: 'Welcome to this tutorial on setting up Claude Flow with Docker.'
        },
        {
          line_number: 2,
          timestamp: '00:01:15',
          text: 'First, make sure you have Docker installed and running on your system.'
        },
        {
          line_number: 3,
          timestamp: '00:02:45',
          text: 'Warning: never run Claude with the dangerously-skip-permissions flag outside of a sandbox.'
        },
        {
          line_number: 4,
          timestamp: '00:03:30',
          text: 'This could expose your credentials and potentially brick your machine.'
        }
      ]
    });
  });

  describe('constructor', () => {
    test('should create verifier with default configuration', () => {
      expect(verifier).toBeInstanceOf(QuoteVerifier);
      expect(verifier.config.exactMatchWeight).toBe(1.0);
      expect(verifier.config.fuzzyMatchWeight).toBe(0.8);
      expect(verifier.config.minConfidenceThreshold).toBe(0.7);
    });

    test('should accept custom configuration', () => {
      const config = {
        exactMatchWeight: 0.9,
        fuzzyMatchWeight: 0.7,
        minConfidenceThreshold: 0.8
      };
      const customVerifier = new QuoteVerifier(config);
      
      expect(customVerifier.config.exactMatchWeight).toBe(0.9);
      expect(customVerifier.config.minConfidenceThreshold).toBe(0.8);
    });
  });

  describe('verifyQuote', () => {
    test('should verify exact match quote with high confidence', async () => {
      const quote = {
        text: 'First, make sure you have Docker installed and running on your system.',
        source_file: 'test-transcript.txt',
        line_start: 2,
        line_end: 2
      };

      const result = await verifier.verifyQuote(quote, mockTranscript);

      expect(result.isValid).toBe(true);
      expect(result.confidence).toBe(1.0);
      expect(result.matchType).toBe('exact');
      expect(result.actualText).toBe(quote.text);
      expect(result.location.line_number).toBe(2);
    });

    test('should verify quote with minor punctuation differences', async () => {
      const quote = {
        text: 'First make sure you have Docker installed and running on your system',
        source_file: 'test-transcript.txt',
        line_start: 2,
        line_end: 2
      };

      const result = await verifier.verifyQuote(quote, mockTranscript);

      expect(result.isValid).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.9);
      expect(result.matchType).toBe('fuzzy');
    });

    test('should verify multi-line quote correctly', async () => {
      const quote = {
        text: 'Warning: never run Claude with the dangerously-skip-permissions flag outside of a sandbox. This could expose your credentials and potentially brick your machine.',
        source_file: 'test-transcript.txt',
        line_start: 3,
        line_end: 4
      };

      const result = await verifier.verifyQuote(quote, mockTranscript);

      expect(result.isValid).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.95);
      expect(result.location.line_start).toBe(3);
      expect(result.location.line_end).toBe(4);
    });

    test('should reject quote that does not exist in transcript', async () => {
      const quote = {
        text: 'This quote does not exist anywhere in the transcript.',
        source_file: 'test-transcript.txt',
        line_start: 1,
        line_end: 1
      };

      const result = await verifier.verifyQuote(quote, mockTranscript);

      expect(result.isValid).toBe(false);
      expect(result.confidence).toBe(0);
      expect(result.matchType).toBe('none');
      expect(result.errors).toContain('Quote not found in source');
    });

    test('should reject quote with incorrect line numbers', async () => {
      const quote = {
        text: 'First, make sure you have Docker installed and running on your system.',
        source_file: 'test-transcript.txt',
        line_start: 5, // Wrong line number
        line_end: 5
      };

      const result = await verifier.verifyQuote(quote, mockTranscript);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Line numbers out of range');
    });

    test('should handle quotes with minor transcription errors', async () => {
      const quote = {
        text: 'First, make shure you have Docker installed and runing on your system.',
        source_file: 'test-transcript.txt',
        line_start: 2,
        line_end: 2
      };

      const result = await verifier.verifyQuote(quote, mockTranscript);

      expect(result.isValid).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.7);
      expect(result.matchType).toBe('fuzzy');
      expect(result.corrections).toBeDefined();
      expect(result.corrections.length).toBeGreaterThan(0);
    });

    test('should verify partial quote within longer text', async () => {
      const quote = {
        text: 'dangerously-skip-permissions flag outside of a sandbox',
        source_file: 'test-transcript.txt',
        line_start: 3,
        line_end: 3
      };

      const result = await verifier.verifyQuote(quote, mockTranscript);

      expect(result.isValid).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.9);
      expect(result.matchType).toBe('partial');
    });
  });

  describe('calculateSimilarity', () => {
    test('should return 1.0 for identical strings', () => {
      const text1 = 'This is exactly the same text.';
      const text2 = 'This is exactly the same text.';

      const similarity = verifier.calculateSimilarity(text1, text2);

      expect(similarity).toBe(1.0);
    });

    test('should return 0.0 for completely different strings', () => {
      const text1 = 'Completely different content here.';
      const text2 = 'Xyz abc def ghi jkl mno.';

      const similarity = verifier.calculateSimilarity(text1, text2);

      expect(similarity).toBeLessThan(0.3);
    });

    test('should calculate similarity for texts with minor differences', () => {
      const text1 = 'First, make sure you have Docker installed.';
      const text2 = 'First make sure you have Docker installed';

      const similarity = verifier.calculateSimilarity(text1, text2);

      expect(similarity).toBeGreaterThan(0.9);
      expect(similarity).toBeLessThan(1.0);
    });

    test('should handle case insensitive comparison', () => {
      const text1 = 'Docker Installation Guide';
      const text2 = 'docker installation guide';

      const similarity = verifier.calculateSimilarity(text1, text2);

      expect(similarity).toBeGreaterThan(0.95);
    });
  });

  describe('findBestMatch', () => {
    test('should find exact match in transcript content', () => {
      const searchText = 'Warning: never run Claude with the dangerously-skip-permissions flag outside of a sandbox.';

      const match = verifier.findBestMatch(searchText, mockTranscript.content);

      expect(match).toBeDefined();
      expect(match.line_number).toBe(3);
      expect(match.confidence).toBe(1.0);
      expect(match.matchType).toBe('exact');
    });

    test('should find fuzzy match when exact match is not available', () => {
      const searchText = 'Warning never run Claude with dangerous permissions flag outside sandbox';

      const match = verifier.findBestMatch(searchText, mockTranscript.content);

      expect(match).toBeDefined();
      expect(match.line_number).toBe(3);
      expect(match.confidence).toBeGreaterThan(0.7);
      expect(match.matchType).toBe('fuzzy');
    });

    test('should find partial match within longer content', () => {
      const searchText = 'Docker installed and running';

      const match = verifier.findBestMatch(searchText, mockTranscript.content);

      expect(match).toBeDefined();
      expect(match.line_number).toBe(2);
      expect(match.matchType).toBe('partial');
    });

    test('should return null when no suitable match is found', () => {
      const searchText = 'This text definitely does not exist anywhere in the transcript content.';

      const match = verifier.findBestMatch(searchText, mockTranscript.content);

      expect(match).toBeNull();
    });
  });

  describe('validateQuoteStructure', () => {
    test('should validate properly structured quote', () => {
      const validQuote = {
        text: 'Valid quote text here.',
        source_file: 'test.txt',
        line_start: 1,
        line_end: 1,
        confidence: 0.95
      };

      expect(() => verifier.validateQuoteStructure(validQuote)).not.toThrow();
    });

    test('should reject quote missing required fields', () => {
      const invalidQuote = {
        text: 'Quote text',
        source_file: 'test.txt'
        // missing line_start, line_end
      };

      expect(() => verifier.validateQuoteStructure(invalidQuote))
        .toThrow('Missing required field: line_start');
    });

    test('should reject quote with invalid line numbers', () => {
      const invalidQuote = {
        text: 'Quote text',
        source_file: 'test.txt',
        line_start: 5,
        line_end: 3 // end before start
      };

      expect(() => verifier.validateQuoteStructure(invalidQuote))
        .toThrow('line_end must be >= line_start');
    });

    test('should reject quote with empty text', () => {
      const invalidQuote = {
        text: '',
        source_file: 'test.txt',
        line_start: 1,
        line_end: 1
      };

      expect(() => verifier.validateQuoteStructure(invalidQuote))
        .toThrow('Quote text cannot be empty');
    });

    test('should reject quote with invalid confidence score', () => {
      const invalidQuote = {
        text: 'Quote text',
        source_file: 'test.txt',
        line_start: 1,
        line_end: 1,
        confidence: 1.5 // > 1.0
      };

      expect(() => verifier.validateQuoteStructure(invalidQuote))
        .toThrow('Confidence must be between 0 and 1');
    });
  });

  describe('batchVerify', () => {
    test('should verify multiple quotes efficiently', async () => {
      const quotes = [
        {
          text: 'Welcome to this tutorial on setting up Claude Flow with Docker.',
          source_file: 'test-transcript.txt',
          line_start: 1,
          line_end: 1
        },
        {
          text: 'First, make sure you have Docker installed and running on your system.',
          source_file: 'test-transcript.txt',
          line_start: 2,
          line_end: 2
        }
      ];

      const results = await verifier.batchVerify(quotes, mockTranscript);

      expect(results).toHaveLength(2);
      expect(results[0].isValid).toBe(true);
      expect(results[1].isValid).toBe(true);
    });

    test('should handle empty batch gracefully', async () => {
      const results = await verifier.batchVerify([], mockTranscript);

      expect(results).toBeInstanceOf(Array);
      expect(results).toHaveLength(0);
    });

    test('should maintain order of verification results', async () => {
      const quotes = [
        { text: 'Quote 1', source_file: 'test.txt', line_start: 1, line_end: 1 },
        { text: 'Quote 2', source_file: 'test.txt', line_start: 2, line_end: 2 },
        { text: 'Quote 3', source_file: 'test.txt', line_start: 3, line_end: 3 }
      ];

      const results = await verifier.batchVerify(quotes, mockTranscript);

      expect(results).toHaveLength(3);
      results.forEach((result, index) => {
        expect(result.originalIndex).toBe(index);
      });
    });
  });

  describe('detectPotentialHallucinations', () => {
    test('should flag quotes with very low confidence as potential hallucinations', () => {
      const verificationResult = {
        isValid: false,
        confidence: 0.3,
        matchType: 'none',
        errors: ['Quote not found in source']
      };

      const isHallucination = verifier.detectPotentialHallucinations(verificationResult);

      expect(isHallucination).toBe(true);
    });

    test('should not flag high-confidence quotes as hallucinations', () => {
      const verificationResult = {
        isValid: true,
        confidence: 0.95,
        matchType: 'exact'
      };

      const isHallucination = verifier.detectPotentialHallucinations(verificationResult);

      expect(isHallucination).toBe(false);
    });

    test('should flag quotes with suspicious patterns', () => {
      const verificationResult = {
        isValid: true,
        confidence: 0.75,
        matchType: 'fuzzy',
        suspiciousPatterns: ['modern_language', 'technical_anachronism']
      };

      const isHallucination = verifier.detectPotentialHallucinations(verificationResult);

      expect(isHallucination).toBe(true);
    });
  });

  describe('generateVerificationReport', () => {
    test('should generate comprehensive verification report', async () => {
      const quotes = [
        {
          text: 'Welcome to this tutorial on setting up Claude Flow with Docker.',
          source_file: 'test-transcript.txt',
          line_start: 1,
          line_end: 1
        },
        {
          text: 'This quote does not exist.',
          source_file: 'test-transcript.txt',
          line_start: 10,
          line_end: 10
        }
      ];

      const report = await verifier.generateVerificationReport(quotes, mockTranscript);

      expect(report.totalQuotes).toBe(2);
      expect(report.validQuotes).toBe(1);
      expect(report.invalidQuotes).toBe(1);
      expect(report.averageConfidence).toBeGreaterThan(0);
      expect(report.verificationRate).toBe(0.5);
      expect(report.details).toHaveLength(2);
      expect(report.potentialHallucinations).toBe(1);
    });

    test('should handle empty quote list', async () => {
      const report = await verifier.generateVerificationReport([], mockTranscript);

      expect(report.totalQuotes).toBe(0);
      expect(report.validQuotes).toBe(0);
      expect(report.verificationRate).toBe(0);
      expect(report.details).toHaveLength(0);
    });
  });
});