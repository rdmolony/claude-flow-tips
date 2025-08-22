#!/usr/bin/env node

/**
 * CLI tool for generating documentation from transcripts
 */

const { generateDocumentationFromTranscripts, generateSampleDocumentation } = require('./generators');
const path = require('path');

function printUsage() {
  console.log(`
🌟 Claude Flow Documentation Generator

Usage:
  node src/cli.js [command] [options]

Commands:
  generate <input-dir> [output-dir]    Generate docs from transcript directory
  sample                               Generate sample docs from /transcripts
  help                                 Show this help message

Options:
  --confidence <threshold>             Confidence threshold (0.0-1.0, default: 0.6)
  --max-insights <number>              Max insights per file (default: 25)
  --no-diagrams                        Disable Mermaid diagrams
  --no-search                          Disable search index generation
  --no-analytics                       Disable analytics dashboard

Examples:
  node src/cli.js sample
  node src/cli.js generate ./transcripts ./docs/knowledge-base
  node src/cli.js generate ./data --confidence 0.8 --max-insights 30
`);
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === 'help') {
    printUsage();
    return;
  }
  
  const command = args[0];
  
  try {
    if (command === 'sample') {
      console.log('🎯 Generating sample documentation...');
      const result = await generateSampleDocumentation();
      
      if (result.success) {
        console.log('\\n🎉 Sample documentation generated successfully!');
        process.exit(0);
      } else {
        console.error('\\n❌ Failed to generate sample documentation:', result.error || result.message);
        process.exit(1);
      }
      
    } else if (command === 'generate') {
      const inputDir = args[1];
      const outputDir = args[2] || './docs/claude-flow-knowledge';
      
      if (!inputDir) {
        console.error('❌ Input directory is required for generate command');
        printUsage();
        process.exit(1);
      }
      
      // Parse options
      const config = {
        processor: {
          confidenceThreshold: 0.6,
          minInsightLength: 50,
          maxInsightLength: 3000
        },
        generator: {
          includeSourceLinks: true,
          generateIndex: true,
          categoryDirectories: true,
          maxInsightsPerFile: 25,
          generateAnalytics: true,
          createSearchIndex: true,
          includeDiagrams: true
        }
      };
      
      for (let i = 3; i < args.length; i++) {
        const arg = args[i];
        
        if (arg === '--confidence' && i + 1 < args.length) {
          config.processor.confidenceThreshold = parseFloat(args[i + 1]);
          i++;
        } else if (arg === '--max-insights' && i + 1 < args.length) {
          config.generator.maxInsightsPerFile = parseInt(args[i + 1]);
          i++;
        } else if (arg === '--no-diagrams') {
          config.generator.includeDiagrams = false;
        } else if (arg === '--no-search') {
          config.generator.createSearchIndex = false;
        } else if (arg === '--no-analytics') {
          config.generator.generateAnalytics = false;
        }
      }
      
      console.log(`🎯 Generating documentation...`);
      console.log(`   Input: ${path.resolve(inputDir)}`);
      console.log(`   Output: ${path.resolve(outputDir)}`);
      console.log(`   Confidence threshold: ${config.processor.confidenceThreshold}`);
      console.log(`   Max insights per file: ${config.generator.maxInsightsPerFile}`);
      
      const result = await generateDocumentationFromTranscripts(inputDir, outputDir, config);
      
      if (result.success) {
        console.log('\\n🎉 Documentation generated successfully!');
        process.exit(0);
      } else {
        console.error('\\n❌ Failed to generate documentation:', result.error || result.message);
        process.exit(1);
      }
      
    } else {
      console.error(`❌ Unknown command: ${command}`);
      printUsage();
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

if (require.main === module) {
  main().catch(console.error);
}