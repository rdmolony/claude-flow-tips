/**
 * TranscriptProcessor - Handles transcript ingestion, parsing, and normalization
 */

const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

class TranscriptProcessor {
  constructor(config = {}) {
    this.config = {
      supportedFormats: ['txt', 'vtt', 'srt'],
      maxLines: 5000,
      encoding: 'utf8',
      ...config
    };
  }

  /**
   * Process a raw transcript into structured format
   */
  async processTranscript(content, filename) {
    this.validateInput(content, filename);
    
    const format = this.detectFormat(filename);
    const parsedContent = this.parseContent(content, format);
    const normalizedContent = this.normalizeContent(parsedContent);
    const metadata = this.extractMetadata(normalizedContent, filename);
    
    const transcript = {
      id: this.generateUniqueId(content, filename),
      filename,
      content: normalizedContent,
      metadata: {
        ...metadata,
        processed_at: new Date().toISOString()
      }
    };

    this.validateTranscript(transcript);
    return transcript;
  }

  validateInput(content, filename) {
    if (!content || typeof content !== 'string') {
      throw new Error('Invalid content: must be a non-empty string');
    }

    if (content.trim().length === 0) {
      throw new Error('Empty transcript content');
    }

    const format = filename.split('.').pop().toLowerCase();
    if (!this.config.supportedFormats.includes(format)) {
      throw new Error(`Unsupported file format: ${format}`);
    }

    const lineCount = content.split('\n').length;
    if (lineCount > this.config.maxLines) {
      throw new Error(`Transcript exceeds maximum lines: ${lineCount} > ${this.config.maxLines}`);
    }
  }

  detectFormat(filename) {
    const extension = filename.split('.').pop().toLowerCase();
    return extension;
  }

  parseContent(content, format) {
    switch (format) {
      case 'vtt':
        return this.parseVTT(content);
      case 'srt':
        return this.parseSRT(content);
      case 'txt':
      default:
        return this.parsePlainText(content);
    }
  }

  parseVTT(content) {
    const lines = content.split('\n');
    const parsed = [];
    let lineNumber = 1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip WEBVTT header and empty lines
      if (line === 'WEBVTT' || line === '') continue;
      
      // Check for timestamp line
      const timestampMatch = line.match(/^(\d{2}:\d{2}:\d{2}\.\d{3}) --> (\d{2}:\d{2}:\d{2}\.\d{3})$/);
      if (timestampMatch) {
        // Next line should be the content
        i++;
        if (i < lines.length) {
          const text = lines[i].trim();
          if (text) {
            parsed.push({
              line_number: lineNumber++,
              timestamp: timestampMatch[1].substring(0, 8), // Remove milliseconds
              speaker: null,
              text: this.cleanText(text)
            });
          }
        }
      }
    }

