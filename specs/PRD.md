# Product Requirements Document: Claude Flow Knowledge Extractor

## 1. Executive Summary

### Product Vision
Create an AI-powered knowledge extraction system that transforms Claude Flow community video transcripts into structured, searchable, and verifiable documentation. This tool will democratize access to Claude Flow expertise by converting scattered video content into organized, actionable guidance.

### Problem Statement
The Claude Flow community has produced valuable video content on https://video.agentics.org/, but this knowledge is:
- Difficult to search and reference quickly
- Time-consuming to consume (requires watching entire videos)
- Not easily verifiable or cross-referenced
- Inaccessible to those who prefer text-based learning

### Solution
An AI system that automatically extracts, categorizes, and documents key insights from video transcripts, creating a comprehensive knowledge base with full source attribution and verification capabilities.

## 2. Product Goals & Objectives

### Primary Goals
1. **Accessibility**: Make Claude Flow knowledge easily discoverable and consumable
2. **Verification**: Ensure all extracted information is traceable to source material
3. **Organization**: Structure knowledge into intuitive categories for quick reference
4. **Community Growth**: Lower the barrier to entry for new Claude Flow users

### Success Metrics
- Number of unique insights extracted per transcript
- User engagement with documentation (page views, time on page)
- Reduction in repeated questions in community forums
- Time saved for users finding specific information (baseline: watching full videos)
- Accuracy of extracted information (verified against source)

## 3. Core Features & Requirements

### 3.1 Knowledge Extraction Engine

**Functional Requirements:**
- Parse video transcript files (support for .vtt, .srt, .txt formats)
- Identify and categorize content into predefined types:
  - **How-To Guides**: Step-by-step instructions
  - **Tips**: Best practices and optimization suggestions
  - **Gotchas**: Warnings, common pitfalls, security concerns
  - **Mental Models**: Conceptual frameworks and understanding
  - **Questions & Answers**: Community Q&A content
  - **Concepts**: Core concepts and definitions
  - **Use Cases**: Real-world application examples

**Content Extraction Rules:**
- Each extracted item must include:
  - Category classification
  - Clear, actionable title
  - Concise summary (50-200 words)
  - Direct quote(s) from transcript
  - Source file reference with timestamp/line numbers
  - Relevance score (for prioritization)

### 3.2 Documentation Structure

**Output Format:**
```markdown
# [Category]: [Title]

[Summary paragraph explaining the insight]

<details>
<summary>📖 Source Reference</summary>

> [Direct quote from transcript]
> 
> **Source:** `[transcript_filename.ext]` - Line [XXX-YYY] / Timestamp [XX:XX]
> **Context:** [Brief context about where this appears in the video]

</details>

---
```

**File Organization:**
```
claude-flow-docs/
├── index.md (master index with links)
├── how-to/
│   ├── setup-github-sync.md
│   ├── configure-docker-environment.md
│   └── ...
├── tips/
│   ├── specification-best-practices.md
│   └── ...
├── gotchas/
│   ├── security-permissions.md
│   └── ...
├── mental-models/
│   ├── batchtool-architecture.md
│   └── ...
├── qa/
│   ├── flow-vs-swarm.md
│   └── ...
└── sources/
    └── transcript-index.md (mapping of all sources)
```

### 3.3 Verification & Traceability

**Requirements:**
- Every claim must link to at least one source quote
- Implement quote validation to ensure quotes exist verbatim in source
- Generate confidence scores for extracted insights
- Flag potential hallucinations or interpretations for human review
- Maintain source transcript versioning for updates

### 3.4 Search & Discovery

**Features:**
- Full-text search across all documentation
- Tag-based filtering system
- "Related Topics" suggestions
- Quick reference cards for common tasks
- Interactive decision tree for finding relevant content

## 4. Technical Architecture

### 4.1 Processing Pipeline

```
1. Transcript Ingestion
   ↓
2. Content Segmentation (identify logical chunks)
   ↓
3. Classification (categorize each chunk)
   ↓
4. Extraction (pull key insights with context)
   ↓
5. Verification (validate quotes against source)
   ↓
6. Documentation Generation (create Markdown files)
   ↓
7. Index Building (create searchable index)
   ↓
8. Quality Review (flag items for human verification)
```

### 4.2 AI Model Requirements

- **Primary Model**: Large language model for content understanding and extraction
- **Capabilities Required**:
  - Multi-turn context understanding
  - Technical documentation comprehension
  - Accurate quote extraction
  - Category classification
  - Summary generation

### 4.3 Data Schema

