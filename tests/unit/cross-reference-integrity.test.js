/**
 * @test Cross-Reference Integrity
 * @description Validates that all cross-references between documents are valid
 * @prerequisites Mock file system and sample documentation structure
 */

const path = require('path');

describe('Cross-Reference Integrity', () => {
  
  describe('Internal Link Validation', () => {
    const mockFileStructure = {
      'docs/tips/cli-shortcuts.md': true,
      'docs/gotchas/security-warnings.md': true,
      'docs/how-to/docker-setup.md': true,
      'docs/how-to/swarm-setup.md': true,
      'docs/mental-models/agentic-principles.md': true,
      'docs/qa/technical-questions.md': true
    };

    it('should validate all internal links exist', () => {
      const sampleContent = `
# Tips Collection

Related topics:
- [Security Warnings](../gotchas/security-warnings.md)
- [Docker Setup](../how-to/docker-setup.md) 
- [Agentic Principles](../mental-models/agentic-principles.md)

See also: [Technical Q&A](../qa/technical-questions.md)
      `;

      const links = extractInternalLinks(sampleContent);
      
      links.forEach(link => {
        const normalizedPath = normalizePath(link.href, 'docs/tips/');
        expect(mockFileStructure[normalizedPath]).toBe(true);
      });
    });

    it('should validate relative path resolution', () => {
      const testCases = [
        {
          currentFile: 'docs/tips/cli-shortcuts.md',
          linkHref: '../gotchas/security-warnings.md',
          expectedPath: 'docs/gotchas/security-warnings.md'
        },
        {
          currentFile: 'docs/how-to/docker-setup.md', 
          linkHref: '../tips/cli-shortcuts.md',
          expectedPath: 'docs/tips/cli-shortcuts.md'
        },
        {
          currentFile: 'docs/qa/technical-questions.md',
          linkHref: '../mental-models/agentic-principles.md',
          expectedPath: 'docs/mental-models/agentic-principles.md'
        }
      ];

      testCases.forEach(({ currentFile, linkHref, expectedPath }) => {
        const resolved = normalizePath(linkHref, currentFile);
        expect(resolved).toBe(expectedPath);
        expect(mockFileStructure[resolved]).toBe(true);
      });
    });

    it('should detect broken internal links', () => {
      const contentWithBrokenLinks = `
# Test Document

Links:
- [Existing File](../gotchas/security-warnings.md) ✓
- [Broken Link](../nonexistent/missing.md) ✗  
- [Another Broken](../how-to/missing-guide.md) ✗
      `;

      const links = extractInternalLinks(contentWithBrokenLinks);
      const brokenLinks = links.filter(link => {
        const normalizedPath = normalizePath(link.href, 'docs/tips/');
        return !mockFileStructure[normalizedPath];
      });

      expect(brokenLinks).toHaveLength(2);
      expect(brokenLinks[0].href).toContain('nonexistent/missing.md');
      expect(brokenLinks[1].href).toContain('missing-guide.md');
    });

    it('should validate anchor links within documents', () => {
      const contentWithAnchors = `
# Main Document

## Section 1 {#section-1}

Content here. See [Section 2](#section-2) for more details.

## Section 2 {#section-2}

More content. Back to [Section 1](#section-1).

## Invalid Reference

This link is broken: [Non-existent Section](#missing-section)
      `;

      const anchorLinks = extractAnchorLinks(contentWithAnchors);
      const definedAnchors = extractDefinedAnchors(contentWithAnchors);

      const validAnchors = anchorLinks.filter(link => 
        definedAnchors.includes(link.anchor)
      );
      const brokenAnchors = anchorLinks.filter(link => 
        !definedAnchors.includes(link.anchor)
      );

      expect(validAnchors).toHaveLength(2);
      expect(brokenAnchors).toHaveLength(1);
      expect(brokenAnchors[0].anchor).toBe('missing-section');
    });
  });

  describe('Tag and Category Cross-References', () => {
    const mockTaggedContent = [
      {
        file: 'docs/tips/cli-shortcuts.md',
        tags: ['productivity', 'cli', 'shortcuts']
      },
      {
        file: 'docs/gotchas/security-warnings.md', 
        tags: ['security', 'docker', 'permissions']
      },
      {
        file: 'docs/how-to/swarm-setup.md',
        tags: ['swarm', 'setup', 'agents']
      }
    ];

    it('should validate tag consistency across documents', () => {
      const allTags = mockTaggedContent.flatMap(content => content.tags);
      const uniqueTags = [...new Set(allTags)];

      // No duplicate tags within same document
      mockTaggedContent.forEach(content => {
        const tagSet = new Set(content.tags);
        expect(tagSet.size).toBe(content.tags.length);
      });

      // All tags should be lowercase and alphanumeric + hyphens
      uniqueTags.forEach(tag => {
        expect(tag).toMatch(/^[a-z0-9-]+$/);
        expect(tag.length).toBeGreaterThan(2);
      });
    });

    it('should validate category-based cross-references', () => {
      const categoryMappings = {
        'tips': ['productivity', 'shortcuts', 'efficiency'],
        'gotchas': ['security', 'warnings', 'pitfalls'],
        'how-to': ['setup', 'configuration', 'tutorial'],
        'mental-models': ['concepts', 'frameworks', 'principles'],
        'qa': ['questions', 'troubleshooting', 'help']
      };

      mockTaggedContent.forEach(content => {
        const category = content.file.split('/')[1]; // Extract category from path
        const expectedTags = categoryMappings[category] || [];
        
        // Should have at least one tag matching the category
        const hasMatchingTag = content.tags.some(tag => 
          expectedTags.some(expectedTag => 
            tag.includes(expectedTag) || expectedTag.includes(tag)
          )
        );
        
        expect(hasMatchingTag).toBe(true);
      });
    });

    it('should maintain bidirectional tag references', () => {
      const securityRelatedFiles = mockTaggedContent.filter(content =>
        content.tags.includes('security')
      );

      const dockerRelatedFiles = mockTaggedContent.filter(content =>
        content.tags.includes('docker')  
      );

      // Security and Docker should be cross-referenced
      expect(securityRelatedFiles.length).toBeGreaterThan(0);
      expect(dockerRelatedFiles.length).toBeGreaterThan(0);
      
      // Files with both tags should exist
      const crossReferencedFiles = mockTaggedContent.filter(content =>
        content.tags.includes('security') && content.tags.includes('docker')
      );
      
      expect(crossReferencedFiles.length).toBeGreaterThan(0);
    });
  });

  describe('Source Reference Integrity', () => {
    it('should validate all transcript source references', () => {
      const mockTranscriptFiles = [
        'en-AI Hacker League July 10.txt',
        'en-AI Hackerspace August 1st.txt',
        'sample-transcript.txt'
      ];

      const sampleReferences = [
        'sample-transcript.txt:4',
        'en-AI Hacker League July 10.txt:156',
        'invalid-transcript.txt:1' // This should fail
      ];

      const validReferences = sampleReferences.filter(ref => {
        const filename = ref.split(':')[0];
        return mockTranscriptFiles.includes(filename);
      });

      const invalidReferences = sampleReferences.filter(ref => {
        const filename = ref.split(':')[0];
        return !mockTranscriptFiles.includes(filename);
      });

      expect(validReferences).toHaveLength(2);
      expect(invalidReferences).toHaveLength(1);
      expect(invalidReferences[0]).toContain('invalid-transcript.txt');
    });

    it('should validate line number references', () => {
      const mockTranscriptLineCounts = {
        'sample-transcript.txt': 25,
        'en-AI Hacker League July 10.txt': 2506
      };

      const lineReferences = [
        'sample-transcript.txt:4', // Valid
        'sample-transcript.txt:25', // Valid (last line)
        'sample-transcript.txt:26', // Invalid (beyond end)
        'en-AI Hacker League July 10.txt:1000', // Valid
        'en-AI Hacker League July 10.txt:3000' // Invalid (beyond end)
      ];

      const results = lineReferences.map(ref => {
        const [filename, lineStr] = ref.split(':');
        const lineNumber = parseInt(lineStr);
        const maxLines = mockTranscriptLineCounts[filename];
        
        return {
          ref,
          valid: lineNumber > 0 && lineNumber <= maxLines
        };
      });

      const validRefs = results.filter(r => r.valid);
      const invalidRefs = results.filter(r => !r.valid);

      expect(validRefs).toHaveLength(3);
      expect(invalidRefs).toHaveLength(2);
    });

    it('should validate speaker attribution consistency', () => {
      const mockSpeakers = {
        'sample-transcript.txt': ['Reuven', 'Community Member', 'Guest'],
        'en-AI Hacker League July 10.txt': ['Reuven', 'John Doe', 'Jane Smith']
      };

      const attributions = [
        { source: 'sample-transcript.txt', speaker: 'Reuven' }, // Valid
        { source: 'sample-transcript.txt', speaker: 'Guest' }, // Valid  
        { source: 'sample-transcript.txt', speaker: 'Unknown Person' }, // Invalid
        { source: 'en-AI Hacker League July 10.txt', speaker: 'John Doe' }, // Valid
        { source: 'en-AI Hacker League July 10.txt', speaker: 'Random Speaker' } // Invalid
      ];

      const results = attributions.map(attr => ({
        ...attr,
        valid: mockSpeakers[attr.source]?.includes(attr.speaker) || false
      }));

      const validAttributions = results.filter(r => r.valid);
      const invalidAttributions = results.filter(r => !r.valid);

      expect(validAttributions).toHaveLength(3);
      expect(invalidAttributions).toHaveLength(2);
    });
  });

  describe('Navigation Structure Integrity', () => {
    it('should validate main index references', () => {
      const mainIndexContent = `
# Claude Flow Documentation

## Categories

- [Tips & Tricks](./tips/README.md)
- [Gotchas & Warnings](./gotchas/README.md)
- [How-To Guides](./how-to/README.md)
- [Mental Models](./mental-models/README.md)
- [Q&A Sessions](./qa/README.md)
      `;

      const categoryLinks = extractInternalLinks(mainIndexContent);
      
      expect(categoryLinks).toHaveLength(5);
      categoryLinks.forEach(link => {
        expect(link.href).toMatch(/^\.\/[a-z-]+\/README\.md$/);
      });
    });

    it('should validate breadcrumb navigation', () => {
      const sampleBreadcrumb = `
[Home](../../README.md) > [Tips](../README.md) > CLI Shortcuts
      `;

      const breadcrumbLinks = extractInternalLinks(sampleBreadcrumb);
      
      expect(breadcrumbLinks).toHaveLength(2);
      expect(breadcrumbLinks[0].text).toBe('Home');
      expect(breadcrumbLinks[1].text).toBe('Tips');
    });

    it('should validate table of contents links', () => {
      const tocContent = `
## Table of Contents

- [Basic Commands](#basic-commands)
- [Advanced Usage](#advanced-usage)  
- [Troubleshooting](#troubleshooting)

## Basic Commands {#basic-commands}
Content here...

## Advanced Usage {#advanced-usage}
More content...

## Troubleshooting {#troubleshooting}
Help content...
      `;

      const tocLinks = extractAnchorLinks(tocContent);
      const definedAnchors = extractDefinedAnchors(tocContent);

      expect(tocLinks).toHaveLength(3);
      expect(definedAnchors).toHaveLength(3);
      
      // All TOC links should have corresponding anchors
      tocLinks.forEach(link => {
        expect(definedAnchors).toContain(link.anchor);
      });
    });
  });
});

// Helper functions for link extraction and validation
function extractInternalLinks(content) {
  const linkRegex = /\[([^\]]+)\]\(([^)]+\.md[^)]*)\)/g;
  const links = [];
  let match;

  while ((match = linkRegex.exec(content)) !== null) {
    links.push({
      text: match[1],
      href: match[2],
      full: match[0]
    });
  }

  return links;
}

function extractAnchorLinks(content) {
  const anchorRegex = /\[([^\]]+)\]\(#([^)]+)\)/g;
  const links = [];
  let match;

  while ((match = anchorRegex.exec(content)) !== null) {
    links.push({
      text: match[1],
      anchor: match[2],
      full: match[0]
    });
  }

  return links;
}

function extractDefinedAnchors(content) {
  const anchorRegex = /\{#([^}]+)\}/g;
  const anchors = [];
  let match;

  while ((match = anchorRegex.exec(content)) !== null) {
    anchors.push(match[1]);
  }

  return anchors;
}

function normalizePath(relativePath, currentFile) {
  const currentDir = path.dirname(currentFile);
  const resolvedPath = path.resolve(currentDir, relativePath);
  return resolvedPath.replace(/\\/g, '/'); // Normalize for cross-platform
}