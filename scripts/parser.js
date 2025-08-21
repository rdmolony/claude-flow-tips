#!/usr/bin/env node

/**
 * Enhanced Transcript Parser for Claude Flow Tips
 * Extracts structured data from markdown transcripts with improved NLP
 */

const fs = require('fs');
const path = require('path');

class TranscriptParser {
  constructor(options = {}) {
    this.contextWindow = options.contextWindow || 7;
    this.minConfidence = options.minConfidence || 0.6;
    this.debug = options.debug || false;
  }

  /**
   * Enhanced pattern matching with contextual awareness
   */
  patterns = {
    gotcha: {
      primary: /\b(warning|careful|don't|avoid|dangerous|never|risk|security|gotcha|pitfall|mistake|error-prone)\b/gi,
      secondary: /\b(break|fail|crash|corrupt|lose|damage|vulnerability|exploit)\b/gi,
      weight: 1.5
    },
    tip: {
      primary: /\b(recommend|suggest|better|should|best practice|pro tip|advice|optimization|improve|enhance)\b/gi,
      secondary: /\b(efficient|faster|cleaner|simpler|powerful|effective)\b/gi,
      weight: 1.2
    },
    howTo: {
      primary: /\b(steps?|first|then|setup|configure|install|how to|guide|tutorial|walkthrough)\b/gi,
      secondary: /\b(create|build|implement|deploy|run|execute|command)\b/gi,
      weight: 1.3
    },
    qa: {
      primary: /(\?|asked|answer|question|response|replied|wondering|curious|explain)/gi,
      secondary: /\b(because|reason|why|how|what|when|where|means|basically)\b/gi,
      weight: 1.1
    },
    mentalModel: {
      primary: /\b(think|understand|concept|mental model|paradigm|approach|philosophy|mindset|perspective)\b/gi,
      secondary: /\b(framework|pattern|principle|theory|abstraction|methodology)\b/gi,
      weight: 1.0
    },
    internals: {
      primary: /\b(how it works|under the hood|internally|mechanism|architecture|implementation|engine|core)\b/gi,
      secondary: /\b(process|algorithm|logic|flow|pipeline|system|component)\b/gi,
      weight: 1.4
    }
  };

  /**
   * Parse a transcript file with enhanced extraction
   */
  parseTranscript(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const fileName = path.basename(filePath);
    const segments = [];
    const processedLines = new Set();

    // First pass: identify high-confidence segments
    for (let i = 0; i < lines.length; i++) {
      if (processedLines.has(i)) continue;
      
      const line = lines[i].trim();
      if (!line || line.length < 20) continue;

      const categorization = this.categorizeLine(line, lines, i);
      
      if (categorization.confidence >= this.minConfidence) {
        const segment = this.extractSegment(lines, i, fileName, categorization);
        segments.push(segment);
        
        // Mark lines as processed to avoid duplicates
        for (let j = segment.lineStart - 1; j <= segment.lineEnd - 1; j++) {
          processedLines.add(j);
        }
      }
    }

    // Second pass: merge related segments
    const mergedSegments = this.mergeRelatedSegments(segments);
    
    // Third pass: enhance with speaker context
    const enhancedSegments = this.enhanceSpeakerContext(mergedSegments, lines);

    return enhancedSegments;
  }

  /**
   * Categorize a line with confidence scoring
   */
  categorizeLine(line, allLines, lineIndex) {
    const scores = {};
    let topCategory = null;
    let topScore = 0;

    // Analyze current line and context
    const contextLines = this.getContextLines(allLines, lineIndex, 3);
    const fullContext = contextLines.join(' ');

    for (const [category, patterns] of Object.entries(this.patterns)) {
      let score = 0;
      
      // Check primary patterns
      const primaryMatches = (line.match(patterns.primary) || []).length;
      score += primaryMatches * patterns.weight * 2;
      
      // Check secondary patterns
      const secondaryMatches = (line.match(patterns.secondary) || []).length;
      score += secondaryMatches * patterns.weight;
      
      // Check context patterns
      const contextPrimaryMatches = (fullContext.match(patterns.primary) || []).length;
      score += contextPrimaryMatches * patterns.weight * 0.5;
      
      // Boost for multiple pattern matches
      if (primaryMatches > 1) score *= 1.2;
      
      // Normalize by line length
      const wordCount = line.split(/\s+/).length;
      score = score / Math.sqrt(wordCount);
      
      scores[category] = score;
      
      if (score > topScore) {
        topScore = score;
        topCategory = category;
      }
    }

    // Calculate confidence
    const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
    const confidence = totalScore > 0 ? topScore / totalScore : 0;

    return {
      category: topCategory,
      confidence: confidence,
      scores: scores,
      primaryCategory: topCategory,
      secondaryCategory: this.getSecondaryCategory(scores, topCategory)
    };
  }

  /**
   * Get secondary category if confidence is close
   */
  getSecondaryCategory(scores, primaryCategory) {
    const sortedCategories = Object.entries(scores)
      .filter(([cat, _]) => cat !== primaryCategory)
      .sort((a, b) => b[1] - a[1]);
    
    if (sortedCategories.length > 0 && sortedCategories[0][1] > 0) {
      const secondaryScore = sortedCategories[0][1];
      const primaryScore = scores[primaryCategory];
      
      // If secondary score is within 80% of primary, it's worth noting
      if (secondaryScore / primaryScore > 0.8) {
        return sortedCategories[0][0];
      }
    }
    
    return null;
  }

  /**
   * Extract a segment with dynamic context
   */
  extractSegment(lines, centerIndex, fileName, categorization) {
    // Dynamically adjust context based on category
    let contextBefore = 5;
    let contextAfter = 5;
    
    if (categorization.category === 'howTo') {
      // How-to guides often need more context
      contextAfter = 10;
    } else if (categorization.category === 'gotcha') {
      // Gotchas need good setup context
      contextBefore = 7;
    }
    
    const startLine = Math.max(0, centerIndex - contextBefore);
    const endLine = Math.min(lines.length - 1, centerIndex + contextAfter);
    
    // Find natural boundaries (speaker changes, timestamps)
    const naturalStart = this.findNaturalBoundary(lines, startLine, centerIndex, 'start');
    const naturalEnd = this.findNaturalBoundary(lines, endLine, centerIndex, 'end');
    
    const contextLines = lines.slice(naturalStart, naturalEnd + 1);
    
    return {
      category: categorization.category,
      secondaryCategory: categorization.secondaryCategory,
      content: contextLines.join('\n'),
      sourceFile: fileName,
      lineStart: naturalStart + 1,
      lineEnd: naturalEnd + 1,
      centerLine: centerIndex + 1,
      exactQuote: lines[centerIndex],
      confidence: categorization.confidence,
      scores: categorization.scores,
      speaker: this.extractSpeaker(lines, centerIndex),
      timestamp: this.extractTimestamp(lines, centerIndex)
    };
  }

  /**
   * Find natural boundaries for segments
   */
  findNaturalBoundary(lines, boundaryIndex, centerIndex, direction) {
    const maxDistance = 15;
    const speakerPattern = /^\[([^\]]+)\]:/;
    const timestampPattern = /\d{1,2}:\d{2}/;
    
    if (direction === 'start') {
      for (let i = boundaryIndex; i < centerIndex && i < boundaryIndex + maxDistance; i++) {
        if (speakerPattern.test(lines[i]) || timestampPattern.test(lines[i])) {
          return i;
        }
      }
    } else {
      for (let i = boundaryIndex; i > centerIndex && i > boundaryIndex - maxDistance; i--) {
        if (speakerPattern.test(lines[i]) || timestampPattern.test(lines[i])) {
          return i;
        }
      }
    }
    
    return boundaryIndex;
  }

