# Claude Flow Community Knowledge Extraction Specification

## Overview
Extract actionable knowledge from Claude Flow community video transcripts into an organized, searchable collection of Markdown documentation. Each insight must be traceable to its source with verbatim quotes and direct links.

## Source Materials
- **Location**: `/transcripts/*.txt` 
- **Format**: Plain text transcripts
- **Total Files**: 14 transcripts from various Agentics community events

## Project Structure

```
claude-flow-tips/
├── index.md                    # Main navigation and overview
├── categories/
│   ├── tips.md                # Best practices and recommendations
│   ├── gotchas.md             # Common pitfalls and warnings
│   ├── how-to.md              # Step-by-step guides
│   ├── concepts.md            # Mental models and explanations
│   └── qa.md                  # Questions and answers
├── by-topic/
│   ├── batchtool.md           # BatchTool specific guidance
│   ├── security.md            # Security considerations
│   ├── swarms.md              # Swarm orchestration
│   ├── memory.md              # Memory management
│   └── debugging.md           # Debugging strategies
└── transcripts/               # Source transcript files

```

## Content Format

### Entry Structure
Each knowledge entry follows this template:

```markdown
### [Entry Title]

**Category**: [Tip | Gotcha | How-To | Concept | Q&A]  
**Tags**: `tag1`, `tag2`, `tag3`

[Clear, actionable description of the insight]

<details>
<summary>Source Quote</summary>

> [Verbatim quote from transcript]

**Source**: [transcript-filename.txt](../transcripts/transcript-filename.txt#L123-L125)  
**Speaker**: [If identifiable]  
**Context**: [Brief context if needed]

</details>
```

## Categorization Guidelines

### Tips 💡
- Best practices that improve workflow
- Optimization strategies
- Productivity enhancers
- Examples: "Specify requirements in 300-400 words", "Use BatchTool for parallel processing"

### Gotchas ⚠️
- Security warnings
- Common mistakes to avoid
- Breaking changes or limitations
- Examples: "Don't run --dangerously-skip-permissions locally", "File size limits"

### How-To 📖
- Step-by-step procedures
- Setup instructions
- Configuration guides
- Examples: "Setting up GitHub integration", "Configuring swarm topology"

### Concepts 🧠
- Architecture explanations
- Mental models
- System behaviors
- Examples: "How BatchTool spawns OS processes", "Swarm coordination patterns"

### Q&A ❓
- Direct questions from community
- Clarifications about features
- Comparisons between tools
- Examples: "Difference between ruv-swarm and claude-flow"

## Link Format Specification

Links to source quotes use GitHub's line number syntax:
- Single line: `[filename.txt#L42](../transcripts/filename.txt#L42)`
- Line range: `[filename.txt#L42-L48](../transcripts/filename.txt#L42-L48)`

## Navigation Structure

### index.md
```markdown
# Claude Flow Tips & Best Practices

Quick access to community knowledge extracted from [video.agentics.org](https://video.agentics.org/)

## Browse by Category
- [💡 Tips](categories/tips.md) - Best practices (X entries)
- [⚠️ Gotchas](categories/gotchas.md) - Common pitfalls (X entries)
- [📖 How-To Guides](categories/how-to.md) - Step-by-step instructions (X entries)
- [🧠 Concepts](categories/concepts.md) - Mental models (X entries)
- [❓ Q&A](categories/qa.md) - Community questions (X entries)

## Browse by Topic
- [BatchTool](by-topic/batchtool.md)
- [Security](by-topic/security.md)
- [Swarms](by-topic/swarms.md)
- [Memory Management](by-topic/memory.md)
- [Debugging](by-topic/debugging.md)

## Most Important
[Top 10 things to know when starting with Claude Flow]
```

## Verification Process

### Automated Validation
1. **Quote Verification**: Script to verify all quotes exist verbatim in source files
2. **Link Validation**: Check all transcript links point to valid line numbers
3. **Duplicate Detection**: Identify similar insights across transcripts
4. **Coverage Report**: Track which transcripts have been processed

### Quality Checklist
- [ ] Quote is verbatim from source
- [ ] Link points to correct line(s)
- [ ] Category is appropriate
- [ ] Description is actionable
- [ ] Tags aid discoverability
- [ ] No hallucinated content

## Implementation Examples

### Example 1: Security Gotcha
```markdown
### Running Claude without permissions is dangerous

**Category**: Gotcha  
**Tags**: `security`, `permissions`, `docker`

If you run `claude --dangerously-skip-permissions` locally outside of a sandbox (like Docker), Claude will have access to all local credentials and could potentially damage your system. Always use sandboxed environments like Docker containers or ephemeral cloud environments (GitHub Codespaces).

<details>
<summary>Source Quote</summary>

> "The team warns against using claude with permissions disabled unless you are executing it in a Docker container or in an ephemeral cloud environment for security reasons."

**Source**: [en-AI Hackerspace Live - June 20.txt](../transcripts/en-AI Hackerspace Live - June 20.txt#L234-L236)  
**Speaker**: Team Member  
**Context**: Discussion about security best practices

</details>
```

### Example 2: Specification Tip
```markdown
### Write detailed specifications upfront

**Category**: Tip  
**Tags**: `specifications`, `best-practices`, `workflow`

The better your specification, the better the results. Spend time writing 300-400 words describing what you want, ask Claude to clarify 10 things that are unclear or need improvement, answer those questions, then let Claude work autonomously.

<details>
<summary>Source Quote</summary>

> "The team suggests specifying what you want beforehand in 300-400 words, and to ask Claude to clarify 10 things that are unclear or need to be improved, answer, then walk away."

**Source**: [en-NYC Agentics Meetup July 10.txt](../transcripts/en-NYC Agentics Meetup July 10.txt#L456-L458)  
**Speaker**: Presenter  
**Context**: Best practices for working with Claude

</details>
```

## Update Process
1. New transcripts added to `/transcripts/`
2. Run extraction script to identify new insights
3. Categorize and format entries
4. Update topic pages with cross-references
5. Update index.md with counts
6. Run validation checks
7. Commit with descriptive message

## Success Metrics
- All insights have verified source quotes
- Zero hallucinated content
- 100% of links resolve correctly
- Clear categorization with <10% ambiguous entries
- Easy navigation to find specific topics
- Regular updates as new transcripts arrive