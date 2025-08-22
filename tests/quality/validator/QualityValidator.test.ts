import { QualityValidator } from '../../../src/quality/validator/QualityValidator';
import { TextImprover } from '../../../src/quality/improver/TextImprover';
import type { ReadabilityConfig } from '../../../src/quality/types';

describe('QualityValidator', () => {
  let validator: QualityValidator;
  let improver: TextImprover;

  beforeEach(() => {
    validator = new QualityValidator();
    improver = new TextImprover();
  });

  describe('validateQuality', () => {
    it('should pass validation for good quality text', () => {
      const text = 'This is well-written text. It has good structure. The sentences are clear and concise.';
      const result = validator.validateQuality(text);

      expect(result.isValid).toBe(true);
      expect(result.passed).toBe(true);
      expect(result.score).toBeGreaterThan(70);
      expect(result.issues).toHaveLength(0);
    });

    it('should fail validation for poor quality text', () => {
      const text = 'this   is  very   bad   text  with  lots   of  issues  and  extremely  long  sentences  that  go  on  and  on  without  proper  punctuation  or  structure  making  it  very  difficult  to  read  and  understand  what  the  author  is  trying  to  communicate  to  the  reader   .';
      const result = validator.validateQuality(text);

      expect(result.isValid).toBe(false);
      expect(result.passed).toBe(false);
      expect(result.score).toBeLessThan(70);
      expect(result.issues.length).toBeGreaterThan(0);
    });

    it('should detect spacing issues', () => {
      const text = 'Hello    world  .  This   has   spacing   issues  .';
      const result = validator.validateQuality(text);

      expect(result.issues.some(issue => issue.includes('spacing issues'))).toBe(true);
    });

    it('should detect broken words', () => {
      const text = 'I need some thing to day and any thing else.';
      const result = validator.validateQuality(text);

      expect(result.issues.some(issue => issue.includes('broken words'))).toBe(true);
    });

    it('should respect configuration limits', () => {
      const text = 'This is a moderately complex sentence with some advanced vocabulary.';
      const config: ReadabilityConfig = {
        targetLevel: 8,
        maxSentenceLength: 10,
        allowedComplexity: 'simple'
      };
      const result = validator.validateQuality(text, config);

      expect(result.issues.length).toBeGreaterThan(0);
    });

    it('should generate appropriate warnings', () => {
      const text = 'The implementation of sophisticated methodologies necessitates comprehensive understanding.';
      const result = validator.validateQuality(text);

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(warning => 
        warning.includes('difficult to read') || warning.includes('complex vocabulary')
      )).toBe(true);
    });
  });

  describe('validateImprovement', () => {
    it('should validate successful improvement', async () => {
      const text = 'Hello    world  ,  some  thing  is  wrong   .';
      const report = await improver.improveText(text);
      const result = validator.validateImprovement(report);

      expect(result.isValid).toBe(true);
      expect(result.score).toBeGreaterThan(50);
      expect(result.passed).toBe(true);
    });

    it('should detect when improvements did not occur', async () => {
      const text = 'Perfect text with no issues.';
      const report = await improver.improveText(text);
      const result = validator.validateImprovement(report);

      // Should have warnings about no improvement
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should detect regression in quality', async () => {
      // Simulate a report where quality got worse
      const report = {
        originalText: 'Good text.',
        improvedText: 'Bad   text   with   issues   .',
        metrics: {
          before: {
            readabilityScore: 80,
            spacingIssues: 0,
            brokenWords: 0,
            fleschKincaidLevel: 8,
            averageWordsPerSentence: 10,
            averageSyllablesPerWord: 1.2,
            complexity: 'simple' as const,
            sentenceCount: 1,
            wordCount: 2,
            syllableCount: 2
          },
          after: {
            readabilityScore: 60,
            spacingIssues: 5,
            brokenWords: 2,
            fleschKincaidLevel: 12,
            averageWordsPerSentence: 15,
            averageSyllablesPerWord: 1.8,
            complexity: 'complex' as const,
            sentenceCount: 1,
            wordCount: 6,
            syllableCount: 10
          }
        },
        improvements: [],
        iterations: 1,
        processingTime: 100
      };

      const result = validator.validateImprovement(report);

      expect(result.isValid).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
    });

    it('should warn about excessive processing time', async () => {
      const text = 'Simple text.';
      const report = await improver.improveText(text);
      // Simulate long processing time
      report.processingTime = 6000;

      const result = validator.validateImprovement(report);

      expect(result.warnings.some(warning => 
        warning.includes('processing time')
      )).toBe(true);
    });

    it('should warn about maximum iterations reached', async () => {
      const text = 'Text that needs improvement.';
      const report = await improver.improveText(text, { maxIterations: 5 });
      // Simulate max iterations
      report.iterations = 5;

      const result = validator.validateImprovement(report);

      expect(result.warnings.some(warning => 
        warning.includes('Maximum iterations')
      )).toBe(true);
    });
  });

  describe('validateBatch', () => {
    it('should validate multiple texts', async () => {
      const texts = [
        'Good text with proper structure.',
        'Bad   text   with   issues   .',
        'Another well-written sentence.'
      ];

      const results = await validator.validateBatch(texts);

      expect(results).toHaveLength(3);
      expect(results[0].passed).toBe(true);
      expect(results[1].passed).toBe(false);
      expect(results[2].passed).toBe(true);
    });

    it('should handle empty array', async () => {
      const results = await validator.validateBatch([]);
      expect(results).toHaveLength(0);
    });

    it('should apply configuration to all texts', async () => {
      const texts = ['Simple text.', 'Another simple text.'];
      const config: ReadabilityConfig = { targetLevel: 6 };

      const results = await validator.validateBatch(texts, config);

      expect(results).toHaveLength(2);
      results.forEach(result => {
        // Both should pass with low target level
        expect(result.score).toBeGreaterThan(50);
      });
    });
  });

  describe('generateValidationSummary', () => {
    it('should generate summary for passed validation', () => {
      const result = {
        isValid: true,
        score: 85,
        issues: [],
        warnings: [],
        passed: true
      };

      const summary = validator.generateValidationSummary(result);

      expect(summary).toContain('PASSED');
      expect(summary).toContain('85/100');
    });

    it('should generate summary for failed validation', () => {
      const result = {
        isValid: false,
        score: 45,
        issues: ['Found 5 spacing issues', 'Text too complex'],
        warnings: ['Low readability score'],
        passed: false
      };

      const summary = validator.generateValidationSummary(result);

      expect(summary).toContain('FAILED');
      expect(summary).toContain('45/100');
      expect(summary).toContain('Issues:');
      expect(summary).toContain('spacing issues');
      expect(summary).toContain('Warnings:');
      expect(summary).toContain('Low readability');
    });

    it('should generate summary for valid but not passed', () => {
      const result = {
        isValid: true,
        score: 65,
        issues: [],
        warnings: ['Could be improved'],
        passed: false
      };

      const summary = validator.generateValidationSummary(result);

      expect(summary).toContain('VALID');
      expect(summary).toContain('65/100');
    });
  });

  describe('edge cases', () => {
    it('should handle empty text', () => {
      const result = validator.validateQuality('');

      expect(result.isValid).toBeDefined();
      expect(result.score).toBeGreaterThanOrEqual(0);
    });

    it('should handle text with only punctuation', () => {
      const result = validator.validateQuality('!!! ??? ...');

      expect(result.isValid).toBeDefined();
      expect(result.score).toBeGreaterThanOrEqual(0);
    });

    it('should handle very short text', () => {
      const result = validator.validateQuality('Hi.');

      expect(result.isValid).toBe(true);
      expect(result.score).toBeGreaterThan(50);
    });

    it('should handle very long text', () => {
      const longText = 'This is a good sentence. '.repeat(100);
      const result = validator.validateQuality(longText);

      expect(result.isValid).toBeDefined();
      expect(result.score).toBeGreaterThan(50);
    });

    it('should handle text with special characters', () => {
      const text = 'Code: function() { return "test"; }';
      const result = validator.validateQuality(text);

      expect(result.isValid).toBeDefined();
      expect(result.score).toBeGreaterThanOrEqual(0);
    });
  });

  describe('configuration edge cases', () => {
    it('should handle extreme configuration values', () => {
      const text = 'Simple test text.';
      const config: ReadabilityConfig = {
        targetLevel: 1,
        maxSentenceLength: 2,
        allowedComplexity: 'simple'
      };

      const result = validator.validateQuality(text, config);

      expect(result.isValid).toBeDefined();
      expect(result.score).toBeGreaterThanOrEqual(0);
    });

    it('should handle undefined configuration values', () => {
      const text = 'Test text.';
      const config: ReadabilityConfig = {
        targetLevel: undefined,
        maxSentenceLength: undefined
      };

      const result = validator.validateQuality(text, config);

      expect(result.isValid).toBeDefined();
      expect(result.score).toBeGreaterThanOrEqual(0);
    });
  });
});