/**
 * SourceAttribution - Manages source attribution and traceability
 */

const { v4: uuidv4 } = require('uuid');

class SourceAttribution {
  constructor(config = {}) {
    this.config = {
      contextWindowSentences: 2,
      requireTimestamps: true,
      trackVersions: true,
      auditTrail: true,
      ...config
    };
    
    this.attributionStore = new Map();
    this.auditEvents = new Map();
    this.relationshipGraph = new Map();
  }

  /**
   * Create attribution record for an insight
   */
  async createAttribution(insight, transcript) {
    const attribution_id = uuidv4();
    
    const sourceReferences = await this.buildSourceReferences(insight, transcript);
    
    const attributionRecord = {
      attribution_id,
      insight_id: insight.insight_id,
      source_references: sourceReferences,
      transcript_metadata: this.extractTranscriptMetadata(transcript),
      created_at: new Date().toISOString(),
      updated_at: null,
      version: 1,
      version_history: []
    };

    // Store attribution
    this.attributionStore.set(attribution_id, attributionRecord);
    
    // Record audit event
    if (this.config.auditTrail) {
      this.recordAuditEvent(attribution_id, 'attribution_created', {
        insight_id: insight.insight_id,
        source_count: sourceReferences.length
      });
    }

    this.validateAttribution(attributionRecord);
    return attributionRecord;
  }

  async buildSourceReferences(insight, transcript) {
    const sourceReferences = [];
    
    for (const quote of insight.quotes) {
      const sourceRef = await this.buildSourceReference(quote, transcript);
      sourceReferences.push(sourceRef);
    }
    
    return sourceReferences;
  }

  async buildSourceReference(quote, transcript) {
    const contextSentences = this.extractContextSentences(quote, transcript);
    
    return {
      file: quote.source_file,
      line_start: quote.line_start,
      line_end: quote.line_end || quote.line_start,
      timestamp: quote.timestamp,
      exact_quote: quote.text,
      context_before: contextSentences.before,
      context_after: contextSentences.after,
      confidence: quote.confidence,
      verification_method: this.determineVerificationMethod(quote),
      character_offset: this.calculateCharacterOffset(quote, transcript)
    };
  }

  extractContextSentences(quote, transcript) {
    const contextWindow = this.config.contextWindowSentences;
    const content = transcript.content;
    
    // Find the line index
    const lineIndex = content.findIndex(line => line.line_number === quote.line_start);
    
    if (lineIndex === -1) {
      return { before: null, context_after: null };
    }

    // Extract context before
    const beforeLines = [];
    for (let i = Math.max(0, lineIndex - contextWindow); i < lineIndex; i++) {
      beforeLines.push(content[i].text);
    }
    
    // Extract context after  
    const afterLines = [];
    const endIndex = quote.line_end ? 
      content.findIndex(line => line.line_number === quote.line_end) : lineIndex;
    
    for (let i = endIndex + 1; i < Math.min(content.length, endIndex + 1 + contextWindow); i++) {
      afterLines.push(content[i].text);
    }

    return {
      before: beforeLines.length > 0 ? beforeLines.join(' ') : null,
      after: afterLines.length > 0 ? afterLines.join(' ') : null
    };
  }

  determineVerificationMethod(quote) {
    if (quote.confidence === 1.0) return 'exact_match';
    if (quote.confidence > 0.9) return 'fuzzy_match';
    if (quote.confidence > 0.7) return 'partial_match';
    return 'low_confidence';
  }

  calculateCharacterOffset(quote, transcript) {
    let offset = 0;
    
    for (const line of transcript.content) {
      if (line.line_number === quote.line_start) {
        const lineText = line.text;
        const quoteIndex = lineText.indexOf(quote.text);
        return offset + (quoteIndex !== -1 ? quoteIndex : 0);
      }
      offset += line.text.length + 1; // +1 for newline
    }
    
    return offset;
  }

  extractTranscriptMetadata(transcript) {
    return {
      filename: transcript.filename,
      total_lines: transcript.content.length,
      processed_at: transcript.metadata.processed_at,
      language: transcript.metadata.language,
      has_timestamps: transcript.metadata.has_timestamps,
      estimated_duration: transcript.metadata.estimated_duration
    };
  }

