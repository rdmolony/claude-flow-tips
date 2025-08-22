import { describe, it, expect, beforeEach } from '@jest/globals';
import { SegmentationStage } from '../../../src/pipeline/stages/segmentation';
import { TranscriptInput, SegmentationConfig } from '../../../src/pipeline/types';

describe('SegmentationStage', () => {
  let segmentationStage: SegmentationStage;
  let config: SegmentationConfig;

  beforeEach(() => {
    config = {
      strategy: 'topic_based',
      minSegmentLength: 50,
      maxSegmentLength: 500,
      overlapPercent: 10
    };
    segmentationStage = new SegmentationStage(config);
  });

  describe('process', () => {
    it('should segment content into logical chunks', async () => {
      const input: TranscriptInput = {
        id: 'test-1',
        content: `Introduction to machine learning. Machine learning is a subset of artificial intelligence. 
        
        Now let's talk about supervised learning. Supervised learning uses labeled data to train models. This is different from unsupervised learning.
        
        In conclusion, machine learning has many applications. It's used in recommendation systems and image recognition.`,
        metadata: {
          source: 'ml-intro.txt',
          format: 'txt'
        }
      };

      const result = await segmentationStage.process(input);

      expect(result.id).toBe(input.id);
      expect(result.segments).toHaveLength(3);
      expect(result.segments[0].type).toBe('introduction');
      expect(result.segments[1].type).toBe('main_content');
      expect(result.segments[2].type).toBe('conclusion');
    });

    it('should respect minimum segment length', async () => {
      const input: TranscriptInput = {
        id: 'test-2',
        content: 'Short. Very short. Another short segment. This is a longer segment that meets the minimum length requirement for proper segmentation.',
        metadata: {
          source: 'short.txt',
          format: 'txt'
        }
      };

      const result = await segmentationStage.process(input);

      result.segments.forEach(segment => {
        expect(segment.content.length).toBeGreaterThanOrEqual(config.minSegmentLength);
      });
    });

    it('should not exceed maximum segment length', async () => {
      const longContent = 'This is a very long piece of content. '.repeat(50);
      const input: TranscriptInput = {
        id: 'test-3',
        content: longContent,
        metadata: {
          source: 'long.txt',
          format: 'txt'
        }
      };

      const result = await segmentationStage.process(input);

      result.segments.forEach(segment => {
        expect(segment.content.length).toBeLessThanOrEqual(config.maxSegmentLength);
      });
    });

    it('should apply overlap between segments', async () => {
      const input: TranscriptInput = {
        id: 'test-4',
        content: 'First topic about machine learning algorithms. Second topic about deep learning networks. Third topic about neural network architectures.',
        metadata: {
          source: 'overlap.txt',
          format: 'txt'
        }
      };

      const result = await segmentationStage.process(input);

      if (result.segments.length > 1) {
        // Check that segments have some overlap
        const firstSegment = result.segments[0].content;
        const secondSegment = result.segments[1].content;
        const overlapLength = Math.floor(firstSegment.length * config.overlapPercent / 100);
        
        if (overlapLength > 0) {
          const firstEnd = firstSegment.slice(-overlapLength);
          expect(secondSegment).toContain(firstEnd.split(' ').slice(-2).join(' '));
        }
      }
    });

    it('should assign confidence scores to segments', async () => {
      const input: TranscriptInput = {
        id: 'test-5',
        content: 'Clear introduction. Main content with examples. Clear conclusion.',
        metadata: {
          source: 'confidence.txt',
          format: 'txt'
        }
      };

      const result = await segmentationStage.process(input);

      result.segments.forEach(segment => {
        expect(segment.confidence).toBeGreaterThan(0);
        expect(segment.confidence).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('time-based segmentation', () => {
    it('should segment based on time when strategy is time_based', async () => {
      const timeConfig = { ...config, strategy: 'time_based' as const };
      const stage = new SegmentationStage(timeConfig);

      const input: TranscriptInput = {
        id: 'test-6',
        content: 'Time-based content for segmentation testing.',
        metadata: {
          source: 'time.txt',
          format: 'txt',
          duration: 300 // 5 minutes
        }
      };

      const result = await stage.process(input);

      expect(result.segments.length).toBeGreaterThan(0);
      result.segments.forEach(segment => {
        expect(segment.startTime).toBeDefined();
        expect(segment.endTime).toBeDefined();
      });
    });
  });

  describe('validate', () => {
    it('should validate input with sufficient content', async () => {
      const input: TranscriptInput = {
        id: 'test-7',
        content: 'Sufficient content for segmentation processing and analysis.',
        metadata: {
          source: 'valid.txt',
          format: 'txt'
        }
      };

      const isValid = await segmentationStage.validate(input);
      expect(isValid).toBe(true);
    });

    it('should reject input with insufficient content', async () => {
      const input: TranscriptInput = {
        id: 'test-8',
        content: 'Too short',
        metadata: {
          source: 'short.txt',
          format: 'txt'
        }
      };

      const isValid = await segmentationStage.validate(input);
      expect(isValid).toBe(false);
    });
  });
});