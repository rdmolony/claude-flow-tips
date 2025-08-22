import { ReadabilityScorer } from '../../../src/quality/scorer/ReadabilityScorer';

describe('ReadabilityScorer', () => {
  let scorer: ReadabilityScorer;

  beforeEach(() => {
    scorer = new ReadabilityScorer();
  });

  describe('calculateMetrics', () => {
    it('should calculate basic metrics for simple text', () => {
      const text = 'The cat sat on the mat. It was a nice day.';
      const metrics = scorer.calculateMetrics(text);

      expect(metrics.sentenceCount).toBe(2);
      expect(metrics.wordCount).toBe(11);
      expect(metrics.readabilityScore).toBeGreaterThan(80); // Simple text should have high readability
      expect(metrics.complexity).toBe('simple');
    });

    it('should calculate metrics for complex text', () => {
      const text = 'The implementation of sophisticated algorithmic methodologies requires comprehensive understanding of computational complexity theory and its practical applications in modern software engineering paradigms.';
      const metrics = scorer.calculateMetrics(text);

      expect(metrics.sentenceCount).toBe(1);
      expect(metrics.wordCount).toBe(19);
      expect(metrics.readabilityScore).toBeLessThan(50); // Complex text should have low readability
      expect(metrics.complexity).toBe('very-complex');
      expect(metrics.fleschKincaidLevel).toBeGreaterThan(12);
    });

    it('should handle empty text gracefully', () => {
      const metrics = scorer.calculateMetrics('');

      expect(metrics.sentenceCount).toBe(1); // Minimum 1 sentence
      expect(metrics.wordCount).toBe(0);
      expect(metrics.syllableCount).toBe(0);
      expect(metrics.readabilityScore).toBeGreaterThanOrEqual(0);
    });

    it('should calculate syllables correctly', () => {
      const text = 'Beautiful extraordinary magnificent.'; // 3 words with multiple syllables
      const metrics = scorer.calculateMetrics(text);

      expect(metrics.wordCount).toBe(3);
      expect(metrics.syllableCount).toBeGreaterThan(6); // Should be around 9-12 syllables
      expect(metrics.averageSyllablesPerWord).toBeGreaterThan(2);
    });

    it('should detect spacing and broken word issues', () => {
      const text = 'Hello    world  ,  some  thing  is  wrong   .';
      const metrics = scorer.calculateMetrics(text);

      expect(metrics.spacingIssues).toBeGreaterThan(0);
    });

    it('should handle single-word text', () => {
      const metrics = scorer.calculateMetrics('Hello.');

      expect(metrics.sentenceCount).toBe(1);
      expect(metrics.wordCount).toBe(1);
      expect(metrics.averageWordsPerSentence).toBe(1);
    });
  });

  describe('complexity determination', () => {
    it('should classify simple text correctly', () => {
      const simpleText = 'I like cats. Cats are nice. They are soft and warm.';
      const metrics = scorer.calculateMetrics(simpleText);

      expect(metrics.complexity).toBe('simple');
      expect(metrics.readabilityScore).toBeGreaterThan(80);
    });

    it('should classify moderate text correctly', () => {
      const moderateText = 'The students were studying advanced mathematics concepts including calculus and statistics for their upcoming examination.';
      const metrics = scorer.calculateMetrics(moderateText);

      expect(['moderate', 'complex']).toContain(metrics.complexity);
      expect(metrics.readabilityScore).toBeLessThan(80);
    });

    it('should classify very complex text correctly', () => {
      const complexText = 'The epistemological ramifications of postmodern deconstructionist paradigms necessitate comprehensive reconsideration of fundamental ontological assumptions underlying contemporary philosophical discourse.';
      const metrics = scorer.calculateMetrics(complexText);

      expect(metrics.complexity).toBe('very-complex');
      expect(metrics.readabilityScore).toBeLessThan(30);
      expect(metrics.fleschKincaidLevel).toBeGreaterThan(15);
    });
  });

  describe('calculateImprovementPotential', () => {
    it('should calculate high potential for poor text', () => {
      const poorText = 'This    is  very   bad   text  with  lots   of  issues  and  extremely  long  sentences  that  go  on  and  on  without  proper  punctuation  or  structure  making  it  very  difficult  to  read  and  understand  what  the  author  is  trying  to  communicate  to  the  reader.';
      const metrics = scorer.calculateMetrics(poorText);
      const potential = scorer.calculateImprovementPotential(metrics);

      expect(potential).toBeGreaterThan(50);
    });

    it('should calculate low potential for good text', () => {
      const goodText = 'This is well-written text. It has good structure. The sentences are clear and concise.';
      const metrics = scorer.calculateMetrics(goodText);
      const potential = scorer.calculateImprovementPotential(metrics);

      expect(potential).toBeLessThan(30);
    });
  });

  describe('calculateImprovement', () => {
    it('should calculate positive improvement when text gets better', () => {
      const beforeText = 'This    is  bad   text  with  spacing   issues.';
      const afterText = 'This is good text with no spacing issues.';
      
      const beforeMetrics = scorer.calculateMetrics(beforeText);
      const afterMetrics = scorer.calculateMetrics(afterText);
      
      const improvement = scorer.calculateImprovement(beforeMetrics, afterMetrics);
      
      expect(improvement).toBeGreaterThan(0);
    });

    it('should calculate negative improvement when text gets worse', () => {
      const beforeText = 'This is good text.';
      const afterText = 'This   is  bad   text   with   issues.';
      
      const beforeMetrics = scorer.calculateMetrics(beforeText);
      const afterMetrics = scorer.calculateMetrics(afterText);
      
      const improvement = scorer.calculateImprovement(beforeMetrics, afterMetrics);
      
      expect(improvement).toBeLessThan(0);
    });
  });

  describe('edge cases and robustness', () => {
    it('should handle text with only punctuation', () => {
      const metrics = scorer.calculateMetrics('!!! ??? ...');

      expect(metrics.wordCount).toBe(0);
      expect(metrics.sentenceCount).toBe(1);
    });

    it('should handle text with numbers', () => {
      const text = 'In 2023, there were 100 students in the class.';
      const metrics = scorer.calculateMetrics(text);

      expect(metrics.wordCount).toBeGreaterThan(5);
      expect(metrics.sentenceCount).toBe(1);
    });

    it('should handle text with abbreviations', () => {
      const text = 'Dr. Smith went to the U.S.A. in Jan. 2023.';
      const metrics = scorer.calculateMetrics(text);

      expect(metrics.sentenceCount).toBe(1); // Should not be confused by periods in abbreviations
    });

    it('should handle very short text', () => {
      const metrics = scorer.calculateMetrics('Hi.');

      expect(metrics.wordCount).toBe(1);
      expect(metrics.sentenceCount).toBe(1);
      expect(metrics.averageWordsPerSentence).toBe(1);
    });

    it('should handle text with mixed casing', () => {
      const text = 'tHiS iS wEiRd CaSiNg BuT sHoUlD wOrK.';
      const metrics = scorer.calculateMetrics(text);

      expect(metrics.wordCount).toBe(7);
      expect(metrics.sentenceCount).toBe(1);
    });
  });
});