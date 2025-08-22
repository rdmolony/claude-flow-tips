import { QualitySystem } from '../../../src/quality';
import type { ImprovementConfig, ReadabilityConfig } from '../../../src/quality/types';

describe('QualitySystem Integration Tests', () => {
  let qualitySystem: QualitySystem;

  beforeEach(() => {
    qualitySystem = new QualitySystem();
  });

  describe('processText - Full Workflow', () => {
    it('should process text with multiple quality issues', async () => {
      const poorText = 'hello    world  ,  some  thing  is  very   wrong  here  and  this  sentence  is  way  too  long  and  contains  many  issues  that  need  to  be  fixed  including  spacing  problems  broken  words  and  poor  readability  due  to  sentence  length  and  complexity   .';
      
      const result = await qualitySystem.processText(poorText);

      // Check that improvements were made
      expect(result.report.improvedText).not.toBe(poorText);
      expect(result.report.metrics.after.spacingIssues).toBeLessThan(result.report.metrics.before.spacingIssues);
      expect(result.report.metrics.after.brokenWords).toBeLessThan(result.report.metrics.before.brokenWords);
      expect(result.report.improvements.length).toBeGreaterThan(0);

      // Check validation
      expect(result.validation.isValid).toBe(true);
      expect(result.finalQuality.score).toBeGreaterThan(result.validation.score);

      // Check summary
      expect(result.summary.improvement).toContain('Improvement Score:');
      expect(result.summary.validation).toContain('Quality Validation:');
      expect(result.summary.finalScore).toBeGreaterThanOrEqual(0);
    });

    it('should handle already good text gracefully', async () => {
      const goodText = 'This is well-written text. It has good structure and readability. The sentences are appropriately sized.';
      
      const result = await qualitySystem.processText(goodText);

      expect(result.report.improvedText).toBeDefined();
      expect(result.validation.isValid).toBe(true);
      expect(result.finalQuality.passed).toBe(true);
      expect(result.summary.finalScore).toBeGreaterThan(70);
    });

    it('should work with custom improvement configuration', async () => {
      const text = 'Text that needs improvement but should be processed with custom settings.';
      const improvementConfig: ImprovementConfig = {
        maxIterations: 2,
        targetReadabilityScore: 75,
        enableAggressiveNormalization: true
      };

      const result = await qualitySystem.processText(text, improvementConfig);

      expect(result.report.iterations).toBeLessThanOrEqual(2);
      expect(result.report.improvedText).toBeDefined();
      expect(result.validation.isValid).toBe(true);
    });

    it('should work with custom validation configuration', async () => {
      const text = 'This is a reasonably complex sentence that might not meet strict validation criteria.';
      const improvementConfig: ImprovementConfig = {};
      const validationConfig: ReadabilityConfig = {
        targetLevel: 8,
        maxSentenceLength: 12,
        allowedComplexity: 'moderate'
      };

      const result = await qualitySystem.processText(text, improvementConfig, validationConfig);

      expect(result.finalQuality.isValid).toBeDefined();
      expect(result.summary).toBeDefined();
    });

    it('should handle edge case: empty text', async () => {
      const result = await qualitySystem.processText('');

      expect(result.report.improvedText).toBe('');
      expect(result.report.improvements).toHaveLength(0);
      expect(result.validation.isValid).toBe(true);
      expect(result.finalQuality.isValid).toBe(true);
    });

    it('should handle edge case: text with only punctuation', async () => {
      const text = '!!! ??? ... !!!';
      const result = await qualitySystem.processText(text);

      expect(result.report.improvedText).toBeDefined();
      expect(result.validation.isValid).toBe(true);
      expect(result.summary).toBeDefined();
    });

    it('should maintain performance with long text', async () => {
      const longText = 'This is a sentence that will be repeated many times to create a long text for testing performance. '.repeat(50);
      
      const startTime = performance.now();
      const result = await qualitySystem.processText(longText);
      const processingTime = performance.now() - startTime;

      expect(result.report.improvedText).toBeDefined();
      expect(result.validation.isValid).toBe(true);
      expect(processingTime).toBeLessThan(10000); // Should complete within 10 seconds
    });
  });

  describe('Real-world Text Scenarios', () => {
    it('should improve transcript-like text', async () => {
      const transcriptText = `um  hello  everyone  uh  welcome  to  this  uh  presentation  about  some  thing  really  important  .  so  uh  lets  start  with  uh  the  basics  and  then  we  can  uh  move  on  to  more  advanced  topics  .`;
      
      const result = await qualitySystem.processText(transcriptText);

      expect(result.report.improvedText).not.toContain('  '); // Double spaces should be fixed
      expect(result.report.improvedText).toContain('something'); // Broken words should be fixed
      expect(result.report.metrics.after.spacingIssues).toBe(0);
      expect(result.validation.passed).toBe(true);
    });

    it('should improve OCR-corrupted text', async () => {
      const ocrText = `Th-
is  is  corrupted  O C R  text  with  l  i  k  e  weird  spacing  and  brok-
en  words  every  where  .  It  needs  comprehensive  cleaning  .`;
      
      const result = await qualitySystem.processText(
        ocrText,
        { enableAggressiveNormalization: true }
      );

      expect(result.report.improvedText).not.toContain('-\n'); // Line breaks should be fixed
      expect(result.report.improvedText).toContain('like'); // Spaced letters should be fixed
      expect(result.report.metrics.after.brokenWords).toBeLessThan(result.report.metrics.before.brokenWords);
    });

    it('should improve academic text readability', async () => {
      const academicText = `The implementation of sophisticated algorithmic methodologies necessitates comprehensive understanding of computational complexity theory and its practical applications in contemporary software engineering paradigms which facilitate enhanced performance optimization outcomes.`;
      
      const result = await qualitySystem.processText(academicText);

      expect(result.report.metrics.after.readabilityScore).toBeGreaterThan(result.report.metrics.before.readabilityScore);
      expect(result.report.improvedText).toContain('use'); // Should simplify 'implementation'
      expect(result.report.improvements.some(imp => imp.type === 'vocabulary')).toBe(true);
    });

    it('should handle mixed quality issues', async () => {
      const mixedText = `This  text  has   multiple   problems   .   some  thing  is  wrong  with  spacing  and  this  sentence  is  extremely  long  and  contains  many  clauses  and  ideas  that  should  be  broken  up  and  it  also  has  some  sophisticated  terminology  that  could  be  simplified  for  better  comprehension  and  readability  .`;
      
      const result = await qualitySystem.processText(mixedText);

      // Should fix spacing
      expect(result.report.metrics.after.spacingIssues).toBeLessThan(result.report.metrics.before.spacingIssues);
      
      // Should fix broken words
      expect(result.report.improvedText).toContain('something');
      
      // Should improve sentence structure
      expect(result.report.metrics.after.averageWordsPerSentence).toBeLessThan(result.report.metrics.before.averageWordsPerSentence);
      
      // Should have multiple improvement types
      const improvementTypes = new Set(result.report.improvements.map(imp => imp.type));
      expect(improvementTypes.size).toBeGreaterThan(1);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle text with special characters', async () => {
      const specialText = `This text contains @#$%^&*() special chars and "quotes" and 'apostrophes' and [brackets].`;
      
      const result = await qualitySystem.processText(specialText);

      expect(result.report.improvedText).toContain('@#$%^&*()');
      expect(result.report.improvedText).toContain('"quotes"');
      expect(result.validation.isValid).toBe(true);
    });

    it('should handle text with code snippets', async () => {
      const codeText = `Here is some code: function test() { return "hello world"; } and it should be preserved.`;
      
      const result = await qualitySystem.processText(codeText);

      expect(result.report.improvedText).toContain('function test()');
      expect(result.report.improvedText).toContain('"hello world"');
      expect(result.validation.isValid).toBe(true);
    });

    it('should handle text with numbers and dates', async () => {
      const numericText = `On January 1st, 2023, there were 1,000 users and 50.5% growth rate.`;
      
      const result = await qualitySystem.processText(numericText);

      expect(result.report.improvedText).toContain('2023');
      expect(result.report.improvedText).toContain('1,000');
      expect(result.report.improvedText).toContain('50.5%');
      expect(result.validation.isValid).toBe(true);
    });

    it('should handle malformed input gracefully', async () => {
      const malformedText = `\t\t\n\n   \n\t   This   has   weird   whitespace   \n\n\t   `;
      
      const result = await qualitySystem.processText(malformedText);

      expect(result.report.improvedText.trim()).toBe('This has weird whitespace');
      expect(result.validation.isValid).toBe(true);
    });
  });

  describe('Performance and Reliability', () => {
    it('should be consistent across multiple runs', async () => {
      const text = 'This  text  has  spacing   issues  and  some  thing  wrong  .';
      
      const results = await Promise.all([
        qualitySystem.processText(text),
        qualitySystem.processText(text),
        qualitySystem.processText(text)
      ]);

      // All results should be identical
      expect(results[0].report.improvedText).toBe(results[1].report.improvedText);
      expect(results[1].report.improvedText).toBe(results[2].report.improvedText);
      
      // All should pass validation
      results.forEach(result => {
        expect(result.validation.isValid).toBe(true);
        expect(result.finalQuality.passed).toBe(true);
      });
    });

    it('should handle concurrent processing', async () => {
      const texts = [
        'First  text  with  spacing   issues  .',
        'Second  text  with  some  thing  wrong  .',
        'Third  text  with  very   bad   spacing   .',
        'Fourth  text  that  needs  improvement  .'
      ];

      const results = await Promise.all(
        texts.map(text => qualitySystem.processText(text))
      );

      expect(results).toHaveLength(4);
      results.forEach((result, index) => {
        expect(result.report.improvedText).toBeDefined();
        expect(result.report.improvedText).not.toBe(texts[index]);
        expect(result.validation.isValid).toBe(true);
      });
    });

    it('should complete within reasonable time limits', async () => {
      const complexText = 'This is a moderately complex text that needs various improvements including spacing fixes, vocabulary simplification, and sentence structure optimization. '.repeat(10);
      
      const startTime = performance.now();
      const result = await qualitySystem.processText(complexText);
      const totalTime = performance.now() - startTime;

      expect(result.report.improvedText).toBeDefined();
      expect(result.validation.isValid).toBe(true);
      expect(totalTime).toBeLessThan(15000); // Should complete within 15 seconds
    });
  });
});