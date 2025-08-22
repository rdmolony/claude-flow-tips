/**
 * Usage examples for the Text Quality Improvement System
 */

import { QualitySystem, TextNormalizer, ReadabilityScorer, TextImprover, QualityValidator } from '../index';
import type { ImprovementConfig, ReadabilityConfig } from '../types';

/**
 * Example 1: Basic usage - improve a single text
 */
export async function basicUsageExample() {
  console.log('=== Basic Usage Example ===');
  
  const qualitySystem = new QualitySystem();
  const poorText = 'hello    world  ,  some  thing  is  very   wrong  here  .';
  
  console.log('Original text:', poorText);
  
  const result = await qualitySystem.processText(poorText);
  
  console.log('Improved text:', result.report.improvedText);
  console.log('Improvements made:', result.report.improvements.length);
  console.log('Processing time:', result.report.processingTime, 'ms');
  console.log('Final quality score:', result.summary.finalScore);
  console.log('\nSummary:');
  console.log(result.summary.improvement);
}

/**
 * Example 2: Using individual components
 */
export async function componentUsageExample() {
  console.log('\n=== Component Usage Example ===');
  
  const text = 'This  text  has  spacing   issues  and  some  thing  wrong  .';
  console.log('Original text:', text);
  
  // Step 1: Normalize text
  const normalizer = new TextNormalizer();
  const normalized = normalizer.normalize(text);
  console.log('Normalized:', normalized.text);
  console.log('Changes made:', normalized.changes.length);
  
  // Step 2: Score readability
  const scorer = new ReadabilityScorer();
  const beforeMetrics = scorer.calculateMetrics(text);
  const afterMetrics = scorer.calculateMetrics(normalized.text);
  
  console.log('Readability before:', beforeMetrics.readabilityScore);
  console.log('Readability after:', afterMetrics.readabilityScore);
  console.log('Complexity:', afterMetrics.complexity);
  
  // Step 3: Further improvement
  const improver = new TextImprover();
  const report = await improver.improveText(normalized.text);
  console.log('Final text:', report.improvedText);
  
  // Step 4: Validate results
  const validator = new QualityValidator();
  const validation = validator.validateQuality(report.improvedText);
  console.log('Validation passed:', validation.passed);
  console.log('Quality score:', validation.score);
}

/**
 * Example 3: Custom configuration
 */
export async function customConfigExample() {
  console.log('\n=== Custom Configuration Example ===');
  
  const qualitySystem = new QualitySystem();
  const academicText = 'The utilization of sophisticated methodologies necessitates comprehensive understanding of complex paradigms.';
  
  console.log('Original academic text:', academicText);
  
  const improvementConfig: ImprovementConfig = {
    maxIterations: 3,
    targetReadabilityScore: 70,
    enableAggressiveNormalization: false,
    preserveOriginalMeaning: true
  };
  
  const validationConfig: ReadabilityConfig = {
    targetLevel: 10,
    maxSentenceLength: 20,
    allowedComplexity: 'moderate',
    preferSimpleWords: true
  };
  
  const result = await qualitySystem.processText(
    academicText,
    improvementConfig,
    validationConfig
  );
  
  console.log('Improved text:', result.report.improvedText);
  console.log('Vocabulary changes:', result.report.improvements.filter(imp => imp.type === 'vocabulary'));
  console.log('Met target readability:', result.report.metrics.after.readabilityScore >= 70);
  console.log('Validation result:', result.finalQuality.passed ? 'PASSED' : 'NEEDS WORK');
}

/**
 * Example 4: Batch processing multiple texts
 */
export async function batchProcessingExample() {
  console.log('\n=== Batch Processing Example ===');
  
  const texts = [
    'First  text  with  spacing   issues  .',
    'Second  text  that  has  some  thing  wrong  .',
    'Third text with normal quality and structure.',
    'Fourth   text   needs   comprehensive   improvement   for   better   readability   .'
  ];
  
  console.log('Processing', texts.length, 'texts...');
  
  const qualitySystem = new QualitySystem();
  
  // Process all texts concurrently
  const startTime = performance.now();
  const results = await Promise.all(
    texts.map((text, index) => 
      qualitySystem.processText(text).then(result => ({ index, text, result }))
    )
  );
  const totalTime = performance.now() - startTime;
  
  console.log('Batch processing completed in', totalTime.toFixed(2), 'ms');
  console.log('Average per text:', (totalTime / texts.length).toFixed(2), 'ms');
  
  results.forEach(({ index, text, result }) => {
    console.log(`\nText ${index + 1}:`);
    console.log('  Original:', text);
    console.log('  Improved:', result.report.improvedText);
    console.log('  Score improvement:', 
      (result.report.metrics.after.readabilityScore - result.report.metrics.before.readabilityScore).toFixed(1)
    );
  });
}

/**
 * Example 5: Real-world transcript processing
 */
