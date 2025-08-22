import { TextNormalizer } from '../../../src/quality/normalizer/TextNormalizer';

describe('TextNormalizer', () => {
  let normalizer: TextNormalizer;

  beforeEach(() => {
    normalizer = new TextNormalizer();
  });

  describe('normalize', () => {
    it('should fix multiple spaces', () => {
      const text = 'Hello    world   test';
      const result = normalizer.normalize(text);
      
      expect(result.text).toBe('Hello world test');
      expect(result.changes).toHaveLength(2);
      expect(result.changes[0].type).toBe('spacing');
    });

    it('should fix space before punctuation', () => {
      const text = 'Hello , world !';
      const result = normalizer.normalize(text);
      
      expect(result.text).toBe('Hello, world!');
      expect(result.changes.some(c => c.type === 'punctuation')).toBe(true);
    });

    it('should fix missing space after punctuation', () => {
      const text = 'Hello,world!How are you?';
      const result = normalizer.normalize(text);
      
      expect(result.text).toBe('Hello, world! How are you?');
    });

    it('should fix broken words', () => {
      const text = 'I need some thing to day';
      const result = normalizer.normalize(text);
      
      expect(result.text).toBe('I need something today');
      expect(result.changes.some(c => c.type === 'word-repair')).toBe(true);
    });

    it('should fix capitalization after periods', () => {
      const text = 'Hello world. this is a test.';
      const result = normalizer.normalize(text);
      
      expect(result.text).toBe('Hello world. This is a test.');
      expect(result.changes.some(c => c.type === 'case')).toBe(true);
    });

    it('should handle empty text', () => {
      const result = normalizer.normalize('');
      
      expect(result.text).toBe('');
      expect(result.changes).toHaveLength(0);
    });

    it('should fix hyphenated words split across lines', () => {
      const text = 'This is a hyph-\nated word';
      const result = normalizer.normalize(text);
      
      expect(result.text).toBe('This is a hyphated word');
    });
  });

  describe('aggressiveNormalize', () => {
    it('should fix encoding issues', () => {
      const text = 'Helloâ€™world withâ€œquotesâ€\u009d';
      const result = normalizer.aggressiveNormalize(text);
      
      expect(result.text).toContain("'");
      expect(result.text).toContain('"');
    });

    it('should fix excessive punctuation', () => {
      const text = 'What....is going on!!!!';
      const result = normalizer.aggressiveNormalize(text);
      
      expect(result.text).toBe('What...is going on!');
    });

    it('should remove line breaks within words', () => {
      const text = 'This is a\ntest with\nbroken lines';
      const result = normalizer.aggressiveNormalize(text);
      
      expect(result.text).toBe('This is a test with broken lines');
    });
  });

  describe('countSpacingIssues', () => {
    it('should count multiple space issues', () => {
      const text = 'Hello    world  ,  test   .';
      const count = normalizer.countSpacingIssues(text);
      
      expect(count).toBeGreaterThan(0);
    });

    it('should return 0 for clean text', () => {
      const text = 'This is clean text.';
      const count = normalizer.countSpacingIssues(text);
      
      expect(count).toBe(0);
    });
  });

  describe('countBrokenWords', () => {
    it('should count broken word patterns', () => {
      const text = 'I need some thing to day and any thing else';
      const count = normalizer.countBrokenWords(text);
      
      expect(count).toBeGreaterThan(0);
    });

    it('should return 0 for text without broken words', () => {
      const text = 'This text has no broken words.';
      const count = normalizer.countBrokenWords(text);
      
      expect(count).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should handle text with only spaces', () => {
      const text = '     ';
      const result = normalizer.normalize(text);
      
      expect(result.text).toBe('');
    });

    it('should handle text with special characters', () => {
      const text = 'Hello @#$%^&* world!!!';
      const result = normalizer.normalize(text);
      
      expect(result.text).toContain('Hello');
      expect(result.text).toContain('world');
    });

    it('should preserve intentional formatting', () => {
      const text = 'Code: function() { return "test"; }';
      const result = normalizer.normalize(text);
      
      expect(result.text).toContain('function()');
      expect(result.text).toContain('"test"');
    });

    it('should handle very long text', () => {
      const longText = 'word '.repeat(1000) + '.';
      const result = normalizer.normalize(longText);
      
      expect(result.text).toContain('word');
      expect(result.text.endsWith('.')).toBe(true);
    });
  });
});