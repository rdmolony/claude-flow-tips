#!/usr/bin/env node

/**
 * Content Classifier for Claude Flow Tips
 * Advanced categorization with NLP and context understanding
 */

const fs = require('fs');
const path = require('path');

class ContentClassifier {
  constructor(options = {}) {
    this.confidenceThreshold = options.confidenceThreshold || 0.7;
    this.multiCategoryThreshold = options.multiCategoryThreshold || 0.85;
    this.debug = options.debug || false;
  }

  /**
   * Enhanced category definitions with contextual rules
   */
  categoryRules = {
    gotcha: {
      mustHave: ['warning', 'careful', 'don\'t', 'avoid', 'never', 'dangerous'],
      shouldHave: ['break', 'fail', 'error', 'crash', 'issue', 'problem'],
      context: ['permission', 'security', 'production', 'delete', 'loss'],
      examples: [
        'never run with --dangerously-skip-permissions',
        'this will break your deployment',
        'avoid using this in production'
      ],
      priority: 10
    },
    tip: {
      mustHave: ['recommend', 'suggest', 'better', 'should', 'tip', 'advice'],
      shouldHave: ['improve', 'optimize', 'faster', 'efficient', 'enhance'],
      context: ['performance', 'workflow', 'productivity', 'quality'],
      examples: [
        'I recommend using this approach',
        'a better way to handle this',
        'pro tip for faster builds'
      ],
      priority: 8
    },
    howTo: {
      mustHave: ['step', 'first', 'then', 'next', 'setup', 'install', 'configure'],
      shouldHave: ['create', 'build', 'run', 'execute', 'implement'],
      context: ['guide', 'tutorial', 'walkthrough', 'instructions'],
      examples: [
        'first install the dependencies',
        'then configure the settings',
        'follow these steps to setup'
      ],
      priority: 9
    },
    qa: {
      mustHave: ['?', 'asked', 'question', 'answer', 'response'],
      shouldHave: ['because', 'reason', 'why', 'explain', 'clarify'],
      context: ['wondering', 'curious', 'confused', 'understanding'],
      examples: [
        'someone asked about this',
        'the answer is',
        'why does this happen?'
      ],
      priority: 7
    },
    mentalModel: {
      mustHave: ['think', 'understand', 'concept', 'mental model', 'paradigm'],
      shouldHave: ['approach', 'philosophy', 'mindset', 'perspective', 'framework'],
      context: ['abstract', 'theory', 'principle', 'pattern'],
      examples: [
        'think of it as a pipeline',
        'the mental model here is',
        'understand the concept behind'
      ],
      priority: 6
    },
    internals: {
      mustHave: ['how it works', 'under the hood', 'internally', 'mechanism'],
      shouldHave: ['architecture', 'implementation', 'engine', 'core', 'system'],
      context: ['technical', 'detailed', 'low-level', 'algorithm'],
      examples: [
        'under the hood it uses',
        'the internal mechanism is',
        'how the engine works'
      ],
      priority: 5
    }
  };

  /**
   * Classify content with advanced NLP
   */
  classify(segment) {
    const content = segment.content.toLowerCase();
    const classifications = [];

    // Analyze each category
    for (const [category, rules] of Object.entries(this.categoryRules)) {
      const score = this.calculateCategoryScore(content, rules, segment);
      
      if (score.total >= this.confidenceThreshold) {
        classifications.push({
          category: category,
          confidence: score.total,
          reasons: score.reasons,
          priority: rules.priority,
          matchedPatterns: score.matchedPatterns
        });
      }
    }

    // Sort by priority and confidence
    classifications.sort((a, b) => {
      const priorityDiff = b.priority - a.priority;
      if (priorityDiff !== 0) return priorityDiff;
      return b.confidence - a.confidence;
    });

    // Determine primary and secondary categories
    const primary = classifications[0] || null;
    const secondary = classifications[1] || null;

    // Check if content fits multiple categories strongly
    const multiCategory = classifications.filter(c => 
      c.confidence >= this.multiCategoryThreshold
    );

    return {
      primary: primary ? primary.category : 'uncategorized',
      primaryConfidence: primary ? primary.confidence : 0,
      secondary: secondary && secondary.confidence > 0.6 ? secondary.category : null,
      secondaryConfidence: secondary ? secondary.confidence : 0,
      allCategories: classifications,
      isMultiCategory: multiCategory.length > 1,
      multiCategories: multiCategory.map(c => c.category),
      metadata: this.extractMetadata(segment, primary)
    };
  }

