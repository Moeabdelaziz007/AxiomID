import { vi } from 'vitest';

// Provide jest-compatible globals for tests that use jest.mock(), jest.fn(), etc.
globalThis.jest = vi;
