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
    '^d3$': '<rootDir>/src/__mocks__/d3.ts',
    '^d3-(.*)$': '<rootDir>/src/__mocks__/d3-$1/index.ts',
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
    '<rootDir>/workers/',
    '<rootDir>/src/app/api/score/ip_resolution.test.ts',
    '<rootDir>/src/app/context/dna-context.test.ts',
    '<rootDir>/src/app/api/__tests__/test-harness.ts',
    '<rootDir>/src/__tests__/app/wallet-test-helpers.ts',
    '<rootDir>/src/__tests__/api/emulate-route.test.ts',
  ],
  // react-dom 19's scheduler keeps a MessagePort open by design; without
  // forceExit the worker pool force-kills it ("worker process has failed to
  // exit gracefully") and jest exits non-zero in CI (Loops coverage job).
  forceExit: true,
  openHandlesTimeout: 0,
  // Per-path thresholds on the modules this app owns and tests directly;
  // the global numbers are set below the all-files reality so the merged
  // `backend/` service (~23%) cannot veto the whole run. Jest's exit code
  // is the enforcement — loops.yml's bespoke grep is gone.
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 60,
      lines: 70,
      statements: 70,
    },
    '**/components/os/*': {
      branches: 75,
      functions: 95,
      lines: 95,
      statements: 95,
    },
    '**/components/plans/*': {
      branches: 80,
      functions: 95,
      lines: 95,
      statements: 95,
    },
    '**/app/api/plans/checkout/*': {
      branches: 70,
      functions: 90,
      lines: 90,
      statements: 90,
    },
    '**/ghost.ts': {
      branches: 90,
      functions: 70,
      lines: 95,
      statements: 85,
    },
  },
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)
