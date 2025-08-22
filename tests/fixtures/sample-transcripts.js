/**
 * Sample transcript data for testing
 * Provides realistic transcript content for various test scenarios
 */

module.exports = {
  /**
   * Complete Docker tutorial transcript with all content types
   */
  dockerTutorial: `[00:00:30] Welcome to this comprehensive Claude Flow tutorial focused on Docker setup.
[00:01:15] First, you need to install Docker Desktop. You can download it from the official website.
[00:01:45] Make sure to check the system requirements before installation.
[00:02:30] Warning: never run Claude with the dangerously-skip-permissions flag outside of a sandbox.
[00:03:15] This is absolutely critical for security. If you bypass permissions outside a container, Claude could access your local credentials.
[00:04:00] It could even potentially brick your machine by editing system drivers or other critical files.
[00:04:30] Pro tip: always use GitHub Codespaces or Docker containers for Claude Flow development.
[00:05:00] This provides proper isolation and prevents accidental system damage.
[00:05:30] Question from the audience: "What if I don't have Docker installed?"
[00:06:00] Answer: You have several options. You can use GitHub Codespaces, which provides a cloud-based development environment.
[00:06:30] Alternatively, you can install Docker Desktop, but make sure to run it in a safe environment.
[00:07:00] Think of Claude Flow like a manufacturing pipeline. Raw transcript data goes in one end.
[00:07:30] Structured, verified knowledge documentation comes out the other end.
[00:08:00] Each stage transforms the data: parsing, classification, extraction, verification, and final documentation generation.
[00:08:30] The SPARC methodology guides this entire process systematically.
[00:09:00] SPARC stands for Specification, Pseudocode, Architecture, Refinement, and Completion.`,

  /**
   * Security-focused transcript with multiple gotchas
   */
  securityGotchas: `[00:00:30] Today we're discussing critical security considerations for Claude Flow.
[00:01:00] Warning: the biggest mistake I see is running Claude with elevated permissions on the host system.
[00:01:30] Never, and I mean never, use the --allow-all-permissions flag in production environments.
[00:02:00] This flag essentially gives Claude unrestricted access to your entire system.
[00:02:30] I've seen cases where this resulted in accidental deletion of important files.
[00:03:00] Another critical issue: storing API keys in plaintext configuration files.
[00:03:30] Always use environment variables or secure key management systems.
[00:04:00] Be careful with file path permissions. Claude can potentially access any file the user account can read.
[00:04:30] Warning: if you're on a shared system, other users might be able to access Claude's temporary files.
[00:05:00] Make sure to set proper umask values and file permissions.
[00:05:30] Pro tip: use Docker's security features like read-only filesystems and dropped capabilities.
[00:06:00] Always run containers with a non-root user account for additional security.`,

  /**
   * Q&A session transcript
   */
  qaSesssion: `[00:00:30] Let's open up for questions about Claude Flow implementation.
[00:01:00] Question: "How do I handle authentication with external APIs?"
[00:01:30] Answer: The recommended approach is to use OAuth 2.0 tokens stored in environment variables.
[00:02:00] You can configure these in your .env file, but never commit that file to version control.
[00:02:30] Question: "What's the best way to debug pipeline issues?"
[00:03:00] Answer: Start by enabling verbose logging. Set the LOG_LEVEL environment variable to 'debug'.
[00:03:30] You can also use the --dry-run flag to test your configuration without actually processing files.
[00:04:00] Question: "Can Claude Flow work with video files directly?"
[00:04:30] Answer: Not directly. You'll need to extract transcripts first using tools like Whisper or Rev.ai.
[00:05:00] Then you can process the transcript files through the Claude Flow pipeline.
[00:05:30] Question: "How accurate is the quote verification system?"
[00:06:00] Answer: In our testing, we achieve about 95% accuracy for exact matches and 88% for fuzzy matches.
[00:06:30] The system uses Levenshtein distance algorithms to handle minor transcription errors.`,

  /**
   * Technical architecture discussion
   */
  architecture: `[00:00:30] Let's dive into the technical architecture of Claude Flow's processing pipeline.
[00:01:00] The system follows a event-driven architecture pattern with clear separation of concerns.
[00:01:30] Think of it as a series of specialized workers, each handling a specific transformation step.
[00:02:00] The transcript processor normalizes input from various formats: VTT, SRT, and plain text.
[00:02:30] Next, the content segmenter breaks transcripts into logical chunks for processing.
[00:03:00] The classification engine uses transformer models to categorize content into predefined types.
[00:03:30] We support how-to guides, tips, gotchas, mental models, Q&A content, and concept definitions.
[00:04:00] The insight extractor generates summaries and selects representative quotes from classified content.
[00:04:30] Everything goes through a multi-layer verification system to prevent hallucinations.
[00:05:00] The verification includes exact quote matching, fuzzy matching for transcription errors, and confidence scoring.
[00:05:30] Finally, the documentation generator creates structured Markdown files with full source attribution.
[00:06:00] Pro tip: the entire pipeline is designed to be idempotent, so you can safely re-run processing.`,

  /**
   * Troubleshooting and tips transcript
   */
  troubleshooting: `[00:00:30] Let's cover common troubleshooting scenarios and helpful tips.
[00:01:00] Pro tip: if your pipeline is running slowly, check your concurrent processing settings.
[00:01:30] The default is 3 concurrent transcripts, but you can increase this on powerful machines.
[00:02:00] Common issue: "ModuleNotFoundError" usually means you haven't installed dependencies correctly.
[00:02:30] Run npm install in the project directory to install all required packages.
[00:03:00] If you're getting permission errors, make sure you're running in a properly configured environment.
[00:03:30] Pro tip: use the --verbose flag to get detailed logging output for debugging.
[00:04:00] Memory usage can be high with large transcripts. Consider processing files in smaller batches.
[00:04:30] If quote verification is failing, check that your transcript format is supported.
[00:05:00] The system works best with timestamped content, but can handle plain text too.
[00:05:30] Pro tip: always backup your original transcripts before processing.
[00:06:00] The pipeline modifies files in place, so you'll want to preserve the originals.`,

  /**
   * Malformed transcript for error testing
   */
  malformed: `This transcript has no timestamps
Some lines have partial formatting [00:01:30 but incomplete
Other lines are completely unstructured
[00:02:30] This line is properly formatted
Random content without any structure at all
[Missing closing bracket 00:03:30
Final line with no formatting`,

  /**
   * Empty and minimal transcripts
   */
  empty: '',
  minimal: '[00:00:30] Single line transcript for minimal testing.',

  /**
   * Multi-language transcript (mixed)
   */
  multiLanguage: `[00:00:30] Welcome to our international Claude Flow tutorial.
[00:01:00] Bienvenidos a nuestro tutorial de Claude Flow en español.
[00:01:30] Bienvenue dans notre tutoriel Claude Flow en français.
[00:02:00] We'll cover setup procedures in multiple languages.
[00:02:30] La instalación de Docker es el primer paso importante.
[00:03:00] L'installation de Docker est la première étape cruciale.`,

  /**
   * VTT format transcript
   */
  vttFormat: `WEBVTT

00:00:30.000 --> 00:00:35.000
Welcome to this VTT formatted transcript example.

00:01:15.000 --> 00:01:25.000
First, install Docker Desktop from the official website.

00:01:45.000 --> 00:01:55.000
Make sure Docker daemon is running properly.

00:02:30.000 --> 00:02:45.000
Warning: never use dangerous permission flags in production.

00:03:00.000 --> 00:03:15.000
Pro tip: containerized environments provide better security.`,

  /**
   * SRT format transcript
   */
  srtFormat: `1
00:00:30,000 --> 00:00:35,000
Welcome to this SRT formatted transcript example.

2
00:01:15,000 --> 00:01:25,000
Installation steps are critical for proper setup.

3
00:01:45,000 --> 00:01:55,000
Verify your configuration before proceeding.

4
00:02:30,000 --> 00:02:45,000
Security considerations must not be overlooked.`,

  /**
   * Long transcript for performance testing
   */
  longTranscript: generateLongTranscript(),

  /**
   * Technical jargon heavy transcript
   */
  technicalJargon: `[00:00:30] Today we're implementing OAuth 2.0 authentication with JWT tokens.
[00:01:00] The JWT payload contains base64-encoded JSON with user claims and expiration timestamps.
[00:01:30] Configure your CORS headers to allow cross-origin requests from approved domains.
[00:02:00] Use bcrypt for password hashing with a minimum salt rounds of 12.
[00:02:30] Implement rate limiting with Redis to prevent brute force attacks.
[00:03:00] Warning: never log sensitive data like passwords, tokens, or personal information.
[00:03:30] Pro tip: use environment-specific configuration files for different deployment stages.
[00:04:00] Set up CI/CD pipelines with proper secret management using HashiCorp Vault or AWS Secrets Manager.`
};

/**
 * Generate a long transcript for performance testing
 */
function generateLongTranscript() {
  const lines = [];
  const topics = [
    'Docker installation and configuration',
    'Security best practices and warnings',
    'GitHub integration setup',
    'Authentication configuration',
    'Troubleshooting common issues',
    'Performance optimization tips',
    'API configuration and usage',
    'Development environment setup'
  ];

  for (let i = 0; i < 500; i++) {
    const minutes = Math.floor(i / 4);
    const seconds = (i % 4) * 15;
    const topic = topics[i % topics.length];
    
    lines.push(`[${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}] Line ${i}: Discussion about ${topic} with detailed explanations and examples.`);
  }

  return lines.join('\\n');
}