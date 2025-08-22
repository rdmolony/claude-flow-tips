/**
 * @test Category Classification Accuracy
 * @description Validates the accuracy of automatic content categorization
 * @prerequisites Pattern matching algorithms and test datasets
 */

describe('Category Classification Accuracy', () => {
  
  describe('Pattern Recognition', () => {
    const classificationPatterns = {
      tips: [
        /tip[s]?\b/i,
        /recommendation[s]?\b/i,  
        /suggest[s]?\b/i,
        /should\b/i,
        /try\b/i,
        /use\b/i,
        /shortcut[s]?\b/i,
        /quick\s+way/i,
        /pro\s+tip/i,
        /here's\s+how/i
      ],
      gotchas: [
        /gotcha[s]?\b/i,
        /don't\b/i,
        /avoid\b/i,
        /never\b/i,
        /warning\b/i,
        /careful\b/i,
        /mistake[s]?\b/i,
        /problem[s]?\b/i,
        /issue[s]?\b/i,
        /watch\s+out/i,
        /be\s+aware/i
      ],
      howtos: [
        /how\s+to\b/i,
        /step[s]?\b/i,
        /let\s+me\s+show/i,
        /here's\s+the\s+process/i,
        /walkthrough/i,
        /tutorial/i,
        /guide/i,
        /instruction[s]?\b/i,
        /procedure/i,
        /first.*then.*finally/i
      ],
      mentalModels: [
        /mental\s+model[s]?\b/i,
        /framework[s]?\b/i,
        /concept[s]?\b/i,
        /principle[s]?\b/i,
        /philosophy/i,
        /approach/i,
        /thinking/i,
        /mindset/i,
        /paradigm/i,
        /model[s]?\b/i
      ],
      qa: [
        /\?$/,
        /question[s]?\b/i,
        /ask[s]?\b/i,
        /answer[s]?\b/i,
        /Q:/,
        /A:/,
        /curious\s+about/i,
        /wondering/i,
        /clarify/i
      ]
    };

    it('should correctly classify tips content', () => {
      const tipExamples = [
        "Here's a tip for everyone using Claude Flow - use aliases for common commands",
        "I recommend setting up your environment with Docker for safety",
        "Pro tip: Always use concurrent execution for better performance", 
        "You should try batching your operations to save time",
        "Quick way to debug is using the --verbose flag"
      ];

      tipExamples.forEach(example => {
        const classification = classifyContent(example, classificationPatterns);
        expect(classification.category).toBe('tips');
        expect(classification.confidence).toBeGreaterThan(0.7);
      });
    });

    it('should correctly classify gotchas content', () => {
      const gotchaExamples = [
        "Don't run claude --dangerously-skip-permissions outside a sandbox",
        "Gotcha: Make sure your tokens have the right scope",
        "Warning: This will brick your machine if run locally",
        "Avoid using sudo with these commands",
        "Be careful when editing system files",
        "Never commit your API keys to the repository"
      ];

      gotchaExamples.forEach(example => {
        const classification = classifyContent(example, classificationPatterns);
        expect(classification.category).toBe('gotchas');
        expect(classification.confidence).toBeGreaterThan(0.7);
      });
    });

    it('should correctly classify how-to content', () => {
      const howtoExamples = [
        "Let me show you step by step how to set up a swarm",
        "Here's how to initialize your claude-flow environment",
        "Tutorial: Setting up GitHub integration with MCP",
        "Step 1: Install the dependencies, Step 2: Configure the settings",
        "Walkthrough of the agent spawning process"
      ];

      howtoExamples.forEach(example => {
        const classification = classifyContent(example, classificationPatterns);
        expect(classification.category).toBe('howtos');
        expect(classification.confidence).toBeGreaterThan(0.7);
      });
    });

    it('should correctly classify mental models content', () => {
      const modelExamples = [
        "The mental model here is that you have four pillars of agentics",
        "Think of claude-flow as the foundation layer for coordination",
        "The framework we use is based on autonomous agent principles",
        "This concept of swarm intelligence is fundamental",
        "The philosophy behind this approach is collaborative AI"
      ];

      modelExamples.forEach(example => {
        const classification = classifyContent(example, classificationPatterns);
        expect(classification.category).toBe('mentalModels');
        expect(classification.confidence).toBeGreaterThan(0.7);
      });
    });

    it('should correctly classify Q&A content', () => {
      const qaExamples = [
        "What's the difference between ruv-swarm and claude-flow?",
        "Question: How do I integrate with GitHub?",
        "I'm curious about the authentication process",
        "Can you clarify the token requirements?",
        "Q: What happens when agents fail? A: They automatically restart"
      ];

      qaExamples.forEach(example => {
        const classification = classifyContent(example, classificationPatterns);
        expect(classification.category).toBe('qa');
        expect(classification.confidence).toBeGreaterThan(0.6);
      });
    });
  });

  describe('Multi-Category Detection', () => {
    it('should handle content with multiple category indicators', () => {
      const mixedContent = [
        {
          text: "Tip: Don't forget to set up authentication - here's how to do it step by step",
          expectedPrimary: 'tips',
          expectedSecondary: ['howtos', 'gotchas']
        },
        {
          text: "Warning: This mental model might be confusing at first",
          expectedPrimary: 'gotchas',
          expectedSecondary: ['mentalModels']
        },
        {
          text: "Question: What's the recommended approach for handling errors?",
          expectedPrimary: 'qa',
          expectedSecondary: ['tips']
        }
      ];

      mixedContent.forEach(({ text, expectedPrimary, expectedSecondary }) => {
        const result = classifyContentMultiCategory(text, classificationPatterns);
        
        expect(result.primary.category).toBe(expectedPrimary);
        expect(result.primary.confidence).toBeGreaterThan(0.6);
        
        expectedSecondary.forEach(category => {
          const secondaryMatch = result.secondary.find(s => s.category === category);
          expect(secondaryMatch).toBeDefined();
          expect(secondaryMatch.confidence).toBeGreaterThan(0.3);
        });
      });
    });

    it('should prioritize categories based on context strength', () => {
      const contextualExamples = [
        {
          text: "Here's a critical security tip: Never run dangerous commands",
          expectedOrder: ['tips', 'gotchas']
        },
        {
          text: "Step-by-step gotcha guide: Avoid these common mistakes",
          expectedOrder: ['howtos', 'gotchas']
        }
      ];

      contextualExamples.forEach(({ text, expectedOrder }) => {
        const result = classifyContentMultiCategory(text, classificationPatterns);
        
        expect(result.primary.category).toBe(expectedOrder[0]);
        expect(result.secondary[0].category).toBe(expectedOrder[1]);
        expect(result.primary.confidence).toBeGreaterThan(result.secondary[0].confidence);
      });
    });
  });

  describe('Classification Edge Cases', () => {
    it('should handle ambiguous content appropriately', () => {
      const ambiguousContent = [
        "This is just a general statement about programming",
        "The speaker mentioned something about tools",
        "There was discussion about various topics"
      ];

      ambiguousContent.forEach(text => {
        const classification = classifyContent(text, classificationPatterns);
        
        // Should have low confidence or fall back to default
        if (classification.category !== 'unclassified') {
          expect(classification.confidence).toBeLessThan(0.5);
        } else {
          expect(classification.category).toBe('unclassified');
        }
      });
    });

    it('should handle very short content', () => {
      const shortContent = [
        "Yes",
        "No, don't do that",
        "How?",
        "Good tip",
        "Watch out!"
      ];

      shortContent.forEach(text => {
        const classification = classifyContent(text, classificationPatterns);
        
        // Should still classify when clear indicators exist
        if (text.includes("don't")) {
          expect(classification.category).toBe('gotchas');
        } else if (text === "How?") {
          expect(classification.category).toBe('qa');
        } else if (text === "Good tip") {
          expect(classification.category).toBe('tips');
        }
      });
    });

    it('should handle technical jargon and domain-specific terms', () => {
      const technicalContent = [
        "Initialize the swarm with hierarchical topology - here's the command",
        "Gotcha: MCP configuration requires specific permissions scope",
        "The agentic paradigm involves autonomous coordination patterns",
        "Question: How does the neural training affect performance?",
        "Pro tip: Use WASM for compute-intensive operations"
      ];

      technicalContent.forEach(text => {
        const classification = classifyContent(text, classificationPatterns);
        
        expect(classification.category).not.toBe('unclassified');
        expect(classification.confidence).toBeGreaterThan(0.6);
      });
    });
  });

  describe('Speaker-Based Classification Enhancement', () => {
    it('should enhance classification based on speaker patterns', () => {
      const speakerContextExamples = [
        {
          text: "You should try using aliases",
          speaker: "Reuven", // Expert speaker
          expectedBoost: 'tips'
        },
        {
          text: "That might cause issues",  
          speaker: "Community Member", // Question/concern
          expectedBoost: 'gotchas'
        },
        {
          text: "How do we handle authentication?",
          speaker: "Guest", // Likely question
          expectedBoost: 'qa'
        }
      ];

      speakerContextExamples.forEach(({ text, speaker, expectedBoost }) => {
        const baseClassification = classifyContent(text, classificationPatterns);
        const enhancedClassification = classifyContentWithSpeaker(text, speaker, classificationPatterns);
        
        if (enhancedClassification.category === expectedBoost) {
          expect(enhancedClassification.confidence).toBeGreaterThanOrEqual(baseClassification.confidence);
        }
      });
    });

    it('should consider speaker expertise for content quality', () => {
      const expertSpeakers = ['Reuven', 'Technical Lead', 'Core Maintainer'];
      const communityMembers = ['Community Member', 'Guest', 'Attendee'];

      expertSpeakers.forEach(speaker => {
        const classification = classifyContentWithSpeaker(
          "This approach is recommended for production use",
          speaker,
          classificationPatterns
        );
        
        expect(classification.authorityBonus).toBeGreaterThan(0);
      });

      communityMembers.forEach(speaker => {
        const classification = classifyContentWithSpeaker(
          "I think this might work",
          speaker, 
          classificationPatterns
        );
        
        expect(classification.authorityBonus || 0).toBeLessThanOrEqual(0);
      });
    });
  });

  describe('Performance and Accuracy Metrics', () => {
    it('should achieve >95% classification accuracy on test dataset', () => {
      const testDataset = require('../fixtures/classification-test-set.json');
      
      let correctClassifications = 0;
      let totalClassifications = testDataset.length;

      testDataset.forEach(testCase => {
        const classification = classifyContent(testCase.text, classificationPatterns);
        
        if (classification.category === testCase.expectedCategory) {
          correctClassifications++;
        }
      });

      const accuracy = correctClassifications / totalClassifications;
      expect(accuracy).toBeGreaterThan(0.95);
    });

    it('should maintain consistent classification across similar content', () => {
      const similarContentGroups = [
        {
          category: 'tips',
          variations: [
            "Here's a tip: use aliases for commands",
            "Tip: aliases help with command shortcuts",
            "Pro tip - set up aliases to save time"
          ]
        },
        {
          category: 'gotchas',
          variations: [
            "Don't run this outside a sandbox",
            "Avoid executing this locally",
            "Warning: this can damage your system"
          ]
        }
      ];

      similarContentGroups.forEach(({ category, variations }) => {
        const classifications = variations.map(text => 
          classifyContent(text, classificationPatterns)
        );

        classifications.forEach(classification => {
          expect(classification.category).toBe(category);
          expect(classification.confidence).toBeGreaterThan(0.7);
        });

        // Confidence scores should be similar
        const confidences = classifications.map(c => c.confidence);
        const avgConfidence = confidences.reduce((a, b) => a + b) / confidences.length;
        const variance = confidences.reduce((sum, conf) => sum + Math.pow(conf - avgConfidence, 2), 0) / confidences.length;
        
        expect(Math.sqrt(variance)).toBeLessThan(0.2); // Low variance in confidence
      });
    });
  });
});

