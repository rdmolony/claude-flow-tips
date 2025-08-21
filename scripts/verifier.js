#!/usr/bin/env node

/**
 * Verification Engine for Claude Flow Tips
 * Validates quotes, references, and content quality
 */

const fs = require('fs');
const path = require('path');

class Verifier {
  constructor(options = {}) {
    this.transcriptDir = options.transcriptDir || path.join(__dirname, '../transcripts');
    this.strictMode = options.strictMode !== false;
    this.minQuoteLength = options.minQuoteLength || 10;
    this.maxQuoteLength = options.maxQuoteLength || 500;
    this.debug = options.debug || false;
    this.verificationLog = [];
  }

  /**
   * Verify a single entry
   */
  verifyEntry(entry) {
    const results = {
      entryId: entry.id,
      valid: true,
      errors: [],
      warnings: [],
      checks: {}
    };

    // Run all verification checks
    results.checks.quote = this.verifyQuote(entry);
    results.checks.source = this.verifySource(entry);
    results.checks.content = this.verifyContent(entry);
    results.checks.metadata = this.verifyMetadata(entry);
    results.checks.links = this.verifyLinks(entry);
    results.checks.format = this.verifyFormat(entry);

    // Aggregate results
    Object.values(results.checks).forEach(check => {
      if (check.errors.length > 0) {
        results.valid = false;
        results.errors.push(...check.errors);
      }
      if (check.warnings.length > 0) {
        results.warnings.push(...check.warnings);
      }
    });

    // Log verification
    this.verificationLog.push({
      timestamp: new Date().toISOString(),
      entryId: entry.id,
      valid: results.valid,
      errorCount: results.errors.length,
      warningCount: results.warnings.length
    });

    return results;
  }

  /**
   * Verify quote accuracy
   */
  verifyQuote(entry) {
    const result = {
      valid: true,
      errors: [],
      warnings: []
    };

    if (!entry.exactQuote) {
      result.errors.push('Missing exact quote');
      result.valid = false;
      return result;
    }

    // Check quote length
    const quoteLength = entry.exactQuote.length;
    if (quoteLength < this.minQuoteLength) {
      result.warnings.push(`Quote too short (${quoteLength} chars)`);
    }
    if (quoteLength > this.maxQuoteLength) {
      result.warnings.push(`Quote too long (${quoteLength} chars)`);
    }

    // Verify quote exists in source file
    try {
      const filePath = path.join(this.transcriptDir, entry.sourceFile);
      if (!fs.existsSync(filePath)) {
        result.errors.push(`Source file not found: ${entry.sourceFile}`);
        result.valid = false;
        return result;
      }

      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');

      // Check if quote exists at specified line
      const quoteLine = entry.centerLine || entry.lineStart;
      if (quoteLine > 0 && quoteLine <= lines.length) {
        const lineContent = lines[quoteLine - 1];
        
        // Allow partial matches for long quotes
        const quoteFragment = entry.exactQuote.substring(0, 50).toLowerCase();
        if (!lineContent.toLowerCase().includes(quoteFragment)) {
          // Try to find quote anywhere in the file
          const foundAnywhere = content.toLowerCase().includes(quoteFragment);
          
          if (foundAnywhere) {
            result.warnings.push('Quote found but not at specified line');
          } else {
            result.errors.push('Quote not found in source file');
            result.valid = false;
          }
        }
      } else {
        result.errors.push(`Invalid line number: ${quoteLine}`);
        result.valid = false;
      }

      // Check for quote truncation indicators
      if (entry.exactQuote.includes('[...]')) {
        result.warnings.push('Quote contains truncation markers');
      }

    } catch (error) {
      result.errors.push(`Error verifying quote: ${error.message}`);
      result.valid = false;
    }

    return result;
  }

  /**
   * Verify source references
   */
  verifySource(entry) {
    const result = {
      valid: true,
      errors: [],
      warnings: []
    };

    // Check source file
    if (!entry.sourceFile) {
      result.errors.push('Missing source file');
      result.valid = false;
      return result;
    }

    // Check line numbers
    if (!entry.lineStart || !entry.lineEnd) {
      result.errors.push('Missing line numbers');
      result.valid = false;
    }

    if (entry.lineStart > entry.lineEnd) {
      result.errors.push('Invalid line range (start > end)');
      result.valid = false;
    }

    // Check file exists
    const filePath = path.join(this.transcriptDir, entry.sourceFile);
    if (!fs.existsSync(filePath)) {
      result.errors.push(`Source file not found: ${entry.sourceFile}`);
      result.valid = false;
    } else {
      // Verify line numbers are within file bounds
      const content = fs.readFileSync(filePath, 'utf-8');
      const lineCount = content.split('\n').length;
      
      if (entry.lineEnd > lineCount) {
        result.errors.push(`Line numbers exceed file length (${lineCount} lines)`);
        result.valid = false;
      }
    }

    // Check for timestamp if expected
    if (entry.sourceFile.includes('video') && !entry.timestamp) {
      result.warnings.push('Video transcript missing timestamp');
    }

    return result;
  }

