/* eslint-disable @typescript-eslint/no-require-imports */
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.polyfills.js', '<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@pinetwork/pi-sdk-js$': '<rootDir>/src/__mocks__/@pinetwork/pi-sdk-js.ts',
  },
  testPathIgnorePatterns: [
    '/node_modules/',
    '<rootDir>/src/lib/tiers.test.ts',
    '<rootDir>/src/app/api/score/ip_resolution.test.ts',
    '<rootDir>/src/app/context/dna-context.test.ts',
    '<rootDir>/src/app/api/__tests__/test-harness.ts',
    '<rootDir>/src/__tests__/api/user-status.test.ts',
    '<rootDir>/src/__tests__/lib/validate.test.ts',
    '<rootDir>/src/__tests__/test-utils.ts',
  ],
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)