  validateAttribution(attribution) {
    const requiredFields = ['attribution_id', 'insight_id', 'source_references', 'created_at'];
    
    for (const field of requiredFields) {
      if (!attribution[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    if (!Array.isArray(attribution.source_references) || attribution.source_references.length === 0) {
      throw new Error('At least one source reference is required');
    }

    // Validate source references
    attribution.source_references.forEach((ref, index) => {
      const requiredRefFields = ['file', 'line_start', 'exact_quote', 'confidence'];
      
      for (const field of requiredRefFields) {
        if (ref[field] === undefined) {
          throw new Error(`Source reference ${index} missing required field: ${field}`);
        }
      }
    });
  }

  /**
   * Trace an insight back to its source locations
   */
  async traceInsightToSource(insight_id, attributionRecord) {
    if (attributionRecord.insight_id !== insight_id) {
      return null;
    }

    const sourceLocations = attributionRecord.source_references.map(ref => ({
      file: ref.file,
      line_numbers: this.getLineRange(ref.line_start, ref.line_end),
      span_lines: (ref.line_end || ref.line_start) - ref.line_start + 1,
      timestamp: ref.timestamp,
      original_text: ref.exact_quote,
      context: {
        before: ref.context_before,
        after: ref.context_after
      },
      confidence: ref.confidence,
      character_offset: ref.character_offset
    }));

    return {
      insight_id,
      attribution_id: attributionRecord.attribution_id,
      source_locations,
      trace_timestamp: new Date().toISOString()
    };
  }

  getLineRange(startLine, endLine) {
    const range = [];
    const end = endLine || startLine;
    
    for (let i = startLine; i <= end; i++) {
      range.push(i);
    }
    
    return range;
  }

  /**
   * Check source integrity against current transcript
   */
  async checkSourceIntegrity(attributionRecord, currentTranscript) {
    const issues = [];
    let totalConfidence = 0;
    let validReferences = 0;

    for (const ref of attributionRecord.source_references) {
      // Check if line numbers still exist
      const lineExists = currentTranscript.content.some(
        line => line.line_number >= ref.line_start && line.line_number <= (ref.line_end || ref.line_start)
      );

      if (!lineExists) {
        issues.push({
          type: 'missing_lines',
          reference: ref,
          description: `Lines ${ref.line_start}-${ref.line_end || ref.line_start} no longer exist`
        });
        continue;
      }

      // Check if quote still matches
      const currentLine = currentTranscript.content.find(line => line.line_number === ref.line_start);
      if (currentLine && !currentLine.text.includes(ref.exact_quote)) {
        issues.push({
          type: 'quote_mismatch',
          reference: ref,
          expected: ref.exact_quote,
          actual: currentLine.text,
          description: 'Quote no longer matches source text'
        });
        continue;
      }

      totalConfidence += ref.confidence;
      validReferences++;
    }

    const averageConfidence = validReferences > 0 ? totalConfidence / validReferences : 0;

    return {
      isValid: issues.length === 0,
      confidence_score: averageConfidence,
      issues,
      valid_references: validReferences,
      total_references: attributionRecord.source_references.length,
      integrity_check_date: new Date().toISOString()
    };
  }

  /**
   * Update attribution with new information
   */
  async updateAttribution(attribution_id, updates) {
    const existingRecord = this.attributionStore.get(attribution_id);
    if (!existingRecord) {
      throw new Error(`Attribution not found: ${attribution_id}`);
    }

    // Store version history
    const versionHistory = [...existingRecord.version_history];
    versionHistory.push({
      version: existingRecord.version,
      data: { ...existingRecord },
      updated_at: existingRecord.updated_at || existingRecord.created_at
    });

    const updatedRecord = {
      ...existingRecord,
      ...updates,
      updated_at: new Date().toISOString(),
      version: existingRecord.version + 1,
      version_history: versionHistory
    };

    this.attributionStore.set(attribution_id, updatedRecord);

    // Record audit event
    if (this.config.auditTrail) {
      this.recordAuditEvent(attribution_id, 'attribution_updated', {
        version: updatedRecord.version,
        changes: Object.keys(updates)
      });
    }

    return updatedRecord;
  }

  /**
   * Link related insights bidirectionally
   */
  async linkRelatedInsights(attribution_id_1, attribution_id_2, relationship_type) {
    // Add forward relationship
    if (!this.relationshipGraph.has(attribution_id_1)) {
      this.relationshipGraph.set(attribution_id_1, []);
    }
    this.relationshipGraph.get(attribution_id_1).push({
      target: attribution_id_2,
      relationship: relationship_type,
      created_at: new Date().toISOString()
    });

    // Add reverse relationship  
    if (!this.relationshipGraph.has(attribution_id_2)) {
      this.relationshipGraph.set(attribution_id_2, []);
    }
    this.relationshipGraph.get(attribution_id_2).push({
      target: attribution_id_1,
      relationship: this.reverseRelationship(relationship_type),
      created_at: new Date().toISOString()
    });
  }

  reverseRelationship(relationship) {
    const reverseMap = {
      'supports': 'supported_by',
      'contradicts': 'contradicted_by',
      'extends': 'extended_by',
      'depends_on': 'depended_on_by'
    };
    
    return reverseMap[relationship] || relationship;
  }

  getRelatedInsights(attribution_id) {
    const relationships = this.relationshipGraph.get(attribution_id) || [];
    return relationships.map(rel => rel.target);
  }

  getRelationshipType(attribution_id_1, attribution_id_2) {
    const relationships = this.relationshipGraph.get(attribution_id_1) || [];
    const relationship = relationships.find(rel => rel.target === attribution_id_2);
    return relationship ? relationship.relationship : null;
  }

  /**
   * Record audit events
   */
  recordAuditEvent(attribution_id, event_type, metadata = {}) {
    if (!this.auditEvents.has(attribution_id)) {
      this.auditEvents.set(attribution_id, []);
    }
    
    this.auditEvents.get(attribution_id).push({
      event_type,
      timestamp: new Date().toISOString(),
      metadata
    });
  }

  recordVerificationEvent(attribution_id, event_type, metadata) {
    this.recordAuditEvent(attribution_id, event_type, metadata);
  }

  recordModificationEvent(attribution_id, event_type, metadata) {
    this.recordAuditEvent(attribution_id, event_type, metadata);
  }

  /**
   * Generate comprehensive audit trail
   */
  generateAuditTrail(attributionRecord) {
    const events = this.auditEvents.get(attributionRecord.attribution_id) || [];
    
    return {
      attribution_id: attributionRecord.attribution_id,
      events: events.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)),
      created_at: attributionRecord.created_at,
      last_updated: attributionRecord.updated_at,
      version: attributionRecord.version,
      total_events: events.length
    };
  }

  /**
   * Export attribution in various formats
   */
  exportAttribution(attributionRecord, format = 'json') {
    switch (format) {
      case 'json':
        return JSON.stringify(attributionRecord, null, 2);
        
      case 'markdown':
        return this.exportAsMarkdown(attributionRecord);
        
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  exportAsMarkdown(attributionRecord) {
    let markdown = `## Source Attribution\\n\\n`;
    markdown += `**Attribution ID:** ${attributionRecord.attribution_id}\\n`;
    markdown += `**Insight ID:** ${attributionRecord.insight_id}\\n`;
    markdown += `**Created:** ${attributionRecord.created_at}\\n\\n`;
    
    markdown += `### Source References\\n\\n`;
    
    attributionRecord.source_references.forEach((ref, index) => {
      markdown += `#### Reference ${index + 1}\\n\\n`;
      markdown += `**File:** ${ref.file}\\n`;
      markdown += `**Lines:** ${ref.line_start}${ref.line_end && ref.line_end !== ref.line_start ? `-${ref.line_end}` : ''}\\n`;
      if (ref.timestamp) {
        markdown += `**Timestamp:** ${ref.timestamp}\\n`;
      }
      markdown += `**Confidence:** ${(ref.confidence * 100).toFixed(1)}%\\n\\n`;
      markdown += `> ${ref.exact_quote}\\n\\n`;
    });
    
    return markdown;
  }
}

module.exports = SourceAttribution;