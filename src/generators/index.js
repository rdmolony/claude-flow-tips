/**
 * Main entry point for the enhanced documentation generation system
 */

const EnhancedDocumentationGenerator = require('./enhanced-doc-generator');
const QualityEnhancedGenerator = require('./quality-enhanced-generator');
const TranscriptProcessor = require('./transcript-processor');
const path = require('path');

/**
 * Generate documentation from transcript directory
 */
async function generateDocumentationFromTranscripts(transcriptDir, outputDir, config = {}) {
  console.log('🚀 Starting Enhanced Documentation Generation');
  console.log(`📂 Input: ${transcriptDir}`);
  console.log(`📁 Output: ${outputDir}`);
  
  try {
    // Initialize processors
    const transcriptProcessor = new TranscriptProcessor(config.processor);
    // Use quality-enhanced generator for better readability
    const docGenerator = new QualityEnhancedGenerator({
      outputDir,
      ...config.generator
    });
    
    // Process transcripts
    console.log('\\n📄 Processing transcripts...');
    const { insights, sources } = await transcriptProcessor.processTranscriptFiles(transcriptDir);
    
    if (insights.length === 0) {
      console.log('⚠️  No insights extracted from transcripts');
      return { success: false, message: 'No insights found' };
    }
    
    // Generate documentation
    console.log(`\\n📝 Generating documentation for ${insights.length} insights...`);
    const result = await docGenerator.generateDocumentation(insights, sources);
    
    if (result.success) {
      console.log('\\n✅ Documentation generation completed successfully!');
      console.log(`📊 Generated ${result.filesGenerated.length} files`);
      console.log(`⏱️  Total time: ${result.stats.endTime - result.stats.startTime}ms`);
      console.log(`📂 Output directory: ${outputDir}`);
      
      // Log key files
      console.log('\\n📋 Key files created:');
      console.log(`   📖 Main Index: ${path.join(outputDir, 'index.md')}`);
      console.log(`   🔍 Search: ${path.join(outputDir, '_search', 'index.md')}`);
      console.log(`   📚 Sources: ${path.join(outputDir, 'sources', 'index.md')}`);
      console.log(`   📊 Analytics: ${path.join(outputDir, '_assets', 'analytics.md')}`);
    }
    
    return result;
    
  } catch (error) {
    console.error('❌ Documentation generation failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Generate sample documentation with default settings
 */
async function generateSampleDocumentation() {
  const transcriptDir = path.resolve(__dirname, '../../transcripts');
  const outputDir = path.resolve(__dirname, '../../docs/claude-flow-knowledge');
  
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
  
  return await generateDocumentationFromTranscripts(transcriptDir, outputDir, config);
}

/**
 * Export main functions
 */
module.exports = {
  generateDocumentationFromTranscripts,
  generateSampleDocumentation,
  EnhancedDocumentationGenerator,
  QualityEnhancedGenerator,
  TranscriptProcessor
};