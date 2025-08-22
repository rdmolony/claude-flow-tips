/**
 * Jest setup file for global test configuration
 */

// Global test timeout (10 seconds for integration tests)
jest.setTimeout(10000);

// Mock console methods to keep test output clean (but preserve original console for debugging)
const originalConsole = global.console;
global.console = {
  ...originalConsole,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: originalConsole.warn, // Keep warnings visible for debugging
  error: originalConsole.error // Keep errors visible for debugging
};

// Test utilities
global.testUtils = {
  /**
   * Create a mock transcript with consistent structure
   */
  createMockTranscript: (overrides = {}) => ({
    id: 'test-transcript-123',
    filename: 'test-transcript.txt',
    content: [
      {
        line_number: 1,
        timestamp: '00:00:30',
        speaker: 'host',
        text: 'Welcome to this tutorial on setting up Claude Flow with Docker.'
      },
      {
        line_number: 2,
        timestamp: '00:01:15',
        speaker: 'host',
        text: 'First, make sure you have Docker installed and running on your system.'
      },
      {
        line_number: 3,
        timestamp: '00:02:45',
        speaker: 'host',
        text: 'Warning: never run Claude with the dangerously-skip-permissions flag outside of a sandbox.'
      }
    ],
    metadata: {
      duration: '45:30',
      language: 'en',
      processed_at: '2025-08-22T10:30:00Z'
    },
    ...overrides
  }),

  /**
   * Create a mock insight for testing
   */
  createMockInsight: (overrides = {}) => ({
    insight_id: 'insight-123',
    category: 'how-to',
    title: 'Setting Up Claude Flow with Docker',
    summary: 'Step-by-step guide to configure Claude Flow in a Docker environment.',
    quotes: [{
      text: 'First, make sure you have Docker installed and running on your system.',
      source_file: 'test-transcript.txt',
      line_start: 2,
      line_end: 2,
      timestamp: '00:01:15',
      confidence: 0.95
    }],
    tags: ['docker', 'setup', 'tutorial'],
    related_insights: [],
    verification_status: 'verified',
    extraction_date: '2025-08-22T10:30:00Z',
    ...overrides
  }),

  /**
   * Create test files in memory for testing
   */
  createTestFiles: () => ({
    'valid-transcript.txt': `[00:00:30] Welcome to this tutorial on setting up Claude Flow.
[00:01:15] First, install Docker on your system.
[00:02:45] Warning: never run with dangerous permissions outside sandbox.`,
    
    'malformed-transcript.txt': `Invalid format without timestamps
This line has no structure
Another random line`,
    
    'empty-transcript.txt': ''
  }),

  /**
   * Assert that object contains required fields
   */
  assertRequiredFields: (obj, fields) => {
    fields.forEach(field => {
      expect(obj).toHaveProperty(field);
      expect(obj[field]).toBeDefined();
    });
  },

  /**
   * Assert that insight has proper structure
   */
  assertValidInsight: (insight) => {
    global.testUtils.assertRequiredFields(insight, [
      'insight_id', 'category', 'title', 'summary', 'quotes', 
      'verification_status', 'extraction_date'
    ]);
    
    expect(insight.quotes).toBeInstanceOf(Array);
    expect(insight.quotes.length).toBeGreaterThan(0);
    
    insight.quotes.forEach(quote => {
      global.testUtils.assertRequiredFields(quote, [
        'text', 'source_file', 'line_start', 'confidence'
      ]);
      expect(quote.confidence).toBeGreaterThanOrEqual(0);
      expect(quote.confidence).toBeLessThanOrEqual(1);
    });
  }
};

// Global mocks
global.mockFileSystem = {
  files: {},
  readFile: jest.fn((path) => {
    if (global.mockFileSystem.files[path]) {
      return Promise.resolve(global.mockFileSystem.files[path]);
    }
    throw new Error(`File not found: ${path}`);
  }),
  writeFile: jest.fn((path, content) => {
    global.mockFileSystem.files[path] = content;
    return Promise.resolve();
  }),
  exists: jest.fn((path) => Boolean(global.mockFileSystem.files[path]))
};