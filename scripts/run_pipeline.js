#!/usr/bin/env node

/**
 * Complete Pipeline Runner - Executes the full documentation extraction pipeline
 * 
 * This script runs all three stages of the documentation extraction process:
 * 1. Parse transcripts (basic pattern extraction)
 * 2. Extract refined patterns (quality scoring and analysis)  
 * 3. Generate documentation site (structured markdown output)
 */

const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

class PipelineRunner {
    constructor() {
        this.scriptsDir = __dirname;
        this.outputDir = path.join(__dirname, '..', 'docs', 'poc');
        this.startTime = Date.now();
    }

    /**
     * Run the complete pipeline
     */
    async run() {
        try {
            console.log('🚀 Starting Claude Flow Documentation Extraction Pipeline');
            console.log('=' .repeat(60));
            
            // Step 1: Parse transcripts
            console.log('\n📄 Step 1: Parsing transcripts...');
            await this.runScript('parse_transcripts.js');
            
            // Step 2: Extract patterns
            console.log('\n🔍 Step 2: Extracting refined patterns...');
            await this.runScript('extract_patterns.js');
            
            // Step 3: Generate documentation
            console.log('\n📚 Step 3: Generating documentation...');
            await this.runScript('generate_docs.js');
            
            // Show results
            await this.showResults();
            
            const duration = ((Date.now() - this.startTime) / 1000).toFixed(1);
            console.log(`\n✅ Pipeline completed successfully in ${duration}s`);
            console.log(`📁 Documentation generated in: ${this.outputDir}`);
            console.log(`🌐 Start browsing: ${path.join(this.outputDir, 'index.md')}`);
            
        } catch (error) {
            console.error('\n❌ Pipeline failed:', error.message);
            process.exit(1);
        }
    }

    /**
     * Run a single script and wait for completion
     */
    async runScript(scriptName) {
        return new Promise((resolve, reject) => {
            const scriptPath = path.join(this.scriptsDir, scriptName);
            const child = spawn('node', [scriptPath], { 
                stdio: 'inherit',
                cwd: path.join(this.scriptsDir, '..')
            });

            child.on('close', (code) => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`Script ${scriptName} failed with exit code ${code}`));
                }
            });

            child.on('error', (error) => {
                reject(error);
            });
        });
    }

    /**
     * Show pipeline results and statistics
     */
    async showResults() {
        try {
            // Load extraction statistics
            const extractedDataPath = path.join(this.outputDir, 'extracted_patterns.json');
            const extractedData = JSON.parse(await fs.readFile(extractedDataPath, 'utf-8'));
            
            // Calculate statistics
            const stats = this.calculateStats(extractedData);
            
            console.log('\n📊 Pipeline Results:');
            console.log('-'.repeat(40));
            console.log(`📁 Source files processed: ${stats.sources}`);
            console.log(`📄 Total extractions: ${stats.totalExtractions}`);
            console.log(`⭐ Average quality: ${(stats.averageQuality * 100).toFixed(1)}%`);
            console.log('\n📋 Content by category:');
            console.log(`   💡 Tips: ${stats.byType.tips || 0}`);
            console.log(`   ⚠️  Gotchas: ${stats.byType.gotchas || 0}`);
            console.log(`   📋 How-tos: ${stats.byType.howtos || 0}`);
            console.log(`   🧠 Mental Models: ${stats.byType.mentalModels || 0}`);
            console.log(`   ❓ Questions: ${stats.byType.questions || 0}`);
            
            console.log('\n🎯 Quality distribution:');
            console.log(`   🟢 High (80%+): ${stats.qualityDistribution.high}`);
            console.log(`   🟡 Medium (60-80%): ${stats.qualityDistribution.medium}`);
            console.log(`   🔴 Low (<60%): ${stats.qualityDistribution.low}`);
            
            // List generated files
            console.log('\n📄 Generated files:');
            const files = await fs.readdir(this.outputDir);
            const mdFiles = files.filter(file => file.endsWith('.md')).sort();
            for (const file of mdFiles) {
                console.log(`   📝 ${file}`);
            }
            
        } catch (error) {
            console.warn('Could not load results statistics:', error.message);
        }
    }

    /**
     * Calculate extraction statistics
     */
    calculateStats(extractedData) {
        const stats = {
            sources: extractedData.length,
            totalExtractions: 0,
            averageQuality: 0,
            byType: {},
            qualityDistribution: { high: 0, medium: 0, low: 0 }
        };

        let qualitySum = 0;
        let qualityCount = 0;

        for (const result of extractedData) {
            for (const [type, items] of Object.entries(result)) {
                if (type === 'source') continue;
                
                if (!stats.byType[type]) stats.byType[type] = 0;
                stats.byType[type] += items.length;
                stats.totalExtractions += items.length;
                
                for (const item of items) {
                    qualitySum += item.quality;
                    qualityCount++;
                    
                    if (item.quality >= 0.8) stats.qualityDistribution.high++;
                    else if (item.quality >= 0.6) stats.qualityDistribution.medium++;
                    else stats.qualityDistribution.low++;
                }
            }
        }

        stats.averageQuality = qualityCount > 0 ? qualitySum / qualityCount : 0;

        return stats;
    }
}

// CLI interface
if (require.main === module) {
    const runner = new PipelineRunner();
    
    (async () => {
        await runner.run();
    })();
}

module.exports = PipelineRunner;