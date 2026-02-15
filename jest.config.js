/**
 * Jest configuration for TodoService unit tests
 *
 * This configuration is designed for testing services without React Native dependencies.
 * For component testing, consider using jest-expo with transform patterns.
 */

module.exports = {
  preset: 'ts-jest',

  // Test environment
  testEnvironment: 'node',

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],

  // Module paths
  moduleDirectories: ['node_modules', '<rootDir>/src'],

  // Test match patterns
  testMatch: [
    '**/*.spec.ts',
    '**/*.test.ts',
    '**/__tests__/**/*.ts',
  ],

  // Transform configuration
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      },
    }],
  },

  // Module name mapper for mocking
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },

  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.test.ts',
    '!src/types/**',
    '!src/navigation/**',
    '!src/screens/**',
    '!src/components/**',
  ],

  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
  ],

  // Clear mocks between tests
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,

  // Verbose output
  verbose: true,
};
