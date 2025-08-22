import {
  PipelineStage,
  ClassifiedContent,
  ExtractedKnowledge,
  KnowledgeConcept,
  ConceptRelationship,
  ExtractionConfig,
  PipelineStageError
} from '../types';

export class ExtractionStage implements PipelineStage<ClassifiedContent, ExtractedKnowledge> {
  public readonly name = 'extraction';

  constructor(private config: ExtractionConfig) {}

  async process(input: ClassifiedContent): Promise<ExtractedKnowledge> {
    try {
      if (!(await this.validate(input))) {
        throw new PipelineStageError(
          'Input validation failed for extraction',
          this.name,
          'VALIDATION_FAILED',
          input,
          false
        );
      }

      const concepts: KnowledgeConcept[] = [];
      const relationships: ConceptRelationship[] = [];

      // Extract concepts from each segment
      for (const segment of input.segments) {
        const segmentConcepts = await this.extractConceptsFromSegment(segment);
        concepts.push(...segmentConcepts);
      }

      // Remove duplicate concepts and merge similar ones
      const uniqueConcepts = this.deduplicateConcepts(concepts);

      // Extract relationships between concepts
      const extractedRelationships = await this.extractRelationships(uniqueConcepts, input.segments);
      relationships.push(...extractedRelationships);

      // Filter concepts and relationships by confidence threshold
      const filteredConcepts = uniqueConcepts.filter(concept => 
        concept.confidence >= this.config.minConfidence
      );

      const filteredRelationships = relationships.filter(rel => 
        rel.strength >= this.config.minConfidence
      );

      return {
        id: input.id,
        concepts: filteredConcepts,
        relationships: filteredRelationships,
        metadata: {
          ...input.metadata,
          extractionTimestamp: new Date().toISOString(),
          version: '1.0.0'
        }
      };

    } catch (error) {
      if (error instanceof PipelineStageError) {
        throw error;
      }

      throw new PipelineStageError(
        `Extraction processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        this.name,
        'PROCESSING_FAILED',
        { input, error },
        true
      );
    }
  }

  async validate(input: ClassifiedContent): Promise<boolean> {
    try {
      if (!input.segments || input.segments.length === 0) {
        return false;
      }

      // Check that segments have classifications
      for (const segment of input.segments) {
        if (!segment.category || !segment.content) {
          return false;
        }
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  private async extractConceptsFromSegment(segment: any): Promise<KnowledgeConcept[]> {
    const concepts: KnowledgeConcept[] = [];
    const content = segment.content;

    // Extract different types of concepts based on configuration
    for (const conceptType of this.config.conceptTypes) {
      switch (conceptType) {
        case 'definition':
          concepts.push(...this.extractDefinitions(content, segment));
          break;
        case 'process':
          concepts.push(...this.extractProcesses(content, segment));
          break;
        case 'example':
          concepts.push(...this.extractExamples(content, segment));
          break;
        case 'principle':
          concepts.push(...this.extractPrinciples(content, segment));
          break;
        case 'fact':
          concepts.push(...this.extractFacts(content, segment));
          break;
      }
    }

    return concepts;
  }

  private extractDefinitions(content: string, segment: any): KnowledgeConcept[] {
    const definitions: KnowledgeConcept[] = [];
    const definitionPatterns = [
      /(\w+(?:\s+\w+)*)\s+is\s+(.+?)(?:\.|$)/gi,
      /(\w+(?:\s+\w+)*)\s+are\s+(.+?)(?:\.|$)/gi,
      /(\w+(?:\s+\w+)*)\s+defined\s+as\s+(.+?)(?:\.|$)/gi,
      /(\w+(?:\s+\w+)*)\s+refers\s+to\s+(.+?)(?:\.|$)/gi,
      /(\w+(?:\s+\w+)*)\s+means\s+(.+?)(?:\.|$)/gi
    ];

    for (const pattern of definitionPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const term = match[1].trim();
        const definition = match[2].trim();

        if (term.length > 2 && definition.length > 10) {
          const confidence = this.calculateDefinitionConfidence(term, definition, content);
          
          if (confidence >= this.config.minConfidence) {
            definitions.push({
              id: `def-${this.generateId()}`,
              name: term,
              description: definition,
              type: 'definition',
              confidence,
              sourceSegments: [segment.id],
              context: this.extractContext(content, term, this.config.contextWindow)
            });
          }
        }
      }
    }

    return definitions;
  }

  private extractProcesses(content: string, segment: any): KnowledgeConcept[] {
    const processes: KnowledgeConcept[] = [];
    const processIndicators = ['process', 'procedure', 'method', 'approach', 'workflow', 'algorithm'];

    for (const indicator of processIndicators) {
      const regex = new RegExp(`(${indicator}[^.]*?)(?:\\.|$)`, 'gi');
      let match;

      while ((match = regex.exec(content)) !== null) {
        const processDescription = match[1].trim();
        
        if (processDescription.length > 20) {
          const confidence = this.calculateProcessConfidence(processDescription, content);
          
          if (confidence >= this.config.minConfidence) {
            processes.push({
              id: `proc-${this.generateId()}`,
              name: `${indicator} process`,
              description: processDescription,
              type: 'process',
              confidence,
              sourceSegments: [segment.id],
              context: this.extractContext(content, processDescription, this.config.contextWindow)
            });
          }
        }
      }
    }

    return processes;
  }

  private extractExamples(content: string, segment: any): KnowledgeConcept[] {
    const examples: KnowledgeConcept[] = [];
    const examplePatterns = [
      /(?:for example|for instance|such as|like|including|consider)\s+(.+?)(?:\.|$)/gi,
      /(?:example|instance):\s*(.+?)(?:\.|$)/gi
    ];

    for (const pattern of examplePatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const example = match[1].trim();
        
        if (example.length > 10) {
          const confidence = this.calculateExampleConfidence(example, content);
          
          if (confidence >= this.config.minConfidence) {
            examples.push({
              id: `ex-${this.generateId()}`,
              name: example.split(' ').slice(0, 5).join(' ') + '...', // First few words as name
              description: example,
              type: 'example',
              confidence,
              sourceSegments: [segment.id],
              context: this.extractContext(content, example, this.config.contextWindow)
            });
          }
        }
      }
    }

    return examples;
  }

  private extractPrinciples(content: string, segment: any): KnowledgeConcept[] {
    const principles: KnowledgeConcept[] = [];
    const principleIndicators = ['principle', 'rule', 'law', 'guideline', 'best practice', 'fundamental'];

    for (const indicator of principleIndicators) {
      const regex = new RegExp(`(${indicator}[^.]*?)(?:\\.|$)`, 'gi');
      let match;

      while ((match = regex.exec(content)) !== null) {
        const principle = match[1].trim();
        
        if (principle.length > 15) {
          const confidence = this.calculatePrincipleConfidence(principle, content);
          
          if (confidence >= this.config.minConfidence) {
            principles.push({
              id: `prin-${this.generateId()}`,
              name: `${indicator}`,
              description: principle,
              type: 'principle',
              confidence,
              sourceSegments: [segment.id],
              context: this.extractContext(content, principle, this.config.contextWindow)
            });
          }
        }
      }
    }

    return principles;
  }

  private extractFacts(content: string, segment: any): KnowledgeConcept[] {
    const facts: KnowledgeConcept[] = [];
    
    // Look for factual statements (sentences with strong assertion patterns)
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10);
    
    for (const sentence of sentences) {
      const trimmedSentence = sentence.trim();
      
      if (this.isFactualStatement(trimmedSentence)) {
        const confidence = this.calculateFactConfidence(trimmedSentence, content);
        
        if (confidence >= this.config.minConfidence) {
          facts.push({
            id: `fact-${this.generateId()}`,
            name: trimmedSentence.split(' ').slice(0, 8).join(' ') + '...',
            description: trimmedSentence,
            type: 'fact',
            confidence,
            sourceSegments: [segment.id],
            context: this.extractContext(content, trimmedSentence, this.config.contextWindow)
          });
        }
      }
    }

    return facts;
  }

  private async extractRelationships(concepts: KnowledgeConcept[], segments: any[]): Promise<ConceptRelationship[]> {
    const relationships: ConceptRelationship[] = [];

    // Extract relationships between concepts
    for (let i = 0; i < concepts.length; i++) {
      for (let j = i + 1; j < concepts.length; j++) {
        const concept1 = concepts[i];
        const concept2 = concepts[j];

        // Check if concepts appear in the same or related segments
        const sharedSegments = concept1.sourceSegments.filter(segId => 
          concept2.sourceSegments.includes(segId)
        );

        if (sharedSegments.length > 0 || this.areConceptsRelated(concept1, concept2)) {
          const relationshipType = this.determineRelationshipType(concept1, concept2, segments);
          const strength = this.calculateRelationshipStrength(concept1, concept2, segments);

          if (strength >= this.config.minConfidence && this.config.relationshipTypes.includes(relationshipType)) {
            relationships.push({
              id: `rel-${this.generateId()}`,
              source: concept1.id,
              target: concept2.id,
              type: relationshipType as any,
              strength,
              description: this.generateRelationshipDescription(concept1, concept2, relationshipType)
            });
          }
        }
      }
    }

    return relationships;
  }

  private deduplicateConcepts(concepts: KnowledgeConcept[]): KnowledgeConcept[] {
    const uniqueConcepts = new Map<string, KnowledgeConcept>();

    for (const concept of concepts) {
      const key = concept.name.toLowerCase().trim();
      const existing = uniqueConcepts.get(key);

      if (existing) {
        // Merge concepts with same name
        existing.sourceSegments.push(...concept.sourceSegments);
        existing.sourceSegments = [...new Set(existing.sourceSegments)]; // Remove duplicates
        existing.confidence = Math.max(existing.confidence, concept.confidence);
        
        // Merge descriptions if different
        if (existing.description !== concept.description) {
          existing.description += `. ${concept.description}`;
        }
      } else {
        uniqueConcepts.set(key, { ...concept });
      }
    }

    return Array.from(uniqueConcepts.values());
  }

  private calculateDefinitionConfidence(term: string, definition: string, content: string): number {
    let confidence = 0.7; // Base confidence for definitions

    // Boost confidence based on definition quality
    if (definition.length > 50) confidence += 0.1;
    if (definition.includes('that')) confidence += 0.05;
    if (definition.includes('which')) confidence += 0.05;

    // Boost if term appears multiple times in content
    const termCount = (content.toLowerCase().match(new RegExp(term.toLowerCase(), 'g')) || []).length;
    if (termCount > 1) confidence += 0.1;

    return Math.min(1.0, confidence);
  }

  private calculateProcessConfidence(processDescription: string, content: string): number {
    let confidence = 0.6;

    // Check for process indicators
    if (processDescription.includes('step') || processDescription.includes('phase')) confidence += 0.15;
    if (processDescription.includes('first') || processDescription.includes('then')) confidence += 0.1;
    if (processDescription.length > 100) confidence += 0.1;

    return Math.min(1.0, confidence);
  }

  private calculateExampleConfidence(example: string, content: string): number {
    let confidence = 0.7;

    // Boost confidence for concrete examples
    if (example.includes('code') || example.includes('data') || example.includes('system')) confidence += 0.1;
    if (example.length > 30) confidence += 0.05;

    return Math.min(1.0, confidence);
  }

  private calculatePrincipleConfidence(principle: string, content: string): number {
    let confidence = 0.65;

    // Boost confidence for well-formed principles
    if (principle.includes('should') || principle.includes('must') || principle.includes('always')) confidence += 0.1;
    if (principle.includes('important') || principle.includes('key') || principle.includes('essential')) confidence += 0.05;

    return Math.min(1.0, confidence);
  }

  private calculateFactConfidence(fact: string, content: string): number {
    let confidence = 0.6;

    // Boost confidence for factual indicators
    if (fact.includes('research shows') || fact.includes('studies indicate')) confidence += 0.15;
    if (fact.includes('proven') || fact.includes('established')) confidence += 0.1;
    if (fact.match(/\d+/)) confidence += 0.05; // Contains numbers

    return Math.min(1.0, confidence);
  }

  private isFactualStatement(sentence: string): boolean {
    const factualIndicators = [
      'research shows', 'studies indicate', 'proven', 'established', 'evidence suggests',
      'data shows', 'statistics reveal', 'according to', 'it has been found'
    ];

    const lowerSentence = sentence.toLowerCase();
    return factualIndicators.some(indicator => lowerSentence.includes(indicator)) ||
           sentence.match(/\d+/) !== null || // Contains numbers
           sentence.includes(' is ') || sentence.includes(' are ');
  }

  private areConceptsRelated(concept1: KnowledgeConcept, concept2: KnowledgeConcept): boolean {
    // Check if concepts share similar words or context
    const words1 = new Set(concept1.name.toLowerCase().split(/\s+/));
    const words2 = new Set(concept2.name.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(word => words2.has(word)));
    return intersection.size > 0 || 
           concept1.context.includes(concept2.name) || 
           concept2.context.includes(concept1.name);
  }

  private determineRelationshipType(concept1: KnowledgeConcept, concept2: KnowledgeConcept, segments: any[]): string {
    // Analyze context to determine relationship type
    const combinedContext = concept1.context + ' ' + concept2.context;
    const lowerContext = combinedContext.toLowerCase();

    if (lowerContext.includes('depends on') || lowerContext.includes('requires')) {
      return 'depends_on';
    }
    if (lowerContext.includes('part of') || lowerContext.includes('component of')) {
      return 'part_of';
    }
    if (lowerContext.includes('example of') || lowerContext.includes('instance of')) {
      return 'example_of';
    }
    if (lowerContext.includes('causes') || lowerContext.includes('results in')) {
      return 'causes';
    }
    
    return 'related_to'; // Default relationship type
  }

  private calculateRelationshipStrength(concept1: KnowledgeConcept, concept2: KnowledgeConcept, segments: any[]): number {
    let strength = 0.5;

    // Boost strength based on shared segments
    const sharedSegments = concept1.sourceSegments.filter(segId => 
      concept2.sourceSegments.includes(segId)
    );
    strength += sharedSegments.length * 0.1;

    // Boost strength based on concept types
    if (concept1.type === 'definition' && concept2.type === 'example') strength += 0.2;
    if (concept1.type === 'principle' && concept2.type === 'process') strength += 0.15;

    // Boost strength based on confidence
    const avgConfidence = (concept1.confidence + concept2.confidence) / 2;
    strength += avgConfidence * 0.2;

    return Math.min(1.0, strength);
  }

  private generateRelationshipDescription(concept1: KnowledgeConcept, concept2: KnowledgeConcept, relationshipType: string): string {
    const descriptions: Record<string, string> = {
      'depends_on': `${concept1.name} depends on ${concept2.name}`,
      'part_of': `${concept1.name} is part of ${concept2.name}`,
      'related_to': `${concept1.name} is related to ${concept2.name}`,
      'example_of': `${concept1.name} is an example of ${concept2.name}`,
      'causes': `${concept1.name} causes ${concept2.name}`
    };

    return descriptions[relationshipType] || `${concept1.name} and ${concept2.name} are connected`;
  }

  private extractContext(content: string, target: string, windowSize: number): string {
    const index = content.toLowerCase().indexOf(target.toLowerCase());
    if (index === -1) return content.substring(0, windowSize);

    const start = Math.max(0, index - windowSize / 2);
    const end = Math.min(content.length, index + target.length + windowSize / 2);

    return content.substring(start, end);
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  async cleanup(): Promise<void> {
    // No cleanup required for extraction stage
  }
}