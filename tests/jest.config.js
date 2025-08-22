module.exports = {
  // Test environment
  testEnvironment: 'node',
  
  // Root directory
  rootDir: '../',
  
  // Test directories
  testMatch: [
    '<rootDir>/tests/unit/**/*.test.js',
    '<rootDir>/tests/integration/**/*.test.js', 
    '<rootDir>/tests/e2e/**/*.test.js'
  ],
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  
  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: '<rootDir>/tests/coverage',
  collectCoverageFrom: [
    'src/**/*.{js,ts}',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/**/node_modules/**'
  ],
  coverageReporters: [
    'text',
    'html',
    'json-summary',
    'lcov'
  ],
  
  // Coverage thresholds (90%+ requirement)
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    },
    'src/extraction/': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95
    }
  },
  
  // Test timeout
  testTimeout: 30000,
  
  // Module paths
  moduleDirectories: ['node_modules', '<rootDir>/tests'],
  
  // Mock patterns  
  moduleNamePattern: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  
  // Verbose output
  verbose: true,
  
  // Bail on first failure in CI
  bail: process.env.CI ? 1 : false,
  
  // Test suites
  projects: [
    {
      displayName: 'Unit Tests',
      testMatch: ['<rootDir>/tests/unit/**/*.test.js'],
      coveragePathIgnorePatterns: ['/node_modules/', '/tests/']
    },
    {
      displayName: 'Integration Tests', 
      testMatch: ['<rootDir>/tests/integration/**/*.test.js'],
      testTimeout: 60000
    },
    {
      displayName: 'E2E Tests',
      testMatch: ['<rootDir>/tests/e2e/**/*.test.js'], 
      testTimeout: 120000
    }
  ],
  
  // Reporter configuration
  reporters: [
    'default',
    [
      'jest-html-reporters',
      {
        publicPath: '<rootDir>/tests/coverage/html-report',
        filename: 'test-report.html',
        expand: true,
        hideIcon: true,
        pageTitle: 'Transcript Extraction System - Test Results'
      }
    ]
  ],
  
  // Global variables
  globals: {
    TEST_ENV: 'jest',
    COVERAGE_THRESHOLD: 90
  }
};