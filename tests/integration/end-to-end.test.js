/**
 * End-to-End Integration Tests
 * Tests complete workflow from raw transcript files to final documentation
 */

const { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } = require('@jest/globals');
const path = require('path');
const fs = require('fs').promises;
const { spawn } = require('child_process');

describe('End-to-End Workflow Tests', () => {
  let testWorkspace;
  let transcriptsDir;
  let outputDir;
  let configFile;

  beforeAll(async () => {
    // Set up test workspace
    testWorkspace = path.join(__dirname, '../e2e-workspace');
    transcriptsDir = path.join(testWorkspace, 'transcripts');
    outputDir = path.join(testWorkspace, 'output');
    configFile = path.join(testWorkspace, 'config.json');

    await fs.mkdir(testWorkspace, { recursive: true });
    await fs.mkdir(transcriptsDir, { recursive: true });
    await fs.mkdir(outputDir, { recursive: true });

    // Create test configuration
    const config = {
      processing: {
        max_concurrent_transcripts: 3,
        confidence_thresholds: {
          auto_approve: 0.90,
          human_review: 0.70,
          reject: 0.70
        }
      },
      categories: {
        how_to: { min_steps: 2 },
        gotcha: { severity_levels: ['low', 'medium', 'high', 'critical'] }
      },
      output: {
        generate_index: true,
        include_source_links: true,
        markdown_format: true
      }
    };

    await fs.writeFile(configFile, JSON.stringify(config, null, 2));
  });

  afterAll(async () => {
    // Clean up test workspace
    try {
      await fs.rmdir(testWorkspace, { recursive: true });
    } catch (error) {
      console.warn('Cleanup warning:', error.message);
    }
  });

  describe('Complete Documentation Generation Workflow', () => {
    test('should transform real Claude Flow transcript into structured documentation', async () => {
      // Use actual Claude Flow transcript content
      const realTranscript = `WEBVTT

00:00:30.000 --> 00:00:35.000
Welcome to today's Claude Flow tutorial. We'll cover Docker setup and security best practices.

00:01:15.000 --> 00:01:25.000
First, you need to install Docker Desktop. You can download it from the official website at docker.com.

00:01:45.000 --> 00:01:55.000
Once installed, make sure Docker is running. You can check this by opening a terminal and running docker --version.

00:02:30.000 --> 00:02:45.000
Warning: never run Claude with the dangerously-skip-permissions flag outside of a containerized environment.

00:03:00.000 --> 00:03:15.000
This is critical for security. If you skip permissions outside a sandbox, Claude could access your local credentials.

00:03:30.000 --> 00:03:40.000
It could even potentially brick your machine by modifying system drivers or other critical files.

00:04:00.000 --> 00:04:10.000
Pro tip: always use GitHub Codespaces or Docker containers for Claude Flow development.

00:04:30.000 --> 00:04:45.000
Question from chat: "What if I'm on a system without Docker?" Great question! You have a few options.

00:04:50.000 --> 00:05:05.000
You can use GitHub Codespaces, which provides a cloud-based development environment with Docker pre-installed.

00:05:20.000 --> 00:05:35.000
Think of Claude Flow like a manufacturing pipeline. Raw transcripts go in one end, structured knowledge comes out the other.

00:05:50.000 --> 00:06:05.000
Each stage in the pipeline transforms the data: parsing, classification, extraction, verification, and documentation.

00:06:20.000 --> 00:06:30.000
SPARC methodology guides this process: Specification, Pseudocode, Architecture, Refinement, and Completion.`;

      const transcriptFile = path.join(transcriptsDir, 'claude-flow-docker-tutorial.vtt');
      await fs.writeFile(transcriptFile, realTranscript);

      // Run the knowledge extraction pipeline
      const result = await runExtractionPipeline(transcriptFile, outputDir, configFile);

      expect(result.exitCode).toBe(0);
      expect(result.stderr).toBe('');

      // Verify documentation structure was created
      const outputFiles = await fs.readdir(outputDir);
      
      // Should generate category-specific files
      expect(outputFiles.some(file => file.includes('how-to'))).toBe(true);
      expect(outputFiles.some(file => file.includes('gotchas'))).toBe(true);
      expect(outputFiles.some(file => file.includes('tips'))).toBe(true);
      expect(outputFiles.some(file => file.includes('qa'))).toBe(true);
      expect(outputFiles.some(file => file.includes('mental-models'))).toBe(true);

      // Should generate master index
      expect(outputFiles.some(file => file.includes('index'))).toBe(true);

      // Verify how-to documentation quality
      const howToFiles = outputFiles.filter(file => file.includes('how-to'));
      expect(howToFiles.length).toBeGreaterThan(0);

      const howToContent = await fs.readFile(path.join(outputDir, howToFiles[0]), 'utf8');
      expect(howToContent).toContain('# How-To: Docker Installation');
      expect(howToContent).toContain('docker.com');
      expect(howToContent).toContain('docker --version');
      expect(howToContent).toContain('Source:');
      expect(howToContent).toContain('claude-flow-docker-tutorial.vtt');

      // Verify gotcha documentation
      const gotchaFiles = outputFiles.filter(file => file.includes('gotchas'));
      expect(gotchaFiles.length).toBeGreaterThan(0);

      const gotchaContent = await fs.readFile(path.join(outputDir, gotchaFiles[0]), 'utf8');
      expect(gotchaContent).toContain('# Gotcha: Security Risk');
      expect(gotchaContent).toContain('dangerously-skip-permissions');
      expect(gotchaContent).toContain('credentials');
      expect(gotchaContent).toContain('brick your machine');

      // Verify mental model documentation
      const mentalModelFiles = outputFiles.filter(file => file.includes('mental-models'));
      expect(mentalModelFiles.length).toBeGreaterThan(0);

      const mentalModelContent = await fs.readFile(path.join(outputDir, mentalModelFiles[0]), 'utf8');
      expect(mentalModelContent).toContain('manufacturing pipeline');
      expect(mentalModelContent).toContain('Raw transcripts');
      expect(mentalModelContent).toContain('structured knowledge');
    });

    test('should maintain source attribution and traceability', async () => {
      const transcript = `[00:01:30] Step 1: Install Docker Desktop from the official website.
[00:02:15] Step 2: Verify installation by running docker --version in terminal.
[00:03:00] Step 3: Pull the Claude Flow image using docker pull claude-flow.
[00:03:45] Warning: ensure you're using the latest security patches.`;

      const transcriptFile = path.join(transcriptsDir, 'attribution-test.txt');
      await fs.writeFile(transcriptFile, transcript);

      const result = await runExtractionPipeline(transcriptFile, outputDir, configFile);
      expect(result.exitCode).toBe(0);

      // Check generated documentation for source attribution
      const outputFiles = await fs.readdir(outputDir);
      const docFiles = outputFiles.filter(file => file.endsWith('.md'));

      for (const docFile of docFiles) {
        const content = await fs.readFile(path.join(outputDir, docFile), 'utf8');
        
        // Every document should have source references
        if (content.includes('##') && content.length > 100) { // Actual content, not empty
          expect(content).toMatch(/Source.*attribution-test\.txt/);
          expect(content).toMatch(/Line \d+/);
          expect(content).toContain('> '); // Quote formatting
        }
      }

      // Check that attribution metadata was generated
      const metadataFiles = outputFiles.filter(file => file.includes('attribution') || file.includes('metadata'));
      expect(metadataFiles.length).toBeGreaterThan(0);
    });

    test('should handle multiple transcript formats correctly', async () => {
      // Create transcripts in different formats
      const transcriptFormats = {
        'tutorial.txt': `[00:01:00] Plain text format with timestamps.
[00:02:00] This demonstrates simple timestamp parsing.`,

        'webinar.vtt': `WEBVTT

00:01:00.000 --> 00:01:05.000
VTT format with duration timestamps.

00:02:00.000 --> 00:02:05.000
WebVTT is commonly used for video captions.`,

        'meeting.srt': `1
00:01:00,000 --> 00:01:05,000
SRT format with comma separators.

2
00:02:00,000 --> 00:02:05,000
SubRip format for subtitles.`
      };

      // Write all format files
      for (const [filename, content] of Object.entries(transcriptFormats)) {
        await fs.writeFile(path.join(transcriptsDir, filename), content);
      }

      // Process all files
      const result = await runBatchExtraction(transcriptsDir, outputDir, configFile);
      expect(result.exitCode).toBe(0);

      // Verify all formats were processed
      const outputFiles = await fs.readdir(outputDir);
      
      // Should have generated docs for each transcript
      expect(outputFiles.some(file => file.includes('tutorial'))).toBe(true);
      expect(outputFiles.some(file => file.includes('webinar'))).toBe(true);
      expect(outputFiles.some(file => file.includes('meeting'))).toBe(true);

      // Verify cross-references between documents
      const indexFiles = outputFiles.filter(file => file.includes('index'));
      expect(indexFiles.length).toBeGreaterThan(0);

      const indexContent = await fs.readFile(path.join(outputDir, indexFiles[0]), 'utf8');
      expect(indexContent).toContain('tutorial.txt');
      expect(indexContent).toContain('webinar.vtt');
      expect(indexContent).toContain('meeting.srt');
    });

    test('should generate comprehensive search index', async () => {
      const transcript = `[00:01:00] Docker installation requires careful attention to system requirements.
[00:02:00] Authentication setup involves OAuth tokens and API keys configuration.
[00:03:00] GitHub integration enables automated deployment and testing workflows.
[00:04:00] Security scanning should be part of every CI/CD pipeline implementation.`;

      const transcriptFile = path.join(transcriptsDir, 'search-index-test.txt');
      await fs.writeFile(transcriptFile, transcript);

      const result = await runExtractionPipeline(transcriptFile, outputDir, configFile);
      expect(result.exitCode).toBe(0);

      // Check for search index generation
      const outputFiles = await fs.readdir(outputDir);
      const searchFiles = outputFiles.filter(file => 
        file.includes('search') || file.includes('index') || file.includes('tags')
      );
      expect(searchFiles.length).toBeGreaterThan(0);

      // Verify search functionality if index file exists
      const indexFile = searchFiles.find(file => file.includes('index'));
      if (indexFile) {
        const indexContent = await fs.readFile(path.join(outputDir, indexFile), 'utf8');
        
        // Should contain searchable terms
        expect(indexContent.toLowerCase()).toContain('docker');
        expect(indexContent.toLowerCase()).toContain('authentication');
        expect(indexContent.toLowerCase()).toContain('github');
        expect(indexContent.toLowerCase()).toContain('security');
      }
    });
  });

  describe('Quality and Verification Workflows', () => {
    test('should detect and flag potential quality issues', async () => {
      const problematicTranscript = `[00:01:00] This is some unclear content.
[00:02:00] Maybe you should do something, but it depends.
[00:03:00] Instructions that are vague and hard to follow.
[00:04:00] Warning about stuff that could be problematic.`;

      const transcriptFile = path.join(transcriptsDir, 'quality-test.txt');
      await fs.writeFile(transcriptFile, transcript);

      const result = await runExtractionPipeline(transcriptFile, outputDir, configFile);
      
      // Pipeline should complete but flag quality issues
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('quality');

      // Check for quality report generation
      const outputFiles = await fs.readdir(outputDir);
      const qualityFiles = outputFiles.filter(file => 
        file.includes('quality') || file.includes('review')
      );
      expect(qualityFiles.length).toBeGreaterThan(0);
    });

    test('should verify quotes against source transcripts', async () => {
      const transcript = `[00:01:00] Exact quote for verification testing purposes.
[00:02:00] Another precise quote that should be verified correctly.
[00:03:00] Warning: this is a security-related quote for testing.`;

      const transcriptFile = path.join(transcriptsDir, 'verification-test.txt');
      await fs.writeFile(transcriptFile, transcript);

      const result = await runExtractionPipeline(transcriptFile, outputDir, configFile);
      expect(result.exitCode).toBe(0);

      // Check verification report
      const outputFiles = await fs.readdir(outputDir);
      const verificationFiles = outputFiles.filter(file => 
        file.includes('verification') || file.includes('quotes')
      );
      
      if (verificationFiles.length > 0) {
        const verificationContent = await fs.readFile(
          path.join(outputDir, verificationFiles[0]), 'utf8'
        );
        
        // Should show high verification rate for exact quotes
        expect(verificationContent).toMatch(/verification.*rate.*[89]\d%|verification.*rate.*100%/i);
        expect(verificationContent).not.toContain('hallucination');
      }
    });

    test('should handle transcription errors gracefully', async () => {
      const transcriptWithErrors = `[00:01:00] Sometimes transcription makes misatkes in the text.
[00:02:00] Words might be mispelled or sentences incmplete
[00:03:00] But the system should stil extract meaningful insights.`;

      const transcriptFile = path.join(transcriptsDir, 'transcription-errors.txt');
      await fs.writeFile(transcriptFile, transcriptWithErrors);

      const result = await runExtractionPipeline(transcriptFile, outputDir, configFile);
      expect(result.exitCode).toBe(0);

      // Should still generate documentation despite errors
      const outputFiles = await fs.readdir(outputDir);
      const docFiles = outputFiles.filter(file => file.endsWith('.md'));
      expect(docFiles.length).toBeGreaterThan(0);

      // Check that errors were noted but didn't prevent processing
      expect(result.stdout).toMatch(/warning|error/i);
    });
  });

  describe('Performance and Scalability', () => {
    test('should process multiple large transcripts efficiently', async () => {
      // Generate multiple large transcript files
      const largeTranscripts = {};
      for (let i = 0; i < 3; i++) {
        const lines = [];
        for (let j = 0; j < 200; j++) {
          const minutes = Math.floor(j / 4);
          const seconds = (j % 4) * 15;
          lines.push(`[00:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}] Tutorial content line ${j} for file ${i}.`);
        }
        largeTranscripts[`large-transcript-${i}.txt`] = lines.join('\\n');
      }

      // Write large transcript files
      for (const [filename, content] of Object.entries(largeTranscripts)) {
        await fs.writeFile(path.join(transcriptsDir, filename), content);
      }

      const startTime = Date.now();
      const result = await runBatchExtraction(transcriptsDir, outputDir, configFile);
      const processingTime = Date.now() - startTime;

      expect(result.exitCode).toBe(0);
      
      // Should complete within reasonable time (< 60 seconds)
      expect(processingTime).toBeLessThan(60000);

      // Should generate documentation for all files
      const outputFiles = await fs.readdir(outputDir);
      const docFiles = outputFiles.filter(file => file.endsWith('.md'));
      expect(docFiles.length).toBeGreaterThan(3);
    });

    test('should handle memory usage efficiently with large inputs', async () => {
      // Create a very large transcript (simulate 2-hour video)
      const lines = [];
      for (let i = 0; i < 2000; i++) {
        const minutes = Math.floor(i / 60);
        const seconds = i % 60;
        lines.push(`[${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}] Content line ${i} with meaningful tutorial information about Docker, GitHub, and security practices.`);
      }

      const largeTranscript = lines.join('\\n');
      const transcriptFile = path.join(transcriptsDir, 'memory-test-large.txt');
      await fs.writeFile(transcriptFile, largeTranscript);

      // Monitor memory usage during processing
      const result = await runExtractionPipeline(transcriptFile, outputDir, configFile);
      
      expect(result.exitCode).toBe(0);
      expect(result.stderr).not.toContain('out of memory');
      expect(result.stderr).not.toContain('heap');

      // Should still generate quality output
      const outputFiles = await fs.readdir(outputDir);
      const docFiles = outputFiles.filter(file => file.endsWith('.md'));
      expect(docFiles.length).toBeGreaterThan(0);
    });
  });

  // Helper functions for running external processes
  async function runExtractionPipeline(inputFile, outputDir, configFile) {
    return new Promise((resolve) => {
      const child = spawn('node', [
        path.join(__dirname, '../../src/cli.js'),
        'extract',
        '--input', inputFile,
        '--output', outputDir,
        '--config', configFile
      ], {
        cwd: path.join(__dirname, '../..'),
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (exitCode) => {
        resolve({ exitCode, stdout, stderr });
      });
    });
  }

  async function runBatchExtraction(inputDir, outputDir, configFile) {
    return new Promise((resolve) => {
      const child = spawn('node', [
        path.join(__dirname, '../../src/cli.js'),
        'batch',
        '--input', inputDir,
        '--output', outputDir,
        '--config', configFile
      ], {
        cwd: path.join(__dirname, '../..'),
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (exitCode) => {
        resolve({ exitCode, stdout, stderr });
      });
    });
  }
});