  /**
   * Verify content quality
   */
  verifyContent(entry) {
    const result = {
      valid: true,
      errors: [],
      warnings: []
    };

    // Check content exists and has minimum length
    if (!entry.content) {
      result.errors.push('Missing content');
      result.valid = false;
      return result;
    }

    const contentLength = entry.content.length;
    if (contentLength < 50) {
      result.errors.push('Content too short (< 50 chars)');
      result.valid = false;
    } else if (contentLength < 100) {
      result.warnings.push('Content may be too brief');
    }

    // Check for placeholder text
    const placeholders = ['TODO', 'FIXME', 'XXX', '[placeholder]', '...'];
    placeholders.forEach(placeholder => {
      if (entry.content.includes(placeholder)) {
        result.warnings.push(`Contains placeholder text: ${placeholder}`);
      }
    });

    // Check for broken markdown
    const markdownIssues = this.checkMarkdown(entry.content);
    if (markdownIssues.length > 0) {
      result.warnings.push(...markdownIssues);
    }

    // Check category alignment
    if (entry.category) {
      const categoryCheck = this.checkCategoryAlignment(entry);
      if (!categoryCheck.aligned) {
        result.warnings.push(`Content may not match category '${entry.category}': ${categoryCheck.reason}`);
      }
    }

    // Check for sensitive information
    const sensitivePatterns = [
      /\b[A-Z0-9]{20,}\b/g,  // API keys
      /\bpassword\s*[:=]\s*["'][^"']+["']/gi,  // Passwords
      /\b[a-z0-9]{8}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{12}\b/gi,  // UUIDs that might be sensitive
      /\b\d{3}-\d{2}-\d{4}\b/g,  // SSN pattern
    ];

    sensitivePatterns.forEach(pattern => {
      if (pattern.test(entry.content)) {
        result.errors.push('Content may contain sensitive information');
        result.valid = false;
      }
    });

    return result;
  }

