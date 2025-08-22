import { PipelineStage, TranscriptInput, IngestionConfig, PipelineStageError } from '../types';

export class IngestionStage implements PipelineStage<TranscriptInput, TranscriptInput> {
  public readonly name = 'ingestion';

  constructor(private config: IngestionConfig) {}

  async process(input: TranscriptInput): Promise<TranscriptInput> {
    try {
      // Validate input first
      if (!(await this.validate(input))) {
        throw new PipelineStageError(
          'Input validation failed',
          this.name,
          'VALIDATION_FAILED',
          input,
          false
        );
      }

      // Check for empty content
      if (!input.content || input.content.trim().length === 0) {
        throw new PipelineStageError(
          'Content cannot be empty',
          this.name,
          'EMPTY_CONTENT',
          input,
          false
        );
      }

      let processedContent = input.content;

      // Apply preprocessing if enabled
      if (this.config.preprocessingEnabled) {
        processedContent = this.preprocessContent(input.content);
      }

      // Return processed input
      return {
        ...input,
        content: processedContent
      };
    } catch (error) {
      if (error instanceof PipelineStageError) {
        throw error;
      }
      
      throw new PipelineStageError(
        `Ingestion processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        this.name,
        'PROCESSING_FAILED',
        { input, error },
        true
      );
    }
  }

  async validate(input: TranscriptInput): Promise<boolean> {
    try {
      // Check if format is supported
      const format = input.metadata.format || 'txt';
      if (!this.config.supportedFormats.includes(format)) {
        return false;
      }

      // Check content size
      const contentSize = Buffer.byteLength(input.content, 'utf8');
      if (contentSize > this.config.maxFileSize) {
        return false;
      }

      // Check required metadata
      if (!input.metadata.source) {
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  private preprocessContent(content: string): string {
    // Remove excessive whitespace
    let processed = content
      .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
      .replace(/\n\s*\n/g, '\n') // Replace multiple newlines with single newline
      .trim();

    // Normalize line breaks
    processed = processed.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // Remove empty lines at start and end
    processed = processed.replace(/^\n+|\n+$/g, '');

    return processed;
  }

  async cleanup(): Promise<void> {
    // No cleanup required for ingestion stage
  }
}