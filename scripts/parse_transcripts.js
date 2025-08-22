#!/usr/bin/env node

/**
 * Transcript Parser - Extracts structured content from transcript files
 * 
 * This module parses transcript files and identifies different types of content
 * including tips, gotchas, how-tos, mental models, and questions/answers.
 */

const fs = require('fs').promises;
const path = require('path');

class TranscriptParser {
    constructor(transcriptDir = './transcripts') {
        this.transcriptDir = transcriptDir;
        this.patterns = {
            // Pattern definitions for different content types
            tips: [
                /(?:tip|suggestion|recommend|should|better to|key is|secret is)/i,
                /(?:pro tip|best practice|advice|guidance)/i,
                /(?:make sure|remember|don't forget)/i
            ],
            gotchas: [
                /(?:gotcha|watch out|be careful|warning|danger|avoid|don't|never)/i,
                /(?:problem|issue|trouble|error|mistake|fail)/i,
                /(?:won't work|doesn't work|will break|careful with)/i
            ],
            howtos: [
                /(?:how to|step by step|first|second|third|then|next|finally)/i,
                /(?:here's how|way to|process|method|approach)/i,
                /(?:you need to|start by|begin with)/i
            ],
            mentalModels: [
                /(?:think of|like|similar to|analogy|metaphor|imagine)/i,
                /(?:concept|model|framework|paradigm|mindset)/i,
                /(?:way to think|perspective|view)/i
            ],
            questions: [
                /\?/,
                /(?:question|ask|wonder|curious)/i,
                /(?:what|how|why|when|where|which)/i
            ]
        };
    }

    /**
     * Parse all transcript files in the directory
     */
    async parseAllTranscripts() {
        try {
            const files = await fs.readdir(this.transcriptDir);
            const transcriptFiles = files.filter(file => file.endsWith('.txt'));
            
            const results = [];
            for (const file of transcriptFiles) {
                const result = await this.parseTranscript(path.join(this.transcriptDir, file));
                results.push(result);
            }
            
            return results;
        } catch (error) {
            console.error('Error parsing transcripts:', error);
            throw error;
        }
    }

    /**
     * Parse a single transcript file
     */
    async parseTranscript(filePath) {
        try {
            const content = await fs.readFile(filePath, 'utf-8');
            const lines = content.split('\n').map(line => line.trim()).filter(line => line);
            
            const fileName = path.basename(filePath);
            const extractedContent = {
                source: fileName,
                tips: [],
                gotchas: [],
                howtos: [],
                mentalModels: [],
                questions: []
            };

            // Process lines in context windows for better extraction
            for (let i = 0; i < lines.length; i++) {
                const currentLine = lines[i];
                const context = this.getContextWindow(lines, i, 2); // 2 lines before/after
                
                // Check each pattern type
                for (const [type, patterns] of Object.entries(this.patterns)) {
                    if (this.matchesPatterns(context.text, patterns)) {
                        const extraction = {
                            content: context.text,
                            lineNumber: i + 1,
                            confidence: this.calculateConfidence(context.text, patterns),
                            context: context.lines
                        };
                        
                        extractedContent[type].push(extraction);
                    }
                }
            }

            return extractedContent;
        } catch (error) {
            console.error(`Error parsing transcript ${filePath}:`, error);
            throw error;
        }
    }

    /**
     * Get context window around a specific line
     */
    getContextWindow(lines, centerIndex, windowSize) {
        const start = Math.max(0, centerIndex - windowSize);
        const end = Math.min(lines.length, centerIndex + windowSize + 1);
        
        const contextLines = lines.slice(start, end);
        const text = contextLines.join(' ');
        
        return {
            text,
            lines: contextLines,
            start: start + 1,
            end: end
        };
    }

    /**
     * Check if text matches any of the given patterns
     */
    matchesPatterns(text, patterns) {
        return patterns.some(pattern => pattern.test(text));
    }

    /**
     * Calculate confidence score for pattern match
     */
    calculateConfidence(text, patterns) {
        let matchCount = 0;
        for (const pattern of patterns) {
            if (pattern.test(text)) matchCount++;
        }
        return matchCount / patterns.length;
    }

    /**
     * Filter extractions by confidence threshold
     */
    filterByConfidence(extractions, threshold = 0.3) {
        const filtered = {};
        for (const [type, items] of Object.entries(extractions)) {
            if (Array.isArray(items)) {
                filtered[type] = items.filter(item => item.confidence >= threshold);
            } else {
                filtered[type] = items;
            }
        }
        return filtered;
    }

    /**
     * Get statistics about parsed content
     */
    getStatistics(results) {
        const stats = {
            totalFiles: results.length,
            totalExtractions: 0,
            byType: {}
        };

        for (const result of results) {
            for (const [type, extractions] of Object.entries(result)) {
                if (type === 'source') continue;
                if (!stats.byType[type]) stats.byType[type] = 0;
                stats.byType[type] += extractions.length;
                stats.totalExtractions += extractions.length;
            }
        }

        return stats;
    }
}

// CLI interface
if (require.main === module) {
    const parser = new TranscriptParser('./transcripts');
    
    (async () => {
        try {
            console.log('Parsing transcripts...');
            const results = await parser.parseAllTranscripts();
            
            // Filter low-confidence matches
            const filtered = results.map(result => parser.filterByConfidence(result));
            
            // Show statistics
            const stats = parser.getStatistics(filtered);
            console.log('\nParsing Statistics:');
            console.log(`Files processed: ${stats.totalFiles}`);
            console.log(`Total extractions: ${stats.totalExtractions}`);
            console.log('By type:', stats.byType);
            
            // Save results
            const outputPath = './docs/poc/parsed_transcripts.json';
            await fs.writeFile(outputPath, JSON.stringify(filtered, null, 2));
            console.log(`\nResults saved to ${outputPath}`);
            
        } catch (error) {
            console.error('Error:', error);
            process.exit(1);
        }
    })();
}

module.exports = TranscriptParser;