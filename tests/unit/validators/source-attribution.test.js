/**
 * Unit tests for SourceAttribution
 * Tests source attribution and traceability functionality
 */

const { describe, test, expect, beforeEach } = require('@jest/globals');
const SourceAttribution = require('../../../src/validators/source-attribution');

describe('SourceAttribution', () => {
  let attribution;
  let mockInsight;
  let mockTranscript;
  
  beforeEach(() => {
    attribution = new SourceAttribution();
    
    mockInsight = global.testUtils.createMockInsight({
      insight_id: 'test-insight-123',
      quotes: [{
        text: 'First, make sure you have Docker installed and running on your system.',
        source_file: 'test-transcript.txt',
        line_start: 2,
        line_end: 2,
        timestamp: '00:01:15',
        confidence: 0.95
      }]
    });

    mockTranscript = global.testUtils.createMockTranscript();
  });

  describe('constructor', () => {
    test('should create attribution tracker with default configuration', () => {
      expect(attribution).toBeInstanceOf(SourceAttribution);
      expect(attribution.config.contextWindowSentences).toBe(2);
      expect(attribution.config.requireTimestamps).toBe(true);
      expect(attribution.config.trackVersions).toBe(true);
    });

    test('should accept custom configuration', () => {
      const config = {
        contextWindowSentences: 3,
        requireTimestamps: false,
        trackVersions: false
      };
      const customAttribution = new SourceAttribution(config);
      
      expect(customAttribution.config.contextWindowSentences).toBe(3);
      expect(customAttribution.config.requireTimestamps).toBe(false);
    });
  });

  describe('createAttribution', () => {
    test('should create complete attribution record for insight', async () => {
      const result = await attribution.createAttribution(mockInsight, mockTranscript);

      expect(result).toBeDefined();
      expect(result.insight_id).toBe(mockInsight.insight_id);
      expect(result.source_references).toHaveLength(1);
      
      const sourceRef = result.source_references[0];
      expect(sourceRef.file).toBe('test-transcript.txt');
      expect(sourceRef.line_start).toBe(2);
      expect(sourceRef.line_end).toBe(2);
      expect(sourceRef.timestamp).toBe('00:01:15');
      expect(sourceRef.exact_quote).toContain('Docker installed');
      expect(sourceRef.context_before).toBeDefined();
      expect(sourceRef.context_after).toBeDefined();
    });

    test('should include context sentences around quote', async () => {
      const result = await attribution.createAttribution(mockInsight, mockTranscript);
      const sourceRef = result.source_references[0];

      expect(sourceRef.context_before).toContain('Welcome to this tutorial');
      expect(sourceRef.context_after).toContain('Warning: never run Claude');
    });

    test('should handle multiple quotes in single insight', async () => {
      const multiQuoteInsight = global.testUtils.createMockInsight({
        quotes: [
          {
            text: 'First, make sure you have Docker installed.',
            source_file: 'test-transcript.txt',
            line_start: 2,
            line_end: 2,
            timestamp: '00:01:15',
            confidence: 0.95
          },
          {
            text: 'Warning: never run Claude with dangerous permissions.',
            source_file: 'test-transcript.txt',
            line_start: 3,
            line_end: 3,
            timestamp: '00:02:45',
            confidence: 0.90
          }
        ]
      });

      const result = await attribution.createAttribution(multiQuoteInsight, mockTranscript);

      expect(result.source_references).toHaveLength(2);
      expect(result.source_references[0].line_start).toBe(2);
      expect(result.source_references[1].line_start).toBe(3);
    });

    test('should generate unique attribution ID', async () => {
      const result1 = await attribution.createAttribution(mockInsight, mockTranscript);
      const result2 = await attribution.createAttribution(mockInsight, mockTranscript);

      expect(result1.attribution_id).toBeDefined();
      expect(result2.attribution_id).toBeDefined();
      expect(result1.attribution_id).not.toBe(result2.attribution_id);
    });

    test('should include transcript metadata in attribution', async () => {
      const result = await attribution.createAttribution(mockInsight, mockTranscript);

      expect(result.transcript_metadata).toBeDefined();
      expect(result.transcript_metadata.filename).toBe(mockTranscript.filename);
      expect(result.transcript_metadata.total_lines).toBe(mockTranscript.content.length);
      expect(result.transcript_metadata.processed_at).toBe(mockTranscript.metadata.processed_at);
    });
  });

  describe('validateAttribution', () => {
    test('should validate complete attribution record', () => {
      const validAttribution = {
        attribution_id: 'attr-123',
        insight_id: 'insight-123',
        source_references: [{
          file: 'test.txt',
          line_start: 1,
          line_end: 1,
          exact_quote: 'Test quote',
          confidence: 0.95
        }],
        created_at: new Date().toISOString()
      };

      expect(() => attribution.validateAttribution(validAttribution)).not.toThrow();
    });

    test('should reject attribution missing required fields', () => {
      const invalidAttribution = {
        attribution_id: 'attr-123'
        // missing insight_id, source_references
      };

      expect(() => attribution.validateAttribution(invalidAttribution))
        .toThrow('Missing required field: insight_id');
    });

    test('should reject attribution with empty source references', () => {
      const invalidAttribution = {
        attribution_id: 'attr-123',
        insight_id: 'insight-123',
        source_references: [],
        created_at: new Date().toISOString()
      };

      expect(() => attribution.validateAttribution(invalidAttribution))
        .toThrow('At least one source reference is required');
    });

    test('should reject source reference missing required fields', () => {
      const invalidAttribution = {
        attribution_id: 'attr-123',
        insight_id: 'insight-123',
        source_references: [{
          file: 'test.txt',
          // missing line_start, exact_quote
        }],
        created_at: new Date().toISOString()
      };

      expect(() => attribution.validateAttribution(invalidAttribution))
        .toThrow('Source reference missing required field');
    });
  });

  describe('traceInsightToSource', () => {
    test('should trace insight back to specific source lines', async () => {
      const attributionRecord = await attribution.createAttribution(mockInsight, mockTranscript);
      
      const traceResult = await attribution.traceInsightToSource(
        mockInsight.insight_id, 
        attributionRecord
      );

      expect(traceResult).toBeDefined();
      expect(traceResult.insight_id).toBe(mockInsight.insight_id);
      expect(traceResult.source_locations).toHaveLength(1);
      expect(traceResult.source_locations[0].file).toBe('test-transcript.txt');
      expect(traceResult.source_locations[0].line_numbers).toContain(2);
      expect(traceResult.source_locations[0].original_text).toContain('Docker installed');
    });

    test('should handle multi-line quotes in tracing', async () => {
      const multiLineInsight = global.testUtils.createMockInsight({
        quotes: [{
          text: 'Warning: never run Claude with the dangerously-skip-permissions flag outside of a sandbox. This could expose your credentials.',
          source_file: 'test-transcript.txt',
          line_start: 3,
          line_end: 4,
          confidence: 0.92
        }]
      });

      const attributionRecord = await attribution.createAttribution(multiLineInsight, mockTranscript);
      const traceResult = await attribution.traceInsightToSource(
        multiLineInsight.insight_id,
        attributionRecord
      );

      const sourceLocation = traceResult.source_locations[0];
      expect(sourceLocation.line_numbers).toContain(3);
      expect(sourceLocation.line_numbers).toContain(4);
      expect(sourceLocation.span_lines).toBe(2);
    });

    test('should return null for non-existent insight', async () => {
      const attributionRecord = await attribution.createAttribution(mockInsight, mockTranscript);
      
      const traceResult = await attribution.traceInsightToSource(
        'non-existent-insight',
        attributionRecord
      );

      expect(traceResult).toBeNull();
    });
  });

  describe('generateAuditTrail', () => {
    test('should generate comprehensive audit trail', async () => {
      const attributionRecord = await attribution.createAttribution(mockInsight, mockTranscript);
      
      const auditTrail = attribution.generateAuditTrail(attributionRecord);

      expect(auditTrail).toBeDefined();
      expect(auditTrail.attribution_id).toBe(attributionRecord.attribution_id);
      expect(auditTrail.events).toBeInstanceOf(Array);
      expect(auditTrail.events.length).toBeGreaterThan(0);
      
      const creationEvent = auditTrail.events[0];
      expect(creationEvent.event_type).toBe('attribution_created');
      expect(creationEvent.timestamp).toBeDefined();
      expect(creationEvent.metadata.source_count).toBe(1);
    });

    test('should include verification events in audit trail', async () => {
      const attributionRecord = await attribution.createAttribution(mockInsight, mockTranscript);
      attribution.recordVerificationEvent(attributionRecord.attribution_id, 'quote_verified', {
        quote_index: 0,
        confidence: 0.95
      });

      const auditTrail = attribution.generateAuditTrail(attributionRecord);

      const verificationEvent = auditTrail.events.find(e => e.event_type === 'quote_verified');
      expect(verificationEvent).toBeDefined();
      expect(verificationEvent.metadata.confidence).toBe(0.95);
    });

    test('should track modification events', async () => {
      const attributionRecord = await attribution.createAttribution(mockInsight, mockTranscript);
      attribution.recordModificationEvent(attributionRecord.attribution_id, 'source_updated', {
        field: 'context_before',
        old_value: 'old context',
        new_value: 'new context'
      });

      const auditTrail = attribution.generateAuditTrail(attributionRecord);

      const modificationEvent = auditTrail.events.find(e => e.event_type === 'source_updated');
      expect(modificationEvent).toBeDefined();
      expect(modificationEvent.metadata.field).toBe('context_before');
    });
  });

  describe('checkSourceIntegrity', () => {
    test('should verify source integrity for valid attribution', async () => {
      const attributionRecord = await attribution.createAttribution(mockInsight, mockTranscript);
      
      const integrityCheck = await attribution.checkSourceIntegrity(attributionRecord, mockTranscript);

      expect(integrityCheck.isValid).toBe(true);
      expect(integrityCheck.issues).toHaveLength(0);
      expect(integrityCheck.confidence_score).toBeGreaterThan(0.9);
    });

    test('should detect quote mismatches', async () => {
      const modifiedTranscript = {
        ...mockTranscript,
        content: mockTranscript.content.map(item => ({
          ...item,
          text: item.text.replace('Docker', 'Podman') // Modified content
        }))
      };

      const attributionRecord = await attribution.createAttribution(mockInsight, mockTranscript);
      const integrityCheck = await attribution.checkSourceIntegrity(attributionRecord, modifiedTranscript);

      expect(integrityCheck.isValid).toBe(false);
      expect(integrityCheck.issues.length).toBeGreaterThan(0);
      expect(integrityCheck.issues[0].type).toBe('quote_mismatch');
    });

    test('should detect missing line numbers', async () => {
      const truncatedTranscript = {
        ...mockTranscript,
        content: mockTranscript.content.slice(0, 1) // Remove lines 2-3
      };

      const attributionRecord = await attribution.createAttribution(mockInsight, mockTranscript);
      const integrityCheck = await attribution.checkSourceIntegrity(attributionRecord, truncatedTranscript);

      expect(integrityCheck.isValid).toBe(false);
      expect(integrityCheck.issues.some(issue => issue.type === 'missing_lines')).toBe(true);
    });
  });

  describe('updateAttribution', () => {
    test('should update attribution with new source information', async () => {
      const attributionRecord = await attribution.createAttribution(mockInsight, mockTranscript);
      
      const updates = {
        source_references: [{
          ...attributionRecord.source_references[0],
          confidence: 0.98,
          context_before: 'Updated context before'
        }]
      };

      const updatedRecord = await attribution.updateAttribution(attributionRecord.attribution_id, updates);

      expect(updatedRecord.source_references[0].confidence).toBe(0.98);
      expect(updatedRecord.source_references[0].context_before).toBe('Updated context before');
      expect(updatedRecord.updated_at).toBeDefined();
      expect(updatedRecord.version).toBe(2);
    });

    test('should maintain version history', async () => {
      const attributionRecord = await attribution.createAttribution(mockInsight, mockTranscript);
      
      const updates = { source_references: [{ ...attributionRecord.source_references[0], confidence: 0.99 }] };
      const updatedRecord = await attribution.updateAttribution(attributionRecord.attribution_id, updates);

      expect(updatedRecord.version_history).toBeDefined();
      expect(updatedRecord.version_history).toHaveLength(1);
      expect(updatedRecord.version_history[0].version).toBe(1);
    });

    test('should record update event in audit trail', async () => {
      const attributionRecord = await attribution.createAttribution(mockInsight, mockTranscript);
      
      const updates = { source_references: [{ ...attributionRecord.source_references[0], confidence: 0.99 }] };
      const updatedRecord = await attribution.updateAttribution(attributionRecord.attribution_id, updates);

      const auditTrail = attribution.generateAuditTrail(updatedRecord);
      const updateEvent = auditTrail.events.find(e => e.event_type === 'attribution_updated');
      expect(updateEvent).toBeDefined();
    });
  });

  describe('linkRelatedInsights', () => {
    test('should create bidirectional links between related insights', async () => {
      const insight1 = global.testUtils.createMockInsight({ insight_id: 'insight-1' });
      const insight2 = global.testUtils.createMockInsight({ insight_id: 'insight-2' });

      const attribution1 = await attribution.createAttribution(insight1, mockTranscript);
      const attribution2 = await attribution.createAttribution(insight2, mockTranscript);

      await attribution.linkRelatedInsights(
        attribution1.attribution_id,
        attribution2.attribution_id,
        'supports'
      );

      const links1 = attribution.getRelatedInsights(attribution1.attribution_id);
      const links2 = attribution.getRelatedInsights(attribution2.attribution_id);

      expect(links1).toContain(attribution2.attribution_id);
      expect(links2).toContain(attribution1.attribution_id);
    });

    test('should support different relationship types', async () => {
      const insight1 = global.testUtils.createMockInsight({ insight_id: 'insight-1' });
      const insight2 = global.testUtils.createMockInsight({ insight_id: 'insight-2' });

      const attribution1 = await attribution.createAttribution(insight1, mockTranscript);
      const attribution2 = await attribution.createAttribution(insight2, mockTranscript);

      await attribution.linkRelatedInsights(
        attribution1.attribution_id,
        attribution2.attribution_id,
        'contradicts'
      );

      const relationship = attribution.getRelationshipType(
        attribution1.attribution_id,
        attribution2.attribution_id
      );

      expect(relationship).toBe('contradicts');
    });
  });

  describe('exportAttribution', () => {
    test('should export attribution in structured format', async () => {
      const attributionRecord = await attribution.createAttribution(mockInsight, mockTranscript);
      
      const exported = attribution.exportAttribution(attributionRecord, 'json');

      expect(exported).toBeDefined();
      const parsed = JSON.parse(exported);
      expect(parsed.attribution_id).toBe(attributionRecord.attribution_id);
      expect(parsed.source_references).toHaveLength(1);
    });

    test('should export in markdown format for documentation', async () => {
      const attributionRecord = await attribution.createAttribution(mockInsight, mockTranscript);
      
      const exported = attribution.exportAttribution(attributionRecord, 'markdown');

      expect(exported).toBeDefined();
      expect(exported).toContain('## Source Attribution');
      expect(exported).toContain('**File:**');
      expect(exported).toContain('**Lines:**');
      expect(exported).toContain('> '); // Quote formatting
    });

    test('should handle unsupported export format gracefully', async () => {
      const attributionRecord = await attribution.createAttribution(mockInsight, mockTranscript);
      
      expect(() => attribution.exportAttribution(attributionRecord, 'unsupported'))
        .toThrow('Unsupported export format: unsupported');
    });
  });
});