# 📚 Transcript to Docs

> Extracting community wisdom from Claude Flow video transcripts using semantic understanding

> [!CAUTION]
> This prototype works poorly at best - most of the insights from https://video.agentics.org/ have been missed

## 🎯 Overview

This project transforms video transcripts from [video.agentics.org](https://video.agentics.org/) into structured, searchable documentation. We extract tips, gotchas, best practices, and mental models shared by the Claude Flow community.

## ⚠️ Important Caveats

### Non-Deterministic Process
- **LLM-Based Extraction**: This system uses Large Language Models for semantic understanding
- **Variable Results**: Each extraction run may produce slightly different insights
- **Confidence Scoring**: Not all extractions have equal reliability
- **Human Review Recommended**: Low-confidence extractions should be manually verified

### Technical Limitations
- **Context Windows**: LLMs have finite context, may miss connections across long transcripts
- **Semantic Interpretation**: Meaning extraction is subjective and may vary
- **Source Attribution**: While we track sources, interpretations may differ from speaker intent
- **Evolving Understanding**: The system's comprehension improves over time through neural training

## 🧠 How It Works

### Neural Swarm Architecture
```
Transcripts → Research Agent → Analyst Agent → Documenter Agent → Structured Docs
                    ↓              ↓              ↓
              [Pattern Analysis] [Semantic Extraction] [Markdown Generation]
                    ↓              ↓              ↓
              Shared Memory & Neural Training for Continuous Improvement
```

### Key Features
- **Semantic Understanding**: Focuses on meaning, not keywords
- **Multi-Agent Collaboration**: Specialized agents for different extraction tasks
- **Confidence Scoring**: Each insight rated by semantic clarity
- **Source Traceability**: Every claim linked to transcript:line references

## 📁 Documentation Structure

```
docs/
├── index.md           # Navigation hub and overview
├── tips.md            # Actionable wisdom and time-savers
├── gotchas.md         # Critical warnings and pitfalls
├── how-to.md          # Step-by-step guides
├── qa.md              # Community questions & answers
├── mental-models.md   # Conceptual frameworks
└── best-practices.md  # Proven methodologies
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Claude Flow alpha (`npx claude-flow@alpha`)
- GitHub Codespaces or Docker (recommended for safety)

### Installation
```bash
# Clone the repository
git clone https://github.com/rdmolony/transcript-to-docs.git
cd transcript-to-docs

# Install dependencies
npm install

# Initialize Claude Flow
npx claude-flow@alpha init
```

### Running Extraction
```bash
# Run the semantic extraction swarm
npx claude-flow@alpha sparc run swarm "Extract insights from transcripts"

# Or use the neural extraction mode
npx claude-flow@alpha neural-extract --source transcripts/ --output docs/
```

## 🎓 Understanding the Output

### Confidence Levels
- **High**: Clear, explicit statements with strong context
- **Medium**: Implied wisdom requiring some interpretation
- **Low**: Inferred insights that need verification

### Source References
Each extraction includes:
- Original quote from transcript
- File name and line number
- Context explaining why it matters
- Problem it solves

## 🔄 Continuous Improvement

The system uses neural training to improve over time:
1. Initial extractions establish baseline patterns
2. Human feedback refines understanding
3. Neural models adapt to community language
4. Confidence scoring becomes more accurate

## 🤝 Contributing

### Adding Transcripts
1. Place new transcripts in `transcripts/` folder
2. Run extraction pipeline
3. Review low-confidence outputs
4. Submit PR with verified insights

### Improving Extraction
- Report false positives/negatives in issues
- Suggest new extraction categories
- Contribute to neural training data
- Enhance confidence scoring algorithms

## 📊 Current Status

- **Transcripts Processed**: 0 (pending)
- **Insights Extracted**: 24 (from examples)
- **Neural Model Accuracy**: 67.75%
- **Documentation Pages**: 7

## 🔗 Resources

- [Claude Flow Documentation](https://github.com/ruvnet/claude-flow)
- [Video Tutorials](https://video.agentics.org/)
- [Community Discord](https://discord.gg/claudeflow) *(example)*

## 📝 License

MIT - See [LICENSE](LICENSE) for details

## 🙏 Acknowledgments

- Claude Flow team for the amazing tool
- Agentics community for sharing knowledge
- Contributors to this extraction project

---

*Note: This is an experimental project using LLM-based semantic extraction. Results are non-deterministic and should be verified for production use.*
