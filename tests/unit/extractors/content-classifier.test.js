/**
 * Unit tests for ContentClassifier
 * Tests content categorization and classification logic
 */

const { describe, test, expect, beforeEach } = require('@jest/globals');
const ContentClassifier = require('../../../src/extractors/content-classifier');

describe('ContentClassifier', () => {
  let classifier;
  
  beforeEach(() => {
    classifier = new ContentClassifier();
  });

  describe('constructor', () => {
    test('should create classifier with default categories', () => {
      expect(classifier).toBeInstanceOf(ContentClassifier);
      expect(classifier.categories).toContain('how-to');
      expect(classifier.categories).toContain('tip');
      expect(classifier.categories).toContain('gotcha');
      expect(classifier.categories).toContain('mental-model');
      expect(classifier.categories).toContain('qa');
      expect(classifier.categories).toContain('concept');
    });

    test('should initialize with classification patterns', () => {
      expect(classifier.patterns).toBeDefined();
      expect(classifier.patterns['how-to']).toBeDefined();
      expect(classifier.patterns['gotcha']).toBeDefined();
    });
  });

  describe('classifyContent', () => {
    test('should classify how-to content correctly', async () => {
      const howToText = `First, you need to install Docker on your system. 
      Next, clone the repository from GitHub. 
      Finally, run the setup script to configure everything.`;

      const result = await classifier.classifyContent(howToText);

      expect(result.category).toBe('how-to');
      expect(result.confidence).toBeGreaterThan(0.7);
      expect(result.features).toContain('sequential_steps');
      expect(result.features).toContain('action_verbs');
    });

    test('should classify gotcha/warning content correctly', async () => {
      const gotchaText = `Warning: never run Claude with the dangerously-skip-permissions flag 
      outside of a sandbox. This could brick your machine or expose your credentials.`;

      const result = await classifier.classifyContent(gotchaText);

      expect(result.category).toBe('gotcha');
      expect(result.confidence).toBeGreaterThan(0.8);
      expect(result.features).toContain('warning_language');
      expect(result.features).toContain('risk_indicators');
    });

    test('should classify tip content correctly', async () => {
      const tipText = `Pro tip: Use containerized environments for better isolation. 
      This makes your development workflow more reliable and reproducible.`;

      const result = await classifier.classifyContent(tipText);

      expect(result.category).toBe('tip');
      expect(result.confidence).toBeGreaterThan(0.7);
      expect(result.features).toContain('best_practice');
    });

    test('should classify Q&A content correctly', async () => {
      const qaText = `Question: How do I configure GitHub integration? 
      Answer: You need to set up OAuth tokens in your configuration file.`;

      const result = await classifier.classifyContent(qaText);

      expect(result.category).toBe('qa');
      expect(result.confidence).toBeGreaterThan(0.8);
      expect(result.features).toContain('question_answer_pattern');
    });

    test('should classify mental model content correctly', async () => {
      const mentalModelText = `Think of Claude Flow like a pipeline where each stage transforms 
      the data. The input flows through processors, extractors, and validators 
      before becoming structured documentation.`;

      const result = await classifier.classifyContent(mentalModelText);

      expect(result.category).toBe('mental-model');
      expect(result.confidence).toBeGreaterThan(0.6);
      expect(result.features).toContain('metaphor');
      expect(result.features).toContain('conceptual_framework');
    });

    test('should classify concept definition correctly', async () => {
      const conceptText = `SPARC stands for Specification, Pseudocode, Architecture, 
      Refinement, and Completion. It's a methodology for systematic software development.`;

      const result = await classifier.classifyContent(conceptText);

      expect(result.category).toBe('concept');
      expect(result.confidence).toBeGreaterThan(0.7);
      expect(result.features).toContain('definition');
      expect(result.features).toContain('acronym_expansion');
    });

    test('should handle ambiguous content with multiple classifications', async () => {
      const ambiguousText = `Here's how to set up Docker (step 1: install), 
      but be careful not to expose your ports publicly - that's a security risk!`;

      const result = await classifier.classifyContent(ambiguousText);

      expect(result.alternativeCategories).toBeDefined();
      expect(result.alternativeCategories.length).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThan(0.9); // Lower confidence for ambiguous content
    });

    test('should return low confidence for unclear content', async () => {
      const unclearText = `This is just some random text that doesn't fit 
      any particular category clearly.`;

      const result = await classifier.classifyContent(unclearText);

      expect(result.confidence).toBeLessThan(0.5);
      expect(result.category).toBe('general'); // Default fallback category
    });
  });

  describe('extractFeatures', () => {
    test('should detect sequential step indicators', () => {
      const stepText = 'First, install Docker. Then, clone the repo. Finally, run the setup.';
      
      const features = classifier.extractFeatures(stepText);

      expect(features).toContain('sequential_steps');
      expect(features).toContain('step_indicators');
    });

    test('should detect warning language', () => {
      const warningText = 'Warning: be careful not to expose your credentials!';
      
      const features = classifier.extractFeatures(warningText);

      expect(features).toContain('warning_language');
      expect(features).toContain('imperative_tone');
    });

    test('should detect question patterns', () => {
      const questionText = 'How do I configure the GitHub integration settings?';
      
      const features = classifier.extractFeatures(questionText);

      expect(features).toContain('question_pattern');
      expect(features).toContain('interrogative');
    });

    test('should detect code and technical terms', () => {
      const technicalText = 'Run npm install and configure your .env file with API keys.';
      
      const features = classifier.extractFeatures(technicalText);

      expect(features).toContain('technical_terms');
      expect(features).toContain('commands');
    });

    test('should detect metaphors and analogies', () => {
      const metaphorText = 'Think of it like a pipeline where data flows through stages.';
      
      const features = classifier.extractFeatures(metaphorText);

      expect(features).toContain('metaphor');
      expect(features).toContain('analogy_language');
    });
  });

  describe('validateClassification', () => {
    test('should validate correct classification structure', () => {
      const validClassification = {
        category: 'how-to',
        confidence: 0.85,
        features: ['sequential_steps', 'action_verbs'],
        alternativeCategories: ['tip']
      };

      expect(() => classifier.validateClassification(validClassification)).not.toThrow();
    });

    test('should reject classification with invalid category', () => {
      const invalidClassification = {
        category: 'invalid-category',
        confidence: 0.85,
        features: ['test']
      };

      expect(() => classifier.validateClassification(invalidClassification))
        .toThrow('Invalid category: invalid-category');
    });

    test('should reject classification with invalid confidence', () => {
      const invalidClassification = {
        category: 'how-to',
        confidence: 1.5, // > 1.0
        features: ['test']
      };

      expect(() => classifier.validateClassification(invalidClassification))
        .toThrow('Confidence must be between 0 and 1');
    });

    test('should reject classification missing required fields', () => {
      const incompleteClassification = {
        category: 'how-to'
        // missing confidence and features
      };

      expect(() => classifier.validateClassification(incompleteClassification))
        .toThrow('Missing required field: confidence');
    });
  });

  describe('calculateConfidence', () => {
    test('should calculate higher confidence for clear patterns', () => {
      const features = ['sequential_steps', 'action_verbs', 'step_indicators'];
      const category = 'how-to';

      const confidence = classifier.calculateConfidence(features, category);

      expect(confidence).toBeGreaterThan(0.8);
    });

    test('should calculate lower confidence for weak patterns', () => {
      const features = ['general_text'];
      const category = 'how-to';

      const confidence = classifier.calculateConfidence(features, category);

      expect(confidence).toBeLessThan(0.5);
    });

    test('should return confidence in valid range', () => {
      const features = ['warning_language', 'risk_indicators'];
      const category = 'gotcha';

      const confidence = classifier.calculateConfidence(features, category);

      expect(confidence).toBeGreaterThanOrEqual(0);
      expect(confidence).toBeLessThanOrEqual(1);
    });
  });

  describe('getAlternativeCategories', () => {
    test('should suggest alternative categories for ambiguous content', () => {
      const features = ['sequential_steps', 'best_practice', 'action_verbs'];
      const primaryCategory = 'how-to';

      const alternatives = classifier.getAlternativeCategories(features, primaryCategory);

      expect(alternatives).toBeInstanceOf(Array);
      expect(alternatives).toContain('tip');
      expect(alternatives).not.toContain(primaryCategory);
    });

    test('should return empty array when no alternatives exist', () => {
      const features = ['highly_specific_feature'];
      const primaryCategory = 'concept';

      const alternatives = classifier.getAlternativeCategories(features, primaryCategory);

      expect(alternatives).toBeInstanceOf(Array);
      expect(alternatives).toHaveLength(0);
    });
  });

  describe('batchClassify', () => {
    test('should classify multiple content items efficiently', async () => {
      const contentItems = [
        'First, install Docker. Then configure the environment.',
        'Warning: never expose your API keys in public repositories.',
        'What is the best way to handle authentication?'
      ];

      const results = await classifier.batchClassify(contentItems);

      expect(results).toHaveLength(3);
      expect(results[0].category).toBe('how-to');
      expect(results[1].category).toBe('gotcha');
      expect(results[2].category).toBe('qa');
    });

    test('should handle empty batch gracefully', async () => {
      const results = await classifier.batchClassify([]);

      expect(results).toBeInstanceOf(Array);
      expect(results).toHaveLength(0);
    });

    test('should maintain order of results', async () => {
      const contentItems = ['Item 1', 'Item 2', 'Item 3'];
      const results = await classifier.batchClassify(contentItems);

      expect(results).toHaveLength(3);
      results.forEach((result, index) => {
        expect(result.originalIndex).toBe(index);
      });
    });
  });
});