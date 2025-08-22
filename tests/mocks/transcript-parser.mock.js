/**
 * Mock implementation of transcript parser for testing
 */

class MockTranscriptParser {
  constructor() {
    this.mockData = {
      'sample-transcript.txt': {
        lines: [
          'AI Hackerspace Live - Test Sample 2025-08-22',
          '',
          'Speaker: Reuven',
          'So here\'s a tip for everyone using Claude Flow. What I\'ve been using are aliases.',
          '',
          'Speaker: Community Member', 
          'Can you show us how to set up a swarm system?',
          '',
          'Speaker: Reuven',
          'Let me show you step by step. First, you need to initialize...'
        ],
        speakers: ['Reuven', 'Community Member', 'Guest'],
        metadata: {
          date: '2025-08-22',
          event: 'AI Hackerspace Live',
          duration: '45 minutes'
        }
      }
    };
  }

  async parseTranscript(filename) {
    if (!this.mockData[filename]) {
      throw new Error(`Mock transcript not found: ${filename}`);
    }
    
    return {
      filename,
      content: this.mockData[filename].lines.join('\n'),
      lines: this.mockData[filename].lines,
      speakers: this.mockData[filename].speakers,
      metadata: this.mockData[filename].metadata
    };
  }

  async extractSpeakerSegments(transcript) {
    const segments = [];
    let currentSpeaker = null;
    let currentContent = [];
    let lineNumber = 0;

    for (const line of transcript.lines) {
      lineNumber++;
      
      if (line.startsWith('Speaker: ')) {
        // Save previous segment if exists
        if (currentSpeaker && currentContent.length > 0) {
          segments.push({
            speaker: currentSpeaker,
            content: currentContent.join(' '),
            startLine: lineNumber - currentContent.length - 1,
            endLine: lineNumber - 1
          });
        }
        
        currentSpeaker = line.replace('Speaker: ', '');
        currentContent = [];
      } else if (line.trim() && !line.startsWith('AI Hackerspace')) {
        currentContent.push(line.trim());
      }
    }
    
    // Add final segment
    if (currentSpeaker && currentContent.length > 0) {
      segments.push({
        speaker: currentSpeaker,
        content: currentContent.join(' '),
        startLine: lineNumber - currentContent.length,
        endLine: lineNumber
      });
    }

    return segments;
  }

  setMockData(filename, data) {
    this.mockData[filename] = data;
  }
}

module.exports = MockTranscriptParser;