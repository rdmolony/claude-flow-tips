#!/usr/bin/env node

/**
 * Documentation Generator - Creates structured markdown documentation
 * 
 * This module takes extracted patterns and generates well-structured markdown
 * documentation with proper formatting, navigation, and source references.
 */

const fs = require('fs').promises;
const path = require('path');

class DocumentationGenerator {
    constructor(outputDir = './docs/poc') {
        this.outputDir = outputDir;
        this.templateDir = path.join(__dirname, 'templates');
    }

    /**
     * Generate complete documentation site
     */
    async generateDocumentation(extractedData) {
        try {
            await this.ensureOutputDirectory();
            
            // Generate main index
            await this.generateIndex(extractedData);
            
            // Generate category pages
            await this.generateTips(extractedData);
            await this.generateGotchas(extractedData);
            await this.generateHowTos(extractedData);
            await this.generateMentalModels(extractedData);
            await this.generateQuestions(extractedData);
            
            // Generate navigation
            await this.generateNavigation();
            
            // Generate source index
            await this.generateSourceIndex(extractedData);
            
            console.log(`Documentation generated in ${this.outputDir}`);
            
        } catch (error) {
            console.error('Error generating documentation:', error);
            throw error;
        }
    }

    /**
     * Ensure output directory exists
     */
    async ensureOutputDirectory() {
        try {
            await fs.mkdir(this.outputDir, { recursive: true });
        } catch (error) {
            if (error.code !== 'EEXIST') throw error;
        }
    }

    /**
     * Generate main index page
     */
    async generateIndex(extractedData) {
        const stats = this.calculateStats(extractedData);
        
        const content = `# Claude Flow Documentation Hub

Welcome to the Claude Flow community knowledge base! This documentation is automatically extracted from community videos and transcripts.

## 📊 Content Overview

- **${stats.tips}** Tips and Best Practices
- **${stats.gotchas}** Gotchas and Warnings  
- **${stats.howtos}** How-To Guides
- **${stats.mentalModels}** Mental Models and Concepts
- **${stats.questions}** Questions and Answers

## 🗂️ Browse by Category

### [💡 Tips](./tips.md)
Community-shared tips and best practices for using Claude Flow effectively.

### [⚠️ Gotchas](./gotchas.md) 
Important warnings and common pitfalls to avoid.

### [📋 How-To Guides](./howtos.md)
Step-by-step guides for specific tasks and workflows.

### [🧠 Mental Models](./mental-models.md)
Conceptual frameworks and ways of thinking about Claude Flow.

### [❓ Questions & Answers](./questions.md)
Common questions from the community with answers.

## 📚 Source Files

View the [source index](./sources.md) to see which transcripts each piece of content comes from.

## 🔍 How This Works

This documentation is automatically generated from community video transcripts using:

1. **Pattern Extraction** - Identifies different types of content using NLP patterns
2. **Quality Scoring** - Filters and ranks content by relevance and clarity  
3. **Source Linking** - Maintains links back to original transcript sources
4. **Structured Output** - Organizes content into browsable categories

---

*Last updated: ${new Date().toISOString().split('T')[0]}*
*Total sources processed: ${stats.sources}*
`;

        await fs.writeFile(path.join(this.outputDir, 'index.md'), content);
    }

    /**
     * Generate tips page
     */
    async generateTips(extractedData) {
        const tips = this.getAllByType(extractedData, 'tips')
            .sort((a, b) => b.quality - a.quality)
            .slice(0, 50); // Top 50 tips

        let content = `# 💡 Tips and Best Practices

Community-shared tips for using Claude Flow effectively.

`;

        for (let i = 0; i < tips.length; i++) {
            const tip = tips[i];
            content += this.formatTip(tip, i + 1);
        }

        content += this.generateFooter('tips', tips.length);
        
        await fs.writeFile(path.join(this.outputDir, 'tips.md'), content);
    }

    /**
     * Generate gotchas page
     */
    async generateGotchas(extractedData) {
        const gotchas = this.getAllByType(extractedData, 'gotchas')
            .sort((a, b) => b.quality - a.quality)
            .slice(0, 50);

        let content = `# ⚠️ Gotchas and Warnings

Important warnings and common pitfalls to avoid when using Claude Flow.

`;

        for (let i = 0; i < gotchas.length; i++) {
            const gotcha = gotchas[i];
            content += this.formatGotcha(gotcha, i + 1);
        }

        content += this.generateFooter('gotchas', gotchas.length);
        
        await fs.writeFile(path.join(this.outputDir, 'gotchas.md'), content);
    }

    /**
     * Generate how-to guides page
     */
    async generateHowTos(extractedData) {
        const howtos = this.getAllByType(extractedData, 'howtos')
            .sort((a, b) => b.quality - a.quality)
            .slice(0, 30);

        let content = `# 📋 How-To Guides

Step-by-step guides for specific Claude Flow tasks and workflows.

`;

        for (let i = 0; i < howtos.length; i++) {
            const howto = howtos[i];
            content += this.formatHowTo(howto, i + 1);
        }

        content += this.generateFooter('how-tos', howtos.length);
        
        await fs.writeFile(path.join(this.outputDir, 'howtos.md'), content);
    }

