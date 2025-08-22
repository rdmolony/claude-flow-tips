/**
 * Unit tests for InsightExtractor
 * Tests insight extraction from classified content
 */

const { describe, test, expect, beforeEach } = require('@jest/globals');
const InsightExtractor = require('../../../src/extractors/insight-extractor');

describe('InsightExtractor', () => {
  let extractor;
  
  beforeEach(() => {
    extractor = new InsightExtractor();
  });

  describe('constructor', () => {
    test('should create extractor with default templates', () => {
      expect(extractor).toBeInstanceOf(InsightExtractor);
      expect(extractor.templates).toBeDefined();
      expect(extractor.templates['how-to']).toBeDefined();
      expect(extractor.templates['gotcha']).toBeDefined();
    });

    test('should accept custom configuration', () => {
      const config = {
        maxSummaryWords: 150,
        minQuoteLength: 25
      };
      const customExtractor = new InsightExtractor(config);
      
      expect(customExtractor.config.maxSummaryWords).toBe(150);
      expect(customExtractor.config.minQuoteLength).toBe(25);
    });
  });

  describe('extractInsight', () => {
    test('should extract complete insight from how-to content', async () => {
      const classifiedContent = {
        content: `First, you need to install Docker on your system. You can download it from the official website. 
        Next, clone the repository using git clone command. 
        Finally, run the setup script to configure everything properly.`,
        classification: {
          category: 'how-to',
          confidence: 0.9,
          features: ['sequential_steps', 'action_verbs']
        },
        metadata: {
          source_file: 'docker-tutorial.txt',
          line_start: 10,
          line_end: 12
        }
      };

      const insight = await extractor.extractInsight(classifiedContent);

      global.testUtils.assertValidInsight(insight);
      expect(insight.category).toBe('how-to');
      expect(insight.title).toMatch(/Docker/i);
      expect(insight.summary).toContain('install Docker');
      expect(insight.quotes[0].text).toContain('First, you need to install Docker');
    });

    test('should extract gotcha/warning insight correctly', async () => {
      const classifiedContent = {
        content: `Warning: never run Claude with the dangerously-skip-permissions flag outside of a sandbox like Docker. 
        This could expose your credentials and potentially brick your machine by editing system drivers.`,
        classification: {
          category: 'gotcha',
          confidence: 0.95,
          features: ['warning_language', 'risk_indicators']
        },
        metadata: {
          source_file: 'security-gotchas.txt',
          line_start: 25,
          line_end: 26
        }
      };

      const insight = await extractor.extractInsight(classifiedContent);

      expect(insight.category).toBe('gotcha');
      expect(insight.title).toMatch(/Security Risk|Permission|Sandbox/i);
      expect(insight.summary).toContain('sandbox');
      expect(insight.quotes[0].text).toContain('dangerously-skip-permissions');
    });

    test('should extract Q&A insight with question and answer', async () => {
      const classifiedContent = {
        content: `Question: How do I configure GitHub integration with Claude Flow? 
        Answer: You need to set up OAuth tokens in your configuration file and add the repository URL to your settings.`,
        classification: {
          category: 'qa',
          confidence: 0.88,
          features: ['question_answer_pattern', 'technical_terms']
        },
        metadata: {
          source_file: 'qa-session.txt',
          line_start: 45,
          line_end: 46
        }
      };

      const insight = await extractor.extractInsight(classifiedContent);

      expect(insight.category).toBe('qa');
      expect(insight.title).toContain('GitHub integration');
      expect(insight.summary).toContain('OAuth tokens');
      expect(insight.quotes).toHaveLength(2); // Should split question and answer
    });

    test('should generate appropriate tags from content', async () => {
      const classifiedContent = {
        content: `Set up Docker containers for Claude Flow development with secure authentication and API configuration.`,
        classification: {
          category: 'how-to',
          confidence: 0.8
        },
        metadata: {
          source_file: 'setup-guide.txt',
          line_start: 1,
          line_end: 1
        }
      };

      const insight = await extractor.extractInsight(classifiedContent);

      expect(insight.tags).toContain('docker');
      expect(insight.tags).toContain('authentication');
      expect(insight.tags).toContain('api');
      expect(insight.tags).toContain('setup');
    });

    test('should handle content with multiple quotes', async () => {
      const classifiedContent = {
        content: `There are several important steps. First, install Docker. 
        The documentation states "Docker is required for sandboxing". 
        Additionally, "never skip security permissions in production environments".`,
        classification: {
          category: 'how-to',
          confidence: 0.85
        },
        metadata: {
          source_file: 'multi-quote.txt',
          line_start: 10,
          line_end: 15
        }
      };

      const insight = await extractor.extractInsight(classifiedContent);

      expect(insight.quotes.length).toBeGreaterThan(1);
      expect(insight.quotes[0].text).toContain('install Docker');
      expect(insight.quotes[1].text).toContain('Docker is required');
    });
  });

  describe('generateTitle', () => {
    test('should generate concise title for how-to content', () => {
      const content = 'First, install Docker. Then configure the environment settings.';
      const category = 'how-to';

      const title = extractor.generateTitle(content, category);

      expect(title).toBeDefined();
      expect(title.length).toBeLessThanOrEqual(80);
      expect(title).toMatch(/Install|Setup|Configure/i);
    });

    test('should generate warning title for gotcha content', () => {
      const content = 'Warning: never expose API keys in public repositories.';
      const category = 'gotcha';

      const title = extractor.generateTitle(content, category);

      expect(title).toMatch(/Warning|Risk|Avoid|Security/i);
    });

    test('should generate question-based title for Q&A content', () => {
      const content = 'Question: How do I handle authentication? Answer: Use OAuth tokens.';
      const category = 'qa';

      const title = extractor.generateTitle(content, category);

      expect(title).toMatch(/How|What|Why|authentication/i);
      expect(title).not.toContain('Question:');
      expect(title).not.toContain('Answer:');
    });

    test('should handle titles that exceed maximum length', () => {
      const longContent = 'This is a very detailed explanation of how to set up a complex multi-stage Docker configuration with authentication, security, monitoring, and deployment capabilities.';
      const category = 'how-to';

      const title = extractor.generateTitle(longContent, category);

      expect(title.length).toBeLessThanOrEqual(80);
      expect(title).not.toMatch(/\.\.\.$/); // Should not end with ellipsis
    });
  });

  describe('generateSummary', () => {
    test('should create concise summary within word limits', () => {
      const content = `This tutorial explains how to set up Docker for Claude Flow development. 
      First, download and install Docker Desktop. Then, clone the repository and configure the environment. 
      Finally, run the initialization script to complete the setup process.`;
      const category = 'how-to';

      const summary = extractor.generateSummary(content, category);

      const wordCount = summary.split(/\\s+/).length;
      expect(wordCount).toBeGreaterThanOrEqual(20);
      expect(wordCount).toBeLessThanOrEqual(200);
      expect(summary).toContain('Docker');
      expect(summary).toContain('setup');
    });

    test('should preserve key information in summary', () => {
      const content = 'Warning: the dangerously-skip-permissions flag can expose credentials and damage your system.';
      const category = 'gotcha';

      const summary = extractor.generateSummary(content, category);

      expect(summary).toContain('permissions');
      expect(summary).toContain('credentials');
      expect(summary).toMatch(/risk|danger|warning/i);
    });

    test('should handle short content appropriately', () => {
      const shortContent = 'Use Docker for isolation.';
      const category = 'tip';

      const summary = extractor.generateSummary(shortContent, category);

      expect(summary).toBeDefined();
      expect(summary.length).toBeGreaterThan(shortContent.length);
      expect(summary).toContain('Docker');
    });
  });

  describe('selectQuotes', () => {
    test('should select most relevant quotes from content', () => {
      const content = `This is background information. The key point is "Docker is essential for secure development". 
      Another important note: "Never skip security permissions in production". 
      Some additional context here.`;

      const quotes = extractor.selectQuotes(content, 'gotcha');

      expect(quotes).toHaveLength(2);
      expect(quotes[0]).toContain('Docker is essential');
      expect(quotes[1]).toContain('Never skip security');
    });

    test('should respect minimum and maximum quote lengths', () => {
      const content = `Short. This is a sufficiently long quote that provides meaningful context and information. Tiny.`;

      const quotes = extractor.selectQuotes(content, 'how-to');

      quotes.forEach(quote => {
        expect(quote.length).toBeGreaterThanOrEqual(20); // minQuoteLength
        expect(quote.length).toBeLessThanOrEqual(300); // maxQuoteLength
      });
    });

    test('should prioritize quotes with technical terms', () => {
      const content = `General discussion here. 
      The command "npm install --save-dev jest" installs the testing framework. 
      More general talk.`;

      const quotes = extractor.selectQuotes(content, 'how-to');

      expect(quotes[0]).toContain('npm install');
    });

    test('should handle content with no suitable quotes', () => {
      const shortContent = 'OK.';

      const quotes = extractor.selectQuotes(shortContent, 'general');

      expect(quotes).toHaveLength(0);
    });
  });

  describe('extractTags', () => {
    test('should extract technical terms as tags', () => {
      const content = 'Configure Docker, GitHub integration, and OAuth authentication for your API.';

      const tags = extractor.extractTags(content);

      expect(tags).toContain('docker');
      expect(tags).toContain('github');
      expect(tags).toContain('oauth');
      expect(tags).toContain('authentication');
      expect(tags).toContain('api');
    });

    test('should extract action-based tags', () => {
      const content = 'Install, configure, and deploy your application with proper testing.';

      const tags = extractor.extractTags(content);

      expect(tags).toContain('install');
      expect(tags).toContain('configure');
      expect(tags).toContain('deploy');
      expect(tags).toContain('testing');
    });

    test('should normalize tags to lowercase', () => {
      const content = 'Docker, GitHub, OAuth, Authentication';

      const tags = extractor.extractTags(content);

      tags.forEach(tag => {
        expect(tag).toMatch(/^[a-z0-9-]+$/);
      });
    });

    test('should limit number of tags', () => {
      const content = 'Docker GitHub OAuth authentication API setup install configure deploy test monitor debug troubleshoot optimize secure';

      const tags = extractor.extractTags(content);

      expect(tags.length).toBeLessThanOrEqual(10);
    });

    test('should remove duplicate tags', () => {
      const content = 'Docker setup, Docker configuration, Docker deployment with Docker containers';

      const tags = extractor.extractTags(content);

      const dockerTags = tags.filter(tag => tag === 'docker');
      expect(dockerTags).toHaveLength(1);
    });
  });

  describe('validateInsight', () => {
    test('should validate properly structured insight', () => {
      const validInsight = global.testUtils.createMockInsight();

      expect(() => extractor.validateInsight(validInsight)).not.toThrow();
    });

    test('should reject insight with missing required fields', () => {
      const invalidInsight = {
        insight_id: 'test-123',
        category: 'how-to'
        // missing title, summary, quotes
      };

      expect(() => extractor.validateInsight(invalidInsight))
        .toThrow('Missing required field');
    });

    test('should reject insight with empty quotes array', () => {
      const invalidInsight = global.testUtils.createMockInsight({
        quotes: []
      });

      expect(() => extractor.validateInsight(invalidInsight))
        .toThrow('At least one quote is required');
    });

    test('should reject quotes with invalid confidence scores', () => {
      const invalidInsight = global.testUtils.createMockInsight({
        quotes: [{
          text: 'Test quote',
          source_file: 'test.txt',
          line_start: 1,
          confidence: 1.5 // Invalid: > 1.0
        }]
      });

      expect(() => extractor.validateInsight(invalidInsight))
        .toThrow('Quote confidence must be between 0 and 1');
    });
  });

  describe('batchExtract', () => {
    test('should extract insights from multiple classified contents', async () => {
      const classifiedContents = [
        {
          content: 'First, install Docker.',
          classification: { category: 'how-to', confidence: 0.9 },
          metadata: { source_file: 'test1.txt', line_start: 1 }
        },
        {
          content: 'Warning: never skip security checks.',
          classification: { category: 'gotcha', confidence: 0.95 },
          metadata: { source_file: 'test2.txt', line_start: 1 }
        }
      ];

      const insights = await extractor.batchExtract(classifiedContents);

      expect(insights).toHaveLength(2);
      expect(insights[0].category).toBe('how-to');
      expect(insights[1].category).toBe('gotcha');
    });

    test('should handle empty batch gracefully', async () => {
      const insights = await extractor.batchExtract([]);

      expect(insights).toBeInstanceOf(Array);
      expect(insights).toHaveLength(0);
    });

    test('should maintain processing order', async () => {
      const classifiedContents = Array(5).fill(null).map((_, i) => ({
        content: `Content ${i}`,
        classification: { category: 'general', confidence: 0.5 },
        metadata: { source_file: `test${i}.txt`, line_start: 1 }
      }));

      const insights = await extractor.batchExtract(classifiedContents);

      insights.forEach((insight, index) => {
        expect(insight.title).toContain(`${index}`);
      });
    });
  });
});