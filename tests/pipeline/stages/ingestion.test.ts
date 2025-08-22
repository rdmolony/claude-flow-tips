import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { IngestionStage } from '../../../src/pipeline/stages/ingestion';
import { TranscriptInput, IngestionConfig } from '../../../src/pipeline/types';

describe('IngestionStage', () => {
  let ingestionStage: IngestionStage;
  let config: IngestionConfig;

  beforeEach(() => {
    config = {
      supportedFormats: ['txt', 'srt', 'vtt'],
      maxFileSize: 10 * 1024 * 1024, // 10MB
      preprocessingEnabled: true
    };
    ingestionStage = new IngestionStage(config);
  });

  describe('process', () => {
    it('should process valid transcript input', async () => {
      const input: TranscriptInput = {
        id: 'test-1',
        content: 'This is a test transcript with multiple sentences. It contains various topics.',
        metadata: {
          source: 'test-video.mp4',
          duration: 120,
          timestamp: '2024-01-01T00:00:00Z',
          format: 'txt'
        }
      };

      const result = await ingestionStage.process(input);

      expect(result.id).toBe(input.id);
      expect(result.content).toBe(input.content);
      expect(result.metadata).toEqual(input.metadata);
    });

    it('should preprocess content when enabled', async () => {
      const input: TranscriptInput = {
        id: 'test-2',
        content: '  This   has   extra   spaces  and\n\n\nmultiple\nlines  ',
        metadata: {
          source: 'test.txt',
          format: 'txt'
        }
      };

      const result = await ingestionStage.process(input);

      expect(result.content).toBe('This has extra spaces and multiple lines');
    });

    it('should preserve content when preprocessing disabled', async () => {
      const configNoPreprocess = { ...config, preprocessingEnabled: false };
      const stage = new IngestionStage(configNoPreprocess);
      
      const input: TranscriptInput = {
        id: 'test-3',
        content: '  Raw   content   with   spaces  ',
        metadata: {
          source: 'test.txt',
          format: 'txt'
        }
      };

      const result = await stage.process(input);

      expect(result.content).toBe(input.content);
    });

    it('should handle empty content', async () => {
      const input: TranscriptInput = {
        id: 'test-4',
        content: '',
        metadata: {
          source: 'empty.txt',
          format: 'txt'
        }
      };

      await expect(ingestionStage.process(input)).rejects.toThrow('Content cannot be empty');
    });
  });

  describe('validate', () => {
    it('should validate supported format', async () => {
      const input: TranscriptInput = {
        id: 'test-5',
        content: 'Valid content',
        metadata: {
          source: 'test.txt',
          format: 'txt'
        }
      };

      const isValid = await ingestionStage.validate(input);
      expect(isValid).toBe(true);
    });

    it('should reject unsupported format', async () => {
      const input: TranscriptInput = {
        id: 'test-6',
        content: 'Valid content',
        metadata: {
          source: 'test.pdf',
          format: 'pdf'
        }
      };

      const isValid = await ingestionStage.validate(input);
      expect(isValid).toBe(false);
    });

    it('should reject content exceeding size limit', async () => {
      const largeContent = 'x'.repeat(config.maxFileSize + 1);
      const input: TranscriptInput = {
        id: 'test-7',
        content: largeContent,
        metadata: {
          source: 'large.txt',
          format: 'txt'
        }
      };

      const isValid = await ingestionStage.validate(input);
      expect(isValid).toBe(false);
    });
  });
});