# Claude Flow Tips & Guides Extraction System

> Extract actionable knowledge from Claude Flow community video transcripts into a structured, searchable documentation system.

## 🎯 Overview

This system automatically processes video transcripts from the Claude Flow community to extract valuable tips, gotchas, how-to guides, Q&As, mental models, and technical internals. The extracted content is organized into a searchable documentation site with verified source references.

## ✨ Features

- **Advanced NLP Processing**: Enhanced pattern matching and contextual analysis
- **Multi-Category Classification**: Automatically categorizes content into 6 main types
- **Source Verification**: Every entry links back to exact line numbers in transcripts
- **Cross-References**: Smart linking between related entries
- **Search Functionality**: Client-side search with fuzzy matching
- **Quality Assurance**: Built-in verification engine with reporting

## 📊 Results

From 14 transcript files, the system extracted:
- **28 verified entries** across 4 categories
- **75% verification success rate**
- **2,573 segments analyzed**
- **Processing time: 2.6 seconds**

### Categories Extracted:
- 🔧 How-To Guides: 20 entries
- 🚨 Gotchas & Warnings: 4 entries
- ⚙️ Internals & Architecture: 2 entries
- ❓ Questions & Answers: 2 entries

## 🚀 Quick Start

### Prerequisites
- Node.js 14+ 
- No external dependencies required (uses only Node.js built-in modules)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/claude-flow-tips.git
cd claude-flow-tips

# Run the extraction
cd scripts
node extractor.js
```

### Usage

```bash
# Basic extraction
node extractor.js

# Verbose output
node extractor.js --verbose

# Debug mode
node extractor.js --debug

# Custom input/output directories
node extractor.js --input=/path/to/transcripts --output=/path/to/docs
```

## 📁 Project Structure

```
claude-flow-tips/
├── transcripts/           # Raw transcript files (input)
├── docs/                  # Generated documentation (output)
│   ├── index.md          # Main navigation page
│   ├── gotchas/          # Critical warnings
│   ├── tips/             # Best practices
│   ├── how-to/           # Implementation guides
│   ├── qa/               # Questions & answers
│   ├── mental-models/    # Conceptual guides
│   ├── internals/        # Technical explanations
│   ├── assets/           # Search scripts and styles
│   ├── search/           # Search index
│   └── .verification/    # QA reports
├── scripts/              # Extraction pipeline
│   ├── extractor.js      # Main orchestrator
│   ├── parser.js         # Transcript parser
│   ├── classifier.js     # Content classifier
│   ├── linker.js         # Reference linker
│   ├── verifier.js       # Verification engine
│   └── generator.js      # Markdown generator
└── README.md             # This file
```

## 🔧 Architecture

### Component Overview

1. **TranscriptParser** (`parser.js`)
   - Extracts structured segments from markdown/text transcripts
   - Identifies speaker changes and timestamps
   - Applies NLP for context understanding
   - Confidence scoring for each segment

2. **ContentClassifier** (`classifier.js`)
   - Multi-category classification with confidence scores
   - Pattern-based and contextual analysis
   - Metadata extraction (topics, tools, commands)
   - Category-specific feature detection

3. **ReferenceLinker** (`linker.js`)
   - Creates GitHub-compatible source links
   - Builds cross-references between entries
   - Validates link accuracy
   - Generates navigation structures

4. **Verifier** (`verifier.js`)
   - Validates quote accuracy
   - Checks source references
   - Content quality assessment
   - Generates verification reports

5. **MarkdownGenerator** (`generator.js`)
   - Creates formatted documentation pages
   - Generates search index
   - Builds category navigation
   - Creates metadata and sitemaps

## 📈 Performance

- **Extraction Speed**: ~1,000 segments/second
- **Memory Usage**: <100MB for typical workloads
- **Scalability**: Handles transcripts with 10,000+ lines
- **Accuracy**: 75%+ verification success rate

## 🛠️ Configuration

### Parser Options
```javascript
{
  contextWindow: 7,        // Lines of context to extract
  minConfidence: 0.6,      // Minimum confidence threshold
  debug: false             // Enable debug logging
}
```

### Classifier Options
```javascript
{
  confidenceThreshold: 0.7,     // Minimum classification confidence
  multiCategoryThreshold: 0.85, // Threshold for multi-category
  debug: false                  // Enable debug logging
}
```

## 📝 Output Format

Each extracted entry includes:

```markdown
# Category: Title

[Navigation breadcrumb]

## Summary
One-sentence description of the key insight

## Details
Expanded explanation with full context

## Code Examples (if applicable)
```javascript
// Example code
```

## Sources
- [transcript-file.txt#L45-L52](link) ✅ 
  > "Exact quote from transcript..."

## Related
- Links to related entries

---
*Extracted: Date | Verified: ✅ | Confidence: 85%*
```

## 🧪 Testing

Run the test suite:
```bash
cd scripts
npm test
```

## 🚀 Deployment

### GitHub Pages
1. Push to GitHub repository
2. Enable GitHub Pages in Settings
3. Select `/docs` folder as source
4. Access at: `https://username.github.io/claude-flow-tips`

### Local Preview
```bash
# Install a simple HTTP server
npm install -g http-server

# Serve the docs
cd docs
http-server -p 8080
```

## 📊 Quality Metrics

The system tracks:
- **Extraction Rate**: Segments processed vs entries created
- **Verification Rate**: Successfully verified quotes
- **Confidence Scores**: Classification confidence levels
- **Coverage**: Percentage of transcript content extracted

## 🤝 Contributing

1. Add new transcripts to `/transcripts` directory
2. Run the extraction pipeline
3. Review verification report
4. Submit PR with changes

## 📄 License

MIT License - See LICENSE file for details

## 🙏 Acknowledgments

- Claude Flow community for video content
- Anthropic for Claude AI technology
- Contributors and maintainers

## 📞 Support

- Documentation: [Browse extracted tips](docs/index.md)
- Issues: [GitHub Issues](https://github.com/yourusername/claude-flow-tips/issues)
- Community: Claude Flow Discord/Slack

---

*Built with the Claude Flow Swarm orchestration system*