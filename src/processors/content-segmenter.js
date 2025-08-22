/**
 * ContentSegmenter - Divides transcript into logical chunks for processing
 */

class ContentSegmenter {
  constructor(config = {}) {
    this.config = {
      maxSegmentWords: 500,
      minSegmentWords: 20,
      overlapWords: 50,
      segmentationStrategy: 'topic_boundary', // 'topic_boundary', 'time_based', 'speaker_based'
      ...config
    };
  }

  /**
   * Segment transcript content into logical chunks
   */
  async segmentContent(transcript) {
    const segments = [];
    
    switch (this.config.segmentationStrategy) {
      case 'topic_boundary':
        return this.segmentByTopicBoundary(transcript);
      case 'time_based':
        return this.segmentByTime(transcript);
      case 'speaker_based':
        return this.segmentBySpeaker(transcript);
      default:
        return this.segmentByTopicBoundary(transcript);
    }
  }

  /**
   * Segment by detecting topic boundaries using semantic similarity
   */
  segmentByTopicBoundary(transcript) {
    const segments = [];
    const content = transcript.content;
    
    let currentSegment = {
      text: '',
      lines: [],
      line_start: null,
      line_end: null,
      timestamp: null,
      word_count: 0
    };

    for (let i = 0; i < content.length; i++) {
      const line = content[i];
      const words = line.text.split(/\\s+/);
      
      // Start new segment if needed
      if (currentSegment.line_start === null) {
        currentSegment.line_start = line.line_number;
        currentSegment.timestamp = line.timestamp;
      }
      
      // Add line to current segment
      currentSegment.text += (currentSegment.text ? ' ' : '') + line.text;
      currentSegment.lines.push(line);
      currentSegment.word_count += words.length;
      currentSegment.line_end = line.line_number;
      
      // Check if we should close this segment
      const shouldCloseSegment = 
        currentSegment.word_count >= this.config.maxSegmentWords ||
        this.detectTopicBoundary(currentSegment, content[i + 1]) ||
        i === content.length - 1;
      
      if (shouldCloseSegment && currentSegment.word_count >= this.config.minSegmentWords) {
        segments.push({
          ...currentSegment,
          segment_id: segments.length + 1
        });
        
        // Start new segment with overlap
        currentSegment = this.createOverlappingSegment(currentSegment);
      }
    }

    return segments;
  }

  /**
   * Detect topic boundaries using simple heuristics
   */
  detectTopicBoundary(currentSegment, nextLine) {
    if (!nextLine) return true;
    
    const currentText = currentSegment.text.toLowerCase();
    const nextText = nextLine.text.toLowerCase();
    
    // Detect topic change indicators
    const topicChangeIndicators = [
      'next topic', 'moving on', 'now let\\'s', 'switching to',
      'another thing', 'different topic', 'question:', 'answer:'
    ];
    
    for (const indicator of topicChangeIndicators) {
      if (nextText.includes(indicator)) {
        return true;
      }
    }
    
    // Detect speaker changes as potential topic boundaries
    const currentLines = currentSegment.lines;
    if (currentLines.length > 0) {
      const lastSpeaker = currentLines[currentLines.length - 1].speaker;
      if (lastSpeaker && nextLine.speaker && lastSpeaker !== nextLine.speaker) {
        return true;
      }
    }
    
    // Simple semantic similarity check
    const similarity = this.calculateSimpleSimilarity(currentText, nextText);
    if (similarity < 0.3) {
      return true;
    }
    
    return false;
  }

