import { describe, it, expect, beforeEach } from '@jest/globals';
import { GenerationStage } from '../../../src/pipeline/stages/generation';
import { VerifiedKnowledge, GenerationConfig } from '../../../src/pipeline/types';

describe('GenerationStage', () => {
  let generationStage: GenerationStage;
  let config: GenerationConfig;

  beforeEach(() => {
    config = {
      outputFormats: ['markdown', 'html'],
      includeMetadata: true,
      generateTOC: true
    };
    generationStage = new GenerationStage(config);
  });

  describe('process', () => {
    it('should generate a complete document from verified knowledge', async () => {
      const input: VerifiedKnowledge = {
        id: 'test-1',
        concepts: [
          {
            id: 'concept-1',
            name: 'Machine Learning',
            description: 'A subset of artificial intelligence that enables computers to learn from data.',
            type: 'definition',
            confidence: 0.9,
            sourceSegments: ['seg-1'],
            context: 'Machine learning is used in various applications.',
            verified: true,
            verificationScore: 0.95,
            issues: []
          },
          {
            id: 'concept-2',
            name: 'Supervised Learning Example',
            description: 'Email spam detection using labeled training data to classify emails.',
            type: 'example',
            confidence: 0.85,
            sourceSegments: ['seg-2'],
            context: 'This example demonstrates supervised learning in practice.',
            verified: true,
            verificationScore: 0.9,
            issues: []
          }
        ],
        relationships: [
          {
            id: 'rel-1',
            source: 'concept-2',
            target: 'concept-1',
            type: 'example_of',
            strength: 0.8,
            description: 'Spam detection is an example of machine learning',
            verified: true,
            verificationScore: 0.85,
            issues: []
          }
        ],
        qualityScore: 0.9,
        verificationReport: {
          overallScore: 0.9,
          conceptsVerified: 2,
          relationshipsVerified: 1,
          issues: [],
          recommendations: []
        },
        metadata: {
          source: 'ml-tutorial.txt',
          format: 'txt',
          duration: 300,
          timestamp: '2024-01-01T00:00:00Z',
          extractionTimestamp: '2024-01-01T01:00:00Z',
          version: '1.0.0'
        }
      };

      const result = await generationStage.process(input);

      expect(result.id).toBe(input.id);
      expect(result.title).toBeTruthy();
      expect(result.content).toBeTruthy();
      expect(result.format).toBe('markdown');
      expect(result.sections).toHaveLength(4); // overview, concepts, examples, references
      expect(result.metadata.generatedAt).toBeTruthy();
      expect(result.metadata.sourceTranscript).toBe(input.id);
      expect(result.metadata.tags).toBeDefined();

      // Verify document structure
      expect(result.content).toContain('## Overview');
      expect(result.content).toContain('## Concepts and Definitions');
      expect(result.content).toContain('## Examples and Illustrations');
      expect(result.content).toContain('## References and Source Information');
    });

    it('should generate table of contents when enabled', async () => {
      const input: VerifiedKnowledge = {
        id: 'test-2',
        concepts: [
          {
            id: 'concept-1',
            name: 'Test Concept',
            description: 'A test concept for TOC generation.',
            type: 'definition',
            confidence: 0.8,
            sourceSegments: ['seg-1'],
            context: 'Test context',
            verified: true,
            verificationScore: 0.8,
            issues: []
          }
        ],
        relationships: [],
        qualityScore: 0.8,
        verificationReport: {
          overallScore: 0.8,
          conceptsVerified: 1,
          relationshipsVerified: 0,
          issues: [],
          recommendations: []
        },
        metadata: {
          source: 'test.txt',
          format: 'txt',
          extractionTimestamp: '2024-01-01T00:00:00Z',
          version: '1.0.0'
        }
      };

      const result = await generationStage.process(input);

      expect(result.content).toContain('## Table of Contents');
      expect(result.content).toContain('- [Overview](#overview)');
      expect(result.content).toContain('- [Concepts and Definitions](#concepts-and-definitions)');
    });

    it('should generate HTML format when specified', async () => {
      const htmlConfig = { ...config, outputFormats: ['html'] };
      const htmlStage = new GenerationStage(htmlConfig);

      const input: VerifiedKnowledge = {
        id: 'test-3',
        concepts: [
          {
            id: 'concept-1',
            name: 'HTML Test Concept',
            description: 'A concept for HTML generation testing.',
            type: 'definition',
            confidence: 0.8,
            sourceSegments: ['seg-1'],
            context: 'HTML context',
            verified: true,
            verificationScore: 0.8,
            issues: []
          }
        ],
        relationships: [],
        qualityScore: 0.8,
        verificationReport: {
          overallScore: 0.8,
          conceptsVerified: 1,
          relationshipsVerified: 0,
          issues: [],
          recommendations: []
        },
        metadata: {
          source: 'html-test.txt',
          format: 'txt',
          extractionTimestamp: '2024-01-01T00:00:00Z',
          version: '1.0.0'
        }
      };

      const result = await htmlStage.process(input);

      expect(result.format).toBe('html');
      expect(result.content).toContain('<!DOCTYPE html>');
      expect(result.content).toContain('<h2>');
      expect(result.content).toContain('</html>');
    });

    it('should group concepts by type in output', async () => {
      const input: VerifiedKnowledge = {
        id: 'test-4',
        concepts: [
          {
            id: 'def-1',
            name: 'Definition Concept',
            description: 'A definition for testing.',
            type: 'definition',
            confidence: 0.9,
            sourceSegments: ['seg-1'],
            context: 'Definition context',
            verified: true,
            verificationScore: 0.9,
            issues: []
          },
          {
            id: 'proc-1',
            name: 'Process Concept',
            description: 'A process for testing.',
            type: 'process',
            confidence: 0.85,
            sourceSegments: ['seg-2'],
            context: 'Process context',
            verified: true,
            verificationScore: 0.85,
            issues: []
          },
          {
            id: 'ex-1',
            name: 'Example Concept',
            description: 'An example for testing.',
            type: 'example',
            confidence: 0.8,
            sourceSegments: ['seg-3'],
            context: 'Example context',
            verified: true,
            verificationScore: 0.8,
            issues: []
          }
        ],
        relationships: [],
        qualityScore: 0.85,
        verificationReport: {
          overallScore: 0.85,
          conceptsVerified: 3,
          relationshipsVerified: 0,
          issues: [],
          recommendations: []
        },
        metadata: {
          source: 'grouped.txt',
          format: 'txt',
          extractionTimestamp: '2024-01-01T00:00:00Z',
          version: '1.0.0'
        }
      };

      const result = await generationStage.process(input);

      expect(result.content).toContain('### Definitions');
      expect(result.content).toContain('### Processes');
      expect(result.content).toContain('Definition Concept');
      expect(result.content).toContain('Process Concept');
    });

    it('should include quality assessment in appendix when issues exist', async () => {
      const input: VerifiedKnowledge = {
        id: 'test-5',
        concepts: [
          {
            id: 'concept-1',
            name: 'Problematic Concept',
            description: 'A concept with issues.',
            type: 'definition',
            confidence: 0.6,
            sourceSegments: ['seg-1'],
            context: 'Short context',
            verified: false,
            verificationScore: 0.6,
            issues: [
              {
                type: 'low_confidence',
                severity: 'medium',
                description: 'Concept has low confidence score',
                suggestion: 'Review extraction criteria'
              }
            ]
          }
        ],
        relationships: [],
        qualityScore: 0.6,
        verificationReport: {
          overallScore: 0.6,
          conceptsVerified: 0,
          relationshipsVerified: 0,
          issues: [
            {
              type: 'low_confidence',
              severity: 'medium',
              description: 'Multiple concepts have low confidence',
              suggestion: 'Review extraction pipeline'
            }
          ],
          recommendations: ['Improve extraction confidence thresholds']
        },
        metadata: {
          source: 'issues.txt',
          format: 'txt',
          extractionTimestamp: '2024-01-01T00:00:00Z',
          version: '1.0.0'
        }
      };

      const result = await generationStage.process(input);

      expect(result.content).toContain('## Appendix: Quality Assessment');
      expect(result.content).toContain('### Issues Identified');
      expect(result.content).toContain('### Recommendations');
      expect(result.content).toContain('Improve extraction confidence thresholds');
    });

    it('should show relationships between concepts', async () => {
      const input: VerifiedKnowledge = {
        id: 'test-6',
        concepts: [
          {
            id: 'parent-concept',
            name: 'Parent Concept',
            description: 'A parent concept in the hierarchy.',
            type: 'definition',
            confidence: 0.9,
            sourceSegments: ['seg-1'],
            context: 'Parent context',
            verified: true,
            verificationScore: 0.9,
            issues: []
          },
          {
            id: 'child-concept',
            name: 'Child Concept',
            description: 'A child concept that relates to the parent.',
            type: 'definition',
            confidence: 0.85,
            sourceSegments: ['seg-2'],
            context: 'Child context',
            verified: true,
            verificationScore: 0.85,
            issues: []
          }
        ],
        relationships: [
          {
            id: 'rel-1',
            source: 'child-concept',
            target: 'parent-concept',
            type: 'part_of',
            strength: 0.8,
            description: 'Child concept is part of parent concept',
            verified: true,
            verificationScore: 0.8,
            issues: []
          }
        ],
        qualityScore: 0.85,
        verificationReport: {
          overallScore: 0.85,
          conceptsVerified: 2,
          relationshipsVerified: 1,
          issues: [],
          recommendations: []
        },
        metadata: {
          source: 'relationships.txt',
          format: 'txt',
          extractionTimestamp: '2024-01-01T00:00:00Z',
          version: '1.0.0'
        }
      };

      const result = await generationStage.process(input);

      expect(result.content).toContain('**Related Concepts:**');
      expect(result.content).toContain('Parent Concept');
      expect(result.content).toContain('Child concept is part of parent concept');
    });
  });

  describe('validate', () => {
    it('should validate input with verified concepts', async () => {
      const input: VerifiedKnowledge = {
        id: 'test-7',
        concepts: [
          {
            id: 'concept-1',
            name: 'Valid Concept',
            description: 'A valid verified concept.',
            type: 'definition',
            confidence: 0.8,
            sourceSegments: ['seg-1'],
            context: 'Valid context',
            verified: true,
            verificationScore: 0.8,
            issues: []
          }
        ],
        relationships: [],
        qualityScore: 0.8,
        verificationReport: {
          overallScore: 0.8,
          conceptsVerified: 1,
          relationshipsVerified: 0,
          issues: [],
          recommendations: []
        },
        metadata: {
          source: 'valid.txt',
          format: 'txt',
          extractionTimestamp: '2024-01-01T00:00:00Z',
          version: '1.0.0'
        }
      };

      const isValid = await generationStage.validate(input);
      expect(isValid).toBe(true);
    });

    it('should reject input without concepts', async () => {
      const input: VerifiedKnowledge = {
        id: 'test-8',
        concepts: [],
        relationships: [],
        qualityScore: 0.8,
        verificationReport: {
          overallScore: 0.8,
          conceptsVerified: 0,
          relationshipsVerified: 0,
          issues: [],
          recommendations: []
        },
        metadata: {
          source: 'empty.txt',
          format: 'txt',
          extractionTimestamp: '2024-01-01T00:00:00Z',
          version: '1.0.0'
        }
      };

      const isValid = await generationStage.validate(input);
      expect(isValid).toBe(false);
    });

    it('should reject input without verified concepts', async () => {
      const input: VerifiedKnowledge = {
        id: 'test-9',
        concepts: [
          {
            id: 'concept-1',
            name: 'Unverified Concept',
            description: 'A concept that failed verification.',
            type: 'definition',
            confidence: 0.4,
            sourceSegments: ['seg-1'],
            context: 'Context',
            verified: false, // Not verified
            verificationScore: 0.4,
            issues: []
          }
        ],
        relationships: [],
        qualityScore: 0.4,
        verificationReport: {
          overallScore: 0.4,
          conceptsVerified: 0,
          relationshipsVerified: 0,
          issues: [],
          recommendations: []
        },
        metadata: {
          source: 'unverified.txt',
          format: 'txt',
          extractionTimestamp: '2024-01-01T00:00:00Z',
          version: '1.0.0'
        }
      };

      const isValid = await generationStage.validate(input);
      expect(isValid).toBe(false);
    });

    it('should reject input with very low quality score', async () => {
      const input: VerifiedKnowledge = {
        id: 'test-10',
        concepts: [
          {
            id: 'concept-1',
            name: 'Low Quality Concept',
            description: 'A low quality concept.',
            type: 'definition',
            confidence: 0.5,
            sourceSegments: ['seg-1'],
            context: 'Context',
            verified: true,
            verificationScore: 0.5,
            issues: []
          }
        ],
        relationships: [],
        qualityScore: 0.2, // Very low quality
        verificationReport: {
          overallScore: 0.2,
          conceptsVerified: 1,
          relationshipsVerified: 0,
          issues: [],
          recommendations: []
        },
        metadata: {
          source: 'low-quality.txt',
          format: 'txt',
          extractionTimestamp: '2024-01-01T00:00:00Z',
          version: '1.0.0'
        }
      };

      const isValid = await generationStage.validate(input);
      expect(isValid).toBe(false);
    });
  });

  describe('document quality', () => {
    it('should generate meaningful titles based on content', async () => {
      const input: VerifiedKnowledge = {
        id: 'title-test',
        concepts: [
          {
            id: 'concept-1',
            name: 'Artificial Intelligence',
            description: 'The simulation of human intelligence in machines.',
            type: 'definition',
            confidence: 0.95,
            sourceSegments: ['seg-1'],
            context: 'AI is a broad field of computer science',
            verified: true,
            verificationScore: 0.95,
            issues: []
          }
        ],
        relationships: [],
        qualityScore: 0.95,
        verificationReport: {
          overallScore: 0.95,
          conceptsVerified: 1,
          relationshipsVerified: 0,
          issues: [],
          recommendations: []
        },
        metadata: {
          source: 'ai-introduction.txt',
          format: 'txt',
          extractionTimestamp: '2024-01-01T00:00:00Z',
          version: '1.0.0'
        }
      };

      const result = await generationStage.process(input);

      expect(result.title).toContain('Artificial Intelligence');
      expect(result.title).toMatch(/Understanding|Guide/i);
    });

    it('should include appropriate tags in metadata', async () => {
      const input: VerifiedKnowledge = {
        id: 'tags-test',
        concepts: [
          {
            id: 'concept-1',
            name: 'Machine Learning Process',
            description: 'The process of training ML models.',
            type: 'process',
            confidence: 0.9,
            sourceSegments: ['seg-1'],
            context: 'ML process context',
            verified: true,
            verificationScore: 0.9,
            issues: []
          }
        ],
        relationships: [],
        qualityScore: 0.9,
        verificationReport: {
          overallScore: 0.9,
          conceptsVerified: 1,
          relationshipsVerified: 0,
          issues: [],
          recommendations: []
        },
        metadata: {
          source: 'ml-process.txt',
          format: 'txt',
          extractionTimestamp: '2024-01-01T00:00:00Z',
          version: '1.0.0'
        }
      };

      const result = await generationStage.process(input);

      expect(result.metadata.tags).toContain('process');
      expect(result.metadata.tags).toContain('high-quality');
    });
  });
});