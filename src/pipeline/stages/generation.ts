import {
  PipelineStage,
  VerifiedKnowledge,
  GeneratedDocument,
  DocumentSection,
  GenerationConfig,
  PipelineStageError
} from '../types';

export class GenerationStage implements PipelineStage<VerifiedKnowledge, GeneratedDocument> {
  public readonly name = 'generation';

  constructor(private config: GenerationConfig) {}

  async process(input: VerifiedKnowledge): Promise<GeneratedDocument> {
    try {
      if (!(await this.validate(input))) {
        throw new PipelineStageError(
          'Input validation failed for generation',
          this.name,
          'VALIDATION_FAILED',
          input,
          false
        );
      }

      // Generate document sections
      const sections = await this.generateDocumentSections(input);
      
      // Generate document title
      const title = this.generateDocumentTitle(input);
      
      // Generate document content based on format
      const format = this.config.outputFormats[0] || 'markdown'; // Use first format as default
      const content = await this.generateDocumentContent(sections, format);

      // Extract tags for metadata
      const tags = this.extractDocumentTags(input);

      return {
        id: input.id,
        title,
        content,
        format: format as any,
        sections,
        metadata: {
          generatedAt: new Date().toISOString(),
          sourceTranscript: input.id,
          version: '1.0.0',
          author: 'Knowledge Extraction Pipeline',
          tags
        }
      };

    } catch (error) {
      if (error instanceof PipelineStageError) {
        throw error;
      }

      throw new PipelineStageError(
        `Generation processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        this.name,
        'PROCESSING_FAILED',
        { input, error },
        true
      );
    }
  }

  async validate(input: VerifiedKnowledge): Promise<boolean> {
    try {
      if (!input.concepts || input.concepts.length === 0) {
        return false;
      }

      // Check that we have some verified concepts to work with
      const verifiedConcepts = input.concepts.filter(c => c.verified);
      if (verifiedConcepts.length === 0) {
        return false;
      }

      // Check quality score meets threshold
      if (input.qualityScore < 0.3) {
        return false; // Too low quality to generate meaningful documentation
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  private async generateDocumentSections(input: VerifiedKnowledge): Promise<DocumentSection[]> {
    const sections: DocumentSection[] = [];
    const verifiedConcepts = input.concepts.filter(c => c.verified);
    const verifiedRelationships = input.relationships.filter(r => r.verified);

    // Generate overview section
    const overviewSection = this.generateOverviewSection(input, verifiedConcepts);
    if (overviewSection) sections.push(overviewSection);

    // Generate concepts section
    const conceptsSection = this.generateConceptsSection(verifiedConcepts, verifiedRelationships);
    if (conceptsSection) sections.push(conceptsSection);

    // Generate examples section
    const examplesSection = this.generateExamplesSection(verifiedConcepts);
    if (examplesSection) sections.push(examplesSection);

    // Generate references section if metadata available
    const referencesSection = this.generateReferencesSection(input);
    if (referencesSection) sections.push(referencesSection);

    // Generate appendix with verification report if quality issues exist
    if (input.verificationReport.issues.length > 0) {
      const appendixSection = this.generateAppendixSection(input);
      if (appendixSection) sections.push(appendixSection);
    }

    return sections;
  }

  private generateOverviewSection(input: VerifiedKnowledge, concepts: any[]): DocumentSection | null {
    if (concepts.length === 0) return null;

    // Categorize concepts for overview
    const conceptsByType = this.groupConceptsByType(concepts);
    const mainTopics = this.identifyMainTopics(concepts, input.relationships.filter(r => r.verified));

    let content = '## Overview\n\n';
    content += 'This document contains extracted knowledge and concepts from the source content. ';
    content += `A total of ${concepts.length} verified concepts were identified across ${Object.keys(conceptsByType).length} different categories.\n\n`;

    if (mainTopics.length > 0) {
      content += '### Main Topics Covered\n\n';
      mainTopics.forEach(topic => {
        content += `- **${topic.name}**: ${topic.description}\n`;
      });
      content += '\n';
    }

    // Add quality metrics
    content += '### Quality Metrics\n\n';
    content += `- Overall Quality Score: ${Math.round(input.qualityScore * 100)}%\n`;
    content += `- Verified Concepts: ${input.verificationReport.conceptsVerified}\n`;
    content += `- Verified Relationships: ${input.verificationReport.relationshipsVerified}\n`;
    
    if (input.verificationReport.issues.length > 0) {
      content += `- Quality Issues Identified: ${input.verificationReport.issues.length}\n`;
    }

    return {
      id: 'overview',
      title: 'Overview',
      content,
      type: 'overview',
      order: 1,
      sourceConcepts: concepts.map(c => c.id)
    };
  }

  private generateConceptsSection(concepts: any[], relationships: any[]): DocumentSection | null {
    if (concepts.length === 0) return null;

    const conceptsByType = this.groupConceptsByType(concepts);
    let content = '## Concepts and Definitions\n\n';

    // Order types by importance: definitions, principles, processes, facts, examples
    const typeOrder = ['definition', 'principle', 'process', 'fact', 'example'];
    const orderedTypes = typeOrder.filter(type => conceptsByType[type]);
    const remainingTypes = Object.keys(conceptsByType).filter(type => !typeOrder.includes(type));
    const allTypes = [...orderedTypes, ...remainingTypes];

    for (const type of allTypes) {
      const typeConcepts = conceptsByType[type];
      if (typeConcepts.length === 0) continue;

      content += `### ${this.capitalizeFirst(type)}s\n\n`;

      // Sort concepts by importance (verification score and confidence)
      const sortedConcepts = typeConcepts.sort((a: any, b: any) => {
        const scoreA = (a.verificationScore * a.confidence) * (a.importance || 0.5);
        const scoreB = (b.verificationScore * b.confidence) * (b.importance || 0.5);
        return scoreB - scoreA;
      });

      for (const concept of sortedConcepts) {
        content += `#### ${concept.name}\n\n`;
        content += `${concept.description}\n\n`;

        // Add context if available and meaningful
        if (concept.context && concept.context.length > concept.description.length) {
          content += `**Context:** ${concept.context}\n\n`;
        }

        // Add related concepts
        const relatedConcepts = this.findRelatedConcepts(concept, relationships, concepts);
        if (relatedConcepts.length > 0) {
          content += '**Related Concepts:**\n';
          relatedConcepts.forEach(related => {
            content += `- ${related.name}: ${related.relationshipDescription}\n`;
          });
          content += '\n';
        }
      }
    }

    return {
      id: 'concepts',
      title: 'Concepts and Definitions',
      content,
      type: 'concepts',
      order: 2,
      sourceConcepts: concepts.map(c => c.id)
    };
  }

  private generateExamplesSection(concepts: any[]): DocumentSection | null {
    const examples = concepts.filter(c => c.type === 'example');
    if (examples.length === 0) return null;

    let content = '## Examples and Illustrations\n\n';
    content += 'This section provides practical examples and illustrations of the concepts discussed.\n\n';

    const sortedExamples = examples.sort((a, b) => {
      const scoreA = a.verificationScore * a.confidence;
      const scoreB = b.verificationScore * b.confidence;
      return scoreB - scoreA;
    });

    sortedExamples.forEach((example, index) => {
      content += `### Example ${index + 1}: ${example.name}\n\n`;
      content += `${example.description}\n\n`;
      
      if (example.context && example.context !== example.description) {
        content += `**Context:** ${example.context}\n\n`;
      }
    });

    return {
      id: 'examples',
      title: 'Examples and Illustrations',
      content,
      type: 'examples',
      order: 3,
      sourceConcepts: examples.map(e => e.id)
    };
  }

  private generateReferencesSection(input: VerifiedKnowledge): DocumentSection | null {
    const metadata = input.metadata;
    if (!metadata.source) return null;

    let content = '## References and Source Information\n\n';
    content += '### Source Material\n\n';
    content += `- **Source:** ${metadata.source}\n`;
    
    if (metadata.duration) {
      content += `- **Duration:** ${Math.round(metadata.duration / 60)} minutes\n`;
    }
    
    if (metadata.timestamp) {
      content += `- **Created:** ${new Date(metadata.timestamp).toLocaleDateString()}\n`;
    }
    
    if (metadata.format) {
      content += `- **Format:** ${metadata.format.toUpperCase()}\n`;
    }

    content += '\n### Extraction Information\n\n';
    content += `- **Extraction Date:** ${new Date(metadata.extractionTimestamp).toLocaleDateString()}\n`;
    content += `- **Pipeline Version:** ${metadata.version}\n`;
    content += `- **Total Concepts Extracted:** ${input.concepts.length}\n`;
    content += `- **Total Relationships Identified:** ${input.relationships.length}\n`;

    return {
      id: 'references',
      title: 'References and Source Information',
      content,
      type: 'references',
      order: 4,
      sourceConcepts: []
    };
  }

  private generateAppendixSection(input: VerifiedKnowledge): DocumentSection | null {
    const report = input.verificationReport;
    if (report.issues.length === 0 && report.recommendations.length === 0) return null;

    let content = '## Appendix: Quality Assessment\n\n';
    content += `This appendix contains information about the quality assessment of the extracted knowledge.\n\n`;

    if (report.issues.length > 0) {
      content += '### Issues Identified\n\n';
      const issuesByType = new Map<string, any[]>();
      
      report.issues.forEach(issue => {
        if (!issuesByType.has(issue.type)) {
          issuesByType.set(issue.type, []);
        }
        issuesByType.get(issue.type)!.push(issue);
      });

      for (const [type, issues] of issuesByType) {
        content += `#### ${this.formatIssueType(type)}\n\n`;
        issues.forEach(issue => {
          content += `- **${issue.severity.toUpperCase()}**: ${issue.description}\n`;
          if (issue.suggestion) {
            content += `  - *Suggestion: ${issue.suggestion}*\n`;
          }
        });
        content += '\n';
      }
    }

    if (report.recommendations.length > 0) {
      content += '### Recommendations\n\n';
      report.recommendations.forEach(rec => {
        content += `- ${rec}\n`;
      });
      content += '\n';
    }

    return {
      id: 'appendix',
      title: 'Appendix: Quality Assessment',
      content,
      type: 'appendix',
      order: 5,
      sourceConcepts: []
    };
  }

  private async generateDocumentContent(sections: DocumentSection[], format: string): Promise<string> {
    let content = '';

    // Sort sections by order
    const sortedSections = sections.sort((a, b) => a.order - b.order);

    switch (format) {
      case 'markdown':
        content = await this.generateMarkdownContent(sortedSections);
        break;
      case 'html':
        content = await this.generateHtmlContent(sortedSections);
        break;
      default:
        content = await this.generateMarkdownContent(sortedSections);
    }

    // Add table of contents if configured
    if (this.config.generateTOC && sections.length > 2) {
      const toc = this.generateTableOfContents(sortedSections, format);
      content = toc + '\n\n' + content;
    }

    return content;
  }

  private async generateMarkdownContent(sections: DocumentSection[]): Promise<string> {
    let content = '';

    for (const section of sections) {
      content += section.content + '\n';
    }

    return content.trim();
  }

  private async generateHtmlContent(sections: DocumentSection[]): Promise<string> {
    let content = '<!DOCTYPE html>\n<html lang="en">\n<head>\n';
    content += '<meta charset="UTF-8">\n';
    content += '<meta name="viewport" content="width=device-width, initial-scale=1.0">\n';
    content += '<title>Knowledge Extraction Document</title>\n';
    content += '<style>\n';
    content += 'body { font-family: Arial, sans-serif; line-height: 1.6; margin: 0 auto; max-width: 800px; padding: 20px; }\n';
    content += 'h2 { color: #333; border-bottom: 2px solid #eee; padding-bottom: 10px; }\n';
    content += 'h3 { color: #666; }\n';
    content += 'h4 { color: #888; }\n';
    content += 'code { background-color: #f4f4f4; padding: 2px 4px; border-radius: 3px; }\n';
    content += '</style>\n</head>\n<body>\n';

    for (const section of sections) {
      // Convert markdown to basic HTML
      const htmlContent = this.convertMarkdownToHtml(section.content);
      content += htmlContent + '\n';
    }

    content += '</body>\n</html>';
    return content;
  }

  private generateTableOfContents(sections: DocumentSection[], format: string): string {
    if (format === 'html') {
      let toc = '<h2>Table of Contents</h2>\n<ul>\n';
      sections.forEach(section => {
        const anchor = section.id.toLowerCase().replace(/\s+/g, '-');
        toc += `<li><a href="#${anchor}">${section.title}</a></li>\n`;
      });
      toc += '</ul>';
      return toc;
    } else {
      let toc = '## Table of Contents\n\n';
      sections.forEach(section => {
        const anchor = section.title.toLowerCase().replace(/\s+/g, '-');
        toc += `- [${section.title}](#${anchor})\n`;
      });
      return toc;
    }
  }

  private convertMarkdownToHtml(markdown: string): string {
    return markdown
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^#### (.*$)/gim, '<h4>$1</h4>')
      .replace(/^\- (.*$)/gim, '<li>$1</li>')
      .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*)\*/gim, '<em>$1</em>')
      .replace(/`(.*)`/gim, '<code>$1</code>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/^(?!<[hul])/gim, '<p>')
      .replace(/(?<!>)$/gim, '</p>');
  }

