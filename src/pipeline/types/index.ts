// Core pipeline types and interfaces

export interface PipelineStage<TInput, TOutput> {
  name: string;
  process(input: TInput): Promise<TOutput>;
  validate?(input: TInput): Promise<boolean>;
  cleanup?(): Promise<void>;
}

export interface PipelineError extends Error {
  stage: string;
  code: string;
  details?: unknown;
  recoverable: boolean;
}

export class PipelineStageError extends Error implements PipelineError {
  constructor(
    message: string,
    public stage: string,
    public code: string,
    public details?: unknown,
    public recoverable: boolean = false
  ) {
    super(message);
    this.name = 'PipelineStageError';
  }
}

// Input/Output types for each stage
export interface TranscriptInput {
  id: string;
  content: string;
  metadata: {
    source: string;
    duration?: number;
    timestamp?: string;
    format?: string;
  };
}

export interface SegmentedContent {
  id: string;
  segments: ContentSegment[];
  metadata: TranscriptInput['metadata'];
}

export interface ContentSegment {
  id: string;
  content: string;
  type: 'introduction' | 'main_content' | 'conclusion' | 'example' | 'definition';
  startTime?: number;
  endTime?: number;
  confidence: number;
}

export interface ClassifiedContent {
  id: string;
  segments: ClassifiedSegment[];
  categories: ContentCategory[];
  metadata: TranscriptInput['metadata'];
}

export interface ClassifiedSegment extends ContentSegment {
  category: string;
  tags: string[];
  importance: number;
}

export interface ContentCategory {
  name: string;
  description: string;
  confidence: number;
  segments: string[]; // segment IDs
}

export interface ExtractedKnowledge {
  id: string;
  concepts: KnowledgeConcept[];
  relationships: ConceptRelationship[];
  metadata: TranscriptInput['metadata'] & {
    extractionTimestamp: string;
    version: string;
  };
}

export interface KnowledgeConcept {
  id: string;
  name: string;
  description: string;
  type: 'definition' | 'process' | 'example' | 'principle' | 'fact';
  confidence: number;
  sourceSegments: string[];
  context: string;
}

export interface ConceptRelationship {
  id: string;
  source: string; // concept ID
  target: string; // concept ID
  type: 'depends_on' | 'part_of' | 'related_to' | 'example_of' | 'causes';
  strength: number;
  description: string;
}

export interface VerifiedKnowledge {
  id: string;
  concepts: VerifiedConcept[];
  relationships: VerifiedRelationship[];
  qualityScore: number;
  verificationReport: VerificationReport;
  metadata: ExtractedKnowledge['metadata'];
}

export interface VerifiedConcept extends KnowledgeConcept {
  verified: boolean;
  verificationScore: number;
  issues: VerificationIssue[];
}

export interface VerifiedRelationship extends ConceptRelationship {
  verified: boolean;
  verificationScore: number;
  issues: VerificationIssue[];
}

export interface VerificationIssue {
  type: 'low_confidence' | 'missing_context' | 'conflicting_info' | 'incomplete_data';
  severity: 'low' | 'medium' | 'high';
  description: string;
  suggestion?: string;
}

export interface VerificationReport {
  overallScore: number;
  conceptsVerified: number;
  relationshipsVerified: number;
  issues: VerificationIssue[];
  recommendations: string[];
}

export interface GeneratedDocument {
  id: string;
  title: string;
  content: string;
  format: 'markdown' | 'html' | 'pdf' | 'json';
  sections: DocumentSection[];
  metadata: {
    generatedAt: string;
    sourceTranscript: string;
    version: string;
    author: string;
    tags: string[];
  };
}

export interface DocumentSection {
  id: string;
  title: string;
  content: string;
  type: 'overview' | 'concepts' | 'examples' | 'references' | 'appendix';
  order: number;
  sourceConcepts: string[];
}

// Pipeline configuration
export interface PipelineConfig {
  stages: {
    ingestion: IngestionConfig;
    segmentation: SegmentationConfig;
    classification: ClassificationConfig;
    extraction: ExtractionConfig;
    verification: VerificationConfig;
    generation: GenerationConfig;
  };
  errorHandling: {
    retryAttempts: number;
    retryDelay: number;
    continueOnError: boolean;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
  };
}

export interface IngestionConfig {
  supportedFormats: string[];
  maxFileSize: number;
  preprocessingEnabled: boolean;
}

export interface SegmentationConfig {
  strategy: 'time_based' | 'topic_based' | 'hybrid';
  minSegmentLength: number;
  maxSegmentLength: number;
  overlapPercent: number;
}

export interface ClassificationConfig {
  categories: string[];
  confidenceThreshold: number;
  multiLabel: boolean;
}

export interface ExtractionConfig {
  conceptTypes: string[];
  relationshipTypes: string[];
  minConfidence: number;
  contextWindow: number;
}

export interface VerificationConfig {
  qualityThreshold: number;
  enableCrossValidation: boolean;
  verificationMethods: string[];
}

export interface GenerationConfig {
  outputFormats: string[];
  templatePath?: string;
  includeMetadata: boolean;
  generateTOC: boolean;
}

// Pipeline result types
export interface PipelineResult<T> {
  success: boolean;
  data?: T;
  error?: PipelineError;
  stage: string;
  timestamp: string;
  duration: number;
}

export interface PipelineExecutionResult {
  id: string;
  success: boolean;
  results: PipelineResult<any>[];
  finalOutput?: GeneratedDocument;
  totalDuration: number;
  startTime: string;
  endTime: string;
  errors: PipelineError[];
}