  /**
   * Check markdown formatting
   */
  checkMarkdown(content) {
    const issues = [];

    // Check for unclosed code blocks
    const codeBlockCount = (content.match(/```/g) || []).length;
    if (codeBlockCount % 2 !== 0) {
      issues.push('Unclosed code block detected');
    }

    // Check for broken links
    const linkPattern = /\[([^\]]*)\]\(([^)]*)\)/g;
    let match;
    while ((match = linkPattern.exec(content)) !== null) {
      if (!match[2] || match[2].trim() === '') {
        issues.push(`Empty link URL: [${match[1]}]()`);
      }
    }

    // Check for unmatched brackets
    const openBrackets = (content.match(/\[/g) || []).length;
    const closeBrackets = (content.match(/\]/g) || []).length;
    if (openBrackets !== closeBrackets) {
      issues.push('Unmatched brackets detected');
    }

    return issues;
  }

  /**
   * Check if content aligns with category
   */
  checkCategoryAlignment(entry) {
    const { category, content } = entry;
    const lowerContent = content.toLowerCase();

    const categoryIndicators = {
      gotcha: ['warning', 'careful', 'don\'t', 'avoid', 'dangerous'],
      tip: ['recommend', 'suggest', 'better', 'should', 'tip'],
      howTo: ['step', 'first', 'then', 'setup', 'install'],
      qa: ['?', 'answer', 'question', 'asked'],
      mentalModel: ['think', 'understand', 'concept', 'model'],
      internals: ['works', 'under', 'hood', 'internally', 'mechanism']
    };

    const indicators = categoryIndicators[category] || [];
    const matchCount = indicators.filter(indicator => 
      lowerContent.includes(indicator)
    ).length;

    const aligned = matchCount > 0 || !this.strictMode;
    const reason = matchCount === 0 ? 'No category indicators found' : '';

    return { aligned, reason, matchCount };
  }

  /**
   * Verify metadata
   */
  verifyMetadata(entry) {
    const result = {
      valid: true,
      errors: [],
      warnings: []
    };

    if (!entry.metadata) {
      result.warnings.push('Missing metadata');
      return result;
    }

    const { metadata } = entry;

    // Check required metadata fields
    if (!metadata.extracted) {
      result.warnings.push('Missing extraction date');
    }

    if (typeof metadata.confidence !== 'number') {
      result.warnings.push('Missing confidence score');
    } else if (metadata.confidence < 0.5) {
      result.warnings.push(`Low confidence score: ${metadata.confidence}`);
    }

    // Verify topics are valid
    if (metadata.topics && Array.isArray(metadata.topics)) {
      const validTopics = [
        'swarm', 'agents', 'claude-flow', 'cli', 'api', 
        'deployment', 'testing', 'performance', 'security', 'debugging'
      ];
      
      metadata.topics.forEach(topic => {
        if (!validTopics.includes(topic)) {
          result.warnings.push(`Unknown topic: ${topic}`);
        }
      });
    }

    // Check for empty arrays
    ['keywords', 'commands', 'tools'].forEach(field => {
      if (metadata[field] && Array.isArray(metadata[field]) && metadata[field].length === 0) {
        result.warnings.push(`Empty ${field} array`);
      }
    });

    // Verify code snippets are valid
    if (metadata.codeSnippets && Array.isArray(metadata.codeSnippets)) {
      metadata.codeSnippets.forEach((snippet, index) => {
        if (snippet.length < 5) {
          result.warnings.push(`Code snippet ${index + 1} too short`);
        }
      });
    }

    return result;
  }

  /**
   * Verify links and references
   */
  verifyLinks(entry) {
    const result = {
      valid: true,
      errors: [],
      warnings: []
    };

    // Check source links
    if (entry.sources && Array.isArray(entry.sources)) {
      entry.sources.forEach((source, index) => {
        if (!source.file) {
          result.errors.push(`Source ${index + 1} missing file`);
          result.valid = false;
        }
        
        if (!source.link) {
          result.errors.push(`Source ${index + 1} missing link`);
          result.valid = false;
        } else {
          // Validate link format
          const linkPattern = /^.*#L\d+(-L\d+)?$/;
          if (!linkPattern.test(source.link)) {
            result.warnings.push(`Source ${index + 1} has non-standard link format`);
          }
        }

        if (!source.quote) {
          result.warnings.push(`Source ${index + 1} missing quote`);
        }
      });
    } else {
      result.errors.push('Missing sources array');
      result.valid = false;
    }

    // Check related links
    if (entry.related && Array.isArray(entry.related)) {
      entry.related.forEach((related, index) => {
        if (!related.id) {
          result.warnings.push(`Related item ${index + 1} missing ID`);
        }
      });
    }

    return result;
  }

  /**
   * Verify entry format
   */
  verifyFormat(entry) {
    const result = {
      valid: true,
      errors: [],
      warnings: []
    };

    // Check required fields
    const requiredFields = ['id', 'category', 'title', 'content'];
    requiredFields.forEach(field => {
      if (!entry[field]) {
        result.errors.push(`Missing required field: ${field}`);
        result.valid = false;
      }
    });

    // Check ID format
    if (entry.id) {
      const idPattern = /^[a-z]+(-[a-z]+)*-\d{3}$/;
      if (!idPattern.test(entry.id)) {
        result.warnings.push(`Non-standard ID format: ${entry.id}`);
      }
    }

    // Check category is valid
    if (entry.category) {
      const validCategories = ['gotcha', 'tip', 'howTo', 'qa', 'mentalModel', 'internals'];
      if (!validCategories.includes(entry.category)) {
        result.errors.push(`Invalid category: ${entry.category}`);
        result.valid = false;
      }
    }

    // Check title
    if (entry.title) {
      if (entry.title.length < 5) {
        result.errors.push('Title too short');
        result.valid = false;
      }
      if (entry.title.length > 100) {
        result.warnings.push('Title may be too long');
      }
    }

    // Check summary if present
    if (entry.summary) {
      if (entry.summary.length < 10) {
        result.warnings.push('Summary too short');
      }
      if (entry.summary.length > 200) {
        result.warnings.push('Summary too long');
      }
    }

    return result;
  }

  /**
   * Verify all entries
   */
  verifyAll(entries) {
    const results = {
      total: entries.length,
      valid: 0,
      invalid: 0,
      warnings: 0,
      errors: [],
      report: []
    };

    entries.forEach(entry => {
      const verification = this.verifyEntry(entry);
      
      if (verification.valid) {
        results.valid++;
      } else {
        results.invalid++;
      }

      if (verification.warnings.length > 0) {
        results.warnings += verification.warnings.length;
      }

      results.report.push(verification);
      
      if (!verification.valid) {
        results.errors.push({
          entryId: entry.id,
          errors: verification.errors
        });
      }
    });

    results.successRate = ((results.valid / results.total) * 100).toFixed(1);

    return results;
  }

  /**
   * Generate verification report
   */
  generateReport(verificationResults) {
    const timestamp = new Date().toISOString();
    
    const report = `# Verification Report
Generated: ${timestamp}

## Summary
- **Total Entries:** ${verificationResults.total}
- **Valid:** ${verificationResults.valid} (${verificationResults.successRate}%)
- **Invalid:** ${verificationResults.invalid}
- **Total Warnings:** ${verificationResults.warnings}

## Status Distribution
\`\`\`
✅ Valid:   ${'█'.repeat(Math.floor(verificationResults.valid / 2))} ${verificationResults.valid}
❌ Invalid: ${'█'.repeat(Math.floor(verificationResults.invalid / 2))} ${verificationResults.invalid}
\`\`\`

## Critical Errors
${verificationResults.errors.length > 0 ? 
  verificationResults.errors.map(err => 
    `### ${err.entryId}\n${err.errors.map(e => `- ❌ ${e}`).join('\n')}`
  ).join('\n\n') : 
  '✅ No critical errors found'}

## Detailed Results

${this.generateDetailedResults(verificationResults.report)}

## Verification Log
Total verifications performed: ${this.verificationLog.length}

## Recommendations
${this.generateRecommendations(verificationResults)}
`;

    return report;
  }

  /**
   * Generate detailed results section
   */
  generateDetailedResults(reports) {
    const byCategory = {};
    
    reports.forEach(report => {
      const category = report.entryId.split('-')[0];
      if (!byCategory[category]) {
        byCategory[category] = {
          valid: 0,
          invalid: 0,
          entries: []
        };
      }
      
      if (report.valid) {
        byCategory[category].valid++;
      } else {
        byCategory[category].invalid++;
      }
      
      byCategory[category].entries.push(report);
    });

    return Object.entries(byCategory).map(([category, data]) => `
### Category: ${category}
- Valid: ${data.valid}
- Invalid: ${data.invalid}
- Success Rate: ${((data.valid / (data.valid + data.invalid)) * 100).toFixed(1)}%
`).join('\n');
  }

  /**
   * Generate recommendations based on verification results
   */
  generateRecommendations(results) {
    const recommendations = [];

    if (results.invalid > 0) {
      recommendations.push('1. **Fix Critical Errors**: Address all entries marked as invalid');
    }

    if (results.warnings > results.total) {
      recommendations.push('2. **Review Warnings**: High warning count suggests content quality issues');
    }

    if (results.successRate < 80) {
      recommendations.push('3. **Improve Extraction**: Success rate below 80% indicates extraction issues');
    }

    const commonErrors = this.analyzeCommonErrors(results.errors);
    if (commonErrors.length > 0) {
      recommendations.push(`4. **Common Issues**: ${commonErrors.join(', ')}`);
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ Verification looking good! Minor improvements may still be possible.');
    }

    return recommendations.join('\n');
  }

  /**
   * Analyze common error patterns
   */
  analyzeCommonErrors(errors) {
    const errorTypes = {};
    
    errors.forEach(err => {
      err.errors.forEach(error => {
        const type = this.categorizeError(error);
        errorTypes[type] = (errorTypes[type] || 0) + 1;
      });
    });

    return Object.entries(errorTypes)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([type]) => type);
  }

  /**
   * Categorize error messages
   */
  categorizeError(error) {
    if (error.includes('quote')) return 'Quote verification';
    if (error.includes('file')) return 'File issues';
    if (error.includes('line')) return 'Line number issues';
    if (error.includes('Missing')) return 'Missing data';
    if (error.includes('Invalid')) return 'Invalid format';
    return 'Other';
  }

  /**
   * Export verification results
   */
  exportResults(results, outputPath) {
    const data = {
      timestamp: new Date().toISOString(),
      summary: {
        total: results.total,
        valid: results.valid,
        invalid: results.invalid,
        successRate: results.successRate
      },
      errors: results.errors,
      report: results.report,
      log: this.verificationLog
    };

    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
    
    return outputPath;
  }
}

module.exports = Verifier;