  /**
   * Calculate category score with detailed analysis
   */
  calculateCategoryScore(content, rules, segment) {
    const score = {
      total: 0,
      reasons: [],
      matchedPatterns: []
    };

    // Check must-have terms (40% weight)
    const mustHaveMatches = this.countMatches(content, rules.mustHave);
    if (mustHaveMatches.count > 0) {
      score.total += 0.4 * Math.min(1, mustHaveMatches.count / 2);
      score.reasons.push(`Found key terms: ${mustHaveMatches.matched.join(', ')}`);
      score.matchedPatterns.push(...mustHaveMatches.matched);
    }

    // Check should-have terms (30% weight)
    const shouldHaveMatches = this.countMatches(content, rules.shouldHave);
    if (shouldHaveMatches.count > 0) {
      score.total += 0.3 * Math.min(1, shouldHaveMatches.count / 3);
      score.reasons.push(`Supporting terms: ${shouldHaveMatches.matched.join(', ')}`);
      score.matchedPatterns.push(...shouldHaveMatches.matched);
    }

    // Check context terms (20% weight)
    const contextMatches = this.countMatches(content, rules.context);
    if (contextMatches.count > 0) {
      score.total += 0.2 * Math.min(1, contextMatches.count / 2);
      score.reasons.push(`Context indicators: ${contextMatches.matched.join(', ')}`);
    }

    // Check against examples (10% weight)
    const exampleSimilarity = this.checkExampleSimilarity(content, rules.examples);
    if (exampleSimilarity > 0.3) {
      score.total += 0.1 * exampleSimilarity;
      score.reasons.push('Similar to known examples');
    }

    // Boost for high-confidence segments from parser
    if (segment.confidence && segment.confidence > 0.8) {
      score.total *= 1.1;
      score.reasons.push('High parser confidence');
    }

    // Penalty for conflicting categories
    const conflicts = this.detectConflicts(content);
    if (conflicts.length > 0) {
      score.total *= 0.9;
      score.reasons.push(`Conflicts detected: ${conflicts.join(', ')}`);
    }

    return score;
  }

  /**
   * Count matches for a list of terms
   */
  countMatches(content, terms) {
    let count = 0;
    const matched = [];

    for (const term of terms) {
      const regex = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      const matches = content.match(regex);
      
      if (matches) {
        count += matches.length;
        matched.push(term);
      }
    }

    return { count, matched };
  }

  /**
   * Check similarity to example patterns
   */
  checkExampleSimilarity(content, examples) {
    let maxSimilarity = 0;

    for (const example of examples) {
      const similarity = this.calculateSimilarity(content, example.toLowerCase());
      maxSimilarity = Math.max(maxSimilarity, similarity);
    }

    return maxSimilarity;
  }