    return parsed;
  }

  parseSRT(content) {
    const lines = content.split('\n');
    const parsed = [];
    let lineNumber = 1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip sequence numbers and empty lines
      if (!line || /^\d+$/.test(line)) continue;
      
      // Check for timestamp line
      const timestampMatch = line.match(/^(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})$/);
      if (timestampMatch) {
        // Next line should be the content
        i++;
        if (i < lines.length) {
          const text = lines[i].trim();
          if (text) {
            parsed.push({
              line_number: lineNumber++,
              timestamp: timestampMatch[1].substring(0, 8).replace(',', '.'),
              speaker: null,
              text: this.cleanText(text)
            });
          }
        }
      }
    }

    return parsed;
  }

  parsePlainText(content) {
    const lines = content.split('\n');
    const parsed = [];

    lines.forEach((line, index) => {
      line = line.trim();
      if (!line) return;

      // Check for timestamp format [00:00:30]
      const timestampMatch = line.match(/^\[(\d{2}:\d{2}:\d{2})\]\s*(.*)$/);
      if (timestampMatch) {
        const [, timestamp, text] = timestampMatch;
        const { speaker, cleanText } = this.extractSpeaker(text);
        
        parsed.push({
          line_number: index + 1,
          timestamp,
          speaker,
          text: this.cleanText(cleanText)
        });
      } else {
        // No timestamp
        const { speaker, cleanText } = this.extractSpeaker(line);
        parsed.push({
          line_number: index + 1,
          timestamp: null,
          speaker,
          text: this.cleanText(cleanText)
        });
      }
    });

    return parsed.filter(item => item.text.length > 0);
  }

  extractSpeaker(text) {
    // Look for "Speaker:" pattern
    const speakerMatch = text.match(/^([^:]+):\\s*(.*)$/);
    if (speakerMatch) {
      return {
        speaker: speakerMatch[1].trim(),
        cleanText: speakerMatch[2].trim()
      };
    }

    return {
      speaker: null,
      cleanText: text
    };
  }

  cleanText(text) {
    // Normalize whitespace and tabs
    return text.replace(/\s+/g, ' ').trim();
  }

  normalizeContent(parsed) {
    return parsed.map((item, index) => ({
      ...item,
      line_number: index + 1,
      text: this.cleanText(item.text)
    }));
  }

  extractMetadata(content, filename) {
    const hasTimestamps = content.some(item => item.timestamp !== null);
    const totalLines = content.length;
    
    let estimatedDuration = null;
    if (hasTimestamps && content.length > 0) {
      const lastTimestamp = content[content.length - 1].timestamp;
      if (lastTimestamp) {
        estimatedDuration = lastTimestamp;
      }
    }

    return {
      filename,
      total_lines: totalLines,
      has_timestamps: hasTimestamps,
      estimated_duration: estimatedDuration,
      language: this.detectLanguage(content)
    };
  }

  detectLanguage(content) {
    // Simple language detection based on common words
    const text = content.map(item => item.text).join(' ').toLowerCase();
    
    const spanishWords = ['el', 'la', 'de', 'que', 'y', 'en', 'es', 'se', 'no', 'te'];
    const frenchWords = ['le', 'de', 'et', 'à', 'un', 'il', 'être', 'et', 'en', 'avoir'];
    const englishWords = ['the', 'and', 'to', 'of', 'a', 'in', 'is', 'it', 'you', 'that'];

    const spanishScore = spanishWords.filter(word => text.includes(` ${word} `)).length;
    const frenchScore = frenchWords.filter(word => text.includes(` ${word} `)).length;
    const englishScore = englishWords.filter(word => text.includes(` ${word} `)).length;

    if (spanishScore > englishScore && spanishScore > frenchScore) return 'es';
    if (frenchScore > englishScore && frenchScore > spanishScore) return 'fr';
    return 'en';
  }

  validateTranscript(transcript) {
    const requiredFields = ['id', 'filename', 'content', 'metadata'];
    
    for (const field of requiredFields) {
      if (!transcript[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    if (!Array.isArray(transcript.content)) {
      throw new Error('Content must be an array');
    }

    if (transcript.content.length === 0) {
      throw new Error('Transcript content cannot be empty');
    }

    // Validate content items
    transcript.content.forEach((item, index) => {
      const requiredItemFields = ['line_number', 'text'];
      
      for (const field of requiredItemFields) {
        if (item[field] === undefined) {
          throw new Error(`Content item ${index} missing required field: ${field}`);
        }
      }

      if (typeof item.text !== 'string' || item.text.trim().length === 0) {
        throw new Error(`Content item ${index} has invalid text`);
      }
    });
  }

  generateUniqueId(content, filename) {
    // Generate deterministic ID based on content and filename
    const hash = crypto.createHash('md5')
      .update(content + filename)
      .digest('hex');
    
    // Convert to UUID format
    return [
      hash.substring(0, 8),
      hash.substring(8, 12),
      hash.substring(12, 16),
      hash.substring(16, 20),
      hash.substring(20, 32)
    ].join('-');
  }
}

module.exports = TranscriptProcessor;