/**
 * Unit tests for TranscriptProcessor
 * Tests transcript ingestion, parsing, and normalization
 */

const { describe, test, expect, beforeEach } = require('@jest/globals');
const TranscriptProcessor = require('../../../src/processors/transcript-processor');

describe('TranscriptProcessor', () => {
  let processor;
  
  beforeEach(() => {
    processor = new TranscriptProcessor();
  });

  describe('constructor', () => {
    test('should create processor with default configuration', () => {
      expect(processor).toBeInstanceOf(TranscriptProcessor);
      expect(processor.config).toBeDefined();
      expect(processor.config.supportedFormats).toContain('txt');
      expect(processor.config.supportedFormats).toContain('vtt');
      expect(processor.config.supportedFormats).toContain('srt');
    });

    test('should accept custom configuration', () => {
      const customConfig = { supportedFormats: ['txt'], maxLines: 1000 };
      const customProcessor = new TranscriptProcessor(customConfig);
      
      expect(customProcessor.config.supportedFormats).toEqual(['txt']);
      expect(customProcessor.config.maxLines).toBe(1000);
    });
  });

  describe('processTranscript', () => {
    test('should process valid TXT transcript with timestamps', async () => {
      const input = `[00:00:30] Welcome to this tutorial on setting up Claude Flow.
[00:01:15] First, install Docker on your system.
[00:02:45] Warning: never run with dangerous permissions.`;

      const result = await processor.processTranscript(input, 'test.txt');

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.filename).toBe('test.txt');
      expect(result.content).toHaveLength(3);
      
      // Verify first line parsing
      expect(result.content[0]).toEqual({
        line_number: 1,
        timestamp: '00:00:30',
        speaker: null,
        text: 'Welcome to this tutorial on setting up Claude Flow.'
      });

      // Verify metadata
      expect(result.metadata).toBeDefined();
      expect(result.metadata.language).toBe('en');
      expect(result.metadata.total_lines).toBe(3);
      expect(result.metadata.processed_at).toBeDefined();
    });

    test('should process VTT transcript format', async () => {
      const vttInput = `WEBVTT

00:00:30.000 --> 00:00:35.000
Welcome to this tutorial on setting up Claude Flow.

00:01:15.000 --> 00:01:20.000
First, install Docker on your system.`;

      const result = await processor.processTranscript(vttInput, 'test.vtt');

      expect(result.content).toHaveLength(2);
      expect(result.content[0].timestamp).toBe('00:00:30');
      expect(result.content[0].text).toBe('Welcome to this tutorial on setting up Claude Flow.');
      expect(result.content[1].timestamp).toBe('00:01:15');
    });

    test('should process SRT transcript format', async () => {
      const srtInput = `1
00:00:30,000 --> 00:00:35,000
Welcome to this tutorial on setting up Claude Flow.

2
00:01:15,000 --> 00:01:20,000
First, install Docker on your system.`;

      const result = await processor.processTranscript(srtInput, 'test.srt');

      expect(result.content).toHaveLength(2);
      expect(result.content[0].timestamp).toBe('00:00:30');
      expect(result.content[1].timestamp).toBe('00:01:15');
    });

    test('should handle transcript without timestamps', async () => {
      const plainInput = `Welcome to this tutorial on setting up Claude Flow.
First, install Docker on your system.
Warning: never run with dangerous permissions.`;

      const result = await processor.processTranscript(plainInput, 'plain.txt');

      expect(result.content).toHaveLength(3);
      expect(result.content[0].timestamp).toBeNull();
      expect(result.content[0].text).toBe('Welcome to this tutorial on setting up Claude Flow.');
    });

    test('should detect and parse speaker information', async () => {
      const speakerInput = `[00:00:30] Host: Welcome to this tutorial.
[00:01:15] Guest: Thanks for having me on the show.
[00:02:45] Host: Let's talk about Docker setup.`;

      const result = await processor.processTranscript(speakerInput, 'speakers.txt');

      expect(result.content[0].speaker).toBe('Host');
      expect(result.content[1].speaker).toBe('Guest');
      expect(result.content[2].speaker).toBe('Host');
    });

    test('should normalize text encoding and whitespace', async () => {
      const messyInput = `[00:00:30]   Welcome  to   this    tutorial.   
[00:01:15]	First,	install	Docker.	
[00:02:45] Warning:   never  run   with   dangerous   permissions.  `;

      const result = await processor.processTranscript(messyInput, 'messy.txt');

      expect(result.content[0].text).toBe('Welcome to this tutorial.');
      expect(result.content[1].text).toBe('First, install Docker.');
      expect(result.content[2].text).toBe('Warning: never run with dangerous permissions.');
    });

    test('should reject invalid file formats', async () => {
      await expect(
        processor.processTranscript('content', 'invalid.pdf')
      ).rejects.toThrow('Unsupported file format');
    });

    test('should reject empty transcript', async () => {
      await expect(
        processor.processTranscript('', 'empty.txt')
      ).rejects.toThrow('Empty transcript content');
    });

    test('should handle transcripts exceeding maximum lines', async () => {
      const longTranscript = Array(10000).fill('[00:00:30] Test line').join('\\n');
      
      await expect(
        processor.processTranscript(longTranscript, 'long.txt')
      ).rejects.toThrow('Transcript exceeds maximum lines');
    });
  });

  describe('extractMetadata', () => {
    test('should extract duration from timestamps', () => {
      const content = [
        { timestamp: '00:00:30' },
        { timestamp: '00:01:15' },
        { timestamp: '00:45:30' }
      ];

      const metadata = processor.extractMetadata(content, 'test.txt');

      expect(metadata.estimated_duration).toBe('00:45:30');
      expect(metadata.total_lines).toBe(3);
      expect(metadata.has_timestamps).toBe(true);
    });

    test('should handle content without timestamps', () => {
      const content = [
        { timestamp: null, text: 'Line 1' },
        { timestamp: null, text: 'Line 2' }
      ];

      const metadata = processor.extractMetadata(content, 'test.txt');

      expect(metadata.has_timestamps).toBe(false);
      expect(metadata.estimated_duration).toBeNull();
    });

    test('should detect language from content', () => {
      const englishContent = [
        { text: 'Welcome to this English tutorial' }
      ];
      const spanishContent = [
        { text: 'Bienvenidos a este tutorial en español' }
      ];

      const englishMeta = processor.extractMetadata(englishContent, 'en.txt');
      const spanishMeta = processor.extractMetadata(spanishContent, 'es.txt');

      expect(englishMeta.language).toBe('en');
      expect(spanishMeta.language).toBe('es');
    });
  });

  describe('validateTranscript', () => {
    test('should validate properly formed transcript', () => {
      const validTranscript = {
        id: 'test-123',
        filename: 'test.txt',
        content: [
          { line_number: 1, text: 'Valid content' }
        ],
        metadata: { language: 'en' }
      };

      expect(() => processor.validateTranscript(validTranscript)).not.toThrow();
    });

    test('should reject transcript missing required fields', () => {
      const invalidTranscript = {
        id: 'test-123',
        // missing filename
        content: [{ line_number: 1, text: 'Content' }]
      };

      expect(() => processor.validateTranscript(invalidTranscript))
        .toThrow('Missing required field: filename');
    });

    test('should reject transcript with empty content', () => {
      const emptyTranscript = {
        id: 'test-123',
        filename: 'test.txt',
        content: [],
        metadata: { language: 'en' }
      };

      expect(() => processor.validateTranscript(emptyTranscript))
        .toThrow('Transcript content cannot be empty');
    });

    test('should reject transcript with malformed content items', () => {
      const malformedTranscript = {
        id: 'test-123',
        filename: 'test.txt',
        content: [
          { line_number: 1 } // missing text field
        ],
        metadata: { language: 'en' }
      };

      expect(() => processor.validateTranscript(malformedTranscript))
        .toThrow('Content item missing required field: text');
    });
  });

  describe('generateUniqueId', () => {
    test('should generate consistent ID for same input', () => {
      const content = 'Same content';
      const filename = 'same-file.txt';

      const id1 = processor.generateUniqueId(content, filename);
      const id2 = processor.generateUniqueId(content, filename);

      expect(id1).toBe(id2);
    });

    test('should generate different IDs for different inputs', () => {
      const id1 = processor.generateUniqueId('content1', 'file1.txt');
      const id2 = processor.generateUniqueId('content2', 'file2.txt');

      expect(id1).not.toBe(id2);
    });

    test('should generate UUID-like format', () => {
      const id = processor.generateUniqueId('test', 'test.txt');
      
      expect(id).toMatch(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/);
    });
  });
});