export async function transcriptProcessingExample() {
  console.log('\n=== Transcript Processing Example ===');
  
  // Simulated transcript with common issues
  const transcript = `um  hello  everyone  uh  welcome  to  this  uh  presentation  about  some  thing  really  important  .  so  uh  lets  start  with  uh  the  basics  and  then  we  can  uh  move  on  to  more  advanced  topics  .  the  first  topic  we  will  cover  is  uh  how  to  effectively  communicate  your  ideas  and  uh  make  sure  every  one  understands  what  you  are  trying  to  say  .`;
  
  console.log('Raw transcript:');
  console.log(transcript);
  
  const qualitySystem = new QualitySystem();
  
  const config: ImprovementConfig = {
    enableAggressiveNormalization: true, // Clean up messy transcript
    maxIterations: 4,
    targetReadabilityScore: 75
  };
  
  const result = await qualitySystem.processText(transcript, config);
  
  console.log('\nCleaned transcript:');
  console.log(result.report.improvedText);
  
  console.log('\nImprovements made:');
  const improvementsByType = result.report.improvements.reduce((acc, imp) => {
    acc[imp.type] = (acc[imp.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  Object.entries(improvementsByType).forEach(([type, count]) => {
    console.log(`  ${type}: ${count} fixes`);
  });
  
  console.log('\nQuality metrics:');
  console.log(`  Readability: ${result.report.metrics.before.readabilityScore} → ${result.report.metrics.after.readabilityScore}`);
  console.log(`  Spacing issues: ${result.report.metrics.before.spacingIssues} → ${result.report.metrics.after.spacingIssues}`);
  console.log(`  Broken words: ${result.report.metrics.before.brokenWords} → ${result.report.metrics.after.brokenWords}`);
}

/**
 * Example 6: OCR text cleanup
 */
export async function ocrCleanupExample() {
  console.log('\n=== OCR Cleanup Example ===');
  
  // Simulated OCR output with typical errors
  const ocrText = `Th-
is  is  corrupted  O C R  text  with  l  i  k  e  weird  spacing  and  brok-
en  words  every  where  .  It  needs  comprehensive  cleaning  to  be-
come  readable  again  .  Some  letters  are  s p a c e d  out  and  there
are  line  breaks  in  the  mid-
dle  of  words  .`;
  
  console.log('OCR output:');
  console.log(ocrText);
  
  const qualitySystem = new QualitySystem();
  
  const config: ImprovementConfig = {
    enableAggressiveNormalization: true, // Essential for OCR cleanup
    maxIterations: 5,
    targetReadabilityScore: 80
  };
  
  const result = await qualitySystem.processText(ocrText, config);
  
  console.log('\nCleaned text:');
  console.log(result.report.improvedText);
  
  console.log('\nCleanup summary:');
  console.log('  Processing time:', result.report.processingTime, 'ms');
  console.log('  Iterations needed:', result.report.iterations);
  console.log('  Changes made:', result.report.improvements.length);
  console.log('  Final quality score:', result.summary.finalScore);
}

/**
 * Example 7: Custom validation criteria
 */
export async function customValidationExample() {
  console.log('\n=== Custom Validation Example ===');
  
  const texts = [
    'Simple text that anyone can read easily.',
    'This sentence contains more sophisticated vocabulary and complex sentence structures.',
    'The implementation of advanced methodologies necessitates comprehensive understanding.'
  ];
  
  const validator = new QualityValidator();
  
  // Different validation criteria for different use cases
  const criteria = [
    { name: 'Elementary', config: { targetLevel: 5, maxSentenceLength: 12, allowedComplexity: 'simple' as const } },
    { name: 'General Public', config: { targetLevel: 8, maxSentenceLength: 18, allowedComplexity: 'moderate' as const } },
    { name: 'Academic', config: { targetLevel: 12, maxSentenceLength: 25, allowedComplexity: 'complex' as const } }
  ];
  
  texts.forEach((text, textIndex) => {
    console.log(`\nText ${textIndex + 1}: "${text}"`);
    
    criteria.forEach(({ name, config }) => {
      const result = validator.validateQuality(text, config);
      console.log(`  ${name} level: ${result.passed ? 'PASS' : 'FAIL'} (score: ${result.score})`);
      
      if (result.issues.length > 0) {
        console.log(`    Issues: ${result.issues.join(', ')}`);
      }
    });
  });
}

/**
 * Run all examples
 */
export async function runAllExamples() {
  console.log('Text Quality Improvement System - Usage Examples\n');
  
  await basicUsageExample();
  await componentUsageExample();
  await customConfigExample();
  await batchProcessingExample();
  await transcriptProcessingExample();
  await ocrCleanupExample();
  await customValidationExample();
  
  console.log('\n=== All Examples Completed ===');
}

// Export individual example functions for selective execution
export {
  basicUsageExample,
  componentUsageExample,
  customConfigExample,
  batchProcessingExample,
  transcriptProcessingExample,
  ocrCleanupExample,
  customValidationExample
};