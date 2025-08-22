#!/usr/bin/env node

/**
 * Pattern Extraction Engine - Advanced pattern matching for different content types
 * 
 * This module uses sophisticated pattern matching and context analysis to identify
 * and extract different types of content from transcripts with high accuracy.
 */

const fs = require('fs').promises;
const path = require('path');

class PatternExtractor {
    constructor() {
        this.contentPatterns = {
            tips: {
                triggers: [
                    /(?:tip|pro tip|life hack|trick|secret)/i,
                    /(?:recommend|suggest|should|better to|key is)/i,
                    /(?:best practice|good idea|smart to|wise to)/i,
                    /(?:make sure|remember|don't forget|important)/i,
                    /(?:always|never)(?:\s+\w+){1,5}(?:\s+(?:use|do|try|avoid))/i
                ],
                contexts: [
                    /(?:here's a|let me give you a|quick|useful)/i,
                    /(?:experience|learned|found out|discovered)/i
                ],
                negatives: [
                    /(?:don't|avoid|never|not recommended)/i
                ]
            },
            
            gotchas: {
                triggers: [
                    /(?:gotcha|catch|trap|pitfall|problem)/i,
                    /(?:watch out|be careful|warning|danger)/i,
                    /(?:mistake|error|fail|break|won't work)/i,
                    /(?:avoid|don't|never|not)/i,
                    /(?:issue|trouble|difficulty|challenge)/i
                ],
                contexts: [
                    /(?:common|typical|frequent|often)/i,
                    /(?:ran into|encountered|stumbled)/i,
                    /(?:surprised|unexpected|tricky)/i
                ],
                indicators: [
                    /(?:will|might|can|could)\s+(?:break|fail|cause)/i
                ]
            },
            
            howtos: {
                triggers: [
                    /(?:how to|step by step|walk through|guide)/i,
                    /(?:process|method|way to|approach)/i,
                    /(?:first|second|third|then|next|finally|last)/i,
                    /(?:start by|begin with|you need to)/i
                ],
                sequences: [
                    /(?:step \d+|phase \d+|\d+\.|first,|second,|then,)/i,
                    /(?:after that|once you|when you)/i
                ],
                actions: [
                    /(?:create|setup|configure|install|run|execute)/i,
                    /(?:open|click|type|enter|select)/i
                ]
            },
            
            mentalModels: {
                triggers: [
                    /(?:think of|like|similar to|analogy|metaphor)/i,
                    /(?:imagine|picture|visualize|concept)/i,
                    /(?:model|framework|paradigm|mindset)/i,
                    /(?:way to think|perspective|view|approach)/i
                ],
                comparisons: [
                    /(?:it's like|just like|think of it as)/i,
                    /(?:similar to|reminds me of|comparable to)/i
                ],
                abstractions: [
                    /(?:abstraction|layer|level|conceptual)/i,
                    /(?:philosophical|theoretical|principle)/i
                ]
            },
            
            questions: {
                triggers: [
                    /\?$/,
                    /(?:question|ask|wonder|curious|confused)/i,
                    /(?:what|how|why|when|where|which|who)(?:\s+\w+)*\?/i
                ],
                contexts: [
                    /(?:good question|great question|interesting)/i,
                    /(?:someone asked|people ask|often asked)/i
                ],
                answers: [
                    /(?:answer|response|reply|explanation)/i,
                    /(?:well,|so,|actually,|basically,)/i
                ]
            }
        };
        
        this.technicalTerms = [
            'claude', 'flow', 'swarm', 'agent', 'api', 'github', 'docker',
            'typescript', 'javascript', 'node', 'npm', 'cli', 'bash',
            'terminal', 'command', 'script', 'function', 'class', 'method'
        ];
    }

    /**
     * Extract patterns from parsed transcript data
     */
    async extractPatterns(parsedData) {
        const results = [];
        
        for (const transcript of parsedData) {
            const extracted = await this.extractFromTranscript(transcript);
            results.push(extracted);
        }
        
        return results;
    }

    /**
     * Extract patterns from a single transcript
     */
    async extractFromTranscript(transcript) {
        const extracted = {
            source: transcript.source,
            tips: [],
            gotchas: [],
            howtos: [],
            mentalModels: [],
            questions: []
        };

        // Process each content type
        for (const [type, items] of Object.entries(transcript)) {
            if (type === 'source') continue;
            
            for (const item of items) {
                const refined = await this.refineExtraction(type, item, transcript.source);
                if (refined && refined.quality > 0.5) {
                    extracted[type].push(refined);
                }
            }
        }

        return extracted;
    }

    /**
     * Refine and score individual extractions
     */
    async refineExtraction(type, item, source) {
        const patterns = this.contentPatterns[type];
        if (!patterns) return null;

        const text = item.content;
        const context = item.context ? item.context.join(' ') : text;
        
        // Calculate quality score
        let quality = item.confidence || 0;
        
        // Boost for technical content
        if (this.containsTechnicalTerms(text)) {
            quality += 0.2;
        }
        
        // Boost for specific pattern matches
        if (patterns.contexts && this.matchesAny(context, patterns.contexts)) {
            quality += 0.15;
        }
        
        if (patterns.sequences && this.matchesAny(text, patterns.sequences)) {
            quality += 0.15;
        }
        
        // Penalty for negative patterns
        if (patterns.negatives && this.matchesAny(text, patterns.negatives) && type === 'tips') {
            quality -= 0.3;
        }
        
        // Extract key information
        const keyInfo = this.extractKeyInformation(type, text, context);
        
        return {
            content: this.cleanContent(text),
            source: source,
            lineNumber: item.lineNumber,
            quality: Math.min(1.0, quality),
            keyInfo: keyInfo,
            context: item.context || [],
            type: type
        };
    }

    /**
     * Extract key information based on content type
     */
    extractKeyInformation(type, text, context) {
        const info = {};
        
        switch (type) {
            case 'tips':
                info.actionable = /(?:should|need to|make sure|remember)/i.test(text);
                info.tools = this.extractMentionedTools(text);
                break;
                
            case 'gotchas':
                info.severity = this.assessSeverity(text);
                info.affects = this.extractAffectedComponents(text);
                break;
                
            case 'howtos':
                info.steps = this.extractSteps(text);
                info.difficulty = this.assessDifficulty(text);
                break;
                
            case 'mentalModels':
                info.concept = this.extractConcept(text);
                info.domain = this.extractDomain(text);
                break;
                
            case 'questions':
                info.hasAnswer = this.detectAnswer(context);
                info.category = this.categorizeQuestion(text);
                break;
        }
        
        return info;
    }

    /**
     * Helper methods for pattern matching and analysis
     */
    matchesAny(text, patterns) {
        return patterns.some(pattern => pattern.test(text));
    }

    containsTechnicalTerms(text) {
        const lowerText = text.toLowerCase();
        return this.technicalTerms.some(term => lowerText.includes(term));
    }

    cleanContent(text) {
        return text
            .replace(/\s+/g, ' ')
            .replace(/[^\w\s.,!?()-]/g, '')
            .trim();
    }

    extractMentionedTools(text) {
        const tools = [];
        const toolPattern = /(?:claude|docker|github|npm|node|bash|terminal|vscode)/gi;
        const matches = text.match(toolPattern);
        return matches ? [...new Set(matches.map(m => m.toLowerCase()))] : [];
    }

    assessSeverity(text) {
        if (/(?:critical|dangerous|will break|brick|destroy)/i.test(text)) return 'high';
        if (/(?:important|careful|warning)/i.test(text)) return 'medium';
        return 'low';
    }

    extractAffectedComponents(text) {
        const components = [];
        const componentPattern = /(?:system|machine|credentials|drivers|files|database)/gi;
        const matches = text.match(componentPattern);
        return matches ? [...new Set(matches.map(m => m.toLowerCase()))] : [];
    }

    extractSteps(text) {
        const stepPattern = /(?:step \d+|first|second|third|then|next|finally)/gi;
        const matches = text.match(stepPattern);
        return matches ? matches.length : 1;
    }

    assessDifficulty(text) {
        if (/(?:simple|easy|quick|basic)/i.test(text)) return 'easy';
        if (/(?:complex|advanced|tricky|careful)/i.test(text)) return 'hard';
        return 'medium';
    }

    extractConcept(text) {
        const conceptPattern = /(?:like|similar to|think of it as)\s+([^.!?]+)/i;
        const match = text.match(conceptPattern);
        return match ? match[1].trim() : null;
    }

    extractDomain(text) {
        if (/(?:programming|coding|development)/i.test(text)) return 'development';
        if (/(?:devops|deployment|infrastructure)/i.test(text)) return 'devops';
        if (/(?:ai|machine learning|neural)/i.test(text)) return 'ai';
        return 'general';
    }

    detectAnswer(context) {
        return /(?:answer|response|well,|so,|actually)/i.test(context);
    }

    categorizeQuestion(text) {
        if (/^what/i.test(text)) return 'definition';
        if (/^how/i.test(text)) return 'process';
        if (/^why/i.test(text)) return 'reasoning';
        if (/^when/i.test(text)) return 'timing';
        return 'general';
    }

    /**
     * Get extraction statistics
     */
    getStatistics(extracted) {
        const stats = {
            totalFiles: extracted.length,
            totalExtractions: 0,
            averageQuality: 0,
            byType: {},
            qualityDistribution: { high: 0, medium: 0, low: 0 }
        };

        let qualitySum = 0;
        let qualityCount = 0;

        for (const result of extracted) {
            for (const [type, items] of Object.entries(result)) {
                if (type === 'source') continue;
                
                if (!stats.byType[type]) {
                    stats.byType[type] = { count: 0, avgQuality: 0 };
                }
                
                stats.byType[type].count += items.length;
                stats.totalExtractions += items.length;
                
                for (const item of items) {
                    qualitySum += item.quality;
                    qualityCount++;
                    
                    if (item.quality >= 0.8) stats.qualityDistribution.high++;
                    else if (item.quality >= 0.6) stats.qualityDistribution.medium++;
                    else stats.qualityDistribution.low++;
                }
                
                if (items.length > 0) {
                    stats.byType[type].avgQuality = items.reduce((sum, item) => sum + item.quality, 0) / items.length;
                }
            }
        }

        stats.averageQuality = qualityCount > 0 ? qualitySum / qualityCount : 0;

        return stats;
    }
}

// CLI interface
if (require.main === module) {
    const extractor = new PatternExtractor();
    
    (async () => {
        try {
            console.log('Loading parsed transcript data...');
            const parsedData = JSON.parse(await fs.readFile('./docs/poc/parsed_transcripts.json', 'utf-8'));
            
            console.log('Extracting refined patterns...');
            const extracted = await extractor.extractPatterns(parsedData);
            
            // Show statistics
            const stats = extractor.getStatistics(extracted);
            console.log('\nExtraction Statistics:');
            console.log(`Files processed: ${stats.totalFiles}`);
            console.log(`Total extractions: ${stats.totalExtractions}`);
            console.log(`Average quality: ${stats.averageQuality.toFixed(2)}`);
            console.log('Quality distribution:', stats.qualityDistribution);
            console.log('By type:', stats.byType);
            
            // Save results
            const outputPath = './docs/poc/extracted_patterns.json';
            await fs.writeFile(outputPath, JSON.stringify(extracted, null, 2));
            console.log(`\nRefined patterns saved to ${outputPath}`);
            
        } catch (error) {
            console.error('Error:', error);
            process.exit(1);
        }
    })();
}

module.exports = PatternExtractor;