  private generateDocumentTitle(input: VerifiedKnowledge): string {
    // Try to infer title from main concepts
    const definitions = input.concepts.filter(c => c.type === 'definition' && c.verified);
    const processes = input.concepts.filter(c => c.type === 'process' && c.verified);
    
    if (definitions.length > 0) {
      const mainDef = definitions.sort((a, b) => b.verificationScore - a.verificationScore)[0];
      return `Understanding ${mainDef.name}`;
    }
    
    if (processes.length > 0) {
      const mainProcess = processes.sort((a, b) => b.verificationScore - a.verificationScore)[0];
      return `Guide to ${mainProcess.name}`;
    }

    // Fallback to generic title
    const sourceFile = input.metadata.source?.split('/').pop()?.replace(/\.[^/.]+$/, '') || 'Source';
    return `Knowledge Guide: ${this.capitalizeFirst(sourceFile)}`;
  }

  private extractDocumentTags(input: VerifiedKnowledge): string[] {
    const tags = new Set<string>();

    // Add concept types as tags
    input.concepts.filter(c => c.verified).forEach(concept => {
      tags.add(concept.type);
    });

    // Add dominant topics
    const conceptsByType = this.groupConceptsByType(input.concepts.filter(c => c.verified));
    const dominantType = Object.entries(conceptsByType)
      .sort(([,a], [,b]) => b.length - a.length)[0];
    
    if (dominantType) {
      tags.add(`${dominantType[0]}-focused`);
    }

    // Add quality indicators
    if (input.qualityScore > 0.8) {
      tags.add('high-quality');
    } else if (input.qualityScore > 0.6) {
      tags.add('medium-quality');
    }

    // Add complexity indicators
    if (input.relationships.length > input.concepts.length * 0.5) {
      tags.add('complex-relationships');
    }

    return Array.from(tags);
  }