    /**
     * Generate mental models page
     */
    async generateMentalModels(extractedData) {
        const models = this.getAllByType(extractedData, 'mentalModels')
            .sort((a, b) => b.quality - a.quality)
            .slice(0, 30);

        let content = `# 🧠 Mental Models and Concepts

Conceptual frameworks and ways of thinking about Claude Flow.

`;

        for (let i = 0; i < models.length; i++) {
            const model = models[i];
            content += this.formatMentalModel(model, i + 1);
        }

        content += this.generateFooter('mental models', models.length);
        
        await fs.writeFile(path.join(this.outputDir, 'mental-models.md'), content);
    }

    /**
     * Generate questions page
     */
    async generateQuestions(extractedData) {
        const questions = this.getAllByType(extractedData, 'questions')
            .sort((a, b) => b.quality - a.quality)
            .slice(0, 40);

        let content = `# ❓ Questions and Answers

Common questions from the Claude Flow community with answers.

`;

        for (let i = 0; i < questions.length; i++) {
            const question = questions[i];
            content += this.formatQuestion(question, i + 1);
        }

        content += this.generateFooter('questions', questions.length);
        
        await fs.writeFile(path.join(this.outputDir, 'questions.md'), content);
    }

    /**
     * Format individual content items
     */
    formatTip(tip, index) {
        const severity = tip.keyInfo?.actionable ? '🎯' : '💭';
        const tools = tip.keyInfo?.tools?.length ? `\n\n**Tools mentioned:** ${tip.keyInfo.tools.join(', ')}` : '';
        
        return `## ${severity} Tip ${index}

${this.cleanAndFormatContent(tip.content)}${tools}

<details>
<summary>📍 Source & Context</summary>

**Source:** \`${tip.source}\` (Line ${tip.lineNumber})  
**Quality Score:** ${(tip.quality * 100).toFixed(0)}%

**Original Quote:**
> ${this.formatQuote(tip.content)}

</details>

---

`;
    }

    formatGotcha(gotcha, index) {
        const severityIcon = gotcha.keyInfo?.severity === 'high' ? '🚨' : 
                           gotcha.keyInfo?.severity === 'medium' ? '⚠️' : '⚡';
        const affects = gotcha.keyInfo?.affects?.length ? `\n\n**May affect:** ${gotcha.keyInfo.affects.join(', ')}` : '';
        
        return `## ${severityIcon} Gotcha ${index}

${this.cleanAndFormatContent(gotcha.content)}${affects}

<details>
<summary>📍 Source & Context</summary>

**Source:** \`${gotcha.source}\` (Line ${gotcha.lineNumber})  
**Quality Score:** ${(gotcha.quality * 100).toFixed(0)}%  
**Severity:** ${gotcha.keyInfo?.severity || 'unknown'}

**Original Quote:**
> ${this.formatQuote(gotcha.content)}

</details>

---

`;
    }

    formatHowTo(howto, index) {
        const difficulty = howto.keyInfo?.difficulty || 'medium';
        const difficultyIcon = difficulty === 'easy' ? '🟢' : difficulty === 'hard' ? '🔴' : '🟡';
        const steps = howto.keyInfo?.steps > 1 ? `\n\n**Steps involved:** ~${howto.keyInfo.steps}` : '';
        
        return `## ${difficultyIcon} How-To ${index}

${this.cleanAndFormatContent(howto.content)}${steps}

<details>
<summary>📍 Source & Context</summary>

**Source:** \`${howto.source}\` (Line ${howto.lineNumber})  
**Quality Score:** ${(howto.quality * 100).toFixed(0)}%  
**Difficulty:** ${difficulty}

**Original Quote:**
> ${this.formatQuote(howto.content)}

</details>

---

`;
    }

    formatMentalModel(model, index) {
        const domain = model.keyInfo?.domain || 'general';
        const concept = model.keyInfo?.concept ? `\n\n**Core concept:** ${model.keyInfo.concept}` : '';
        
        return `## 🧠 Mental Model ${index} (${domain})

${this.cleanAndFormatContent(model.content)}${concept}

<details>
<summary>📍 Source & Context</summary>

**Source:** \`${model.source}\` (Line ${model.lineNumber})  
**Quality Score:** ${(model.quality * 100).toFixed(0)}%  
**Domain:** ${domain}

**Original Quote:**
> ${this.formatQuote(model.content)}

</details>

---

`;
    }

    formatQuestion(question, index) {
        const category = question.keyInfo?.category || 'general';
        const hasAnswer = question.keyInfo?.hasAnswer ? '✅' : '❓';
        
        return `## ${hasAnswer} Question ${index} (${category})

${this.cleanAndFormatContent(question.content)}

<details>
<summary>📍 Source & Context</summary>

**Source:** \`${question.source}\` (Line ${question.lineNumber})  
**Quality Score:** ${(question.quality * 100).toFixed(0)}%  
**Category:** ${category}  
**Has Answer:** ${question.keyInfo?.hasAnswer ? 'Yes' : 'Unknown'}

**Original Quote:**
> ${this.formatQuote(question.content)}

</details>

---

`;
    }

