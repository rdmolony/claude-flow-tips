/**
 * Jest setup file for transcript extraction system tests
 * Configures global test environment and utilities
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.CLAUDE_FLOW_TEST_MODE = 'true';

// Global test utilities
global.testUtils = {
  // Helper for async testing
  waitFor: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Mock coordination hooks
  mockCoordinationHooks: () => ({
    preTask: jest.fn(),
    postTask: jest.fn(), 
    notify: jest.fn(),
    sessionRestore: jest.fn(),
    sessionEnd: jest.fn()
  }),
  
  // Test data generators
  generateTestTranscript: (lines = 10) => ({
    filename: 'test-transcript.txt',
    lines: Array.from({ length: lines }, (_, i) => `Line ${i}: Test content`),
    speakers: ['Reuven', 'Community Member', 'Guest'],
    metadata: { date: '2025-08-22', event: 'Test Session' }
  }),
  
  // Validation helpers
  validateExtraction: (extraction) => {
    expect(extraction).toHaveProperty('source');
    expect(extraction).toHaveProperty('quote');
    expect(extraction).toHaveProperty('lineNumber');
    expect(extraction.quote.length).toBeGreaterThan(10);
    expect(extraction.lineNumber).toBeGreaterThan(0);
  },
  
  validateMarkdown: (content) => {
    expect(content).toMatch(/^#+ /m); // Has headers
    expect(content).not.toMatch(/\]\([^)]*\s[^)]*\)/); // No spaces in links
    expect(content).not.toMatch(/```[^`]*$/m); // No unclosed code blocks
  },
  
  // Performance helpers
  measurePerformance: async (fn) => {
    const start = process.hrtime.bigint();
    const result = await fn();
    const end = process.hrtime.bigint();
    const duration = Number(end - start) / 1000000; // Convert to milliseconds
    
    return { result, duration };
  }
};

// Custom matchers
expect.extend({
  toBeValidExtraction(received) {
    const requiredFields = ['source', 'quote', 'content'];
    const missingFields = requiredFields.filter(field => !received[field]);
    
    if (missingFields.length > 0) {
      return {
        message: () => `Expected extraction to have fields: ${missingFields.join(', ')}`,
        pass: false
      };
    }
    
    if (!received.lineNumber && !received.questionLine) {
      return {
        message: () => 'Expected extraction to have lineNumber or questionLine',
        pass: false
      };
    }
    
    return {
      message: () => 'Expected extraction to be invalid',
      pass: true
    };
  },
  
  toHaveValidMarkdown(received) {
    const hasHeaders = /^#+ /m.test(received);
    const hasNoSpacesInLinks = !/\]\([^)]*\s[^)]*\)/.test(received);
    const hasNoUnclosedCodeBlocks = !/```[^`]*$/.test(received);
    
    const issues = [];
    if (!hasHeaders) issues.push('missing headers');
    if (!hasNoSpacesInLinks) issues.push('spaces in links');
    if (!hasNoUnclosedCodeBlocks) issues.push('unclosed code blocks');
    
    if (issues.length > 0) {
      return {
        message: () => `Invalid markdown: ${issues.join(', ')}`,
        pass: false
      };
    }
    
    return {
      message: () => 'Expected markdown to be invalid',
      pass: true
    };
  },
  
  toHaveSourceCitation(received) {
    const hasSource = received.source && typeof received.source === 'string';
    const hasLineNumber = (received.lineNumber || received.questionLine) && 
                         typeof (received.lineNumber || received.questionLine) === 'number';
    const hasQuote = received.quote && typeof received.quote === 'string';
    
    if (!hasSource || !hasLineNumber || !hasQuote) {
      const missing = [];
      if (!hasSource) missing.push('source');
      if (!hasLineNumber) missing.push('lineNumber');
      if (!hasQuote) missing.push('quote');
      
      return {
        message: () => `Missing citation elements: ${missing.join(', ')}`,
        pass: false
      };
    }
    
    return {
      message: () => 'Expected citation to be invalid',
      pass: true
    };
  }
});

// Console override for cleaner test output
const originalConsole = global.console;
global.console = {
  ...originalConsole,
  log: process.env.VERBOSE_TESTS ? originalConsole.log : () => {},
  info: process.env.VERBOSE_TESTS ? originalConsole.info : () => {},
  warn: originalConsole.warn,
  error: originalConsole.error
};

// Cleanup after all tests
afterAll(() => {
  global.console = originalConsole;
});

// Increase timeout for integration tests
jest.setTimeout(30000);