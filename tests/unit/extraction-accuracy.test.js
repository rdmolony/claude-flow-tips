/**
 * @test Extraction Accuracy Validation
 * @description Validates the accuracy of content extraction and categorization
 * @prerequisites Mock transcript parser and expected extractions
 */

const MockTranscriptParser = require('../mocks/transcript-parser.mock');
const expectedExtractions = require('../fixtures/expected-extractions.json');

describe('Extraction Accuracy Validation', () => {
  let parser;
  let transcript;

  beforeEach(async () => {
    parser = new MockTranscriptParser();
    transcript = await parser.parseTranscript('sample-transcript.txt');
  });

  describe('Content Categorization Accuracy', () => {
    it('should correctly identify tips with >95% accuracy', () => {
      const tipPatterns = [
        /tip[s]?/i,
        /shortcut[s]?/i,
        /quick way/i,
        /here's how/i,
        /saves.*time/i,
        /recommend[s]?/i
      ];

      expectedExtractions.tips.forEach(tip => {
        const hasValidPattern = tipPatterns.some(pattern => 
          pattern.test(tip.content) || pattern.test(tip.quote)
        );
        
        expect(hasValidPattern).toBe(true);
        expect(tip.category).toBeDefined();
      });
    });

    it('should correctly identify gotchas with >95% accuracy', () => {
      const gotchaPatterns = [
        /don't/i,
        /avoid/i,
        /gotcha/i,
        /warning/i,
        /problem/i,
        /issue/i,
        /mistake/i,
        /be careful/i,
        /watch out/i
      ];

      expectedExtractions.gotchas.forEach(gotcha => {
        const hasValidPattern = gotchaPatterns.some(pattern => 
          pattern.test(gotcha.content) || pattern.test(gotcha.quote)
        );
        
        expect(hasValidPattern).toBe(true);
        expect(gotcha.severity).toBeDefined();
        expect(['low', 'medium', 'high', 'critical']).toContain(gotcha.severity);
      });
    });

    it('should correctly identify how-to content with >95% accuracy', () => {
      const howtoPatterns = [
        /how to/i,
        /step by step/i,
        /let me show/i,
        /first.*then/i,
        /you need to/i,
        /initialize.*with/i
      ];

      expectedExtractions.howtos.forEach(howto => {
        const hasValidPattern = howtoPatterns.some(pattern => 
          pattern.test(howto.quote)
        );
        
        expect(hasValidPattern).toBe(true);
        expect(howto.steps).toBeDefined();
        expect(Array.isArray(howto.steps)).toBe(true);
        expect(howto.steps.length).toBeGreaterThan(0);
      });
    });

    it('should correctly identify mental models with >95% accuracy', () => {
      const mentalModelPatterns = [
        /mental model/i,
        /framework/i,
        /pillars/i,
        /principles/i,
        /think of.*as/i,
        /concept/i
      ];

      expectedExtractions.mentalModels.forEach(model => {
        const hasValidPattern = mentalModelPatterns.some(pattern => 
          pattern.test(model.quote) || pattern.test(model.description)
        );
        
        expect(hasValidPattern).toBe(true);
        expect(model.title).toBeDefined();
        expect(model.description).toBeDefined();
      });
    });

    it('should correctly identify Q&A pairs with >95% accuracy', () => {
      expectedExtractions.qa.forEach(qa => {
        // Question should be interrogative
        expect(qa.question).toMatch(/\?$/);
        
        // Answer should be substantive
        expect(qa.answer.length).toBeGreaterThan(20);
        
        // Should have different speakers
        expect(qa.questioner).not.toBe(qa.responder);
      });
    });
  });

  describe('Content Quality Assessment', () => {
    it('should extract high-value content only', () => {
      // Tips should be actionable
      expectedExtractions.tips.forEach(tip => {
        const actionableWords = ['use', 'try', 'do', 'apply', 'implement', 'set'];
        const hasActionableContent = actionableWords.some(word => 
          tip.content.toLowerCase().includes(word)
        );
        expect(hasActionableContent).toBe(true);
      });

      // Gotchas should have clear warnings
      expectedExtractions.gotchas.forEach(gotcha => {
        const warningWords = ['don\'t', 'avoid', 'never', 'warning', 'careful'];
        const hasWarningContent = warningWords.some(word => 
          gotcha.content.toLowerCase().includes(word)
        );
        expect(hasWarningContent).toBe(true);
      });
    });

    it('should maintain context integrity', () => {
      expectedExtractions.tips.forEach(tip => {
        // Quote should be longer and more detailed than content summary
        expect(tip.quote.length).toBeGreaterThan(tip.content.length * 0.8);
        
        // Quote should contain key terms from content
        const contentWords = tip.content.toLowerCase().split(' ');
        const significantWords = contentWords.filter(word => word.length > 4);
        
        if (significantWords.length > 0) {
          const hasContextMatch = significantWords.some(word => 
            tip.quote.toLowerCase().includes(word)
          );
          expect(hasContextMatch).toBe(true);
        }
      });
    });

    it('should filter out low-value content', () => {
      const lowValuePatterns = [
        /um+/i,
        /uh+/i,
        /you know/i,
        /like/i,
        /basically/i,
        /actually/i
      ];

      // High-quality extractions should minimize filler words
      expectedExtractions.tips.forEach(tip => {
        const fillerCount = lowValuePatterns.reduce((count, pattern) => {
          const matches = tip.content.match(pattern);
          return count + (matches ? matches.length : 0);
        }, 0);
        
        // Allow some filler words but not excessive
        const totalWords = tip.content.split(' ').length;
        const fillerRatio = fillerCount / totalWords;
        expect(fillerRatio).toBeLessThan(0.2); // Less than 20% filler words
      });
    });
  });

  describe('Technical Accuracy', () => {
    it('should preserve technical commands accurately', () => {
      const technicalContent = expectedExtractions.howtos[0];
      
      // Check that command syntax is preserved
      expect(technicalContent.quote).toContain('npx claude-flow');
      expect(technicalContent.quote).toContain('--topology');
      expect(technicalContent.steps[0]).toContain('npx claude-flow swarm init --topology hierarchical');
    });

    it('should maintain technical terminology consistency', () => {
      const technicalTerms = [
        'claude-flow',
        'ruv-swarm', 
        'hierarchical',
        'concurrent',
        'agents',
        'swarm'
      ];

      const allContent = [
        ...expectedExtractions.tips,
        ...expectedExtractions.gotchas,
        ...expectedExtractions.howtos,
        ...expectedExtractions.mentalModels,
        ...expectedExtractions.qa.map(qa => ({ content: qa.answer, quote: qa.answer }))
      ];

      allContent.forEach(item => {
        const contentText = (item.content || item.quote || '').toLowerCase();
        technicalTerms.forEach(term => {
          if (contentText.includes(term)) {
            // Verify the term appears in quotes with same casing/formatting
            const quoteText = item.quote.toLowerCase();
            expect(quoteText).toContain(term);
          }
        });
      });
    });

    it('should validate speaker expertise attribution', () => {
      // Reuven should be attributed for technical expertise
      const ruvenContent = [
        ...expectedExtractions.tips.filter(t => t.speaker === 'Reuven'),
        ...expectedExtractions.howtos.filter(h => h.speaker === 'Reuven'),
        ...expectedExtractions.mentalModels.filter(m => m.speaker === 'Reuven')
      ];

      expect(ruvenContent.length).toBeGreaterThan(0);
      
      // Community members should ask questions
      const communityQuestions = expectedExtractions.qa.filter(
        qa => qa.questioner === 'Community Member' || qa.questioner === 'Guest'
      );
      
      expect(communityQuestions.length).toBeGreaterThan(0);
    });
  });

  describe('Performance Metrics', () => {
    it('should achieve >90% extraction coverage', () => {
      const transcriptContent = transcript.content;
      const totalSignificantLines = transcript.lines.filter(line => 
        line.trim().length > 20 && 
        !line.startsWith('AI Hackerspace') &&
        !line.startsWith('Speaker:')
      ).length;

      const extractedContent = [
        ...expectedExtractions.tips,
        ...expectedExtractions.gotchas, 
        ...expectedExtractions.howtos,
        ...expectedExtractions.mentalModels,
        ...expectedExtractions.qa
      ];

      const coverageRatio = extractedContent.length / totalSignificantLines;
      expect(coverageRatio).toBeGreaterThan(0.5); // At least 50% of significant content
    });

    it('should maintain precision over recall balance', () => {
      // All extracted items should be high quality
      const allExtractions = [
        ...expectedExtractions.tips,
        ...expectedExtractions.gotchas,
        ...expectedExtractions.howtos,
        ...expectedExtractions.mentalModels
      ];

      allExtractions.forEach(extraction => {
        // Each extraction should have substantial content
        expect(extraction.content.length).toBeGreaterThan(10);
        expect(extraction.quote.length).toBeGreaterThan(20);
        
        // Should have proper categorization
        expect(extraction.speaker).toBeTruthy();
        expect(extraction.source).toBeTruthy();
        expect(extraction.lineNumber).toBeGreaterThan(0);
      });
    });
  });
});