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
    '^@json-render/react$': '<rootDir>/node_modules/@json-render/react/dist/index.js',
    '^@json-render/react/(.*)$': '<rootDir>/node_modules/@json-render/react/dist/$1.js',
    '^@json-render/core$': '<rootDir>/node_modules/@json-render/core/dist/index.js',
    '^@emulators/github$': '<rootDir>/node_modules/@emulators/github/dist/index.js',
    '^@emulators/adapter-next$': '<rootDir>/node_modules/@emulators/adapter-next/dist/index.js',
    '^@emulators/core$': '<rootDir>/node_modules/@emulators/core/dist/index.js',
  },
  testPathIgnorePatterns: [
    '/node_modules/',
    '<rootDir>/packages/',
    '<rootDir>/src/app/api/score/ip_resolution.test.ts',
    '<rootDir>/src/app/context/dna-context.test.ts',
    '<rootDir>/src/app/api/__tests__/test-harness.ts',
    '<rootDir>/src/__tests__/app/wallet-test-helpers.ts',
    '<rootDir>/src/__tests__/api/emulate-route.test.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)
