import {
  PipelineStage,
  SegmentedContent,
  ClassifiedContent,
  ClassifiedSegment,
  ContentCategory,
  ClassificationConfig,
  PipelineStageError
} from '../types';

export class ClassificationStage implements PipelineStage<SegmentedContent, ClassifiedContent> {
  public readonly name = 'classification';

  constructor(private config: ClassificationConfig) {}

  async process(input: SegmentedContent): Promise<ClassifiedContent> {
    try {
      if (!(await this.validate(input))) {
        throw new PipelineStageError(
          'Input validation failed for classification',
          this.name,
          'VALIDATION_FAILED',
          input,
          false
        );
      }

      const classifiedSegments: ClassifiedSegment[] = [];
      const categoryMap = new Map<string, ContentCategory>();

      // Classify each segment
      for (const segment of input.segments) {
        const classification = await this.classifySegment(segment);
        const classifiedSegment: ClassifiedSegment = {
          ...segment,
          category: classification.primaryCategory,
          tags: classification.tags,
          importance: classification.importance
        };

        classifiedSegments.push(classifiedSegment);

        // Update category tracking
        for (const category of classification.categories) {
          if (category.confidence >= this.config.confidenceThreshold) {
            const existing = categoryMap.get(category.name);
            if (existing) {
              existing.segments.push(segment.id);
              existing.confidence = Math.max(existing.confidence, category.confidence);
            } else {
              categoryMap.set(category.name, {
                name: category.name,
                description: category.description,
                confidence: category.confidence,
                segments: [segment.id]
              });
            }
          }
        }
      }

      // Generate overall content categories
      const categories = Array.from(categoryMap.values())
        .sort((a, b) => b.confidence - a.confidence);

      return {
        id: input.id,
        segments: classifiedSegments,
        categories,
        metadata: input.metadata
      };

    } catch (error) {
      if (error instanceof PipelineStageError) {
        throw error;
      }

      throw new PipelineStageError(
        `Classification processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        this.name,
        'PROCESSING_FAILED',
        { input, error },
        true
      );
    }
  }

  async validate(input: SegmentedContent): Promise<boolean> {
    try {
      if (!input.segments || input.segments.length === 0) {
        return false;
      }

      // Check that all segments have content
      for (const segment of input.segments) {
        if (!segment.content || segment.content.trim().length === 0) {
          return false;
        }
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  private async classifySegment(segment: any): Promise<{
    primaryCategory: string;
    categories: Array<{ name: string; description: string; confidence: number }>;
    tags: string[];
    importance: number;
  }> {
    const content = segment.content.toLowerCase();
    const categories: Array<{ name: string; description: string; confidence: number }> = [];

    // Rule-based classification for each configured category
    for (const categoryName of this.config.categories) {
      const confidence = this.calculateCategoryConfidence(content, categoryName);
      if (confidence >= this.config.confidenceThreshold || !this.config.multiLabel) {
        categories.push({
          name: categoryName,
          description: this.getCategoryDescription(categoryName),
          confidence
        });
      }
    }

    // Sort by confidence and get primary category
    categories.sort((a, b) => b.confidence - a.confidence);
    const primaryCategory = categories.length > 0 ? categories[0].name : 'general';

    // Extract tags based on content analysis
    const tags = this.extractTags(content);

    // Calculate importance score
    const importance = this.calculateImportance(segment, categories);

    return {
      primaryCategory,
      categories: this.config.multiLabel ? categories : categories.slice(0, 1),
      tags,
      importance
    };
  }

  private calculateCategoryConfidence(content: string, category: string): number {
    let confidence = 0;

    switch (category.toLowerCase()) {
      case 'technical':
        confidence = this.calculateTechnicalConfidence(content);
        break;
      case 'educational':
        confidence = this.calculateEducationalConfidence(content);
        break;
      case 'tutorial':
        confidence = this.calculateTutorialConfidence(content);
        break;
      case 'explanation':
        confidence = this.calculateExplanationConfidence(content);
        break;
      case 'example':
        confidence = this.calculateExampleConfidence(content);
        break;
      case 'definition':
        confidence = this.calculateDefinitionConfidence(content);
        break;
      case 'process':
        confidence = this.calculateProcessConfidence(content);
        break;
      case 'concept':
        confidence = this.calculateConceptConfidence(content);
        break;
      default:
        confidence = 0.1; // Default low confidence for unknown categories
    }

    return Math.min(1.0, Math.max(0, confidence));
  }

  private calculateTechnicalConfidence(content: string): number {
    const technicalTerms = [
      'algorithm', 'function', 'class', 'method', 'variable', 'parameter',
      'api', 'database', 'server', 'client', 'framework', 'library',
      'code', 'programming', 'software', 'system', 'architecture',
      'implementation', 'interface', 'protocol', 'encryption', 'authentication'
    ];

    const matches = technicalTerms.filter(term => content.includes(term)).length;
    const density = matches / content.split(' ').length;
    return Math.min(0.9, density * 10 + 0.2);
  }

  private calculateEducationalConfidence(content: string): number {
    const educationalIndicators = [
      'learn', 'understand', 'explain', 'teach', 'lesson', 'course',
      'student', 'knowledge', 'concept', 'theory', 'principle',
      'study', 'education', 'instruction', 'tutorial', 'guide'
    ];

    const matches = educationalIndicators.filter(term => content.includes(term)).length;
    const hasEducationalStructure = content.includes('first') || content.includes('next') || 
                                   content.includes('finally') || content.includes('step');
    
    let confidence = matches * 0.1;
    if (hasEducationalStructure) confidence += 0.2;
    
    return Math.min(0.9, confidence);
  }

  private calculateTutorialConfidence(content: string): number {
    const tutorialIndicators = [
      'step', 'how to', 'tutorial', 'guide', 'walkthrough', 'instructions',
      'first', 'next', 'then', 'finally', 'follow', 'complete',
      'create', 'build', 'make', 'setup', 'configure', 'install'
    ];

    const matches = tutorialIndicators.filter(term => content.includes(term)).length;
    const hasOrderedSteps = (content.match(/\b(first|second|third|next|then|finally)\b/g) || []).length;
    
    let confidence = matches * 0.08;
    confidence += hasOrderedSteps * 0.15;
    
    return Math.min(0.9, confidence);
  }

  private calculateExplanationConfidence(content: string): number {
    const explanationIndicators = [
      'because', 'since', 'therefore', 'thus', 'hence', 'consequently',
      'explain', 'reason', 'cause', 'result', 'effect', 'due to',
      'this means', 'in other words', 'essentially', 'basically'
    ];

    const matches = explanationIndicators.filter(term => content.includes(term)).length;
    const hasExplanatoryStructure = content.includes('this is') || content.includes('what this means');
    
    let confidence = matches * 0.1;
    if (hasExplanatoryStructure) confidence += 0.2;
    
    return Math.min(0.9, confidence);
  }

  private calculateExampleConfidence(content: string): number {
    const exampleIndicators = [
      'example', 'for instance', 'such as', 'like', 'including',
      'consider', 'suppose', 'imagine', 'let\'s say', 'case',
      'demonstration', 'illustration', 'sample'
    ];

    const matches = exampleIndicators.filter(term => content.includes(term)).length;
    return Math.min(0.9, matches * 0.2);
  }

  private calculateDefinitionConfidence(content: string): number {
    const definitionIndicators = [
      ' is ', ' are ', 'defined as', 'refers to', 'means', 'definition',
      'called', 'known as', 'termed', 'described as', 'represents'
    ];

    const matches = definitionIndicators.filter(term => content.includes(term)).length;
    const hasDefinitionStructure = /\w+ is \w+/.test(content) || /\w+ are \w+/.test(content);
    
    let confidence = matches * 0.15;
    if (hasDefinitionStructure) confidence += 0.3;
    
    return Math.min(0.9, confidence);
  }

  private calculateProcessConfidence(content: string): number {
    const processIndicators = [
      'process', 'procedure', 'workflow', 'steps', 'stages', 'phases',
      'method', 'approach', 'technique', 'strategy', 'algorithm',
      'sequence', 'order', 'pipeline', 'flow'
    ];

    const matches = processIndicators.filter(term => content.includes(term)).length;
    const hasProcessStructure = content.includes('first') && (content.includes('then') || content.includes('next'));
    
    let confidence = matches * 0.1;
    if (hasProcessStructure) confidence += 0.25;
    
    return Math.min(0.9, confidence);
  }

  private calculateConceptConfidence(content: string): number {
    const conceptIndicators = [
      'concept', 'idea', 'notion', 'principle', 'theory', 'model',
      'framework', 'paradigm', 'approach', 'methodology', 'philosophy',
      'fundamental', 'basic', 'core', 'essential', 'key'
    ];

    const matches = conceptIndicators.filter(term => content.includes(term)).length;
    return Math.min(0.9, matches * 0.12);
  }

  private getCategoryDescription(category: string): string {
    const descriptions: Record<string, string> = {
      'technical': 'Technical content involving programming, systems, or technology',
      'educational': 'Educational content designed to teach or inform',
      'tutorial': 'Step-by-step instructional content',
      'explanation': 'Explanatory content that clarifies concepts or processes',
      'example': 'Examples or demonstrations of concepts',
      'definition': 'Definitions or descriptions of terms and concepts',
      'process': 'Process-oriented content describing workflows or procedures',
      'concept': 'Conceptual content exploring ideas and theories'
    };

    return descriptions[category.toLowerCase()] || 'General content category';
  }

  private extractTags(content: string): string[] {
    const tags: string[] = [];

    // Technical tags
    const techTerms = ['api', 'database', 'algorithm', 'framework', 'library', 'software', 'programming'];
    techTerms.forEach(term => {
      if (content.includes(term)) {
        tags.push(term);
      }
    });

    // Domain-specific tags
    if (content.includes('machine learning') || content.includes('ai')) {
      tags.push('machine-learning', 'artificial-intelligence');
    }
    
    if (content.includes('web') || content.includes('html') || content.includes('css')) {
      tags.push('web-development');
    }

    if (content.includes('data') && (content.includes('analysis') || content.includes('science'))) {
      tags.push('data-science');
    }

    // Difficulty level tags
    if (content.includes('basic') || content.includes('introduction') || content.includes('beginner')) {
      tags.push('beginner');
    } else if (content.includes('advanced') || content.includes('complex') || content.includes('expert')) {
      tags.push('advanced');
    } else {
      tags.push('intermediate');
    }

    // Content type tags
    if (content.includes('example')) tags.push('example');
    if (content.includes('definition')) tags.push('definition');
    if (content.includes('tutorial')) tags.push('tutorial');

    return [...new Set(tags)]; // Remove duplicates
  }

  private calculateImportance(segment: any, categories: Array<{ confidence: number }>): number {
    let importance = 0.5; // Base importance

    // Boost importance based on segment type
    switch (segment.type) {
      case 'introduction':
        importance += 0.2;
        break;
      case 'conclusion':
        importance += 0.15;
        break;
      case 'definition':
        importance += 0.25;
        break;
      case 'example':
        importance += 0.1;
        break;
    }

    // Boost importance based on classification confidence
    if (categories.length > 0) {
      const avgConfidence = categories.reduce((sum, cat) => sum + cat.confidence, 0) / categories.length;
      importance += avgConfidence * 0.2;
    }

    // Boost importance based on content length (longer segments might be more important)
    const wordCount = segment.content.split(/\s+/).length;
    if (wordCount > 50) {
      importance += 0.1;
    }

    // Boost importance based on segment confidence
    if (segment.confidence > 0.8) {
      importance += 0.1;
    }

    return Math.min(1.0, importance);
  }

  async cleanup(): Promise<void> {
    // No cleanup required for classification stage
  }
}