```json
{
  "insight_id": "unique_identifier",
  "category": "tip|how-to|gotcha|mental-model|qa|concept",
  "title": "Brief descriptive title",
  "summary": "Concise explanation",
  "quotes": [
    {
      "text": "Direct quote from transcript",
      "source_file": "transcript_filename.ext",
      "line_start": 123,
      "line_end": 125,
      "timestamp": "12:34",
      "confidence": 0.95
    }
  ],
  "tags": ["docker", "security", "setup"],
  "related_insights": ["insight_id_1", "insight_id_2"],
  "verification_status": "verified|pending|flagged",
  "extraction_date": "2024-01-01T00:00:00Z"
}
```

## 5. User Experience

### 5.1 Primary User Personas

1. **New Claude Flow User**: Needs quick onboarding and clear getting-started guides
2. **Experienced Developer**: Seeks specific technical details and advanced patterns
3. **Security-Conscious Admin**: Focuses on gotchas and security best practices
4. **Community Contributor**: Wants to verify and improve documentation

### 5.2 User Journey

1. **Discovery**: User searches for specific Claude Flow topic
2. **Navigation**: Finds relevant category and document
3. **Consumption**: Reads summary and decides if details needed
4. **Verification**: Optionally expands source reference for context
5. **Application**: Uses knowledge in their Claude Flow implementation
6. **Contribution**: Reports issues or suggests improvements

## 6. Implementation Phases

### Phase 1: MVP (Weeks 1-2)
- Basic transcript parsing
- Core category extraction (tips, gotchas, how-to)
- Simple Markdown generation
- Manual verification process

### Phase 2: Enhanced Extraction (Weeks 3-4)
- Advanced categorization (mental models, Q&A)
- Multi-quote aggregation
- Confidence scoring
- Basic search functionality

### Phase 3: Verification & Quality (Weeks 5-6)
- Automated quote validation
- Hallucination detection
- Version tracking
- Review workflow

### Phase 4: Discovery & UX (Weeks 7-8)
- Advanced search and filtering
- Interactive navigation
- Related content suggestions
- Usage analytics

## 7. Quality Assurance

### Validation Criteria
- **Accuracy**: 95% of quotes must be verbatim from source
- **Relevance**: Each insight must provide actionable value
- **Completeness**: Cover all major topics from transcripts
- **Clarity**: Documentation readable at 8th-grade level
- **Traceability**: 100% of claims linked to sources

### Review Process
1. Automated validation of quote accuracy
2. AI confidence scoring for categorization
3. Human review for flagged items
4. Community feedback integration
5. Regular accuracy audits

## 8. Success Criteria

### Launch Criteria
- Process minimum 10 video transcripts
- Extract at least 100 unique insights
- Achieve 95% quote accuracy
- Generate documentation for all core categories
- Pass security review for gotchas/warnings

### Long-term Success Metrics
- 50% reduction in time to find specific information
- 80% user satisfaction with documentation quality
- <5% false positive rate in extraction
- Active community contributions and corrections
- Becomes primary reference for Claude Flow users

## 9. Risks & Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Inaccurate extraction | High | Medium | Multi-layer verification, human review |
| Transcript quality issues | Medium | High | Preprocessing, format standardization |
| Information overload | Medium | Medium | Prioritization, progressive disclosure |
| Rapid Claude Flow changes | High | Medium | Version tracking, update workflows |
| Hallucination in summaries | High | Low | Quote-based verification, confidence scoring |

## 10. Future Enhancements

- **Video timestamp linking**: Direct links to video moments
- **Interactive examples**: Runnable code snippets
- **Multi-language support**: Translations for global community
- **AI chat interface**: Q&A bot trained on documentation
- **Contribution workflow**: Community-driven updates
- **Integration with Claude Flow CLI**: In-terminal documentation
- **Visual diagrams**: Auto-generated architecture diagrams
- **Certification paths**: Learning tracks for different skill levels

## Appendix: Example Extraction

### Input (Transcript Excerpt):
```
[00:12:34] So the really important thing to understand here is that 
if you run claude with the dangerously-skip-permissions flag locally 
outside of a sandbox like Docker, claude will likely be able to access 
any credentials you have locally and may even brick your machine by 
editing your drivers, rendering it unusable. Please run it in either 
a sandbox or in an ephemeral cloud environment like GitHub Codespaces 
so that it cannot do so.
```

### Output:
```markdown
# Gotcha: Security Risk with Permission Bypass

Running Claude Flow with disabled permissions outside of a sandboxed environment poses severe security risks including credential exposure and potential system damage.

<details>
<summary>📖 Source Reference</summary>

> "if you run claude with the dangerously-skip-permissions flag locally outside of a sandbox like Docker, claude will likely be able to access any credentials you have locally and may even brick your machine by editing your drivers, rendering it unusable."
> 
> **Source:** `episode-03-security-best-practices.vtt` - Line 234-237 / Timestamp 00:12:34
> **Context:** Discussion about security configurations and safe execution environments

</details>
```