  /**
   * Extract speaker from context
   */
  extractSpeaker(lines, lineIndex) {
    const speakerPattern = /^\[([^\]]+)\]:/;
    
    // Look backwards for speaker marker
    for (let i = lineIndex; i >= Math.max(0, lineIndex - 20); i--) {
      const match = lines[i].match(speakerPattern);
      if (match) {
        return match[1];
      }
    }
    
    return 'Unknown';
  }

  /**
   * Extract timestamp from context
   */
  extractTimestamp(lines, lineIndex) {
    const timestampPattern = /(\d{1,2}:\d{2}(?::\d{2})?)/;
    
    // Look for timestamp in current and nearby lines
    for (let i = Math.max(0, lineIndex - 5); i <= Math.min(lines.length - 1, lineIndex + 2); i++) {
      const match = lines[i].match(timestampPattern);
      if (match) {
        return match[1];
      }
    }
    
    return null;
  }

  /**
   * Merge related segments that are close together
   */
  mergeRelatedSegments(segments) {
    const merged = [];
    const processed = new Set();
    
    for (let i = 0; i < segments.length; i++) {
      if (processed.has(i)) continue;
      
      const current = segments[i];
      const related = [current];
      processed.add(i);
      
      // Look for nearby related segments
      for (let j = i + 1; j < segments.length; j++) {
        if (processed.has(j)) continue;
        
        const candidate = segments[j];
        
        // Check if segments are related
        if (this.areSegmentsRelated(current, candidate)) {
          related.push(candidate);
          processed.add(j);
        }
      }
      
      // Merge if multiple related segments found
      if (related.length > 1) {
        merged.push(this.mergeSegmentGroup(related));
      } else {
        merged.push(current);
      }
    }
    
    return merged;
  }

  /**
   * Check if two segments are related
   */
  areSegmentsRelated(seg1, seg2) {
    // Same file and category
    if (seg1.sourceFile !== seg2.sourceFile || seg1.category !== seg2.category) {
      return false;
    }
    
    // Close proximity (within 20 lines)
    const distance = Math.abs(seg1.centerLine - seg2.centerLine);
    if (distance > 20) {
      return false;
    }
    
    // Same speaker
    if (seg1.speaker === seg2.speaker && seg1.speaker !== 'Unknown') {
      return true;
    }
    
    // High confidence and overlapping context
    if (seg1.confidence > 0.8 && seg2.confidence > 0.8) {
      return distance < 10;
    }
    
    return false;
  }

  /**
   * Merge a group of related segments
   */
  mergeSegmentGroup(segments) {
    segments.sort((a, b) => a.lineStart - b.lineStart);
    
    const merged = {
      category: segments[0].category,
      secondaryCategory: this.findCommonSecondaryCategory(segments),
      sourceFile: segments[0].sourceFile,
      lineStart: segments[0].lineStart,
      lineEnd: segments[segments.length - 1].lineEnd,
      centerLine: segments[0].centerLine,
      exactQuote: segments.map(s => s.exactQuote).join(' [...] '),
      confidence: Math.max(...segments.map(s => s.confidence)),
      scores: this.mergeScores(segments.map(s => s.scores)),
      speaker: segments[0].speaker,
      timestamp: segments[0].timestamp,
      mergedCount: segments.length
    };
    
    // Reconstruct full content from original lines
    merged.content = segments.map(s => s.content).join('\n\n[...]\n\n');
    
    return merged;
  }

  /**
   * Find common secondary category across segments
   */
  findCommonSecondaryCategory(segments) {
    const categories = {};
    
    segments.forEach(seg => {
      if (seg.secondaryCategory) {
        categories[seg.secondaryCategory] = (categories[seg.secondaryCategory] || 0) + 1;
      }
    });
    
    const sorted = Object.entries(categories).sort((a, b) => b[1] - a[1]);
    return sorted.length > 0 ? sorted[0][0] : null;
  }

  /**
   * Merge confidence scores
   */
  mergeScores(scoresList) {
    const merged = {};
    const categories = new Set();
    
    scoresList.forEach(scores => {
      Object.keys(scores).forEach(cat => categories.add(cat));
    });
    
    categories.forEach(cat => {
      const catScores = scoresList.map(s => s[cat] || 0);
      merged[cat] = Math.max(...catScores);
    });
    
    return merged;
  }

  /**
   * Enhance segments with speaker context
   */
  enhanceSpeakerContext(segments, allLines) {
    return segments.map(segment => {
      // Add speaker expertise if detectable
      segment.speakerContext = this.detectSpeakerExpertise(segment.content);
      
      // Add conversation flow
      segment.conversationType = this.detectConversationType(segment.content);
      
      // Add technical level
      segment.technicalLevel = this.assessTechnicalLevel(segment.content);
      
      return segment;
    });
  }

  /**
   * Detect speaker expertise from content
   */
  detectSpeakerExpertise(content) {
    const expertisePatterns = {
      developer: /\b(code|implement|function|api|debug|repository|commit)\b/gi,
      architect: /\b(design|architecture|pattern|structure|system|scale)\b/gi,
      researcher: /\b(study|research|paper|finding|analysis|data)\b/gi,
      educator: /\b(explain|teach|learn|student|course|lesson)\b/gi,
      practitioner: /\b(experience|project|production|real-world|practical)\b/gi
    };
    
    const detected = [];
    
    for (const [expertise, pattern] of Object.entries(expertisePatterns)) {
      const matches = (content.match(pattern) || []).length;
      if (matches > 2) {
        detected.push(expertise);
      }
    }
    
    return detected.length > 0 ? detected : ['general'];
  }

  /**
   * Detect conversation type
   */
  detectConversationType(content) {
    const lines = content.split('\n');
    const hasQuestion = lines.some(l => l.includes('?'));
    const hasAnswer = /\b(because|therefore|basically|essentially|means)\b/i.test(content);
    const hasExample = /\b(example|for instance|like|such as)\b/i.test(content);
    
    if (hasQuestion && hasAnswer) return 'qa';
    if (hasExample) return 'demonstration';
    if (hasAnswer && !hasQuestion) return 'explanation';
    
    return 'discussion';
  }

  /**
   * Assess technical level of content
   */
  assessTechnicalLevel(content) {
    const advancedTerms = /\b(algorithm|optimization|architecture|paradigm|abstraction|polymorphism|concurrency|distributed)\b/gi;
    const intermediateTerms = /\b(function|variable|loop|array|object|method|class|interface)\b/gi;
    const basicTerms = /\b(computer|file|folder|click|button|screen|app|website)\b/gi;
    
    const advancedCount = (content.match(advancedTerms) || []).length;
    const intermediateCount = (content.match(intermediateTerms) || []).length;
    const basicCount = (content.match(basicTerms) || []).length;
    
    const total = advancedCount + intermediateCount + basicCount;
    
    if (total === 0) return 'general';
    
    const advancedRatio = advancedCount / total;
    const intermediateRatio = intermediateCount / total;
    
    if (advancedRatio > 0.4) return 'advanced';
    if (intermediateRatio > 0.4) return 'intermediate';
    
    return 'beginner';
  }

  /**
   * Get context lines around a given index
   */
  getContextLines(lines, centerIndex, radius) {
    const start = Math.max(0, centerIndex - radius);
    const end = Math.min(lines.length - 1, centerIndex + radius);
    return lines.slice(start, end + 1);
  }

  /**
   * Generate summary statistics for parsed content
   */
  generateStatistics(segments) {
    const stats = {
      totalSegments: segments.length,
      byCategory: {},
      bySpeaker: {},
      byTechnicalLevel: {},
      byConfidence: {
        high: 0,
        medium: 0,
        low: 0
      },
      averageConfidence: 0
    };
    
    let totalConfidence = 0;
    
    segments.forEach(segment => {
      // Category counts
      stats.byCategory[segment.category] = (stats.byCategory[segment.category] || 0) + 1;
      
      // Speaker counts
      stats.bySpeaker[segment.speaker] = (stats.bySpeaker[segment.speaker] || 0) + 1;
      
      // Technical level
      stats.byTechnicalLevel[segment.technicalLevel] = (stats.byTechnicalLevel[segment.technicalLevel] || 0) + 1;
      
      // Confidence distribution
      if (segment.confidence > 0.8) {
        stats.byConfidence.high++;
      } else if (segment.confidence > 0.6) {
        stats.byConfidence.medium++;
      } else {
        stats.byConfidence.low++;
      }
      
      totalConfidence += segment.confidence;
    });
    
    stats.averageConfidence = segments.length > 0 ? totalConfidence / segments.length : 0;
    
    return stats;
  }
}

module.exports = TranscriptParser;