  private groupConceptsByType(concepts: any[]): Record<string, any[]> {
    const grouped: Record<string, any[]> = {};
    
    concepts.forEach(concept => {
      if (!grouped[concept.type]) {
        grouped[concept.type] = [];
      }
      grouped[concept.type].push(concept);
    });

    return grouped;
  }

  private identifyMainTopics(concepts: any[], relationships: any[]): Array<{name: string; description: string}> {
    const topics: Array<{name: string; description: string}> = [];
    
    // Identify highly connected concepts as main topics
    const conceptConnections = new Map<string, number>();
    
    relationships.forEach(rel => {
      const sourceCount = conceptConnections.get(rel.source) || 0;
      const targetCount = conceptConnections.get(rel.target) || 0;
      conceptConnections.set(rel.source, sourceCount + 1);
      conceptConnections.set(rel.target, targetCount + 1);
    });

    // Get top connected concepts
    const sortedConnections = Array.from(conceptConnections.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    for (const [conceptId, connectionCount] of sortedConnections) {
      const concept = concepts.find(c => c.id === conceptId);
      if (concept && connectionCount > 1) {
        topics.push({
          name: concept.name,
          description: concept.description.substring(0, 100) + '...'
        });
      }
    }

    return topics;
  }

  private findRelatedConcepts(targetConcept: any, relationships: any[], allConcepts: any[]): Array<{
    name: string;
    relationshipDescription: string;
  }> {
    const related: Array<{name: string; relationshipDescription: string}> = [];

    const relevantRelationships = relationships.filter(r => 
      r.source === targetConcept.id || r.target === targetConcept.id
    );

    for (const rel of relevantRelationships.slice(0, 3)) { // Limit to 3 most relevant
      const relatedConceptId = rel.source === targetConcept.id ? rel.target : rel.source;
      const relatedConcept = allConcepts.find(c => c.id === relatedConceptId);
      
      if (relatedConcept) {
        related.push({
          name: relatedConcept.name,
          relationshipDescription: rel.description || `${rel.type} relationship`
        });
      }
    }

    return related;
  }

  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  private formatIssueType(type: string): string {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  async cleanup(): Promise<void> {
    // No cleanup required for generation stage
  }
}