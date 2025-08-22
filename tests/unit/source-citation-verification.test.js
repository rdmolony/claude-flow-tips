/**
 * @test Source Citation Verification
 * @description Validates that all extracted content has proper source citations
 * @prerequisites Mock transcript data and expected extractions
 */

const MockTranscriptParser = require('../mocks/transcript-parser.mock');
const expectedExtractions = require('../fixtures/expected-extractions.json');

describe('Source Citation Verification', () => {
  let parser;
  let mockTranscript;

  beforeEach(async () => {
    parser = new MockTranscriptParser();
    mockTranscript = await parser.parseTranscript('sample-transcript.txt');
  });

  describe('Citation Completeness', () => {
    it('should have source file reference for every extraction', () => {
      const categories = ['tips', 'gotchas', 'howtos', 'mentalModels', 'qa'];
      
      categories.forEach(category => {
        if (expectedExtractions[category]) {
          expectedExtractions[category].forEach((item, index) => {
            expect(item.source).toBeDefined();
            expect(item.source).toBe('sample-transcript.txt');
          }, `${category}[${index}] missing source reference`);
        }
      });
    });

    it('should have line numbers for every extraction', () => {
      expectedExtractions.tips.forEach((tip, index) => {
        expect(tip.lineNumber).toBeDefined();
        expect(typeof tip.lineNumber).toBe('number');
        expect(tip.lineNumber).toBeGreaterThan(0);
      });

      expectedExtractions.gotchas.forEach((gotcha, index) => {
        expect(gotcha.lineNumber).toBeDefined();
        expect(typeof gotcha.lineNumber).toBe('number');
        expect(gotcha.lineNumber).toBeGreaterThan(0);
      });
    });

    it('should have speaker attribution for all extractions', () => {
      const itemsWithSpeakers = [
        ...expectedExtractions.tips,
        ...expectedExtractions.gotchas,
        ...expectedExtractions.howtos,
        ...expectedExtractions.mentalModels
      ];

      itemsWithSpeakers.forEach((item, index) => {
        expect(item.speaker).toBeDefined();
        expect(item.speaker).toBeTruthy();
        expect(mockTranscript.speakers).toContain(item.speaker);
      });
    });

    it('should have both question and answer sources for Q&A', () => {
      expectedExtractions.qa.forEach((qa, index) => {
        expect(qa.questionSource).toBeDefined();
        expect(qa.answerSource).toBeDefined();
        expect(qa.questionLine).toBeDefined();
        expect(qa.answerLine).toBeDefined();
        expect(qa.questioner).toBeDefined();
        expect(qa.responder).toBeDefined();
      });
    });
  });

  describe('Quote Verification', () => {
    it('should have exact quotes from transcript for all extractions', () => {
      expectedExtractions.tips.forEach((tip, index) => {
        expect(tip.quote).toBeDefined();
        expect(tip.quote.length).toBeGreaterThan(10);
        // Verify quote contains key phrases from the tip
        expect(tip.quote.toLowerCase()).toContain('alias');
      });
    });

    it('should prevent hallucinated content', () => {
      const hallucinationKeywords = [
        'definitely', 'absolutely', 'always', 'never',
        'everyone knows', 'obviously', 'clearly'
      ];

      expectedExtractions.tips.forEach(tip => {
        hallucinationKeywords.forEach(keyword => {
          if (tip.content.toLowerCase().includes(keyword)) {
            // Verify the keyword also exists in the quote
            expect(tip.quote.toLowerCase()).toContain(keyword);
          }
        });
      });
    });

    it('should verify quote context matches line numbers', async () => {
      const transcriptLines = mockTranscript.lines;
      
      expectedExtractions.tips.forEach(tip => {
        if (tip.lineNumber <= transcriptLines.length) {
          const contextLines = transcriptLines.slice(
            Math.max(0, tip.lineNumber - 3),
            tip.lineNumber + 3
          );
          const context = contextLines.join(' ').toLowerCase();
          
          // Quote should appear somewhere in the context
          const quoteParts = tip.quote.toLowerCase().split(' ').slice(0, 3);
          const hasMatch = quoteParts.some(part => 
            context.includes(part) && part.length > 3
          );
          expect(hasMatch).toBe(true);
        }
      });
    });
  });

  describe('Anti-Hallucination Validation', () => {
    it('should reject extractions without proper citations', () => {
      const invalidExtraction = {
        content: 'This is made up content',
        // Missing required fields: source, lineNumber, quote
      };

      expect(() => validateExtraction(invalidExtraction)).toThrow();
    });

    it('should validate line numbers exist in transcript', () => {
      const totalLines = mockTranscript.lines.length;
      
      expectedExtractions.tips.forEach(tip => {
        expect(tip.lineNumber).toBeLessThanOrEqual(totalLines);
        expect(tip.lineNumber).toBeGreaterThan(0);
      });
    });

    it('should verify speakers exist in transcript', () => {
      const validSpeakers = mockTranscript.speakers;
      
      expectedExtractions.tips.forEach(tip => {
        expect(validSpeakers).toContain(tip.speaker);
      });

      expectedExtractions.qa.forEach(qa => {
        expect(validSpeakers).toContain(qa.questioner);
        expect(validSpeakers).toContain(qa.responder);
      });
    });

    it('should detect potentially fabricated quotes', () => {
      // Test for quotes that seem too perfect or contain suspicious patterns
      expectedExtractions.tips.forEach(tip => {
        // Check for overly formal language that might indicate hallucination
        const suspiciousPatterns = [
          /^in conclusion/i,
          /^to summarize/i,
          /^let me be clear/i,
          /^it is important to note/i
        ];

        const hasSuspiciousPattern = suspiciousPatterns.some(pattern => 
          pattern.test(tip.quote)
        );

        // If suspicious pattern found, ensure it matches transcript exactly
        if (hasSuspiciousPattern) {
          const transcriptContent = mockTranscript.content.toLowerCase();
          expect(transcriptContent).toContain(tip.quote.toLowerCase());
        }
      });
    });
  });
});

/**
 * Validation helper function
 */
function validateExtraction(extraction) {
  const requiredFields = ['source', 'lineNumber', 'quote'];
  
  for (const field of requiredFields) {
    if (!extraction[field]) {
      throw new Error(`Missing required field: ${field}`);
    }
  }
  
  return true;
}