  /**
   * Calculate text similarity using simple metrics
   */
  calculateSimilarity(text1, text2) {
    const words1 = new Set(text1.split(/\s+/));
    const words2 = new Set(text2.split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    // Jaccard similarity
    return intersection.size / union.size;
  }

  /**
   * Detect conflicting category indicators
   */
  detectConflicts(content) {
    const conflicts = [];

    // Check for mixed signals
    if (content.includes('don\'t') && content.includes('recommend')) {
      conflicts.push('mixed advice');
    }

    if (content.includes('?') && content.includes('step 1')) {
      conflicts.push('question with steps');
    }

    return conflicts;
  }

  /**
   * Extract metadata from classified content
   */
  extractMetadata(segment, primaryClassification) {
    const metadata = {
      topics: this.extractTopics(segment.content),
      keywords: this.extractKeywords(segment.content),
      codeSnippets: this.extractCodeSnippets(segment.content),
      commands: this.extractCommands(segment.content),
      urls: this.extractUrls(segment.content),
      tools: this.extractTools(segment.content),
      difficulty: this.assessDifficulty(segment),
      actionable: this.isActionable(segment.content),
      standalone: this.isStandalone(segment.content)
    };

    // Add category-specific metadata
    if (primaryClassification) {
      metadata.categorySpecific = this.getCategorySpecificMetadata(
        segment.content,
        primaryClassification.category
      );
    }

    return metadata;
  }

  /**
   * Extract key topics from content
   */
  extractTopics(content) {
    const topicPatterns = {
      'swarm': /\bswarm\s*(intelligence|coordination|agents?)?\b/gi,
      'agents': /\b(agent|multi-agent|autonomous)\b/gi,
      'claude-flow': /\bclaude[\s-]?flow\b/gi,
      'cli': /\b(cli|command[\s-]?line)\b/gi,
      'api': /\b(api|endpoint|rest|graphql)\b/gi,
      'deployment': /\b(deploy|deployment|production|staging)\b/gi,
      'testing': /\b(test|testing|unit|integration|e2e)\b/gi,
      'performance': /\b(performance|optimization|speed|efficiency)\b/gi,
      'security': /\b(security|permission|auth|authentication|authorization)\b/gi,
      'debugging': /\b(debug|debugging|troubleshoot|error|fix)\b/gi
    };

    const topics = [];
    
    for (const [topic, pattern] of Object.entries(topicPatterns)) {
      if (pattern.test(content)) {
        topics.push(topic);
      }
    }

    return topics;
  }

  /**
   * Extract important keywords
   */
  extractKeywords(content) {
    // Remove common words and extract significant terms
    const stopWords = new Set([
      'the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'but',
      'in', 'with', 'to', 'for', 'of', 'as', 'by', 'that', 'this',
      'it', 'from', 'be', 'are', 'was', 'were', 'been'
    ]);

    const words = content.toLowerCase()
      .replace(/[^\w\s-]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3 && !stopWords.has(word));

    // Count frequency
    const frequency = {};
    words.forEach(word => {
      frequency[word] = (frequency[word] || 0) + 1;
    });

    // Get top keywords
    return Object.entries(frequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
  }

  /**
   * Extract code snippets
   */
  extractCodeSnippets(content) {
    const codePatterns = [
      /```[\s\S]*?```/g,  // Markdown code blocks
      /`[^`]+`/g,         // Inline code
      /^\s{4,}.*$/gm      // Indented code
    ];

    const snippets = [];
    
    for (const pattern of codePatterns) {
      const matches = content.match(pattern);
      if (matches) {
        snippets.push(...matches.map(m => m.replace(/```/g, '').trim()));
      }
    }

    return snippets;
  }

  /**
   * Extract commands
   */
  extractCommands(content) {
    const commandPatterns = [
      /\b(npm|npx|yarn|pnpm)\s+[\w-]+/g,
      /\b(git|gh)\s+[\w-]+/g,
      /\bclaude[\s-]?flow\s+[\w-]+/g,
      /\$\s*[\w-]+/g,  // Shell commands
      /^\s*[\w-]+\s+--?[\w-]+/gm  // Command with flags
    ];

    const commands = new Set();
    
    for (const pattern of commandPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        matches.forEach(cmd => commands.add(cmd.trim()));
      }
    }

    return Array.from(commands);
  }

  /**
   * Extract URLs
   */
  extractUrls(content) {
    const urlPattern = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g;
    const matches = content.match(urlPattern);
    return matches || [];
  }

  /**
   * Extract mentioned tools
   */
  extractTools(content) {
    const toolPatterns = {
      'claude-flow': /\bclaude[\s-]?flow\b/gi,
      'swarm': /\bswarm\b/gi,
      'npm': /\bnpm\b/gi,
      'git': /\bgit\b/gi,
      'docker': /\bdocker\b/gi,
      'kubernetes': /\bkubernetes|k8s\b/gi,
      'vscode': /\bvs[\s-]?code|visual studio code\b/gi,
      'github': /\bgithub\b/gi,
      'typescript': /\btypescript|ts\b/gi,
      'javascript': /\bjavascript|js\b/gi,
      'python': /\bpython|py\b/gi,
      'rust': /\brust\b/gi
    };

    const tools = [];
    
    for (const [tool, pattern] of Object.entries(toolPatterns)) {
      if (pattern.test(content)) {
        tools.push(tool);
      }
    }

    return tools;
  }

  /**
   * Assess difficulty level
   */
  assessDifficulty(segment) {
    const { technicalLevel } = segment;
    const content = segment.content.toLowerCase();

    // Check for difficulty indicators
    const beginnerTerms = /\b(basic|simple|easy|start|beginner|intro)\b/g;
    const advancedTerms = /\b(advanced|complex|expert|deep|architecture)\b/g;

    const beginnerCount = (content.match(beginnerTerms) || []).length;
    const advancedCount = (content.match(advancedTerms) || []).length;

    if (technicalLevel === 'advanced' || advancedCount > beginnerCount) {
      return 'advanced';
    } else if (technicalLevel === 'beginner' || beginnerCount > advancedCount) {
      return 'beginner';
    }

    return 'intermediate';
  }

  /**
   * Check if content is actionable
   */
  isActionable(content) {
    const actionablePatterns = [
      /\b(do|run|execute|install|create|build|setup|configure)\b/gi,
      /\b(step \d+|first|then|next|finally)\b/gi,
      /\b(you (can|should|must|need to))\b/gi
    ];

    return actionablePatterns.some(pattern => pattern.test(content));
  }

  /**
   * Check if content is standalone
   */
  isStandalone(content) {
    // Check if content has enough context to be understood independently
    const hasContext = content.length > 200;
    const hasCompleteThought = /[.!?]$/.test(content.trim());
    const hasExample = /\b(example|for instance|such as)\b/i.test(content);

    return hasContext && (hasCompleteThought || hasExample);
  }

  /**
   * Get category-specific metadata
   */
  getCategorySpecificMetadata(content, category) {
    const metadata = {};

    switch (category) {
      case 'gotcha':
        metadata.severity = this.assessSeverity(content);
        metadata.affectedFeatures = this.extractAffectedFeatures(content);
        break;
      
      case 'howTo':
        metadata.steps = this.extractSteps(content);
        metadata.prerequisites = this.extractPrerequisites(content);
        break;
      
      case 'qa':
        metadata.question = this.extractQuestion(content);
        metadata.answer = this.extractAnswer(content);
        break;
      
      case 'tip':
        metadata.benefit = this.extractBenefit(content);
        metadata.useCase = this.extractUseCase(content);
        break;
      
      case 'mentalModel':
        metadata.analogy = this.extractAnalogy(content);
        metadata.principles = this.extractPrinciples(content);
        break;
      
      case 'internals':
        metadata.components = this.extractComponents(content);
        metadata.flow = this.extractFlow(content);
        break;
    }

    return metadata;
  }

  /**
   * Assess severity for gotchas
   */
  assessSeverity(content) {
    if (/\b(critical|severe|dangerous|data loss|security)\b/i.test(content)) {
      return 'critical';
    }
    if (/\b(important|significant|breaking)\b/i.test(content)) {
      return 'high';
    }
    if (/\b(moderate|sometimes|occasionally)\b/i.test(content)) {
      return 'medium';
    }
    return 'low';
  }

  /**
   * Extract affected features
   */
  extractAffectedFeatures(content) {
    const features = [];
    const featurePatterns = {
      'permissions': /\bpermissions?\b/gi,
      'deployment': /\bdeployment?\b/gi,
      'build': /\bbuild(ing)?\b/gi,
      'api': /\bapi\b/gi,
      'database': /\bdatabase|db\b/gi,
      'authentication': /\bauth(entication)?\b/gi
    };

    for (const [feature, pattern] of Object.entries(featurePatterns)) {
      if (pattern.test(content)) {
        features.push(feature);
      }
    }

    return features;
  }

  /**
   * Extract steps from how-to content
   */
  extractSteps(content) {
    const steps = [];
    const lines = content.split('\n');
    
    const stepPatterns = [
      /^(\d+\.|\*|-)\s+(.+)$/,  // Numbered or bulleted lists
      /\b(step \d+|first|then|next|finally)[:.]?\s*(.+)/i
    ];

    lines.forEach(line => {
      for (const pattern of stepPatterns) {
        const match = line.match(pattern);
        if (match) {
          steps.push(match[match.length - 1].trim());
          break;
        }
      }
    });

    return steps;
  }

  /**
   * Extract prerequisites
   */
  extractPrerequisites(content) {
    const prereqs = [];
    const prereqPatterns = [
      /\b(require|need|must have|prerequisite)[:.]?\s*(.+)/i,
      /\bbefore\s+(.+?),/i
    ];

    prereqPatterns.forEach(pattern => {
      const match = content.match(pattern);
      if (match) {
        prereqs.push(match[match.length - 1].trim());
      }
    });

    return prereqs;
  }

  /**
   * Extract question from Q&A content
   */
  extractQuestion(content) {
    const questionMatch = content.match(/([^.!?]*\?)/);
    return questionMatch ? questionMatch[1].trim() : null;
  }

  /**
   * Extract answer from Q&A content
   */
  extractAnswer(content) {
    const parts = content.split('?');
    if (parts.length > 1) {
      // Get the part after the question
      return parts.slice(1).join('?').trim().substring(0, 200);
    }
    return null;
  }

  /**
   * Extract benefit from tip
   */
  extractBenefit(content) {
    const benefitPatterns = [
      /\b(improve|faster|better|easier|cleaner|more efficient)\s+(.+)/i,
      /\bresults? in\s+(.+)/i,
      /\bhelps?\s+(.+)/i
    ];

    for (const pattern of benefitPatterns) {
      const match = content.match(pattern);
      if (match) {
        return match[match.length - 1].trim();
      }
    }

    return null;
  }

  /**
   * Extract use case
   */
  extractUseCase(content) {
    const useCasePatterns = [
      /\bwhen\s+(.+?)[,.]/i,
      /\buse(ful)?\s+(for|when)\s+(.+?)[,.]/i,
      /\bif you\s+(.+?)[,.]/i
    ];

    for (const pattern of useCasePatterns) {
      const match = content.match(pattern);
      if (match) {
        return match[match.length - 1].trim();
      }
    }

    return null;
  }

  /**
   * Extract analogy from mental model
   */
  extractAnalogy(content) {
    const analogyPatterns = [
      /\blike\s+(.+?)[,.]/i,
      /\bsimilar to\s+(.+?)[,.]/i,
      /\bthink of it as\s+(.+?)[,.]/i
    ];

    for (const pattern of analogyPatterns) {
      const match = content.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    return null;
  }

  /**
   * Extract principles
   */
  extractPrinciples(content) {
    const principles = [];
    const principleKeywords = [
      'principle', 'rule', 'concept', 'idea', 'approach'
    ];

    const lines = content.split('\n');
    lines.forEach(line => {
      if (principleKeywords.some(keyword => line.toLowerCase().includes(keyword))) {
        principles.push(line.trim());
      }
    });

    return principles.slice(0, 5);  // Limit to top 5
  }

  /**
   * Extract components from internals
   */
  extractComponents(content) {
    const components = [];
    const componentPatterns = [
      /\b(component|module|service|layer|system)\s+(\w+)/gi,
      /\b(\w+)\s+(component|module|service|layer|system)/gi
    ];

    componentPatterns.forEach(pattern => {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        components.push(match[1] === 'component' ? match[2] : match[1]);
      }
    });

    return [...new Set(components)];  // Remove duplicates
  }

  /**
   * Extract flow description
   */
  extractFlow(content) {
    const flowIndicators = [
      'first', 'then', 'next', 'after', 'finally',
      'starts', 'processes', 'sends', 'receives', 'returns'
    ];

    const hasFlow = flowIndicators.some(indicator => 
      content.toLowerCase().includes(indicator)
    );

    return hasFlow ? 'sequential' : 'parallel';
  }

  /**
   * Validate classification results
   */
  validate(classification) {
    const errors = [];
    const warnings = [];

    // Check for required fields
    if (!classification.primary) {
      errors.push('Missing primary category');
    }

    // Check confidence levels
    if (classification.primaryConfidence < 0.5) {
      warnings.push('Low confidence in primary category');
    }

    // Check for conflicts
    if (classification.isMultiCategory && classification.multiCategories.length > 3) {
      warnings.push('Content matches too many categories');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}

module.exports = ContentClassifier;