    /**
     * Utility methods
     */
    getAllByType(extractedData, type) {
        const items = [];
        for (const transcript of extractedData) {
            if (transcript[type]) {
                items.push(...transcript[type]);
            }
        }
        return items;
    }

    calculateStats(extractedData) {
        const stats = { tips: 0, gotchas: 0, howtos: 0, mentalModels: 0, questions: 0, sources: 0 };
        
        const sources = new Set();
        for (const transcript of extractedData) {
            sources.add(transcript.source);
            stats.tips += transcript.tips?.length || 0;
            stats.gotchas += transcript.gotchas?.length || 0;
            stats.howtos += transcript.howtos?.length || 0;
            stats.mentalModels += transcript.mentalModels?.length || 0;
            stats.questions += transcript.questions?.length || 0;
        }
        
        stats.sources = sources.size;
        return stats;
    }

    cleanAndFormatContent(content) {
        return content
            .replace(/\s+/g, ' ')
            .trim()
            .replace(/([.!?])\s*([A-Z])/g, '$1\n\n$2'); // Add paragraphs
    }

    formatQuote(content) {
        return content.length > 200 ? content.substring(0, 200) + '...' : content;
    }

    generateFooter(type, count) {
        return `\n---

*Showing top ${count} ${type} sorted by quality score.*  
*[← Back to Index](./index.md)*

`;
    }

    /**
     * Generate navigation page
     */
    async generateNavigation() {
        const content = `# 🧭 Navigation

## Quick Links

- [🏠 Home](./index.md) - Main documentation hub
- [💡 Tips](./tips.md) - Best practices and recommendations  
- [⚠️ Gotchas](./gotchas.md) - Warnings and pitfalls
- [📋 How-Tos](./howtos.md) - Step-by-step guides
- [🧠 Mental Models](./mental-models.md) - Conceptual frameworks
- [❓ Questions](./questions.md) - Community Q&A
- [📚 Sources](./sources.md) - Original transcript index

## Browse by Topic

### Development
- Authentication and security
- API integration
- Configuration management
- Error handling

### DevOps
- Docker and containerization
- CI/CD pipelines
- Deployment strategies
- Monitoring and logging

### AI/ML
- Agent coordination
- Swarm intelligence
- Neural networks
- Pattern recognition

---

*This navigation is automatically generated from extracted content.*
`;

        await fs.writeFile(path.join(this.outputDir, 'navigation.md'), content);
    }

    /**
     * Generate source index
     */
    async generateSourceIndex(extractedData) {
        const sourceMap = new Map();
        
        for (const transcript of extractedData) {
            const source = transcript.source;
            if (!sourceMap.has(source)) {
                sourceMap.set(source, {
                    tips: 0,
                    gotchas: 0,
                    howtos: 0,
                    mentalModels: 0,
                    questions: 0,
                    total: 0
                });
            }
            
            const stats = sourceMap.get(source);
            stats.tips += transcript.tips?.length || 0;
            stats.gotchas += transcript.gotchas?.length || 0;
            stats.howtos += transcript.howtos?.length || 0;
            stats.mentalModels += transcript.mentalModels?.length || 0;
            stats.questions += transcript.questions?.length || 0;
            stats.total = stats.tips + stats.gotchas + stats.howtos + stats.mentalModels + stats.questions;
        }

        let content = `# 📚 Source Index

This page lists all source transcripts and the content extracted from each.

## Sources by Content Count

`;

        const sortedSources = Array.from(sourceMap.entries())
            .sort((a, b) => b[1].total - a[1].total);

        for (const [source, stats] of sortedSources) {
            const cleanName = source.replace(/^en-/, '').replace(/\.txt$/, '');
            content += `### ${cleanName}

- **Tips:** ${stats.tips}
- **Gotchas:** ${stats.gotchas}  
- **How-Tos:** ${stats.howtos}
- **Mental Models:** ${stats.mentalModels}
- **Questions:** ${stats.questions}
- **Total:** ${stats.total}

---

`;
        }

        content += `
## Summary

- **Total Sources:** ${sourceMap.size}
- **Total Extractions:** ${Array.from(sourceMap.values()).reduce((sum, stats) => sum + stats.total, 0)}

*[← Back to Index](./index.md)*
`;

        await fs.writeFile(path.join(this.outputDir, 'sources.md'), content);
    }
}

// CLI interface
if (require.main === module) {
    const generator = new DocumentationGenerator('./docs/poc');
    
    (async () => {
        try {
            console.log('Loading extracted patterns...');
            const extractedData = JSON.parse(await fs.readFile('./docs/poc/extracted_patterns.json', 'utf-8'));
            
            console.log('Generating documentation...');
            await generator.generateDocumentation(extractedData);
            
            console.log('✅ Documentation generation complete!');
            console.log('📁 Output directory: ./docs/poc/');
            console.log('🌐 Open index.md to get started');
            
        } catch (error) {
            console.error('Error:', error);
            process.exit(1);
        }
    })();
}

module.exports = DocumentationGenerator;