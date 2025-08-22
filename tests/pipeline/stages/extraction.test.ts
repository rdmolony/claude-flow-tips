import { describe, it, expect, beforeEach } from '@jest/globals';
import { ExtractionStage } from '../../../src/pipeline/stages/extraction';
import { ClassifiedContent, ExtractionConfig } from '../../../src/pipeline/types';

describe('ExtractionStage', () => {
  let extractionStage: ExtractionStage;
  let config: ExtractionConfig;

  beforeEach(() => {
    config = {
      conceptTypes: ['definition', 'process', 'example', 'principle', 'fact'],
      relationshipTypes: ['depends_on', 'part_of', 'related_to', 'example_of'],
      minConfidence: 0.6,
      contextWindow: 100
    };
    extractionStage = new ExtractionStage(config);
  });

  describe('process', () => {
    it('should extract concepts from classified content', async () => {
      const input: ClassifiedContent = {
        id: 'test-1',
        segments: [
          {
            id: 'seg-1',
            content: 'Machine learning is a method of data analysis that automates analytical model building.',
            type: 'definition',
            confidence: 0.9,
            category: 'technical',
            tags: ['definition', 'technical'],
            importance: 0.8
          },
          {
            id: 'seg-2',
            content: 'The process involves several steps: data collection, preprocessing, model training, and evaluation.',
            type: 'main_content',
            confidence: 0.8,
            category: 'educational',
            tags: ['process'],
            importance: 0.7
          }
        ],
        categories: [
          {
            name: 'technical',
            description: 'Technical content',
            confidence: 0.9,
            segments: ['seg-1', 'seg-2']
          }
        ],
        metadata: {
          source: 'ml-basics.txt',
          format: 'txt'
        }
      };

      const result = await extractionStage.process(input);

      expect(result.id).toBe(input.id);
      expect(result.concepts).toHaveLength(2); // Should extract at least 2 concepts
      expect(result.relationships).toBeDefined();
      expect(result.metadata.extractionTimestamp).toBeDefined();
      expect(result.metadata.version).toBeDefined();

      // Check that concepts have required fields
      result.concepts.forEach(concept => {
        expect(concept.id).toBeDefined();
        expect(concept.name).toBeDefined();
        expect(concept.description).toBeDefined();
        expect(concept.type).toBeDefined();
        expect(concept.confidence).toBeGreaterThan(0);
        expect(concept.sourceSegments).toHaveLength(1);
        expect(concept.context).toBeDefined();
      });
    });

    it('should extract different types of concepts', async () => {
      const input: ClassifiedContent = {
        id: 'test-2',
        segments: [
          {
            id: 'seg-1',
            content: 'Supervised learning is defined as a machine learning approach that uses labeled training data.',
            type: 'definition',
            confidence: 0.9,
            category: 'educational',
            tags: ['definition'],
            importance: 0.9
          },
          {
            id: 'seg-2',
            content: 'For example, email spam detection uses labeled emails to train a classifier.',
            type: 'example',
            confidence: 0.8,
            category: 'explanation',
            tags: ['example'],
            importance: 0.6
          },
          {
            id: 'seg-3',
            content: 'The principle of supervised learning is that labeled data provides ground truth for training.',
            type: 'main_content',
            confidence: 0.8,
            category: 'educational',
            tags: ['principle'],
            importance: 0.8
          }
        ],
        categories: [
          {
            name: 'educational',
            description: 'Educational content',
            confidence: 0.9,
            segments: ['seg-1', 'seg-2', 'seg-3']
          }
        ],
        metadata: {
          source: 'supervised-learning.txt',
          format: 'txt'
        }
      };

      const result = await extractionStage.process(input);

      // Should extract different concept types
      const conceptTypes = new Set(result.concepts.map(c => c.type));
      expect(conceptTypes.has('definition')).toBe(true);
      expect(conceptTypes.has('example')).toBe(true);
      expect(conceptTypes.has('principle')).toBe(true);
    });

    it('should extract relationships between concepts', async () => {
      const input: ClassifiedContent = {
        id: 'test-3',
        segments: [
          {
            id: 'seg-1',
            content: 'Neural networks are a type of machine learning algorithm inspired by biological neurons.',
            type: 'definition',
            confidence: 0.9,
            category: 'technical',
            tags: ['definition', 'neural-networks'],
            importance: 0.9
          },
          {
            id: 'seg-2',
            content: 'Deep learning is part of neural networks that uses multiple layers for complex pattern recognition.',
            type: 'definition',
            confidence: 0.8,
            category: 'technical',
            tags: ['definition', 'deep-learning'],
            importance: 0.8
          }
        ],
        categories: [
          {
            name: 'technical',
            description: 'Technical content',
            confidence: 0.9,
            segments: ['seg-1', 'seg-2']
          }
        ],
        metadata: {
          source: 'neural-networks.txt',
          format: 'txt'
        }
      };

      const result = await extractionStage.process(input);

      expect(result.relationships.length).toBeGreaterThan(0);
      
      result.relationships.forEach(rel => {
        expect(rel.id).toBeDefined();
        expect(rel.source).toBeDefined();
        expect(rel.target).toBeDefined();
        expect(rel.type).toBeDefined();
        expect(rel.strength).toBeGreaterThan(0);
        expect(rel.description).toBeDefined();
      });
    });

    it('should filter concepts by minimum confidence', async () => {
      const highConfidenceConfig = { ...config, minConfidence: 0.8 };
      const highConfidenceStage = new ExtractionStage(highConfidenceConfig);

      const input: ClassifiedContent = {
        id: 'test-4',
        segments: [
          {
            id: 'seg-1',
            content: 'Some vague concept that might not be extracted well.',
            type: 'main_content',
            confidence: 0.5,
            category: 'general',
            tags: [],
            importance: 0.4
          }
        ],
        categories: [
          {
            name: 'general',
            description: 'General content',
            confidence: 0.5,
            segments: ['seg-1']
          }
        ],
        metadata: {
          source: 'vague.txt',
          format: 'txt'
        }
      };

      const result = await highConfidenceStage.process(input);

      // Should have fewer concepts due to high confidence threshold
      result.concepts.forEach(concept => {
        expect(concept.confidence).toBeGreaterThanOrEqual(0.8);
      });
    });

    it('should deduplicate similar concepts', async () => {
      const input: ClassifiedContent = {
        id: 'test-5',
        segments: [
          {
            id: 'seg-1',
            content: 'Machine learning is a subset of AI. Machine learning enables computers to learn from data.',
            type: 'definition',
            confidence: 0.9,
            category: 'technical',
            tags: ['definition'],
            importance: 0.8
          }
        ],
        categories: [
          {
            name: 'technical',
            description: 'Technical content',
            confidence: 0.9,
            segments: ['seg-1']
          }
        ],
        metadata: {
          source: 'duplicate-concepts.txt',
          format: 'txt'
        }
      };

      const result = await extractionStage.process(input);

      // Should not have duplicate "machine learning" concepts
      const conceptNames = result.concepts.map(c => c.name.toLowerCase());
      const uniqueNames = new Set(conceptNames);
      expect(uniqueNames.size).toBe(conceptNames.length);
    });
  });

  describe('validate', () => {
    it('should validate input with classified segments', async () => {
      const input: ClassifiedContent = {
        id: 'test-6',
        segments: [
          {
            id: 'seg-1',
            content: 'Valid content',
            type: 'main_content',
            confidence: 0.8,
            category: 'educational',
            tags: [],
            importance: 0.7
          }
        ],
        categories: [],
        metadata: {
          source: 'valid.txt',
          format: 'txt'
        }
      };

      const isValid = await extractionStage.validate(input);
      expect(isValid).toBe(true);
    });

    it('should reject input without segments', async () => {
      const input: ClassifiedContent = {
        id: 'test-7',
        segments: [],
        categories: [],
        metadata: {
          source: 'empty.txt',
          format: 'txt'
        }
      };

      const isValid = await extractionStage.validate(input);
      expect(isValid).toBe(false);
    });

    it('should reject segments without category', async () => {
      const input: ClassifiedContent = {
        id: 'test-8',
        segments: [
          {
            id: 'seg-1',
            content: 'Content without category',
            type: 'main_content',
            confidence: 0.8,
            category: '', // Empty category
            tags: [],
            importance: 0.7
          }
        ],
        categories: [],
        metadata: {
          source: 'no-category.txt',
          format: 'txt'
        }
      };

      const isValid = await extractionStage.validate(input);
      expect(isValid).toBe(false);
    });
  });

  describe('concept extraction accuracy', () => {
    it('should extract definitions with high accuracy', async () => {
      const input: ClassifiedContent = {
        id: 'definition-test',
        segments: [
          {
            id: 'seg-1',
            content: 'Artificial Intelligence is the simulation of human intelligence processes by machines.',
            type: 'definition',
            confidence: 0.9,
            category: 'technical',
            tags: ['definition'],
            importance: 0.9
          }
        ],
        categories: [
          {
            name: 'technical',
            description: 'Technical content',
            confidence: 0.9,
            segments: ['seg-1']
          }
        ],
        metadata: {
          source: 'ai-definition.txt',
          format: 'txt'
        }
      };

      const result = await extractionStage.process(input);

      const aiConcept = result.concepts.find(c => 
        c.name.toLowerCase().includes('artificial intelligence')
      );
      expect(aiConcept).toBeDefined();
      expect(aiConcept!.type).toBe('definition');
      expect(aiConcept!.confidence).toBeGreaterThan(0.7);
    });

    it('should extract processes with step identification', async () => {
      const input: ClassifiedContent = {
        id: 'process-test',
        segments: [
          {
            id: 'seg-1',
            content: 'The machine learning process involves data collection, preprocessing, model training, and evaluation.',
            type: 'main_content',
            confidence: 0.8,
            category: 'educational',
            tags: ['process'],
            importance: 0.8
          }
        ],
        categories: [
          {
            name: 'educational',
            description: 'Educational content',
            confidence: 0.8,
            segments: ['seg-1']
          }
        ],
        metadata: {
          source: 'ml-process.txt',
          format: 'txt'
        }
      };

      const result = await extractionStage.process(input);

      const processConcepts = result.concepts.filter(c => c.type === 'process');
      expect(processConcepts.length).toBeGreaterThan(0);
      
      const mlProcess = processConcepts.find(c => 
        c.description.includes('data collection') || c.description.includes('process')
      );
      expect(mlProcess).toBeDefined();
    });
  });
});