#!/usr/bin/env node

/**
 * Claude Flow-Specific Tips Extractor
 * Extracts actionable Claude Flow knowledge from transcripts
 */

const fs = require('fs');
const path = require('path');

class ClaudeFlowExtractor {
  constructor(options = {}) {
    this.transcriptDir = options.transcriptDir || path.join(__dirname, '../transcripts');
    this.outputDir = options.outputDir || path.join(__dirname, '../docs-v2');
    this.debug = options.debug || false;
    
    // Claude Flow-specific patterns
    this.claudeFlowPatterns = {
      commands: [
        /\bnpx\s+claude-flow(?:\s+[\w-]+)?/gi,
        /\bclaude-flow\s+(?:init|swarm|agent|task|sparc|batch)/gi,
        /\bclaude\s+(?:code|mcp|flow)/gi,
        /\--dangerously-skip-permissions\b/gi,
        /\bmcp__[\w-]+__[\w-]+/gi,  // MCP tool patterns
      ],
      
      features: [
        /\bswarm(?:\s+(?:intelligence|coordination|orchestration|topology))?\b/gi,
        /\bagent(?:s|ic)?\s+(?:spawn|coordinate|communicate|assign)/gi,
        /\bmulti-agent\s+(?:system|coordination|workflow)/gi,
        /\bsparc\s+(?:methodology|development|mode)/gi,
        /\bbatch(?:tool|ing)\s+(?:operations?|execution)/gi,
        /\bparallel\s+execution/gi,
        /\btask\s+orchestration/gi,
        /\bmemory\s+(?:store|retrieve|persist)/gi,
      ],
      
      tips: [
        /\b(?:tip|trick|hint|advice|recommendation)[:.]?\s*(.+)/gi,
        /\b(?:you\s+(?:should|can|must|need\s+to))\s+(.+)/gi,
        /\b(?:make\s+sure|ensure|remember|don't\s+forget)\s+(.+)/gi,
        /\b(?:best\s+practice|recommended|preferred)\s+(.+)/gi,
        /\b(?:pro\s+tip|quick\s+tip|useful\s+tip)[:.]?\s*(.+)/gi,
      ],
      
      gotchas: [
        /\b(?:warning|careful|caution|danger|gotcha)[:.]?\s*(.+)/gi,
        /\b(?:don't|never|avoid|shouldn't)\s+(.+)/gi,
        /\b(?:common\s+(?:mistake|error|issue|problem))[:.]?\s*(.+)/gi,
        /\b(?:will\s+(?:break|fail|crash)|won't\s+work)\s+(.+)/gi,
        /\b(?:security\s+(?:risk|issue|concern))\s+(.+)/gi,
      ],
      
      howTo: [
        /\b(?:how\s+to|how\s+do\s+(?:you|i))\s+(.+)/gi,
        /\b(?:to\s+(?:create|build|implement|setup|configure))\s+(.+)/gi,
        /\b(?:step\s+\d+|first|then|next|finally)[:.]?\s*(.+)/gi,
        /\b(?:example|for\s+instance|such\s+as)[:.]?\s*(.+)/gi,
        /\b(?:here's\s+how|this\s+is\s+how)\s+(.+)/gi,
      ]
    };
    
    this.contextKeywords = [
      'claude', 'flow', 'swarm', 'agent', 'mcp', 'sparc', 'batch',
      'orchestration', 'coordination', 'parallel', 'task', 'memory',
      'typescript', 'javascript', 'node', 'npm', 'npx'
    ];
    
    this.entries = [];
  }

  /**
   * Main extraction pipeline
   */
  async extract() {
    console.log('🚀 Starting Claude Flow-Specific Extraction');
    console.log('=' .repeat(50));
    
    const files = this.getTranscriptFiles();
    console.log(`Found ${files.length} transcript files\n`);
    
    for (const file of files) {
      await this.processTranscript(file);
    }
    
    // Post-process entries
    this.consolidateEntries();
    this.validateEntries();
    
    // Generate output
    await this.generateOutput();
    
    console.log('\n' + '=' .repeat(50));
    console.log('✨ Extraction Complete!');
    console.log(`Total actionable entries: ${this.entries.length}`);
    
    return this.entries;
  }

  /**
   * Get transcript files
   */
  getTranscriptFiles() {
    return fs.readdirSync(this.transcriptDir)
      .filter(f => f.endsWith('.txt') || f.endsWith('.md'))
      .map(f => path.join(this.transcriptDir, f));
  }

  /**
   * Process a single transcript
   */
  async processTranscript(filePath) {
    const fileName = path.basename(filePath);
    console.log(`Processing: ${fileName}`);
    
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    
    // Extract Claude Flow-specific segments
    const segments = this.extractSegments(lines, fileName);
    
    // Convert segments to entries
    const entries = segments.map(seg => this.createEntry(seg));
    
    // Filter valid entries
    const validEntries = entries.filter(e => e && e.isActionable);
    
    this.entries.push(...validEntries);
    console.log(`  → Extracted ${validEntries.length} actionable entries`);
  }

  /**
   * Extract relevant segments from transcript
   */
  extractSegments(lines, fileName) {
    const segments = [];
    const processedLines = new Set();
    
    for (let i = 0; i < lines.length; i++) {
      if (processedLines.has(i)) continue;
      
      const line = lines[i];
      
      // Check if line contains Claude Flow context
      if (!this.hasClaudeFlowContext(line)) continue;
      
      // Extract different types of content
      const segment = this.extractSegmentWithContext(lines, i, fileName);
      
      if (segment && segment.type !== 'none') {
        segments.push(segment);
        
        // Mark lines as processed
        for (let j = segment.startLine; j <= segment.endLine; j++) {
          processedLines.add(j);
        }
      }
    }
    
    return segments;
  }

  /**
   * Check if line has Claude Flow context
   */
  hasClaudeFlowContext(line) {
    const lowerLine = line.toLowerCase();
    
    // Check for keywords
    const hasKeyword = this.contextKeywords.some(keyword => 
      lowerLine.includes(keyword)
    );
    
    if (hasKeyword) return true;
    
    // Check for command patterns
    for (const pattern of this.claudeFlowPatterns.commands) {
      if (pattern.test(line)) return true;
    }
    
    // Check for feature patterns
    for (const pattern of this.claudeFlowPatterns.features) {
      if (pattern.test(line)) return true;
    }
    
    return false;
  }

  /**
   * Extract segment with surrounding context
   */
  extractSegmentWithContext(lines, centerIndex, fileName) {
    const line = lines[centerIndex];
    
    // Determine segment type and extract content
    let segment = null;
    
    // Check for commands
    for (const pattern of this.claudeFlowPatterns.commands) {
      const match = line.match(pattern);
      if (match) {
        segment = this.extractCommandSegment(lines, centerIndex, match[0], fileName);
        break;
      }
    }
    
    // Check for tips
    if (!segment) {
      for (const pattern of this.claudeFlowPatterns.tips) {
        const match = line.match(pattern);
        if (match) {
          segment = this.extractTipSegment(lines, centerIndex, match, fileName);
          break;
        }
      }
    }
    
    // Check for gotchas
    if (!segment) {
      for (const pattern of this.claudeFlowPatterns.gotchas) {
        const match = line.match(pattern);
        if (match) {
          segment = this.extractGotchaSegment(lines, centerIndex, match, fileName);
          break;
        }
      }
    }
    
    // Check for how-to
    if (!segment) {
      for (const pattern of this.claudeFlowPatterns.howTo) {
        const match = line.match(pattern);
        if (match) {
          segment = this.extractHowToSegment(lines, centerIndex, match, fileName);
          break;
        }
      }
    }
    
    return segment || { type: 'none' };
  }

  /**
   * Extract command segment
   */
  extractCommandSegment(lines, centerIndex, command, fileName) {
    // Get surrounding context
    const contextBefore = 3;
    const contextAfter = 5;
    
    const startLine = Math.max(0, centerIndex - contextBefore);
    const endLine = Math.min(lines.length - 1, centerIndex + contextAfter);
    
    // Extract the full command and explanation
    const context = [];
    let fullCommand = command;
    let explanation = '';
    
    // Look for command continuation
    for (let i = centerIndex; i <= endLine; i++) {
      const line = lines[i].trim();
      
      if (i === centerIndex) {
        context.push(line);
      } else if (line.startsWith('  ') || line.startsWith('\t')) {
        // Continuation of command
        fullCommand += ' ' + line.trim();
        context.push(line);
      } else if (line && !line.match(/^[#>]/)) {
        // Explanation
        explanation += ' ' + line;
        context.push(line);
        if (line.endsWith('.') || line.endsWith('!')) break;
      }
    }
    
    // Look for setup context before
    const setupContext = [];
    for (let i = centerIndex - 1; i >= startLine; i--) {
      const line = lines[i].trim();
      if (line && !line.match(/^[#>]/)) {
        setupContext.unshift(line);
        if (line.endsWith(':') || line.endsWith('.')) break;
      }
    }
    
    return {
      type: 'command',
      command: fullCommand.trim(),
      explanation: explanation.trim(),
      setup: setupContext.join(' ').trim(),
      context: context.join('\n'),
      sourceFile: fileName,
      startLine: startLine + 1,
      endLine: endLine + 1,
      centerLine: centerIndex + 1
    };
  }

  /**
   * Extract tip segment
   */
  extractTipSegment(lines, centerIndex, match, fileName) {
    const tipContent = match[1] || match[0];
    
    // Get complete tip
    const fullTip = this.extractCompleteSentence(lines, centerIndex, tipContent);
    
    // Get supporting context
    const context = this.extractSupportingContext(lines, centerIndex, 5);
    
    return {
      type: 'tip',
      title: this.generateTipTitle(fullTip),
      content: fullTip,
      context: context,
      sourceFile: fileName,
      startLine: Math.max(0, centerIndex - 2) + 1,
      endLine: Math.min(lines.length - 1, centerIndex + 3) + 1,
      centerLine: centerIndex + 1
    };
  }

  /**
   * Extract gotcha segment
   */
  extractGotchaSegment(lines, centerIndex, match, fileName) {
    const warningContent = match[1] || match[0];
    
    // Get complete warning
    const fullWarning = this.extractCompleteSentence(lines, centerIndex, warningContent);
    
    // Look for consequence/impact
    const impact = this.extractImpact(lines, centerIndex);
    
    // Look for solution/workaround
    const solution = this.extractSolution(lines, centerIndex);
    
    return {
      type: 'gotcha',
      title: this.generateGotchaTitle(fullWarning),
      warning: fullWarning,
      impact: impact,
      solution: solution,
      context: this.extractSupportingContext(lines, centerIndex, 7),
      sourceFile: fileName,
      startLine: Math.max(0, centerIndex - 3) + 1,
      endLine: Math.min(lines.length - 1, centerIndex + 5) + 1,
      centerLine: centerIndex + 1
    };
  }

  /**
   * Extract how-to segment
   */
  extractHowToSegment(lines, centerIndex, match, fileName) {
    const howToContent = match[1] || match[0];
    
    // Extract steps
    const steps = this.extractSteps(lines, centerIndex);
    
    // Get objective
    const objective = this.extractObjective(lines, centerIndex, howToContent);
    
    return {
      type: 'howTo',
      title: this.generateHowToTitle(objective),
      objective: objective,
      steps: steps,
      context: this.extractSupportingContext(lines, centerIndex, 10),
      sourceFile: fileName,
      startLine: Math.max(0, centerIndex - 2) + 1,
      endLine: Math.min(lines.length - 1, centerIndex + steps.length + 2) + 1,
      centerLine: centerIndex + 1
    };
  }

  /**
   * Extract complete sentence
   */
  extractCompleteSentence(lines, centerIndex, fragment) {
    let sentence = fragment;
    
    // Look forward for sentence completion
    for (let i = centerIndex + 1; i < Math.min(lines.length, centerIndex + 3); i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      sentence += ' ' + line;
      if (line.match(/[.!?]$/)) break;
    }
    
    // Look backward if sentence seems incomplete
    if (!sentence.match(/^[A-Z]/) && centerIndex > 0) {
      for (let i = centerIndex - 1; i >= Math.max(0, centerIndex - 2); i--) {
        const line = lines[i].trim();
        if (!line) continue;
        
        sentence = line + ' ' + sentence;
        if (line.match(/[.!?]$/)) break;
      }
    }
    
    return sentence.trim();
  }

  /**
   * Extract supporting context
   */
  extractSupportingContext(lines, centerIndex, radius) {
    const startIdx = Math.max(0, centerIndex - radius);
    const endIdx = Math.min(lines.length - 1, centerIndex + radius);
    
    const contextLines = [];
    for (let i = startIdx; i <= endIdx; i++) {
      const line = lines[i].trim();
      if (line && !line.match(/^[#>]/) && line.length > 10) {
        contextLines.push(line);
      }
    }
    
    return contextLines.join(' ').substring(0, 500);
  }

  /**
   * Extract impact of a gotcha
   */
  extractImpact(lines, centerIndex) {
    const impactKeywords = ['will', 'can', 'might', 'causes', 'results', 'leads', 'breaks'];
    
    for (let i = centerIndex + 1; i < Math.min(lines.length, centerIndex + 5); i++) {
      const line = lines[i].toLowerCase();
      
      if (impactKeywords.some(keyword => line.includes(keyword))) {
        return this.extractCompleteSentence(lines, i, lines[i]);
      }
    }
    
    return '';
  }

  /**
   * Extract solution for a gotcha
   */
  extractSolution(lines, centerIndex) {
    const solutionKeywords = ['instead', 'solution', 'fix', 'workaround', 'use', 'try'];
    
    for (let i = centerIndex + 1; i < Math.min(lines.length, centerIndex + 7); i++) {
      const line = lines[i].toLowerCase();
      
      if (solutionKeywords.some(keyword => line.includes(keyword))) {
        return this.extractCompleteSentence(lines, i, lines[i]);
      }
    }
    
    return '';
  }

  /**
   * Extract steps from how-to
   */
  extractSteps(lines, centerIndex) {
    const steps = [];
    const stepPatterns = [
      /^(\d+)[.)\s]+(.+)$/,
      /^(step\s+\d+)[:.\s]+(.+)$/i,
      /^(first|second|third|then|next|finally)[:.\s]+(.+)$/i,
      /^[-*]\s+(.+)$/
    ];
    
    for (let i = centerIndex; i < Math.min(lines.length, centerIndex + 15); i++) {
      const line = lines[i].trim();
      
      for (const pattern of stepPatterns) {
        const match = line.match(pattern);
        if (match) {
          const stepContent = match[2] || match[1];
          steps.push(this.extractCompleteSentence(lines, i, stepContent));
          break;
        }
      }
      
      // Stop if we hit a new section
      if (steps.length > 0 && line.match(/^#{1,3}\s/)) break;
    }
    
    return steps;
  }

  /**
   * Extract objective from how-to
   */
  extractObjective(lines, centerIndex, initial) {
    // Look for "how to" pattern and extract the objective
    const line = lines[centerIndex];
    const howToMatch = line.match(/how\s+(?:to|do\s+(?:you|i))\s+(.+)/i);
    
    if (howToMatch) {
      return this.extractCompleteSentence(lines, centerIndex, howToMatch[1]);
    }
    
    return initial;
  }

  /**
   * Generate tip title
   */
  generateTipTitle(tip) {
    const words = tip.split(' ').slice(0, 8).join(' ');
    return words.length > 50 ? words.substring(0, 47) + '...' : words;
  }

  /**
   * Generate gotcha title
   */
  generateGotchaTitle(warning) {
    // Extract the key warning phrase
    const match = warning.match(/(?:don't|never|avoid)\s+(.{10,40})/i);
    if (match) {
      return `Don't ${match[1]}`;
    }
    
    const words = warning.split(' ').slice(0, 6).join(' ');
    return words.length > 50 ? words.substring(0, 47) + '...' : words;
  }

  /**
   * Generate how-to title
   */
  generateHowToTitle(objective) {
    // Clean up the objective
    const cleaned = objective.replace(/^how\s+(?:to|do\s+(?:you|i))\s+/i, '');
    const words = cleaned.split(' ').slice(0, 8).join(' ');
    
    return `How to ${words.length > 40 ? words.substring(0, 37) + '...' : words}`;
  }

  /**
   * Create entry from segment
   */
  createEntry(segment) {
    const entry = {
      id: `${segment.type}-${this.entries.filter(e => e.type === segment.type).length + 1}`,
      type: segment.type,
      sourceFile: segment.sourceFile,
      lineStart: segment.startLine,
      lineEnd: segment.endLine,
      isActionable: false
    };
    
    switch (segment.type) {
      case 'command':
        entry.title = `Claude Flow Command: ${segment.command.split(' ').slice(0, 3).join(' ')}`;
        entry.command = segment.command;
        entry.explanation = segment.explanation;
        entry.setup = segment.setup;
        entry.isActionable = !!segment.command && segment.command.includes('claude');
        break;
        
      case 'tip':
        entry.title = segment.title;
        entry.content = segment.content;
        entry.context = segment.context;
        entry.isActionable = segment.content.length > 30;
        break;
        
      case 'gotcha':
        entry.title = segment.title;
        entry.warning = segment.warning;
        entry.impact = segment.impact;
        entry.solution = segment.solution;
        entry.isActionable = segment.warning.length > 30;
        break;
        
      case 'howTo':
        entry.title = segment.title;
        entry.objective = segment.objective;
        entry.steps = segment.steps;
        entry.isActionable = segment.steps.length > 0;
        break;
    }
    
    // Add metadata
    entry.metadata = {
      extracted: new Date().toISOString(),
      confidence: this.calculateConfidence(segment),
      tools: this.extractTools(segment),
      keywords: this.extractKeywords(segment)
    };
    
    return entry;
  }

  /**
   * Calculate confidence score
   */
  calculateConfidence(segment) {
    let score = 0;
    
    // Check for Claude Flow keywords
    const content = JSON.stringify(segment).toLowerCase();
    const keywordCount = this.contextKeywords.filter(kw => content.includes(kw)).length;
    score += keywordCount * 0.1;
    
    // Check completeness
    if (segment.type === 'command' && segment.explanation) score += 0.2;
    if (segment.type === 'gotcha' && segment.solution) score += 0.2;
    if (segment.type === 'howTo' && segment.steps.length > 2) score += 0.3;
    
    // Check length
    if (content.length > 200) score += 0.1;
    if (content.length > 500) score += 0.1;
    
    return Math.min(1, score);
  }

  /**
   * Extract tools mentioned
   */
  extractTools(segment) {
    const tools = new Set();
    const content = JSON.stringify(segment).toLowerCase();
    
    const toolPatterns = {
      'claude-flow': /claude[\s-]?flow/g,
      'mcp': /mcp/g,
      'swarm': /swarm/g,
      'sparc': /sparc/g,
      'npm': /npm/g,
      'npx': /npx/g,
      'typescript': /typescript|\.ts/g,
      'javascript': /javascript|\.js/g,
      'github': /github|gh\s/g,
      'docker': /docker/g
    };
    
    for (const [tool, pattern] of Object.entries(toolPatterns)) {
      if (pattern.test(content)) {
        tools.add(tool);
      }
    }
    
    return Array.from(tools);
  }

  /**
   * Extract keywords
   */
  extractKeywords(segment) {
    const content = JSON.stringify(segment).toLowerCase();
    const words = content.split(/\s+/)
      .filter(w => w.length > 4)
      .filter(w => !['this', 'that', 'with', 'from', 'have'].includes(w));
    
    const frequency = {};
    words.forEach(word => {
      frequency[word] = (frequency[word] || 0) + 1;
    });
    
    return Object.entries(frequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
  }

  /**
   * Consolidate duplicate entries
   */
  consolidateEntries() {
    const consolidated = [];
    const seen = new Set();
    
    for (const entry of this.entries) {
      const key = `${entry.type}:${entry.title}`;
      
      if (!seen.has(key)) {
        seen.add(key);
        consolidated.push(entry);
      }
    }
    
    this.entries = consolidated;
  }

  /**
   * Validate entries are actionable
   */
  validateEntries() {
    this.entries = this.entries.filter(entry => {
      // Must have Claude Flow context
      const hasContext = entry.metadata.tools.some(tool => 
        ['claude-flow', 'mcp', 'swarm', 'sparc'].includes(tool)
      );
      
      // Must have sufficient content
      const hasContent = 
        (entry.type === 'command' && entry.command) ||
        (entry.type === 'tip' && entry.content && entry.content.length > 50) ||
        (entry.type === 'gotcha' && entry.warning && entry.warning.length > 50) ||
        (entry.type === 'howTo' && entry.steps && entry.steps.length > 0);
      
      return hasContext && hasContent;
    });
  }

  /**
   * Generate output files
   */
  async generateOutput() {
    // Create output directory
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
    
    // Group entries by type
    const byType = {
      command: [],
      tip: [],
      gotcha: [],
      howTo: []
    };
    
    this.entries.forEach(entry => {
      byType[entry.type].push(entry);
    });
    
    // Generate category pages
    for (const [type, entries] of Object.entries(byType)) {
      if (entries.length > 0) {
        await this.generateCategoryPage(type, entries);
      }
    }
    
    // Generate main index
    await this.generateIndexPage(byType);
    
    // Generate JSON data
    const dataPath = path.join(this.outputDir, 'claude-flow-tips.json');
    fs.writeFileSync(dataPath, JSON.stringify(this.entries, null, 2));
    
    console.log(`\n✓ Output generated in ${this.outputDir}`);
  }

  /**
   * Generate category page
   */
  async generateCategoryPage(type, entries) {
    const typeNames = {
      command: 'Commands',
      tip: 'Tips & Best Practices',
      gotcha: 'Gotchas & Warnings',
      howTo: 'How-To Guides'
    };
    
    const content = `# Claude Flow ${typeNames[type]}

${entries.map(entry => this.formatEntry(entry)).join('\n\n---\n\n')}
`;
    
    const filePath = path.join(this.outputDir, `${type}s.md`);
    fs.writeFileSync(filePath, content);
  }

  /**
   * Format entry for markdown
   */
  formatEntry(entry) {
    let content = `## ${entry.title}\n\n`;
    
    switch (entry.type) {
      case 'command':
        content += '```bash\n' + entry.command + '\n```\n\n';
        if (entry.explanation) {
          content += `**Explanation:** ${entry.explanation}\n\n`;
        }
        if (entry.setup) {
          content += `**Setup:** ${entry.setup}\n\n`;
        }
        break;
        
      case 'tip':
        content += entry.content + '\n\n';
        if (entry.context) {
          content += `*Context: ${entry.context.substring(0, 200)}...*\n\n`;
        }
        break;
        
      case 'gotcha':
        content += `⚠️ **Warning:** ${entry.warning}\n\n`;
        if (entry.impact) {
          content += `**Impact:** ${entry.impact}\n\n`;
        }
        if (entry.solution) {
          content += `✅ **Solution:** ${entry.solution}\n\n`;
        }
        break;
        
      case 'howTo':
        content += `**Objective:** ${entry.objective}\n\n`;
        if (entry.steps && entry.steps.length > 0) {
          content += '**Steps:**\n';
          entry.steps.forEach((step, i) => {
            content += `${i + 1}. ${step}\n`;
          });
          content += '\n';
        }
        break;
    }
    
    // Add metadata
    content += `*Source: ${entry.sourceFile} (lines ${entry.lineStart}-${entry.lineEnd})*\n`;
    if (entry.metadata.tools.length > 0) {
      content += `*Tools: ${entry.metadata.tools.join(', ')}*\n`;
    }
    
    return content;
  }

  /**
   * Generate index page
   */
  async generateIndexPage(byType) {
    let content = `# Claude Flow Tips & Guides

Actionable knowledge extracted from Claude Flow community transcripts.

## Summary
- **Total Entries:** ${this.entries.length}
- **Commands:** ${byType.command.length}
- **Tips:** ${byType.tip.length}
- **Gotchas:** ${byType.gotcha.length}
- **How-To Guides:** ${byType.howTo.length}

## Categories

`;
    
    if (byType.command.length > 0) {
      content += `### [📝 Commands](commands.md)\n`;
      content += `Claude Flow commands with explanations (${byType.command.length} entries)\n\n`;
    }
    
    if (byType.tip.length > 0) {
      content += `### [💡 Tips & Best Practices](tips.md)\n`;
      content += `Recommendations from the community (${byType.tip.length} entries)\n\n`;
    }
    
    if (byType.gotcha.length > 0) {
      content += `### [⚠️ Gotchas & Warnings](gotchas.md)\n`;
      content += `Common pitfalls to avoid (${byType.gotcha.length} entries)\n\n`;
    }
    
    if (byType.howTo.length > 0) {
      content += `### [🔧 How-To Guides](howTos.md)\n`;
      content += `Step-by-step instructions (${byType.howTo.length} entries)\n\n`;
    }
    
    const indexPath = path.join(this.outputDir, 'index.md');
    fs.writeFileSync(indexPath, content);
  }
}

// Run if called directly
if (require.main === module) {
  const extractor = new ClaudeFlowExtractor({
    debug: process.argv.includes('--debug')
  });
  
  extractor.extract()
    .then(entries => {
      console.log(`\n✅ Successfully extracted ${entries.length} actionable Claude Flow tips!`);
    })
    .catch(error => {
      console.error('❌ Extraction failed:', error);
      process.exit(1);
    });
}

module.exports = ClaudeFlowExtractor;