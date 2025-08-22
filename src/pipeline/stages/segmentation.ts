import { 
  PipelineStage, 
  TranscriptInput, 
  SegmentedContent, 
  ContentSegment, 
  SegmentationConfig, 
  PipelineStageError 
} from '../types';

export class SegmentationStage implements PipelineStage<TranscriptInput, SegmentedContent> {
  public readonly name = 'segmentation';

  constructor(private config: SegmentationConfig) {}

  async process(input: TranscriptInput): Promise<SegmentedContent> {
    try {
      if (!(await this.validate(input))) {
        throw new PipelineStageError(
          'Input validation failed for segmentation',
          this.name,
          'VALIDATION_FAILED',
          input,
          false
        );
      }

      let segments: ContentSegment[];

      switch (this.config.strategy) {
        case 'time_based':
          segments = await this.timeBasedSegmentation(input);
          break;
        case 'topic_based':
          segments = await this.topicBasedSegmentation(input);
          break;
        case 'hybrid':
          segments = await this.hybridSegmentation(input);
          break;
        default:
          throw new PipelineStageError(
            `Unknown segmentation strategy: ${this.config.strategy}`,
            this.name,
            'INVALID_STRATEGY',
            { strategy: this.config.strategy },
            false
          );
      }

      // Apply overlap if configured
      if (this.config.overlapPercent > 0) {
        segments = this.applyOverlap(segments);
      }

      return {
        id: input.id,
        segments,
        metadata: input.metadata
      };
    } catch (error) {
      if (error instanceof PipelineStageError) {
        throw error;
      }

      throw new PipelineStageError(
        `Segmentation processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        this.name,
        'PROCESSING_FAILED',
        { input, error },
        true
      );
    }
  }

  async validate(input: TranscriptInput): Promise<boolean> {
    try {
      // Check minimum content length
      if (input.content.length < this.config.minSegmentLength) {
        return false;
      }

      // Check that content has meaningful structure
      const sentences = input.content.split(/[.!?]+/).filter(s => s.trim().length > 10);
      if (sentences.length < 2) {
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  private async topicBasedSegmentation(input: TranscriptInput): Promise<ContentSegment[]> {
    const content = input.content;
    const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    
    if (paragraphs.length <= 1) {
      // Fallback to sentence-based segmentation
      return this.sentenceBasedSegmentation(content);
    }

    const segments: ContentSegment[] = [];
    let segmentIndex = 0;

    for (const paragraph of paragraphs) {
      if (paragraph.trim().length < this.config.minSegmentLength) {
        // Combine with next paragraph if too short
        continue;
      }

      const segmentType = this.determineSegmentType(paragraph, segmentIndex, paragraphs.length);
      const confidence = this.calculateConfidence(paragraph, segmentType);

      // Split long paragraphs if they exceed max length
      if (paragraph.length > this.config.maxSegmentLength) {
        const subSegments = this.splitLongContent(paragraph);
        for (const subSegment of subSegments) {
          segments.push({
            id: `${input.id}-segment-${segments.length}`,
            content: subSegment.trim(),
            type: segmentType,
            confidence,
          });
        }
      } else {
        segments.push({
          id: `${input.id}-segment-${segments.length}`,
          content: paragraph.trim(),
          type: segmentType,
          confidence,
        });
      }
      
      segmentIndex++;
    }

    return segments.length > 0 ? segments : this.sentenceBasedSegmentation(content);
  }

  private sentenceBasedSegmentation(content: string): ContentSegment[] {
    const sentences = content.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);
    const segments: ContentSegment[] = [];
    let currentSegment = '';
    let segmentIndex = 0;

    for (const sentence of sentences) {
      if (currentSegment.length + sentence.length < this.config.maxSegmentLength) {
        currentSegment += (currentSegment ? ' ' : '') + sentence;
      } else {
        if (currentSegment.length >= this.config.minSegmentLength) {
          segments.push({
            id: `segment-${segmentIndex++}`,
            content: currentSegment.trim(),
            type: this.determineSegmentType(currentSegment, segmentIndex, sentences.length),
            confidence: this.calculateConfidence(currentSegment, 'main_content'),
          });
        }
        currentSegment = sentence;
      }
    }

    // Add the last segment
    if (currentSegment.length >= this.config.minSegmentLength) {
      segments.push({
        id: `segment-${segmentIndex}`,
        content: currentSegment.trim(),
        type: this.determineSegmentType(currentSegment, segmentIndex, sentences.length),
        confidence: this.calculateConfidence(currentSegment, 'main_content'),
      });
    }

    return segments;
  }

  private async timeBasedSegmentation(input: TranscriptInput): Promise<ContentSegment[]> {
    const duration = input.metadata.duration || 300; // Default 5 minutes
    const content = input.content;
    
    // Estimate segment duration based on content length and total duration
    const wordsPerMinute = 150; // Average speaking rate
    const totalWords = content.split(/\s+/).length;
    const estimatedDuration = totalWords / wordsPerMinute * 60; // in seconds
    
    const actualDuration = Math.max(duration, estimatedDuration);
    const segmentDuration = Math.min(120, actualDuration / 3); // Max 2-minute segments
    
    const segments: ContentSegment[] = [];
    const sentences = content.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);
    
    let currentSegment = '';
    let currentStartTime = 0;
    let segmentIndex = 0;
    
    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      const estimatedSentenceTime = (sentence.split(/\s+/).length / wordsPerMinute) * 60;
      
      if (currentSegment.length + sentence.length < this.config.maxSegmentLength) {
        currentSegment += (currentSegment ? ' ' : '') + sentence;
      } else {
        if (currentSegment.length >= this.config.minSegmentLength) {
          const endTime = currentStartTime + segmentDuration;
          segments.push({
            id: `time-segment-${segmentIndex++}`,
            content: currentSegment.trim(),
            type: this.determineSegmentType(currentSegment, segmentIndex, sentences.length),
            confidence: this.calculateConfidence(currentSegment, 'main_content'),
            startTime: currentStartTime,
            endTime: Math.min(endTime, actualDuration)
          });
          currentStartTime = endTime;
        }
        currentSegment = sentence;
      }
    }

    // Add the last segment
    if (currentSegment.length >= this.config.minSegmentLength) {
      segments.push({
        id: `time-segment-${segmentIndex}`,
        content: currentSegment.trim(),
        type: this.determineSegmentType(currentSegment, segmentIndex, sentences.length),
        confidence: this.calculateConfidence(currentSegment, 'main_content'),
        startTime: currentStartTime,
        endTime: actualDuration
      });
    }

    return segments;
  }

  private async hybridSegmentation(input: TranscriptInput): Promise<ContentSegment[]> {
    // Combine topic-based and time-based approaches
    const topicSegments = await this.topicBasedSegmentation(input);
    const timeSegments = await this.timeBasedSegmentation(input);
    
    // Merge segments based on content similarity and time boundaries
    return this.mergeSegments(topicSegments, timeSegments);
  }

  private mergeSegments(topicSegments: ContentSegment[], timeSegments: ContentSegment[]): ContentSegment[] {
    // Simple merge strategy: prefer topic segments but respect time boundaries
    const merged: ContentSegment[] = [];
    
    for (const topicSegment of topicSegments) {
      // Find overlapping time segments
      const overlapping = timeSegments.filter(timeSegment => 
        this.hasContentOverlap(topicSegment.content, timeSegment.content)
      );
      
      if (overlapping.length > 0) {
        // Use time information from time segments
        const timeInfo = overlapping[0];
        merged.push({
          ...topicSegment,
          startTime: timeInfo.startTime,
          endTime: timeInfo.endTime
        });
      } else {
        merged.push(topicSegment);
      }
    }
    
    return merged;
  }

  private hasContentOverlap(content1: string, content2: string): boolean {
    const words1 = new Set(content1.toLowerCase().split(/\s+/));
    const words2 = new Set(content2.toLowerCase().split(/\s+/));
    const intersection = new Set([...words1].filter(word => words2.has(word)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size > 0.3; // 30% overlap threshold
  }

  private determineSegmentType(content: string, index: number, total: number): ContentSegment['type'] {
    const lowerContent = content.toLowerCase();
    
    // Introduction patterns
    if (index === 0 || lowerContent.includes('introduction') || lowerContent.includes('welcome') || 
        lowerContent.includes('today we') || lowerContent.includes('let\'s start')) {
      return 'introduction';
    }
    
    // Conclusion patterns
    if (index === total - 1 || lowerContent.includes('conclusion') || lowerContent.includes('summary') || 
        lowerContent.includes('in summary') || lowerContent.includes('to conclude')) {
      return 'conclusion';
    }
    
    // Example patterns
    if (lowerContent.includes('example') || lowerContent.includes('for instance') || 
        lowerContent.includes('let\'s look at') || lowerContent.includes('consider')) {
      return 'example';
    }
    
    // Definition patterns
    if (lowerContent.includes('definition') || lowerContent.includes(' is ') || 
        lowerContent.includes('defined as') || lowerContent.includes('refers to')) {
      return 'definition';
    }
    
    return 'main_content';
  }

  private calculateConfidence(content: string, segmentType: ContentSegment['type']): number {
    let confidence = 0.5; // Base confidence
    
    // Length-based confidence
    if (content.length >= this.config.minSegmentLength * 2) {
      confidence += 0.2;
    }
    
    // Structure-based confidence
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length >= 2) {
      confidence += 0.1;
    }
    
    // Type-specific confidence
    const lowerContent = content.toLowerCase();
    switch (segmentType) {
      case 'introduction':
        if (lowerContent.includes('introduction') || lowerContent.includes('welcome')) {
          confidence += 0.2;
        }
        break;
      case 'conclusion':
        if (lowerContent.includes('conclusion') || lowerContent.includes('summary')) {
          confidence += 0.2;
        }
        break;
      case 'example':
        if (lowerContent.includes('example') || lowerContent.includes('for instance')) {
          confidence += 0.15;
        }
        break;
      case 'definition':
        if (lowerContent.includes(' is ') || lowerContent.includes('defined as')) {
          confidence += 0.15;
        }
        break;
    }
    
    return Math.min(1.0, confidence);
  }

  private splitLongContent(content: string): string[] {
    const sentences = content.split(/(?<=[.!?])\s+/);
    const chunks: string[] = [];
    let currentChunk = '';
    
    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length <= this.config.maxSegmentLength) {
        currentChunk += (currentChunk ? ' ' : '') + sentence;
      } else {
        if (currentChunk) {
          chunks.push(currentChunk);
        }
        currentChunk = sentence;
      }
    }
    
    if (currentChunk) {
      chunks.push(currentChunk);
    }
    
    return chunks;
  }

  private applyOverlap(segments: ContentSegment[]): ContentSegment[] {
    if (segments.length <= 1 || this.config.overlapPercent <= 0) {
      return segments;
    }

    const overlappedSegments: ContentSegment[] = [];
    
    for (let i = 0; i < segments.length; i++) {
      let segmentContent = segments[i].content;
      
      // Add overlap from previous segment
      if (i > 0) {
        const prevSegment = segments[i - 1];
        const overlapLength = Math.floor(prevSegment.content.length * this.config.overlapPercent / 100);
        const overlap = prevSegment.content.slice(-overlapLength);
        segmentContent = overlap + ' ' + segmentContent;
      }
      
      // Add overlap from next segment
      if (i < segments.length - 1) {
        const nextSegment = segments[i + 1];
        const overlapLength = Math.floor(nextSegment.content.length * this.config.overlapPercent / 100);
        const overlap = nextSegment.content.slice(0, overlapLength);
        segmentContent = segmentContent + ' ' + overlap;
      }
      
      overlappedSegments.push({
        ...segments[i],
        content: segmentContent.trim()
      });
    }
    
    return overlappedSegments;
  }

  async cleanup(): Promise<void> {
    // No cleanup required for segmentation stage
  }
}