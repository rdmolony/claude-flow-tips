import { QualitySystem } from '../../../src/quality';
import { TextNormalizer } from '../../../src/quality/normalizer/TextNormalizer';
import { ReadabilityScorer } from '../../../src/quality/scorer/ReadabilityScorer';
import { TextImprover } from '../../../src/quality/improver/TextImprover';
import { QualityValidator } from '../../../src/quality/validator/QualityValidator';

describe('Quality System Performance Benchmarks', () => {
  let qualitySystem: QualitySystem;
  let normalizer: TextNormalizer;
  let scorer: ReadabilityScorer;
  let improver: TextImprover;
  let validator: QualityValidator;

  beforeEach(() => {
    qualitySystem = new QualitySystem();
    normalizer = new TextNormalizer();
    scorer = new ReadabilityScorer();
    improver = new TextImprover();
    validator = new QualityValidator();
  });

  const generateTestText = (size: 'small' | 'medium' | 'large' | 'xlarge') => {
    const baseText = 'This  is  a  test  sentence  with  some  thing  wrong  and  spacing   issues  that  needs  improvement  for  better  readability  and  comprehension  . ';
    
    const multipliers = {
      small: 1,      // ~20 words
      medium: 10,    // ~200 words  
      large: 50,     // ~1,000 words
      xlarge: 200    // ~4,000 words
    };
    
    return baseText.repeat(multipliers[size]);
  };

  describe('TextNormalizer Performance', () => {
    const benchmarkNormalizer = (text: string, testName: string) => {
      const startTime = performance.now();
      const result = normalizer.normalize(text);
      const endTime = performance.now();
      const processingTime = endTime - startTime;

      console.log(`${testName}: ${processingTime.toFixed(2)}ms`);
      console.log(`  - Characters: ${text.length}`);
      console.log(`  - Changes: ${result.changes.length}`);
      console.log(`  - Rate: ${(text.length / processingTime * 1000).toFixed(0)} chars/sec`);

      return { result, processingTime };
    };

    it('should normalize small text quickly', () => {
      const text = generateTestText('small');
      const { processingTime } = benchmarkNormalizer(text, 'Small Text Normalization');
      
      expect(processingTime).toBeLessThan(10); // Should complete in <10ms
    });

    it('should normalize medium text efficiently', () => {
      const text = generateTestText('medium');
      const { processingTime } = benchmarkNormalizer(text, 'Medium Text Normalization');
      
      expect(processingTime).toBeLessThan(50); // Should complete in <50ms
    });

    it('should normalize large text within reasonable time', () => {
      const text = generateTestText('large');
      const { processingTime } = benchmarkNormalizer(text, 'Large Text Normalization');
      
      expect(processingTime).toBeLessThan(200); // Should complete in <200ms
    });

    it('should handle xlarge text without timeout', () => {
      const text = generateTestText('xlarge');
      const { processingTime } = benchmarkNormalizer(text, 'XLarge Text Normalization');
      
      expect(processingTime).toBeLessThan(1000); // Should complete in <1s
    });
  });

  describe('ReadabilityScorer Performance', () => {
    const benchmarkScorer = (text: string, testName: string) => {
      const startTime = performance.now();
      const metrics = scorer.calculateMetrics(text);
      const endTime = performance.now();
      const processingTime = endTime - startTime;

      console.log(`${testName}: ${processingTime.toFixed(2)}ms`);
      console.log(`  - Words: ${metrics.wordCount}`);
      console.log(`  - Sentences: ${metrics.sentenceCount}`);
      console.log(`  - Readability Score: ${metrics.readabilityScore}`);
      console.log(`  - Rate: ${(metrics.wordCount / processingTime * 1000).toFixed(0)} words/sec`);

      return { metrics, processingTime };
    };

    it('should score small text quickly', () => {
      const text = generateTestText('small');
      const { processingTime } = benchmarkScorer(text, 'Small Text Scoring');
      
      expect(processingTime).toBeLessThan(5); // Should complete in <5ms
    });

    it('should score medium text efficiently', () => {
      const text = generateTestText('medium');
      const { processingTime } = benchmarkScorer(text, 'Medium Text Scoring');
      
      expect(processingTime).toBeLessThan(25); // Should complete in <25ms
    });

    it('should score large text within reasonable time', () => {
      const text = generateTestText('large');
      const { processingTime } = benchmarkScorer(text, 'Large Text Scoring');
      
      expect(processingTime).toBeLessThan(100); // Should complete in <100ms
    });

    it('should handle xlarge text efficiently', () => {
      const text = generateTestText('xlarge');
      const { processingTime } = benchmarkScorer(text, 'XLarge Text Scoring');
      
      expect(processingTime).toBeLessThan(400); // Should complete in <400ms
    });
  });

  describe('TextImprover Performance', () => {
    const benchmarkImprover = async (text: string, testName: string) => {
      const startTime = performance.now();
      const report = await improver.improveText(text, { maxIterations: 3 });
      const endTime = performance.now();
      const totalTime = endTime - startTime;

      console.log(`${testName}: ${totalTime.toFixed(2)}ms`);
      console.log(`  - Iterations: ${report.iterations}`);
      console.log(`  - Improvements: ${report.improvements.length}`);
      console.log(`  - Score Increase: ${(report.metrics.after.readabilityScore - report.metrics.before.readabilityScore).toFixed(1)}`);
      console.log(`  - Internal Processing: ${report.processingTime.toFixed(2)}ms`);

      return { report, totalTime };
    };

    it('should improve small text quickly', async () => {
      const text = generateTestText('small');
      const { totalTime } = await benchmarkImprover(text, 'Small Text Improvement');
      
      expect(totalTime).toBeLessThan(50); // Should complete in <50ms
    });

    it('should improve medium text efficiently', async () => {
      const text = generateTestText('medium');
      const { totalTime } = await benchmarkImprover(text, 'Medium Text Improvement');
      
      expect(totalTime).toBeLessThan(200); // Should complete in <200ms
    });

    it('should improve large text within reasonable time', async () => {
      const text = generateTestText('large');
      const { totalTime } = await benchmarkImprover(text, 'Large Text Improvement');
      
      expect(totalTime).toBeLessThan(1000); // Should complete in <1s
    });

    it('should handle xlarge text without timeout', async () => {
      const text = generateTestText('xlarge');
      const { totalTime } = await benchmarkImprover(text, 'XLarge Text Improvement');
      
      expect(totalTime).toBeLessThan(3000); // Should complete in <3s
    });
  });

  describe('QualityValidator Performance', () => {
    const benchmarkValidator = (text: string, testName: string) => {
      const startTime = performance.now();
      const result = validator.validateQuality(text);
      const endTime = performance.now();
      const processingTime = endTime - startTime;

      console.log(`${testName}: ${processingTime.toFixed(2)}ms`);
      console.log(`  - Score: ${result.score}`);
      console.log(`  - Issues: ${result.issues.length}`);
      console.log(`  - Warnings: ${result.warnings.length}`);

      return { result, processingTime };
    };

    it('should validate small text quickly', () => {
      const text = generateTestText('small');
      const { processingTime } = benchmarkValidator(text, 'Small Text Validation');
      
      expect(processingTime).toBeLessThan(10); // Should complete in <10ms
    });

    it('should validate medium text efficiently', () => {
      const text = generateTestText('medium');
      const { processingTime } = benchmarkValidator(text, 'Medium Text Validation');
      
      expect(processingTime).toBeLessThan(30); // Should complete in <30ms
    });

    it('should validate large text within reasonable time', () => {
      const text = generateTestText('large');
      const { processingTime } = benchmarkValidator(text, 'Large Text Validation');
      
      expect(processingTime).toBeLessThan(150); // Should complete in <150ms
    });

    it('should handle xlarge text efficiently', () => {
      const text = generateTestText('xlarge');
      const { processingTime } = benchmarkValidator(text, 'XLarge Text Validation');
      
      expect(processingTime).toBeLessThan(500); // Should complete in <500ms
    });
  });

  describe('Full QualitySystem Performance', () => {
    const benchmarkFullSystem = async (text: string, testName: string) => {
      const startTime = performance.now();
      const result = await qualitySystem.processText(text, { maxIterations: 3 });
      const endTime = performance.now();
      const totalTime = endTime - startTime;

      console.log(`${testName}: ${totalTime.toFixed(2)}ms`);
      console.log(`  - Final Score: ${result.summary.finalScore}`);
      console.log(`  - Improvement Score: ${improver.calculateImprovementScore(result.report)}`);
      console.log(`  - Processing Efficiency: ${(text.length / totalTime).toFixed(1)} chars/ms`);

      return { result, totalTime };
    };

    it('should process small text quickly', async () => {
      const text = generateTestText('small');
      const { totalTime } = await benchmarkFullSystem(text, 'Small Text Full Processing');
      
      expect(totalTime).toBeLessThan(100); // Should complete in <100ms
    });

    it('should process medium text efficiently', async () => {
      const text = generateTestText('medium');
      const { totalTime } = await benchmarkFullSystem(text, 'Medium Text Full Processing');
      
      expect(totalTime).toBeLessThan(500); // Should complete in <500ms
    });

    it('should process large text within reasonable time', async () => {
      const text = generateTestText('large');
      const { totalTime } = await benchmarkFullSystem(text, 'Large Text Full Processing');
      
      expect(totalTime).toBeLessThan(2000); // Should complete in <2s
    });

    it('should handle xlarge text without timeout', async () => {
      const text = generateTestText('xlarge');
      const { totalTime } = await benchmarkFullSystem(text, 'XLarge Text Full Processing');
      
      expect(totalTime).toBeLessThan(5000); // Should complete in <5s
    });
  });

  describe('Memory Usage and Scaling', () => {
    it('should handle concurrent processing efficiently', async () => {
      const texts = Array(5).fill(null).map(() => generateTestText('medium'));
      
      const startTime = performance.now();
      const results = await Promise.all(
        texts.map(text => qualitySystem.processText(text, { maxIterations: 2 }))
      );
      const endTime = performance.now();
      const totalTime = endTime - startTime;

      console.log(`Concurrent Processing (5 texts): ${totalTime.toFixed(2)}ms`);
      console.log(`  - Average per text: ${(totalTime / 5).toFixed(2)}ms`);
      
      expect(results).toHaveLength(5);
      expect(totalTime).toBeLessThan(3000); // Should complete in <3s for all 5
      results.forEach(result => {
        expect(result.validation.isValid).toBe(true);
      });
    });

    it('should maintain performance with repeated processing', async () => {
      const text = generateTestText('medium');
      const processingTimes: number[] = [];

      // Process the same text 10 times
      for (let i = 0; i < 10; i++) {
        const startTime = performance.now();
        await qualitySystem.processText(text, { maxIterations: 2 });
        const endTime = performance.now();
        processingTimes.push(endTime - startTime);
      }

      const avgTime = processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length;
      const maxTime = Math.max(...processingTimes);
      const minTime = Math.min(...processingTimes);

      console.log(`Repeated Processing (10 runs):`);
      console.log(`  - Average: ${avgTime.toFixed(2)}ms`);
      console.log(`  - Min: ${minTime.toFixed(2)}ms`);
      console.log(`  - Max: ${maxTime.toFixed(2)}ms`);
      console.log(`  - Variation: ${((maxTime - minTime) / avgTime * 100).toFixed(1)}%`);

      expect(avgTime).toBeLessThan(300);
      expect(maxTime - minTime).toBeLessThan(avgTime * 0.5); // Variation should be <50%
    });
  });

  describe('Real-world Performance Tests', () => {
    it('should efficiently process transcript text', async () => {
      const transcriptText = `um  hello  everyone  uh  welcome  to  this  uh  presentation  about  some  thing  really  important  .  so  uh  lets  start  with  uh  the  basics  and  then  we  can  uh  move  on  to  more  advanced  topics  that  are  really  interesting  and  useful  for  understanding  the  concepts  we  are  discussing  today  .  `.repeat(20);
      
      const startTime = performance.now();
      const result = await qualitySystem.processText(transcriptText);
      const endTime = performance.now();
      const processingTime = endTime - startTime;

      console.log(`Transcript Processing: ${processingTime.toFixed(2)}ms`);
      console.log(`  - Original length: ${transcriptText.length} chars`);
      console.log(`  - Improved length: ${result.report.improvedText.length} chars`);
      console.log(`  - Improvements made: ${result.report.improvements.length}`);

      expect(processingTime).toBeLessThan(1500);
      expect(result.validation.passed).toBe(true);
    });

    it('should efficiently process OCR text', async () => {
      const ocrText = `Th-
is  is  corrupted  O C R  text  with  l  i  k  e  weird  spacing  and  brok-
en  words  every  where  .  It  needs  comprehensive  cleaning  and  improvement  for  better  readability  .  `.repeat(15);
      
      const startTime = performance.now();
      const result = await qualitySystem.processText(ocrText, { enableAggressiveNormalization: true });
      const endTime = performance.now();
      const processingTime = endTime - startTime;

      console.log(`OCR Processing: ${processingTime.toFixed(2)}ms`);
      console.log(`  - Broken words fixed: ${result.report.metrics.before.brokenWords - result.report.metrics.after.brokenWords}`);
      console.log(`  - Spacing issues fixed: ${result.report.metrics.before.spacingIssues - result.report.metrics.after.spacingIssues}`);

      expect(processingTime).toBeLessThan(2000);
      expect(result.report.metrics.after.brokenWords).toBeLessThan(result.report.metrics.before.brokenWords);
    });
  });
});