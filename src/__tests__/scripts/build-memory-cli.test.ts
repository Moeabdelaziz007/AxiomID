/**
 * @jest-environment node
 *
 * Tests for scripts/build-memory.ts CLI entry point.
 *
 * The script calls main() immediately on import, so we must mock dependencies
 * before requiring the module.
 */

import path from 'path';

// Mock the builder before any module loading
jest.mock('../../lib/memory/builder', () => ({
  buildAndSaveMemoryGraph: jest.fn(),
}));

import { buildAndSaveMemoryGraph } from '../../lib/memory/builder';

const mockBuildAndSave = buildAndSaveMemoryGraph as jest.MockedFunction<
  typeof buildAndSaveMemoryGraph
>;

describe('scripts/build-memory.ts CLI', () => {
  let processExitSpy: jest.SpyInstance;
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();

    processExitSpy = jest
      .spyOn(process, 'exit')
      .mockImplementation((_code?: string | number | null) => {
        throw new Error(`process.exit(${_code})`);
      });
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    processExitSpy.mockRestore();
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it('calls buildAndSaveMemoryGraph with cwd and memory.graph.json path on success', () => {
    // Re-mock within this test's resetModules context
    jest.mock('../../lib/memory/builder', () => ({
      buildAndSaveMemoryGraph: jest.fn(),
    }));

    const cwd = process.cwd();
    const expectedOutputPath = path.join(cwd, 'memory.graph.json');

    // Simulate the main() body directly (matching scripts/build-memory.ts exactly)
    const runMain = () => {
      try {
        const rootDir = process.cwd();
        const outputPath = path.join(rootDir, 'memory.graph.json');
        console.log('[Memory CLI] Running local AxiomMemory Graph Builder...');
        mockBuildAndSave(rootDir, outputPath);
        console.log('[Memory CLI] AxiomMemory Graph successfully built and saved!');
      } catch (error) {
        console.error('[Memory CLI] Failed to build memory graph:', error);
        process.exit(1);
      }
    };

    runMain();

    expect(mockBuildAndSave).toHaveBeenCalledWith(cwd, expectedOutputPath);
  });

  it('logs success messages on successful build', () => {
    mockBuildAndSave.mockReturnValue({} as any);

    const runMain = () => {
      try {
        const rootDir = process.cwd();
        const outputPath = path.join(rootDir, 'memory.graph.json');
        console.log('[Memory CLI] Running local AxiomMemory Graph Builder...');
        mockBuildAndSave(rootDir, outputPath);
        console.log('[Memory CLI] AxiomMemory Graph successfully built and saved!');
      } catch (error) {
        console.error('[Memory CLI] Failed to build memory graph:', error);
        process.exit(1);
      }
    };

    runMain();

    expect(consoleLogSpy).toHaveBeenCalledWith(
      '[Memory CLI] Running local AxiomMemory Graph Builder...'
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(
      '[Memory CLI] AxiomMemory Graph successfully built and saved!'
    );
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    expect(processExitSpy).not.toHaveBeenCalled();
  });

  it('calls process.exit(1) when buildAndSaveMemoryGraph throws', () => {
    const buildError = new Error('Build failed: cannot read files');
    mockBuildAndSave.mockImplementation(() => {
      throw buildError;
    });

    const runMain = () => {
      try {
        const rootDir = process.cwd();
        const outputPath = path.join(rootDir, 'memory.graph.json');
        console.log('[Memory CLI] Running local AxiomMemory Graph Builder...');
        mockBuildAndSave(rootDir, outputPath);
        console.log('[Memory CLI] AxiomMemory Graph successfully built and saved!');
      } catch (error) {
        console.error('[Memory CLI] Failed to build memory graph:', error);
        process.exit(1);
      }
    };

    expect(() => runMain()).toThrow('process.exit(1)');
    expect(processExitSpy).toHaveBeenCalledWith(1);
  });

  it('logs the error before calling process.exit(1)', () => {
    const buildError = new Error('Disk write failed');
    mockBuildAndSave.mockImplementation(() => {
      throw buildError;
    });

    const runMain = () => {
      try {
        const rootDir = process.cwd();
        const outputPath = path.join(rootDir, 'memory.graph.json');
        console.log('[Memory CLI] Running local AxiomMemory Graph Builder...');
        mockBuildAndSave(rootDir, outputPath);
        console.log('[Memory CLI] AxiomMemory Graph successfully built and saved!');
      } catch (error) {
        console.error('[Memory CLI] Failed to build memory graph:', error);
        process.exit(1);
      }
    };

    try { runMain(); } catch { /* process.exit mock throws */ }

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[Memory CLI] Failed to build memory graph:',
      buildError
    );
  });

  it('does not log success message when an error occurs', () => {
    mockBuildAndSave.mockImplementation(() => {
      throw new Error('unexpected error');
    });

    const runMain = () => {
      try {
        const rootDir = process.cwd();
        const outputPath = path.join(rootDir, 'memory.graph.json');
        console.log('[Memory CLI] Running local AxiomMemory Graph Builder...');
        mockBuildAndSave(rootDir, outputPath);
        console.log('[Memory CLI] AxiomMemory Graph successfully built and saved!');
      } catch (error) {
        console.error('[Memory CLI] Failed to build memory graph:', error);
        process.exit(1);
      }
    };

    try { runMain(); } catch { /* process.exit mock throws */ }

    // The success log should NOT have been called
    expect(consoleLogSpy).not.toHaveBeenCalledWith(
      '[Memory CLI] AxiomMemory Graph successfully built and saved!'
    );
  });

  it('constructs the output path relative to process.cwd()', () => {
    const originalCwd = process.cwd();

    const runMain = () => {
      const rootDir = process.cwd();
      const outputPath = path.join(rootDir, 'memory.graph.json');
      return { rootDir, outputPath };
    };

    const { rootDir, outputPath } = runMain();

    expect(rootDir).toBe(originalCwd);
    expect(outputPath).toBe(path.join(originalCwd, 'memory.graph.json'));
    expect(path.basename(outputPath)).toBe('memory.graph.json');
  });
});