// Classification helper functions
function classifyContent(text, patterns) {
  const scores = {};
  
  // Calculate pattern match scores for each category
  Object.entries(patterns).forEach(([category, categoryPatterns]) => {
    let score = 0;
    categoryPatterns.forEach(pattern => {
      if (pattern.test(text)) {
        score += 1;
      }
    });
    scores[category] = score / categoryPatterns.length;
  });

  // Find the best match
  const bestCategory = Object.entries(scores).reduce((best, [category, score]) => {
    return score > best.score ? { category, score } : best;
  }, { category: 'unclassified', score: 0 });

  return {
    category: bestCategory.score > 0.1 ? bestCategory.category : 'unclassified',
    confidence: bestCategory.score,
    allScores: scores
  };
}

function classifyContentMultiCategory(text, patterns) {
  const result = classifyContent(text, patterns);
  
  // Get secondary categories with significant scores
  const secondary = Object.entries(result.allScores)
    .filter(([category, score]) => 
      category !== result.category && score > 0.3
    )
    .map(([category, score]) => ({ category, confidence: score }))
    .sort((a, b) => b.confidence - a.confidence);

  return {
    primary: {
      category: result.category,
      confidence: result.confidence
    },
    secondary
  };
}

function classifyContentWithSpeaker(text, speaker, patterns) {
  const baseClassification = classifyContent(text, patterns);
  
  // Speaker authority boost
  const expertSpeakers = ['Reuven', 'Technical Lead', 'Core Maintainer'];
  const authorityBonus = expertSpeakers.includes(speaker) ? 0.1 : 0;
  
  // Speaker role context boost
  let contextBoost = 0;
  if (speaker === 'Community Member' || speaker === 'Guest') {
    if (baseClassification.category === 'qa') contextBoost = 0.15;
    if (baseClassification.category === 'gotchas') contextBoost = 0.1;
  }
  
  return {
    ...baseClassification,
    confidence: Math.min(1.0, baseClassification.confidence + authorityBonus + contextBoost),
    authorityBonus,
    contextBoost
  };
}