import {
  PipelineStage,
  ExtractedKnowledge,
  VerifiedKnowledge,
  VerifiedConcept,
  VerifiedRelationship,
  VerificationReport,
  VerificationIssue,
  VerificationConfig,
  PipelineStageError
} from '../types';

export class VerificationStage implements PipelineStage<ExtractedKnowledge, VerifiedKnowledge> {
  public readonly name = 'verification';

  constructor(private config: VerificationConfig) {}

  async process(input: ExtractedKnowledge): Promise<VerifiedKnowledge> {
    try {
      if (!(await this.validate(input))) {
        throw new PipelineStageError(
          'Input validation failed for verification',
          this.name,
          'VALIDATION_FAILED',
          input,
          false
        );
      }

      const verifiedConcepts: VerifiedConcept[] = [];
      const verifiedRelationships: VerifiedRelationship[] = [];
      const allIssues: VerificationIssue[] = [];

      // Verify each concept
      for (const concept of input.concepts) {
        const verificationResult = await this.verifyConcept(concept, input);
        verifiedConcepts.push(verificationResult.concept);
        allIssues.push(...verificationResult.issues);
      }

      // Verify each relationship
      for (const relationship of input.relationships) {
        const verificationResult = await this.verifyRelationship(relationship, input);
        verifiedRelationships.push(verificationResult.relationship);
        allIssues.push(...verificationResult.issues);
      }

      // Perform cross-validation if enabled
      if (this.config.enableCrossValidation) {
        const crossValidationIssues = await this.performCrossValidation(verifiedConcepts, verifiedRelationships);
        allIssues.push(...crossValidationIssues);
      }

      // Calculate overall quality score
      const qualityScore = this.calculateOverallQualityScore(verifiedConcepts, verifiedRelationships, allIssues);

      // Generate verification report
      const verificationReport = this.generateVerificationReport(verifiedConcepts, verifiedRelationships, allIssues, qualityScore);

      return {
        id: input.id,
        concepts: verifiedConcepts,
        relationships: verifiedRelationships,
        qualityScore,
        verificationReport,
        metadata: input.metadata
      };

    } catch (error) {
      if (error instanceof PipelineStageError) {
        throw error;
      }

      throw new PipelineStageError(
        `Verification processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        this.name,
        'PROCESSING_FAILED',
        { input, error },
        true
      );
    }
  }

  async validate(input: ExtractedKnowledge): Promise<boolean> {
    try {
      if (!input.concepts || !input.relationships) {
        return false;
      }

      // Check that concepts have required fields
      for (const concept of input.concepts) {
        if (!concept.id || !concept.name || !concept.description || concept.confidence < 0) {
          return false;
        }
      }

      // Check that relationships have valid concept references
      for (const relationship of input.relationships) {
        if (!relationship.source || !relationship.target || !relationship.type) {
          return false;
        }

        const hasSource = input.concepts.some(c => c.id === relationship.source);
        const hasTarget = input.concepts.some(c => c.id === relationship.target);
        
        if (!hasSource || !hasTarget) {
          return false;
        }
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  private async verifyConcept(concept: any, knowledge: ExtractedKnowledge): Promise<{
    concept: VerifiedConcept;
    issues: VerificationIssue[];
  }> {
    const issues: VerificationIssue[] = [];
    let verificationScore = 1.0;
    let verified = true;

    // Check confidence threshold
    if (concept.confidence < this.config.qualityThreshold) {
      issues.push({
        type: 'low_confidence',
        severity: 'medium',
        description: `Concept "${concept.name}" has low confidence (${concept.confidence})`,
        suggestion: 'Consider reviewing the source content or extraction criteria'
      });
      verificationScore *= 0.8;
    }

    // Check for missing context
    if (!concept.context || concept.context.length < 20) {
      issues.push({
        type: 'missing_context',
        severity: 'low',
        description: `Concept "${concept.name}" has insufficient context`,
        suggestion: 'Expand context window during extraction'
      });
      verificationScore *= 0.9;
    }

    // Check description quality
    if (concept.description.length < 10) {
      issues.push({
        type: 'incomplete_data',
        severity: 'high',
        description: `Concept "${concept.name}" has very short description`,
        suggestion: 'Review extraction patterns for this concept type'
      });
      verificationScore *= 0.7;
      verified = false;
    }

    // Check for conflicting information within the concept
    const conflictScore = this.detectConflictingInformation(concept);
    if (conflictScore > 0.3) {
      issues.push({
        type: 'conflicting_info',
        severity: 'high',
        description: `Concept "${concept.name}" contains potentially conflicting information`,
        suggestion: 'Review source segments for consistency'
      });
      verificationScore *= (1 - conflictScore);
      if (conflictScore > 0.7) verified = false;
    }

    // Check concept type consistency
    if (!this.isConceptTypeConsistent(concept)) {
      issues.push({
        type: 'incomplete_data',
        severity: 'medium',
        description: `Concept "${concept.name}" type may not match its content`,
        suggestion: 'Review concept classification logic'
      });
      verificationScore *= 0.85;
    }

    // Run method-specific verifications
    for (const method of this.config.verificationMethods) {
      const methodResult = await this.runVerificationMethod(method, concept, knowledge);
      issues.push(...methodResult.issues);
      verificationScore *= methodResult.scoreMultiplier;
      if (!methodResult.passed) verified = false;
    }

    const verifiedConcept: VerifiedConcept = {
      ...concept,
      verified,
      verificationScore: Math.max(0, verificationScore),
      issues: issues.filter(issue => issue.severity !== 'low' || issues.length <= 2) // Limit low-severity issues
    };

    return { concept: verifiedConcept, issues };
  }

  private async verifyRelationship(relationship: any, knowledge: ExtractedKnowledge): Promise<{
    relationship: VerifiedRelationship;
    issues: VerificationIssue[];
  }> {
    const issues: VerificationIssue[] = [];
    let verificationScore = 1.0;
    let verified = true;

    // Check relationship strength
    if (relationship.strength < this.config.qualityThreshold) {
      issues.push({
        type: 'low_confidence',
        severity: 'medium',
        description: `Relationship between concepts has low strength (${relationship.strength})`,
        suggestion: 'Review relationship extraction criteria'
      });
      verificationScore *= 0.8;
    }

    // Verify that source and target concepts exist and are verified
    const sourceConcept = knowledge.concepts.find(c => c.id === relationship.source);
    const targetConcept = knowledge.concepts.find(c => c.id === relationship.target);

    if (!sourceConcept || !targetConcept) {
      issues.push({
        type: 'incomplete_data',
        severity: 'high',
        description: 'Relationship references non-existent concepts',
        suggestion: 'Ensure concept extraction runs before relationship extraction'
      });
      verificationScore *= 0.5;
      verified = false;
    } else {
      // Check if the relationship makes logical sense
      if (!this.isRelationshipLogical(relationship, sourceConcept, targetConcept)) {
        issues.push({
          type: 'conflicting_info',
          severity: 'medium',
          description: `Relationship type "${relationship.type}" may not be appropriate for the connected concepts`,
          suggestion: 'Review relationship type classification'
        });
        verificationScore *= 0.8;
      }
    }

    // Check relationship description quality
    if (!relationship.description || relationship.description.length < 10) {
      issues.push({
        type: 'missing_context',
        severity: 'low',
        description: 'Relationship has insufficient description',
        suggestion: 'Improve relationship description generation'
      });
      verificationScore *= 0.9;
    }

    const verifiedRelationship: VerifiedRelationship = {
      ...relationship,
      verified,
      verificationScore: Math.max(0, verificationScore),
      issues: issues.filter(issue => issue.severity !== 'low' || issues.length <= 2)
    };

    return { relationship: verifiedRelationship, issues };
  }

  private async performCrossValidation(concepts: VerifiedConcept[], relationships: VerifiedRelationship[]): Promise<VerificationIssue[]> {
    const issues: VerificationIssue[] = [];

    // Check for orphaned concepts (concepts with no relationships)
    const connectedConceptIds = new Set([
      ...relationships.map(r => r.source),
      ...relationships.map(r => r.target)
    ]);

    const orphanedConcepts = concepts.filter(c => !connectedConceptIds.has(c.id));
    if (orphanedConcepts.length > concepts.length * 0.3) {
      issues.push({
        type: 'incomplete_data',
        severity: 'medium',
        description: `${orphanedConcepts.length} concepts have no relationships`,
        suggestion: 'Review relationship extraction to ensure comprehensive coverage'
      });
    }

    // Check for circular dependencies
    const circularDeps = this.detectCircularDependencies(relationships);
    if (circularDeps.length > 0) {
      issues.push({
        type: 'conflicting_info',
        severity: 'medium',
        description: `Detected ${circularDeps.length} potential circular dependencies`,
        suggestion: 'Review relationship directions and types'
      });
    }

    // Check concept type distribution
    const typeDistribution = this.analyzeConceptTypeDistribution(concepts);
    if (typeDistribution.imbalance > 0.8) {
      issues.push({
        type: 'incomplete_data',
        severity: 'low',
        description: 'Concept types are heavily skewed toward one type',
        suggestion: 'Review concept type classification balance'
      });
    }

    return issues;
  }

  private detectConflictingInformation(concept: any): number {
    // Analyze the concept's description and context for contradictory statements
    const text = (concept.description + ' ' + concept.context).toLowerCase();
    
    const contradictionPairs = [
      ['always', 'never'],
      ['all', 'none'],
      ['increase', 'decrease'],
      ['improve', 'worsen'],
      ['required', 'optional'],
      ['must', 'should not'],
      ['possible', 'impossible']
    ];

    let conflictScore = 0;
    for (const [word1, word2] of contradictionPairs) {
      if (text.includes(word1) && text.includes(word2)) {
        conflictScore += 0.2;
      }
    }

    // Check for numerical inconsistencies
    const numbers = text.match(/\d+/g);
    if (numbers && numbers.length > 2) {
      // Simple check for obviously inconsistent ranges
      const numValues = numbers.map(n => parseInt(n)).sort((a, b) => a - b);
      const range = numValues[numValues.length - 1] - numValues[0];
      if (range > numValues[Math.floor(numValues.length / 2)] * 10) {
        conflictScore += 0.1;
      }
    }

    return Math.min(1.0, conflictScore);
  }

  private isConceptTypeConsistent(concept: any): boolean {
    const content = concept.description.toLowerCase();
    
    switch (concept.type) {
      case 'definition':
        return content.includes(' is ') || content.includes(' are ') || content.includes('defined as');
      case 'process':
        return content.includes('step') || content.includes('process') || content.includes('method');
      case 'example':
        return content.includes('example') || content.includes('instance') || content.includes('such as');
      case 'principle':
        return content.includes('principle') || content.includes('rule') || content.includes('should');
      case 'fact':
        return content.includes('research') || content.includes('study') || /\d+/.test(content);
      default:
        return true; // Unknown types are considered consistent
    }
  }

  private isRelationshipLogical(relationship: any, sourceConcept: any, targetConcept: any): boolean {
    // Check if the relationship type makes sense given the concept types
    const logicalCombinations = {
      'depends_on': ['process', 'principle', 'definition'],
      'part_of': ['definition', 'process', 'principle'],
      'example_of': ['example'],
      'related_to': ['*'], // Any type can be related
      'causes': ['process', 'fact']
    };

    const allowedSources = logicalCombinations[relationship.type] || ['*'];
    const allowedTargets = logicalCombinations[relationship.type] || ['*'];

    if (allowedSources.includes('*') || allowedSources.includes(sourceConcept.type)) {
      if (allowedTargets.includes('*') || allowedTargets.includes(targetConcept.type)) {
        return true;
      }
    }

    return false;
  }

  private async runVerificationMethod(method: string, concept: any, knowledge: ExtractedKnowledge): Promise<{
    passed: boolean;
    scoreMultiplier: number;
    issues: VerificationIssue[];
  }> {
    const issues: VerificationIssue[] = [];
    let passed = true;
    let scoreMultiplier = 1.0;

    switch (method) {
      case 'consistency':
        // Check internal consistency of the concept
        const consistencyScore = 1.0 - this.detectConflictingInformation(concept);
        if (consistencyScore < 0.7) {
          issues.push({
            type: 'conflicting_info',
            severity: 'medium',
            description: 'Concept has consistency issues',
            suggestion: 'Review source content for conflicting information'
          });
          passed = consistencyScore > 0.5;
        }
        scoreMultiplier = consistencyScore;
        break;

      case 'completeness':
        // Check if the concept has sufficient information
        const completenessScore = this.assessCompletenessScore(concept);
        if (completenessScore < 0.6) {
          issues.push({
            type: 'incomplete_data',
            severity: 'medium',
            description: 'Concept lacks complete information',
            suggestion: 'Expand extraction context or review source material'
          });
          passed = completenessScore > 0.4;
        }
        scoreMultiplier = completenessScore;
        break;

      case 'accuracy':
        // Assess the accuracy based on confidence and supporting evidence
        const accuracyScore = this.assessAccuracyScore(concept, knowledge);
        if (accuracyScore < 0.7) {
          issues.push({
            type: 'low_confidence',
            severity: 'medium',
            description: 'Concept accuracy is questionable',
            suggestion: 'Verify against additional sources or improve extraction confidence'
          });
          passed = accuracyScore > 0.5;
        }
        scoreMultiplier = accuracyScore;
        break;
    }

    return { passed, scoreMultiplier, issues };
  }

  private assessCompletenessScore(concept: any): number {
    let score = 0.5; // Base score

    // Check required fields
    if (concept.name && concept.name.length > 2) score += 0.1;
    if (concept.description && concept.description.length > 20) score += 0.2;
    if (concept.context && concept.context.length > 10) score += 0.1;
    if (concept.sourceSegments && concept.sourceSegments.length > 0) score += 0.1;

    return Math.min(1.0, score);
  }

  private assessAccuracyScore(concept: any, knowledge: ExtractedKnowledge): number {
    let score = concept.confidence; // Start with extraction confidence

    // Boost score if concept appears in multiple segments
    if (concept.sourceSegments && concept.sourceSegments.length > 1) {
      score += 0.1;
    }

    // Boost score if concept has relationships with other concepts
    const relationshipCount = knowledge.relationships.filter(r => 
      r.source === concept.id || r.target === concept.id
    ).length;
    score += Math.min(0.2, relationshipCount * 0.05);

    return Math.min(1.0, score);
  }

  private detectCircularDependencies(relationships: VerifiedRelationship[]): string[] {
    const graph = new Map<string, string[]>();
    const circular: string[] = [];

    // Build adjacency list
    for (const rel of relationships) {
      if (rel.type === 'depends_on' || rel.type === 'part_of') {
        if (!graph.has(rel.source)) graph.set(rel.source, []);
        graph.get(rel.source)!.push(rel.target);
      }
    }

    // DFS to detect cycles
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (node: string): boolean => {
      visited.add(node);
      recursionStack.add(node);

      const neighbors = graph.get(node) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor) && hasCycle(neighbor)) {
          return true;
        } else if (recursionStack.has(neighbor)) {
          circular.push(`${node} -> ${neighbor}`);
          return true;
        }
      }

      recursionStack.delete(node);
      return false;
    };

    for (const node of graph.keys()) {
      if (!visited.has(node)) {
        hasCycle(node);
      }
    }

    return circular;
  }

  private analyzeConceptTypeDistribution(concepts: VerifiedConcept[]): { imbalance: number } {
    const typeCounts = new Map<string, number>();
    
    for (const concept of concepts) {
      const count = typeCounts.get(concept.type) || 0;
      typeCounts.set(concept.type, count + 1);
    }

    const counts = Array.from(typeCounts.values());
    if (counts.length <= 1) return { imbalance: 0 };

    const max = Math.max(...counts);
    const total = counts.reduce((sum, count) => sum + count, 0);
    const imbalance = max / total;

    return { imbalance };
  }

  private calculateOverallQualityScore(
    concepts: VerifiedConcept[], 
    relationships: VerifiedRelationship[], 
    issues: VerificationIssue[]
  ): number {
    // Base score from verified items
    const verifiedConcepts = concepts.filter(c => c.verified).length;
    const verifiedRelationships = relationships.filter(r => r.verified).length;
    const totalItems = concepts.length + relationships.length;
    
    let baseScore = totalItems > 0 ? (verifiedConcepts + verifiedRelationships) / totalItems : 0;

    // Average confidence score
    const avgConceptScore = concepts.length > 0 ? 
      concepts.reduce((sum, c) => sum + c.verificationScore, 0) / concepts.length : 0;
    const avgRelationshipScore = relationships.length > 0 ?
      relationships.reduce((sum, r) => sum + r.verificationScore, 0) / relationships.length : 0;
    const avgConfidence = (avgConceptScore + avgRelationshipScore) / 2;

    // Penalty for issues
    const highSeverityIssues = issues.filter(i => i.severity === 'high').length;
    const mediumSeverityIssues = issues.filter(i => i.severity === 'medium').length;
    const issuePenalty = (highSeverityIssues * 0.1) + (mediumSeverityIssues * 0.05);

    const finalScore = (baseScore * 0.4 + avgConfidence * 0.6) - issuePenalty;
    return Math.max(0, Math.min(1.0, finalScore));
  }

  private generateVerificationReport(
    concepts: VerifiedConcept[], 
    relationships: VerifiedRelationship[], 
    issues: VerificationIssue[], 
    overallScore: number
  ): VerificationReport {
    const conceptsVerified = concepts.filter(c => c.verified).length;
    const relationshipsVerified = relationships.filter(r => r.verified).length;

    const recommendations: string[] = [];

    // Generate recommendations based on issues
    const issueTypes = new Set(issues.map(i => i.type));
    if (issueTypes.has('low_confidence')) {
      recommendations.push('Consider improving extraction confidence thresholds');
    }
    if (issueTypes.has('missing_context')) {
      recommendations.push('Increase context window size during extraction');
    }
    if (issueTypes.has('conflicting_info')) {
      recommendations.push('Review source content for consistency');
    }
    if (issueTypes.has('incomplete_data')) {
      recommendations.push('Enhance extraction patterns for better coverage');
    }

    // Performance-based recommendations
    if (overallScore < 0.7) {
      recommendations.push('Overall quality is below threshold - consider reviewing extraction pipeline');
    }
    if (conceptsVerified / concepts.length < 0.8) {
      recommendations.push('High number of concept verification failures - review concept extraction logic');
    }

    return {
      overallScore,
      conceptsVerified,
      relationshipsVerified,
      issues: issues.filter(i => i.severity === 'high' || i.severity === 'medium'), // Filter out low-severity for report
      recommendations
    };
  }

  async cleanup(): Promise<void> {
    // No cleanup required for verification stage
  }
}