import { TextImprover } from '../../../src/quality/improver/TextImprover';
import type { ImprovementConfig } from '../../../src/quality/types';

describe('TextImprover', () => {
  let improver: TextImprover;

  beforeEach(() => {
    improver = new TextImprover();
  });

  describe('improveText', () => {
    it('should improve text with spacing issues', async () => {
      const text = 'Hello    world  .  This   has   spacing   issues  .';
      const report = await improver.improveText(text);

      expect(report.improvedText).toBe('Hello world. This has spacing issues.');
      expect(report.metrics.after.spacingIssues).toBeLessThan(report.metrics.before.spacingIssues);
      expect(report.improvements.length).toBeGreaterThan(0);
    });

    it('should improve text with broken words', async () => {
      const text = 'I need some thing to day and any thing else.';
      const report = await improver.improveText(text);

      expect(report.improvedText).toContain('something');
      expect(report.improvedText).toContain('today');
      expect(report.improvedText).toContain('anything');
      expect(report.metrics.after.brokenWords).toBeLessThan(report.metrics.before.brokenWords);
    });

    it('should improve readability of complex text', async () => {
      const text = 'The utilization of sophisticated methodologies necessitates comprehensive understanding of complex paradigms and their practical applications in contemporary environments which facilitate enhanced performance outcomes.';
      const report = await improver.improveText(text);

      expect(report.metrics.after.readabilityScore).toBeGreaterThanOrEqual(report.metrics.before.readabilityScore);
      expect(report.improvedText).toContain('use'); // Should replace 'utilization'
      expect(report.improvements.some(imp => imp.type === 'vocabulary')).toBe(true);
    });

    it('should break up long sentences', async () => {
      const text = 'This is a very long sentence that goes on and on and contains multiple clauses and ideas that should probably be broken up into smaller, more manageable sentences for better readability and comprehension.';
      const report = await improver.improveText(text);

      expect(report.metrics.after.averageWordsPerSentence).toBeLessThanOrEqual(report.metrics.before.averageWordsPerSentence);
      expect(report.improvements.some(imp => imp.type === 'sentence-length')).toBe(true);
    });

    it('should handle already good text gracefully', async () => {
      const text = 'This is well-written text. It has good structure. The sentences are clear and concise.';
      const report = await improver.improveText(text);

      expect(report.improvedText).toBeDefined();
      expect(report.metrics.after.readabilityScore).toBeGreaterThan(70);
      expect(report.iterations).toBeLessThan(3); // Should not need many iterations
    });

    it('should respect configuration limits', async () => {
      const text = 'This text needs improvement but should stop early.';
      const config: ImprovementConfig = {
        maxIterations: 2,
        targetReadabilityScore: 80
      };
      const report = await improver.improveText(text, config);

      expect(report.iterations).toBeLessThanOrEqual(2);
    });

    it('should use aggressive normalization when enabled', async () => {
      const text = 'Helloâ€™world withâ€œweirdâ€\u009d encoding....issues!!!!';
      const config: ImprovementConfig = {
        enableAggressiveNormalization: true
      };
      const report = await improver.improveText(text, config);

      expect(report.improvedText).not.toContain('â€');
      expect(report.improvedText).toContain("'");
      expect(report.improvedText).toContain('"');
      expect(report.improvements.length).toBeGreaterThan(0);
    });

    it('should track processing time', async () => {
      const text = 'Simple test text.';
      const report = await improver.improveText(text);

      expect(report.processingTime).toBeGreaterThan(0);
      expect(report.processingTime).toBeLessThan(1000); // Should be fast for simple text
    });
  });

  describe('calculateImprovementScore', () => {
    it('should calculate positive score for improvements', async () => {
      const text = 'Hello    world  ,  some  thing  is  wrong   .';
      const report = await improver.improveText(text);
      const score = improver.calculateImprovementScore(report);

      expect(score).toBeGreaterThan(0);
    });

    it('should calculate zero or negative score for no improvements', async () => {
      const text = 'Perfect text with no issues.';
      const report = await improver.improveText(text);
      const score = improver.calculateImprovementScore(report);

      expect(score).toBeLessThanOrEqual(10); // Minimal improvement expected
    });
  });

  describe('generateImprovementSummary', () => {
    it('should generate meaningful summary for improvements', async () => {
      const text = 'Hello    world  ,  some  thing  is  wrong   .';
      const report = await improver.improveText(text);
      const summary = improver.generateImprovementSummary(report);

      expect(summary).toContain('Improvement Score:');
      expect(summary).toContain('spacing issues');
      expect(summary).toContain('broken words');
    });

    it('should handle case with no improvements', async () => {
      const text = 'Perfect text.';
      const report = await improver.improveText(text);
      const summary = improver.generateImprovementSummary(report);

      expect(summary).toContain('Improvement Score:');
    });
  });

  describe('edge cases', () => {
    it('should handle empty text', async () => {
      const report = await improver.improveText('');

      expect(report.improvedText).toBe('');
      expect(report.improvements).toEqual([]);
      expect(report.iterations).toBe(0);
    });

    it('should handle text with only punctuation', async () => {
      const text = '!!! ??? ...';
      const report = await improver.improveText(text);

      expect(report.improvedText).toBeDefined();
      expect(report.processingTime).toBeGreaterThan(0);
    });

    it('should handle very short text', async () => {
      const text = 'Hi.';
      const report = await improver.improveText(text);

      expect(report.improvedText).toBe('Hi.');
      expect(report.metrics.after.wordCount).toBe(1);
    });

    it('should handle text with special characters', async () => {
      const text = 'Code: function() { return "test"; }';
      const report = await improver.improveText(text);

      expect(report.improvedText).toContain('function()');
      expect(report.improvedText).toContain('"test"');
    });

    it('should handle very long text', async () => {
      const longText = 'This is a sentence. '.repeat(100);
      const report = await improver.improveText(longText);

      expect(report.improvedText.length).toBeGreaterThan(1000);
      expect(report.processingTime).toBeLessThan(5000); // Should complete within reasonable time
    });

    it('should prevent infinite loops', async () => {
      const text = 'Problematic text that might cause loops.';
      const config: ImprovementConfig = {
        maxIterations: 10,
        minImprovementThreshold: 0.1
      };
      const report = await improver.improveText(text, config);

      expect(report.iterations).toBeLessThanOrEqual(10);
      expect(report.processingTime).toBeLessThan(10000); // Should not take too long
    });
  });

  describe('configuration options', () => {
    it('should respect maxIterations', async () => {
      const text = 'Text that needs lots of improvements and iterations to get better.';
      const config: ImprovementConfig = {
        maxIterations: 1
      };
      const report = await improver.improveText(text, config);

      expect(report.iterations).toBeLessThanOrEqual(1);
    });

    it('should respect minImprovementThreshold', async () => {
      const text = 'Text with minor issues.';
      const config: ImprovementConfig = {
        minImprovementThreshold: 10.0 // Very high threshold
      };
      const report = await improver.improveText(text, config);

      expect(report.iterations).toBeLessThan(3); // Should stop early due to high threshold
    });

    it('should respect targetReadabilityScore', async () => {
      const text = 'Simple text that is already readable.';
      const config: ImprovementConfig = {
        targetReadabilityScore: 90 // Very high target
      };
      const report = await improver.improveText(text, config);

      expect(report.metrics.after.readabilityScore).toBeGreaterThanOrEqual(80);
    });
  });
});