  /**
   * Simple similarity calculation based on word overlap
   */
  calculateSimpleSimilarity(text1, text2) {
    const words1 = new Set(text1.split(/\\s+/).filter(w => w.length > 3));
    const words2 = new Set(text2.split(/\\s+/).filter(w => w.length > 3));
    
    const intersection = new Set([...words1].filter(w => words2.has(w)));
    const union = new Set([...words1, ...words2]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  /**
   * Create overlapping segment for continuity
   */
  createOverlappingSegment(previousSegment) {
    const overlapLines = previousSegment.lines.slice(-2); // Last 2 lines
    
    if (overlapLines.length === 0) {
      return {
        text: '',
        lines: [],
        line_start: null,
        line_end: null,
        timestamp: null,
        word_count: 0
      };
    }
    
    const overlapText = overlapLines.map(line => line.text).join(' ');
    const overlapWordCount = overlapText.split(/\\s+/).length;
    
    return {
      text: overlapText,
      lines: [...overlapLines],
      line_start: overlapLines[0].line_number,
      line_end: overlapLines[overlapLines.length - 1].line_number,
      timestamp: overlapLines[0].timestamp,
      word_count: overlapWordCount
    };
  }

  /**
   * Segment by time boundaries
   */
  segmentByTime(transcript) {
    const segments = [];
    const content = transcript.content;
    const timeGapThreshold = 30; // seconds
    
    let currentSegment = this.createEmptySegment();
    
    for (let i = 0; i < content.length; i++) {
      const line = content[i];
      
      // Check for time gap
      if (line.timestamp && currentSegment.timestamp) {
        const timeGap = this.calculateTimeGap(currentSegment.timestamp, line.timestamp);
        
        if (timeGap > timeGapThreshold && currentSegment.word_count >= this.config.minSegmentWords) {
          segments.push({
            ...currentSegment,
            segment_id: segments.length + 1
          });
          currentSegment = this.createEmptySegment();
        }
      }
      
      this.addLineToSegment(currentSegment, line);
      
      // Check word count limit
      if (currentSegment.word_count >= this.config.maxSegmentWords) {
        segments.push({
          ...currentSegment,
          segment_id: segments.length + 1
        });
        currentSegment = this.createOverlappingSegment(currentSegment);
      }
    }
    
    // Add final segment
    if (currentSegment.word_count >= this.config.minSegmentWords) {
      segments.push({
        ...currentSegment,
        segment_id: segments.length + 1
      });
    }
    
    return segments;
  }

  /**
   * Segment by speaker changes
   */
  segmentBySpeaker(transcript) {
    const segments = [];
    const content = transcript.content;
    
    let currentSegment = this.createEmptySegment();
    let currentSpeaker = null;
    
    for (const line of content) {
      // Check for speaker change
      if (line.speaker && line.speaker !== currentSpeaker) {
        // Close previous segment if it has content
        if (currentSegment.word_count >= this.config.minSegmentWords) {
          segments.push({
            ...currentSegment,
            segment_id: segments.length + 1,
            speaker: currentSpeaker
          });
        }
        
        // Start new segment
        currentSegment = this.createEmptySegment();
        currentSpeaker = line.speaker;
      }
      
      this.addLineToSegment(currentSegment, line);
      
      // Check word count limit
      if (currentSegment.word_count >= this.config.maxSegmentWords) {
        segments.push({
          ...currentSegment,
          segment_id: segments.length + 1,
          speaker: currentSpeaker
        });
        currentSegment = this.createOverlappingSegment(currentSegment);
      }
    }
    
    // Add final segment
    if (currentSegment.word_count >= this.config.minSegmentWords) {
      segments.push({
        ...currentSegment,
        segment_id: segments.length + 1,
        speaker: currentSpeaker
      });
    }
    
    return segments;
  }

  createEmptySegment() {
    return {
      text: '',
      lines: [],
      line_start: null,
      line_end: null,
      timestamp: null,
      word_count: 0
    };
  }

  addLineToSegment(segment, line) {
    if (segment.line_start === null) {
      segment.line_start = line.line_number;
      segment.timestamp = line.timestamp;
    }
    
    segment.text += (segment.text ? ' ' : '') + line.text;
    segment.lines.push(line);
    segment.word_count += line.text.split(/\\s+/).length;
    segment.line_end = line.line_number;
  }

  calculateTimeGap(timestamp1, timestamp2) {
    // Parse timestamps in format "00:12:34"
    const parseTime = (timeStr) => {
      const parts = timeStr.split(':').map(Number);
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    };
    
    try {
      const time1 = parseTime(timestamp1);
      const time2 = parseTime(timestamp2);
      return Math.abs(time2 - time1);
    } catch (error) {
      return 0;
    }
  }

  /**
   * Validate segmentation results
   */
  validateSegments(segments) {
    for (const segment of segments) {
      if (!segment.text || segment.text.trim().length === 0) {
        throw new Error(`Empty segment found: ${segment.segment_id}`);
      }
      
      if (segment.word_count < this.config.minSegmentWords) {
        console.warn(`Segment ${segment.segment_id} below minimum word count: ${segment.word_count}`);
      }
      
      if (!segment.line_start || !segment.line_end) {
        throw new Error(`Invalid line numbers for segment ${segment.segment_id}`);
      }
    }
    
    return true;
  }
}

module.exports = ContentSegmenter;