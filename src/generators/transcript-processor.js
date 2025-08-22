/**
 * TranscriptProcessor - Process raw transcript files and extract insights
 * Integrates with existing pipeline components
 */

const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class TranscriptProcessor {
  constructor(config = {}) {
    this.config = {
      chunkSize: 1000, // characters per chunk for processing
      overlapSize: 200, // overlap between chunks
      minInsightLength: 100,
      maxInsightLength: 2000,
      confidenceThreshold: 0.7,
      ...config
    };
  }

  /**
   * Process transcript files and extract insights
   */
  async processTranscriptFiles(transcriptDir) {
    console.log(`📂 Processing transcripts from: ${transcriptDir}`);
    
    const files = await fs.readdir(transcriptDir);
    const transcriptFiles = files.filter(file => file.endsWith('.txt'));
    
    console.log(`📄 Found ${transcriptFiles.length} transcript files`);
    
    const allInsights = [];
    const transcriptSources = [];
    
    for (const filename of transcriptFiles) {
      const filepath = path.join(transcriptDir, filename);
      console.log(`🔄 Processing: ${filename}`);
      
      try {
        const insights = await this.processTranscriptFile(filepath);
        allInsights.push(...insights);
        
        // Extract metadata about the source
        const sourceMetadata = await this.extractSourceMetadata(filepath, filename);
        transcriptSources.push(sourceMetadata);
        
        console.log(`✅ Extracted ${insights.length} insights from ${filename}`);
      } catch (error) {
        console.error(`❌ Error processing ${filename}:`, error.message);
      }
    }
    
    console.log(`🎉 Total insights extracted: ${allInsights.length}`);
    
    return {
      insights: allInsights,
      sources: transcriptSources
    };
  }

  /**
   * Process a single transcript file
   */
  async processTranscriptFile(filepath) {
    const content = await fs.readFile(filepath, 'utf8');
    const filename = path.basename(filepath);
    
    // Split content into processable chunks
    const chunks = this.splitIntoChunks(content);
    
    const insights = [];
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const chunkInsights = await this.extractInsightsFromChunk(chunk, filename, i);
      insights.push(...chunkInsights);
    }
    
    // Post-process insights
    return this.postProcessInsights(insights, filename);
  }

  /**
   * Split transcript content into overlapping chunks
   */
  splitIntoChunks(content) {
    const chunks = [];
    const lines = content.split('\\n');
    
    let currentChunk = '';
    let currentSize = 0;
    
    for (const line of lines) {
      if (currentSize + line.length > this.config.chunkSize && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        
        // Create overlap for context
        const overlapLines = currentChunk.split('\\n').slice(-3);
        currentChunk = overlapLines.join('\\n') + '\\n';
        currentSize = currentChunk.length;
      }
      
      currentChunk += line + '\\n';
      currentSize += line.length + 1;
    }
    
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }
    
    return chunks;
  }

  /**
   * Extract insights from a text chunk using pattern matching and heuristics
   */
  async extractInsightsFromChunk(chunk, sourceFile, chunkIndex) {
    const insights = [];
    
    // Pattern-based insight extraction
    const patterns = [
      // How-to patterns
      {
        pattern: /(?:to|how to|you can|you need to|make sure to|be sure to)\\s+([^.!?]+[.!?])/gi,
        category: 'how-to',
        confidence: 0.8
      },
      
      // Tips and best practices
      {
        pattern: /(?:tip|recommendation|best practice|pro tip|remember)[:.]?\\s*([^.!?]+[.!?])/gi,
        category: 'tip',
        confidence: 0.9
      },
      
      // Warnings and gotchas
      {
        pattern: /(?:warning|careful|watch out|avoid|don't|never|pitfall|gotcha)[:.]?\\s*([^.!?]+[.!?])/gi,
        category: 'gotcha',
        confidence: 0.85
      },
      
      // Questions and answers
      {
        pattern: /(?:question|Q:|why|what|how|when|where)[:.]?\\s*([^.!?]+[.!?])/gi,
        category: 'qa',
        confidence: 0.7
      },
      
      // Concepts and definitions
      {
        pattern: /(?:is defined as|means|refers to|concept of|principle of)\\s+([^.!?]+[.!?])/gi,
        category: 'concept',
        confidence: 0.8
      }
    ];
    
    const lines = chunk.split('\\n');
    
    patterns.forEach(({ pattern, category, confidence }) => {
      let match;
      
      while ((match = pattern.exec(chunk)) !== null) {
        const text = match[0];
        const content = match[1];
        
        if (content && content.length >= this.config.minInsightLength && 
            content.length <= this.config.maxInsightLength) {
          
          // Find the line number
          let lineNumber = 1;
          let charCount = 0;
          for (let i = 0; i < lines.length; i++) {
            if (charCount + lines[i].length >= match.index) {
              lineNumber = i + 1 + (chunkIndex * 50); // Approximate line offset
              break;
            }
            charCount += lines[i].length + 1;
          }
          
          const insight = {
            insight_id: uuidv4(),
            title: this.generateTitle(content),
            summary: this.generateSummary(content),
            category,
            confidence,
            tags: this.extractTags(content),
            quotes: [{
              text: text.trim(),
              source_file: sourceFile,
              line_start: lineNumber,
              confidence,
              context: this.getContext(chunk, match.index, 100)
            }],
            created_date: new Date().toISOString()
          };
          
          insights.push(insight);
        }
      }
    });
    
    // Extract Claude Flow specific insights
    const claudeFlowInsights = this.extractClaudeFlowInsights(chunk, sourceFile, chunkIndex);
    insights.push(...claudeFlowInsights);
    
    return insights;
  }

  /**
   * Extract Claude Flow specific insights
   */
  extractClaudeFlowInsights(chunk, sourceFile, chunkIndex) {
    const insights = [];
    const claudeFlowKeywords = [
      'claude-flow', 'swarm', 'agent', 'neural', 'automation', 
      'workflow', 'orchestration', 'coordination', 'mcp', 'sparc'
    ];
    
    const sentences = chunk.match(/[^.!?]+[.!?]/g) || [];
    
    sentences.forEach((sentence, index) => {
      const lowerSentence = sentence.toLowerCase();
      
      // Check if sentence contains Claude Flow keywords
      const relevantKeywords = claudeFlowKeywords.filter(keyword => 
        lowerSentence.includes(keyword)
      );
      
      if (relevantKeywords.length >= 2 && sentence.length >= this.config.minInsightLength) {
        const insight = {
          insight_id: uuidv4(),
          title: this.generateTitle(sentence),
          summary: this.generateSummary(sentence),
          category: this.categorizeByKeywords(relevantKeywords),
          confidence: Math.min(0.9, 0.6 + (relevantKeywords.length * 0.1)),
          tags: [...relevantKeywords, 'claude-flow'],
          quotes: [{
            text: sentence.trim(),
            source_file: sourceFile,
            line_start: index + (chunkIndex * 50),
            confidence: 0.8,
            context: this.getContext(chunk, chunk.indexOf(sentence), 150)
          }],
          created_date: new Date().toISOString()
        };
        
        insights.push(insight);
      }
    });
    
    return insights;
  }

  /**
   * Post-process insights to remove duplicates and enhance quality
   */
  postProcessInsights(insights, sourceFile) {
    // Remove duplicates based on similarity
    const uniqueInsights = [];
    const seenTitles = new Set();
    
    insights.forEach(insight => {
      const normalizedTitle = insight.title.toLowerCase().replace(/[^a-z0-9]/g, '');
      
      if (!seenTitles.has(normalizedTitle)) {
        seenTitles.add(normalizedTitle);
        uniqueInsights.push(insight);
      } else {
        // Merge with existing insight if similar
        const existingInsight = uniqueInsights.find(ui => 
          ui.title.toLowerCase().replace(/[^a-z0-9]/g, '') === normalizedTitle
        );
        
        if (existingInsight && existingInsight.quotes) {
          existingInsight.quotes.push(...insight.quotes);
          existingInsight.confidence = Math.max(existingInsight.confidence, insight.confidence);
        }
      }
    });
    
    // Filter by confidence threshold
    return uniqueInsights.filter(insight => 
      insight.confidence >= this.config.confidenceThreshold
    );
  }

  /**
   * Generate title from content
   */
  generateTitle(content) {
    const cleanContent = content.replace(/[.!?]+$/, '').trim();
    
    // If content is short, use it as title
    if (cleanContent.length <= 60) {
      return this.capitalizeFirst(cleanContent);
    }
    
    // Extract first meaningful phrase
    const words = cleanContent.split(/\\s+/);
    let title = '';
    
    for (const word of words) {
      if (title.length + word.length > 60) break;
      title += (title ? ' ' : '') + word;
    }
    
    return this.capitalizeFirst(title) + (title !== cleanContent ? '...' : '');
  }

  /**
   * Generate summary from content
   */
  generateSummary(content) {
    const cleaned = content.replace(/[\\r\\n\\t]+/g, ' ').trim();
    
    if (cleaned.length <= 200) {
      return cleaned;
    }
    
    // Truncate at sentence boundary if possible
    const sentences = cleaned.match(/[^.!?]+[.!?]/g) || [];
    let summary = '';
    
    for (const sentence of sentences) {
      if (summary.length + sentence.length > 200) break;
      summary += sentence;
    }
    
    return summary || cleaned.substring(0, 200) + '...';
  }

  /**
   * Extract relevant tags from content
   */
  extractTags(content) {
    const tagPatterns = {
      'automation': /automat/gi,
      'configuration': /config/gi,
      'deployment': /deploy/gi,
      'optimization': /optim/gi,
      'troubleshooting': /trouble|debug|fix|error/gi,
      'tutorial': /tutorial|guide|learn/gi,
      'api': /\\bapi\\b/gi,
      'cli': /\\bcli\\b/gi,
      'workflow': /workflow|process/gi,
      'integration': /integrat/gi
    };
    
    const tags = [];
    
    Object.entries(tagPatterns).forEach(([tag, pattern]) => {
      if (pattern.test(content)) {
        tags.push(tag);
      }
    });
    
    return tags;
  }

  /**
   * Categorize content based on keywords
   */
  categorizeByKeywords(keywords) {
    const categoryKeywords = {
      'how-to': ['implement', 'setup', 'configure', 'deploy'],
      'concept': ['neural', 'swarm', 'agent', 'coordination'],
      'tip': ['optimization', 'performance', 'best'],
      'troubleshooting': ['error', 'debug', 'fix', 'problem']
    };
    
    let bestCategory = 'general';
    let maxScore = 0;
    
    Object.entries(categoryKeywords).forEach(([category, catKeywords]) => {
      const score = keywords.filter(kw => 
        catKeywords.some(ck => kw.includes(ck))
      ).length;
      
      if (score > maxScore) {
        maxScore = score;
        bestCategory = category;
      }
    });
    
    return bestCategory;
  }

  /**
   * Get context around a match
   */
  getContext(text, index, contextSize = 100) {
    const start = Math.max(0, index - contextSize);
    const end = Math.min(text.length, index + contextSize);
    
    let context = text.substring(start, end);
    
    // Try to break at word boundaries
    if (start > 0) {
      const firstSpace = context.indexOf(' ');
      if (firstSpace > 0) {
        context = '...' + context.substring(firstSpace);
      }
    }
    
    if (end < text.length) {
      const lastSpace = context.lastIndexOf(' ');
      if (lastSpace > 0) {
        context = context.substring(0, lastSpace) + '...';
      }
    }
    
    return context.trim();
  }

  /**
   * Extract source metadata
   */
  async extractSourceMetadata(filepath, filename) {
    const content = await fs.readFile(filepath, 'utf8');
    const stats = await fs.stat(filepath);
    
    // Extract date from filename if possible
    const dateMatch = filename.match(/-(\\d{8})(?:_|\\s)/);
    const date = dateMatch ? 
      `${dateMatch[1].substring(0,4)}-${dateMatch[1].substring(4,6)}-${dateMatch[1].substring(6,8)}` : 
      stats.mtime.toISOString().split('T')[0];
    
    // Estimate duration and speakers from content
    const lines = content.split('\\n').length;
    const estimatedDuration = Math.round(lines * 0.5); // rough estimate
    
    // Extract potential speaker names (capitalized words at line starts)
    const speakerMatches = content.match(/^[A-Z][a-z]+:/gm) || [];
    const uniqueSpeakers = [...new Set(speakerMatches.map(match => match.replace(':', '')))];
    
    return {
      filename,
      filepath,
      date,
      duration: `~${estimatedDuration} minutes`,
      speakers: uniqueSpeakers.length > 0 ? uniqueSpeakers : ['Unknown'],
      wordCount: content.split(/\\s+/).length,
      lineCount: lines,
      fileSize: stats.size,
      lastModified: stats.mtime.toISOString()
    };
  }

  /**
   * Capitalize first letter of string
   */
  capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}

module.exports = TranscriptProcessor;