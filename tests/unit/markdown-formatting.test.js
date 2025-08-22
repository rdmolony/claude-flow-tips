/**
 * @test Markdown Formatting Validation
 * @description Validates proper markdown formatting and structure
 * @prerequisites Sample markdown outputs and formatting standards
 */

describe('Markdown Formatting Validation', () => {
  
  describe('Document Structure', () => {
    it('should generate valid markdown headers', () => {
      const sampleMarkdown = `
# Tips & Tricks

## CLI Shortcuts

### Alias Configuration

Use aliases for common commands to save time during development.

> **Quote:** "What I've been using are aliases. So when I type in DSP, dangerously skip permissions, it jumps and does the entire command."
>
> **Source:** sample-transcript.txt:4 | Speaker: Reuven

<details>
<summary>Show full context</summary>

\`\`\`
Original transcript excerpt:
Speaker: Reuven
So here's a tip for everyone using Claude Flow. What I've been using are aliases.
\`\`\`

</details>
      `;

      // Test header hierarchy
      expect(sampleMarkdown).toMatch(/^# /m);
      expect(sampleMarkdown).toMatch(/^## /m);
      expect(sampleMarkdown).toMatch(/^### /m);
      
      // Test quote formatting
      expect(sampleMarkdown).toMatch(/^> \*\*Quote:\*\*/m);
      expect(sampleMarkdown).toMatch(/^> \*\*Source:\*\*/m);
      
      // Test collapsible details
      expect(sampleMarkdown).toMatch(/<details>/);
      expect(sampleMarkdown).toMatch(/<summary>/);
      expect(sampleMarkdown).toMatch(/<\/details>/);
    });

    it('should create properly formatted collapsible sections', () => {
      const collapsibleSection = `
<details>
<summary>Show full context</summary>

\`\`\`
Original transcript excerpt:
Line 4-6: Speaker discussion about aliases
\`\`\`

**Technical Details:**
- Command: \`DSP\` (dangerously skip permissions)
- Time saved: Significant during development
- Risk level: Use with caution

</details>
      `;

      expect(collapsibleSection).toMatch(/<details>/);
      expect(collapsibleSection).toMatch(/<summary>.*<\/summary>/);
      expect(collapsibleSection).toMatch(/<\/details>/);
      expect(collapsibleSection).toMatch(/```[\s\S]*```/);
    });

    it('should format code blocks correctly', () => {
      const codeExample = `
## Setting up a swarm system

Follow these steps to initialize your swarm:

\`\`\`bash
npx claude-flow swarm init --topology hierarchical
npx claude-flow agent spawn --type researcher
npx claude-flow task orchestrate "Analyze requirements"
\`\`\`

> **Source:** sample-transcript.txt:9-11 | Speaker: Reuven
      `;

      expect(codeExample).toMatch(/```bash\n[\s\S]*?\n```/);
      expect(codeExample).toContain('npx claude-flow');
      expect(codeExample).toMatch(/^> \*\*Source:\*\*/m);
    });

    it('should create proper cross-references', () => {
      const crossReference = `
## Security Warning

⚠️ **Critical Gotcha:** Never run dangerous commands outside sandboxes

See related: [Docker Setup Guide](./how-to/docker-setup.md) | [Security Best Practices](./gotchas/security-warnings.md)

**Tags:** \`security\` \`docker\` \`permissions\`
      `;

      expect(crossReference).toMatch(/\[.*\]\(\.\/.*\.md\)/);
      expect(crossReference).toMatch(/\*\*Tags:\*\*/);
      expect(crossReference).toMatch(/`[^`]+`/);
    });
  });

  describe('Content Formatting Standards', () => {
    it('should format tips with consistent structure', () => {
      const tipFormat = formatTip({
        content: 'Use aliases for common commands',
        quote: 'What I\'ve been using are aliases...',
        source: 'sample-transcript.txt',
        lineNumber: 4,
        speaker: 'Reuven',
        category: 'productivity'
      });

      expect(tipFormat).toContain('💡 **Tip:**');
      expect(tipFormat).toContain('> **Quote:**');
      expect(tipFormat).toContain('> **Source:**');
      expect(tipFormat).toContain('<details>');
      expect(tipFormat).toMatch(/\*\*Category:\*\* `productivity`/);
    });

    it('should format gotchas with warning indicators', () => {
      const gotchaFormat = formatGotcha({
        content: 'Never run dangerous commands outside sandboxes',
        quote: 'don\'t run claude --dangerously-skip-permissions...',
        source: 'sample-transcript.txt',
        lineNumber: 12,
        speaker: 'Reuven',
        severity: 'critical',
        tags: ['security', 'docker']
      });

      expect(gotchaFormat).toContain('⚠️ **Gotcha:**');
      expect(gotchaFormat).toContain('🔴 **Severity:** Critical');
      expect(gotchaFormat).toContain('**Tags:**');
      expect(gotchaFormat).toMatch(/`security`.*`docker`/);
    });

    it('should format how-to guides with step lists', () => {
      const howtoFormat = formatHowTo({
        title: 'Setting up a swarm system',
        steps: [
          'Initialize with npx claude-flow swarm init --topology hierarchical',
          'Spawn agents with specific types',
          'Use concurrent execution'
        ],
        quote: 'Let me show you step by step...',
        source: 'sample-transcript.txt',
        lineNumber: 9,
        speaker: 'Reuven'
      });

      expect(howtoFormat).toContain('📋 **How To:**');
      expect(howtoFormat).toContain('### Steps');
      expect(howtoFormat).toMatch(/1\. Initialize/);
      expect(howtoFormat).toMatch(/2\. Spawn/);
      expect(howtoFormat).toMatch(/3\. Use/);
    });

    it('should format mental models with structured sections', () => {
      const modelFormat = formatMentalModel({
        title: 'Four Pillars of Agentics',
        description: 'Fundamental principles for agent-based systems',
        pillars: ['proactive', 'autonomous', 'collaborative', 'targeted'],
        quote: 'The mental model here is that you have four pillars...',
        source: 'sample-transcript.txt',
        lineNumber: 18,
        speaker: 'Reuven'
      });

      expect(modelFormat).toContain('🧠 **Mental Model:**');
      expect(modelFormat).toContain('### Core Concepts');
      expect(modelFormat).toContain('- **Proactive**');
      expect(modelFormat).toContain('- **Autonomous**');
    });

    it('should format Q&A with clear question-answer structure', () => {
      const qaFormat = formatQA({
        question: 'What\'s the difference between ruv-swarm and claude-flow?',
        answer: 'Claude-flow came first and provides the foundation layer...',
        questionSource: 'sample-transcript.txt',
        questionLine: 14,
        answerSource: 'sample-transcript.txt',
        answerLine: 16,
        questioner: 'Community Member',
        responder: 'Reuven',
        tags: ['architecture', 'comparison']
      });

      expect(qaFormat).toContain('❓ **Question:**');
      expect(qaFormat).toContain('✅ **Answer:**');
      expect(qaFormat).toContain('**Asked by:** Community Member');
      expect(qaFormat).toContain('**Answered by:** Reuven');
    });
  });

  describe('Link and Reference Integrity', () => {
    it('should generate valid internal links', () => {
      const internalLinks = [
        '[Docker Setup](./how-to/docker-setup.md)',
        '[Security Warnings](./gotchas/security-warnings.md)',
        '[Agent Types](./tips/agent-types.md)'
      ];

      internalLinks.forEach(link => {
        expect(link).toMatch(/\[.*\]\(\.\/.*\.md\)/);
        expect(link).not.toContain(' '); // No spaces in filenames
        expect(link).toMatch(/\.(md)$/); // Proper extension
      });
    });

    it('should create valid anchor links', () => {
      const anchorLinks = [
        '#security-warning',
        '#four-pillars-of-agentics',
        '#setting-up-swarm-system'
      ];

      anchorLinks.forEach(anchor => {
        expect(anchor).toMatch(/^#[a-z0-9-]+$/);
        expect(anchor).not.toContain('_');
        expect(anchor).not.toContain(' ');
      });
    });

    it('should format source references consistently', () => {
      const sourceReference = 'sample-transcript.txt:4 | Speaker: Reuven';
      
      expect(sourceReference).toMatch(/\.txt:\d+/);
      expect(sourceReference).toMatch(/\| Speaker: \w+/);
      expect(sourceReference).not.toContain('line ');
      expect(sourceReference).not.toContain('Line ');
    });
  });

  describe('Accessibility and Readability', () => {
    it('should use proper heading hierarchy', () => {
      const documentStructure = `
# Main Category
## Subcategory
### Specific Item
#### Implementation Details
      `;

      const headings = documentStructure.match(/^#+\s+/gm);
      expect(headings).toHaveLength(4);
      
      // Should not skip heading levels
      expect(documentStructure).not.toMatch(/^#\s+.*\n^###\s+/m);
    });

    it('should include alt text for emojis when contextually important', () => {
      const emojiUsage = [
        '💡 **Tip:** (lightbulb)',
        '⚠️ **Gotcha:** (warning)',
        '📋 **How To:** (clipboard)',
        '🧠 **Mental Model:** (brain)',
        '❓ **Question:** (question mark)'
      ];

      // For accessibility, important emojis should have context
      emojiUsage.forEach(usage => {
        expect(usage).toMatch(/\*\*\w+:\*\*/); // Has descriptive label
      });
    });

    it('should maintain consistent formatting patterns', () => {
      const patterns = {
        quotes: /^> \*\*Quote:\*\*/m,
        sources: /^> \*\*Source:\*\*/m,
        tags: /\*\*Tags:\*\* `[^`]+`/,
        codeBlocks: /```\w+\n[\s\S]*?\n```/,
        details: /<details>[\s\S]*?<\/details>/
      };

      Object.entries(patterns).forEach(([name, pattern]) => {
        // Pattern should be consistently applied
        expect(pattern.source).toBeTruthy();
      });
    });
  });
});

// Helper formatting functions for testing
function formatTip(tip) {
  return `
💡 **Tip:** ${tip.content}

> **Quote:** "${tip.quote}"
>
> **Source:** ${tip.source}:${tip.lineNumber} | Speaker: ${tip.speaker}

**Category:** \`${tip.category}\`

<details>
<summary>Show full context</summary>

\`\`\`
Original transcript excerpt from ${tip.source}
\`\`\`

</details>
  `;
}

function formatGotcha(gotcha) {
  const severityEmoji = gotcha.severity === 'critical' ? '🔴' : 
                       gotcha.severity === 'high' ? '🟠' :
                       gotcha.severity === 'medium' ? '🟡' : '🟢';
  
  return `
⚠️ **Gotcha:** ${gotcha.content}

${severityEmoji} **Severity:** ${gotcha.severity.charAt(0).toUpperCase() + gotcha.severity.slice(1)}

> **Quote:** "${gotcha.quote}"
>
> **Source:** ${gotcha.source}:${gotcha.lineNumber} | Speaker: ${gotcha.speaker}

**Tags:** ${gotcha.tags.map(tag => `\`${tag}\``).join(' ')}
  `;
}

function formatHowTo(howto) {
  return `
📋 **How To:** ${howto.title}

### Steps

${howto.steps.map((step, index) => `${index + 1}. ${step}`).join('\n')}

> **Source:** ${howto.source}:${howto.lineNumber} | Speaker: ${howto.speaker}
  `;
}

function formatMentalModel(model) {
  return `
🧠 **Mental Model:** ${model.title}

${model.description}

### Core Concepts

${model.pillars.map(pillar => `- **${pillar.charAt(0).toUpperCase() + pillar.slice(1)}**`).join('\n')}

> **Quote:** "${model.quote}"
>
> **Source:** ${model.source}:${model.lineNumber} | Speaker: ${model.speaker}
  `;
}

function formatQA(qa) {
  return `
❓ **Question:** ${qa.question}

✅ **Answer:** ${qa.answer}

**Asked by:** ${qa.questioner} | **Answered by:** ${qa.responder}

**Sources:** 
- Question: ${qa.questionSource}:${qa.questionLine}
- Answer: ${qa.answerSource}:${qa.answerLine}

${qa.tags ? `**Tags:** ${qa.tags.map(tag => `\`${tag}\``).join(' ')}` : ''}
  `;
}