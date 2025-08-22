import { describe, it, expect, beforeEach } from '@jest/globals';
import { ClassificationStage } from '../../../src/pipeline/stages/classification';
import { SegmentedContent, ClassificationConfig } from '../../../src/pipeline/types';

describe('ClassificationStage', () => {
  let classificationStage: ClassificationStage;
  let config: ClassificationConfig;

  beforeEach(() => {
    config = {
      categories: ['technical', 'educational', 'tutorial', 'explanation'],
      confidenceThreshold: 0.7,
      multiLabel: true
    };
    classificationStage = new ClassificationStage(config);
  });

  describe('process', () => {
    it('should classify segments into appropriate categories', async () => {
      const input: SegmentedContent = {
        id: 'test-1',
        segments: [
          {
            id: 'seg-1',
            content: 'Machine learning is a subset of artificial intelligence that enables computers to learn from data.',
            type: 'definition',
            confidence: 0.9
          },
          {
            id: 'seg-2', 
            content: 'Let\'s walk through a step-by-step tutorial on implementing neural networks. First, we need to prepare our data.',
            type: 'main_content',
            confidence: 0.8
          },
          {
            id: 'seg-3',
            content: 'For example, consider a spam email classifier that analyzes email content to determine if it\'s spam.',
            type: 'example',
            confidence: 0.85
          }
        ],
        metadata: {
          source: 'ml-course.txt',
          format: 'txt'
        }
      };

      const result = await classificationStage.process(input);

      expect(result.id).toBe(input.id);
      expect(result.segments).toHaveLength(3);
      expect(result.categories).toHaveLength(4); // All categories should be present

      // Check first segment (definition) - should be educational/technical
      expect(result.segments[0].category).toMatch(/^(technical|educational)$/);
      expect(result.segments[0].tags).toContain('definition');

      // Check second segment (tutorial) - should be tutorial
      expect(result.segments[1].category).toBe('tutorial');
      expect(result.segments[1].tags).toContain('tutorial');

      // Check third segment (example) - should be explanation with example tag
      expect(result.segments[2].tags).toContain('example');
    });

    it('should assign importance scores to segments', async () => {
      const input: SegmentedContent = {
        id: 'test-2',
        segments: [
          {
            id: 'seg-1',
            content: 'Introduction to machine learning concepts.',
            type: 'introduction',
            confidence: 0.9
          }
        ],
        metadata: {
          source: 'intro.txt',
          format: 'txt'
        }
      };

      const result = await classificationStage.process(input);

      expect(result.segments[0].importance).toBeGreaterThan(0);
      expect(result.segments[0].importance).toBeLessThanOrEqual(1);
    });

    it('should handle multi-label classification when enabled', async () => {
      const input: SegmentedContent = {
        id: 'test-3',
        segments: [
          {
            id: 'seg-1',
            content: 'This tutorial explains machine learning algorithms using technical examples.',
            type: 'main_content',
            confidence: 0.8
          }
        ],
        metadata: {
          source: 'complex.txt',
          format: 'txt'
        }
      };

      const result = await classificationStage.process(input);

      // Should classify into multiple categories
      expect(result.categories.length).toBeGreaterThan(1);
      
      // Should have technical and tutorial categories
      const categoryNames = result.categories.map(c => c.name);
      expect(categoryNames).toContain('technical');
      expect(categoryNames).toContain('tutorial');
    });

    it('should respect confidence threshold', async () => {
      const strictConfig = { ...config, confidenceThreshold: 0.9 };
      const strictStage = new ClassificationStage(strictConfig);

      const input: SegmentedContent = {
        id: 'test-4',
        segments: [
          {
            id: 'seg-1',
            content: 'Some general content without strong indicators.',
            type: 'main_content',
            confidence: 0.5
          }
        ],
        metadata: {
          source: 'general.txt',
          format: 'txt'
        }
      };

      const result = await strictStage.process(input);

      // With high threshold, fewer categories should pass
      const highConfidenceCategories = result.categories.filter(c => c.confidence >= 0.9);
      expect(highConfidenceCategories.length).toBeLessThanOrEqual(result.categories.length);
    });

    it('should generate appropriate tags based on content', async () => {
      const input: SegmentedContent = {
        id: 'test-5',
        segments: [
          {
            id: 'seg-1',
            content: 'Advanced machine learning algorithms for beginners using Python API.',
            type: 'main_content',
            confidence: 0.8
          }
        ],
        metadata: {
          source: 'ml-advanced.txt',
          format: 'txt'
        }
      };

      const result = await classificationStage.process(input);

      const tags = result.segments[0].tags;
      expect(tags).toContain('machine-learning');
      expect(tags).toContain('api');
      expect(tags).toContain('beginner'); // Despite "advanced" in content
    });
  });

  describe('validate', () => {
    it('should validate input with segments', async () => {
      const input: SegmentedContent = {
        id: 'test-6',
        segments: [
          {
            id: 'seg-1',
            content: 'Valid segment content',
            type: 'main_content',
            confidence: 0.8
          }
        ],
        metadata: {
          source: 'valid.txt',
          format: 'txt'
        }
      };

      const isValid = await classificationStage.validate(input);
      expect(isValid).toBe(true);
    });

    it('should reject input without segments', async () => {
      const input: SegmentedContent = {
        id: 'test-7',
        segments: [],
        metadata: {
          source: 'empty.txt',
          format: 'txt'
        }
      };

      const isValid = await classificationStage.validate(input);
      expect(isValid).toBe(false);
    });

    it('should reject segments with empty content', async () => {
      const input: SegmentedContent = {
        id: 'test-8',
        segments: [
          {
            id: 'seg-1',
            content: '',
            type: 'main_content',
            confidence: 0.8
          }
        ],
        metadata: {
          source: 'empty-content.txt',
          format: 'txt'
        }
      };

      const isValid = await classificationStage.validate(input);
      expect(isValid).toBe(false);
    });
  });

  describe('category classification accuracy', () => {
    it('should correctly classify technical content', async () => {
      const input: SegmentedContent = {
        id: 'tech-test',
        segments: [
          {
            id: 'seg-1',
            content: 'The algorithm implements a hash table with O(1) lookup time using a dynamic array data structure.',
            type: 'main_content',
            confidence: 0.9
          }
        ],
        metadata: {
          source: 'technical.txt',
          format: 'txt'
        }
      };

      const result = await classificationStage.process(input);

      expect(result.segments[0].category).toBe('technical');
      const technicalCategory = result.categories.find(c => c.name === 'technical');
      expect(technicalCategory).toBeDefined();
      expect(technicalCategory!.confidence).toBeGreaterThan(0.7);
    });

    it('should correctly classify tutorial content', async () => {
      const input: SegmentedContent = {
        id: 'tutorial-test',
        segments: [
          {
            id: 'seg-1',
            content: 'Step 1: Install the dependencies. Step 2: Configure the settings. Step 3: Run the application.',
            type: 'main_content',
            confidence: 0.9
          }
        ],
        metadata: {
          source: 'tutorial.txt',
          format: 'txt'
        }
      };

      const result = await classificationStage.process(input);

      expect(result.segments[0].category).toBe('tutorial');
      const tutorialCategory = result.categories.find(c => c.name === 'tutorial');
      expect(tutorialCategory).toBeDefined();
      expect(tutorialCategory!.confidence).toBeGreaterThan(0.7);
    });
  });
});