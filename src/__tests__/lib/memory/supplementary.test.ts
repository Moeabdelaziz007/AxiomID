/**
 * @jest-environment node
 *
 * Supplementary tests for the memory graph system added in this PR.
 * Covers edge cases and behaviors not fully captured in the primary test files.
 */

import fs from 'fs';
import path from 'path';
import { buildAndSaveMemoryGraph, calculateGraphHash, buildMemoryGraph } from '../../../lib/memory/builder';
import { scanProjectAST } from '../../../lib/memory/extractors/ast-extractor';
import { extractGitInfo } from '../../../lib/memory/extractors/git-extractor';
import { scanProjectDocs } from '../../../lib/memory/extractors/doc-extractor';
import { validateGraph, validateNode, validateEdge, MemoryGraph } from '../../../lib/memory/graph';
import { TopologicalRouter } from '../../../lib/memory/router';

jest.mock('fs', () => {
  const original = jest.requireActual('fs');
  return {
    ...original,
    writeFileSync: jest.fn(),
    existsSync: jest.fn(),
    mkdirSync: jest.fn(),
    readFileSync: jest.fn(),
    statSync: jest.fn(),
    readdirSync: jest.fn(),
  };
});

jest.mock('../../../lib/memory/extractors/ast-extractor');
jest.mock('../../../lib/memory/extractors/git-extractor');
jest.mock('../../../lib/memory/extractors/doc-extractor');

const mockFs = fs as jest.Mocked<typeof fs>;
const mockScanProjectAST = scanProjectAST as jest.MockedFunction<typeof scanProjectAST>;
const mockExtractGitInfo = extractGitInfo as jest.MockedFunction<typeof extractGitInfo>;
const mockScanProjectDocs = scanProjectDocs as jest.MockedFunction<typeof scanProjectDocs>;

// ─────────────────────────────────────────────────────────────────────────────
// buildAndSaveMemoryGraph – actual fs.mkdirSync behavior
// ─────────────────────────────────────────────────────────────────────────────
describe('buildAndSaveMemoryGraph – fs.mkdirSync behavior', () => {
  const rootDir = '/project';

  beforeEach(() => {
    jest.clearAllMocks();
    mockScanProjectAST.mockReturnValue({ nodes: [], edges: [] });
    mockExtractGitInfo.mockReturnValue({ nodes: [], edges: [] });
    mockScanProjectDocs.mockReturnValue({ nodes: [], edges: [] });
  });

  it('always calls mkdirSync with {recursive: true} regardless of existsSync result', () => {
    // The current implementation unconditionally calls mkdirSync.
    // Using {recursive: true} makes it safe even if the directory already exists.
    mockFs.existsSync.mockReturnValue(true); // directory already exists

    buildAndSaveMemoryGraph(rootDir, '/project/out/memory.graph.json');

    expect(mockFs.mkdirSync).toHaveBeenCalledWith('/project/out', { recursive: true });
  });

  it('calls mkdirSync for nested output path', () => {
    buildAndSaveMemoryGraph(rootDir, '/project/deep/nested/output/memory.graph.json');

    expect(mockFs.mkdirSync).toHaveBeenCalledWith(
      '/project/deep/nested/output',
      { recursive: true }
    );
  });

  it('writes valid JSON that can be re-parsed', () => {
    let capturedContent: string = '';
    mockFs.writeFileSync.mockImplementation(((_path: any, content: any) => {
      capturedContent = content as string;
    }) as any);

    buildAndSaveMemoryGraph(rootDir, '/project/memory.graph.json');

    expect(() => JSON.parse(capturedContent)).not.toThrow();
    const parsed = JSON.parse(capturedContent);
    expect(parsed).toHaveProperty('version', '1.0');
    expect(parsed).toHaveProperty('hash');
    expect(parsed).toHaveProperty('nodes');
    expect(parsed).toHaveProperty('edges');
  });

  it('returns the same graph object that was written to disk', () => {
    let capturedContent: string = '';
    mockFs.writeFileSync.mockImplementation(((_path: any, content: any) => {
      capturedContent = content as string;
    }) as any);

    const graph = buildAndSaveMemoryGraph(rootDir, '/project/memory.graph.json');
    const written = JSON.parse(capturedContent);

    expect(graph.hash).toBe(written.hash);
    expect(graph.version).toBe(written.version);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// calculateGraphHash – determinism and sensitivity
// ─────────────────────────────────────────────────────────────────────────────
describe('calculateGraphHash – additional boundary cases', () => {
  it('produces the same hash regardless of edge ordering', () => {
    const nodes = [{ id: 'a.ts', type: 'file' as const }];
    const edges = [
      { source: 'a.ts', target: 'b.ts', type: 'imports' as const, weight: 1.0 },
      { source: 'a.ts', target: 'c.ts', type: 'imports' as const, weight: 1.0 },
    ];
    const ts = 12345;

    const h1 = calculateGraphHash(nodes, edges, ts);
    const h2 = calculateGraphHash(nodes, [edges[1], edges[0]], ts); // reversed order

    expect(h1).toBe(h2);
  });

  it('produces different hashes for different edge weights', () => {
    const nodes = [{ id: 'a.ts', type: 'file' as const }];
    const ts = 12345;

    const h1 = calculateGraphHash(
      nodes,
      [{ source: 'a.ts', target: 'b.ts', type: 'imports' as const, weight: 1.0 }],
      ts
    );
    const h2 = calculateGraphHash(
      nodes,
      [{ source: 'a.ts', target: 'b.ts', type: 'imports' as const, weight: 0.5 }],
      ts
    );

    expect(h1).not.toBe(h2);
  });

  it('produces a string of exactly 64 hex characters (sha256)', () => {
    const hash = calculateGraphHash(
      [{ id: 'x.ts', type: 'file' as const }],
      [],
      999
    );
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// buildMemoryGraph – additional merge behavior
// ─────────────────────────────────────────────────────────────────────────────
describe('buildMemoryGraph – additional merge scenarios', () => {
  const rootDir = '/project';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('preserves edges from all three extractors in the final graph', () => {
    mockScanProjectAST.mockReturnValue({
      nodes: [{ id: 'a.ts', type: 'file', metadata: {} }],
      edges: [{ source: 'a.ts', target: 'b.ts', type: 'imports', weight: 1.0 }],
    });
    mockExtractGitInfo.mockReturnValue({
      nodes: [],
      edges: [{ source: 'a.ts', target: 'b.ts', type: 'co-occurrence', weight: 0.5 }],
    });
    mockScanProjectDocs.mockReturnValue({
      nodes: [],
      edges: [{ source: 'a.ts', target: 'b.ts', type: 'wikilink', weight: 1.0 }],
    });

    const graph = buildMemoryGraph(rootDir);

    // Three distinct edge types → all three should be present
    const types = graph.edges.map((e) => e.type);
    expect(types).toContain('imports');
    expect(types).toContain('co-occurrence');
    expect(types).toContain('wikilink');
  });

  it('keeps the lower weight when two identical edges have same weight', () => {
    mockScanProjectAST.mockReturnValue({
      nodes: [],
      edges: [{ source: 'x.ts', target: 'y.ts', type: 'imports', weight: 0.7 }],
    });
    mockExtractGitInfo.mockReturnValue({
      nodes: [],
      edges: [{ source: 'x.ts', target: 'y.ts', type: 'imports', weight: 0.7 }],
    });
    mockScanProjectDocs.mockReturnValue({ nodes: [], edges: [] });

    const graph = buildMemoryGraph(rootDir);
    const edge = graph.edges.find(
      (e) => e.source === 'x.ts' && e.target === 'y.ts' && e.type === 'imports'
    );
    expect(edge?.weight).toBe(0.7);
  });

  it('returns a graph that passes Zod validation', () => {
    mockScanProjectAST.mockReturnValue({
      nodes: [{ id: 'src/index.ts', type: 'file', metadata: { size: 1024 } }],
      edges: [],
    });
    mockExtractGitInfo.mockReturnValue({ nodes: [], edges: [] });
    mockScanProjectDocs.mockReturnValue({ nodes: [], edges: [] });

    const graph = buildMemoryGraph(rootDir);

    expect(() => validateGraph(graph)).not.toThrow();
  });

  it('handles empty output from all extractors and produces a valid empty graph', () => {
    mockScanProjectAST.mockReturnValue({ nodes: [], edges: [] });
    mockExtractGitInfo.mockReturnValue({ nodes: [], edges: [] });
    mockScanProjectDocs.mockReturnValue({ nodes: [], edges: [] });

    const graph = buildMemoryGraph(rootDir);

    expect(graph.nodes).toHaveLength(0);
    expect(graph.edges).toHaveLength(0);
    expect(graph.version).toBe('1.0');
    expect(graph.hash).toHaveLength(64);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// MemoryGraph schema – additional edge cases not in graph.test.ts
// ─────────────────────────────────────────────────────────────────────────────
describe('MemoryGraph schema – additional edge cases', () => {
  it('validateGraph accepts a graph with all valid edge types mixed together', () => {
    const graph = {
      version: '1.0',
      hash: 'abc123def456',
      timestamp: 1000,
      nodes: [
        { id: 'dir', type: 'directory' },
        { id: 'file.ts', type: 'file' },
        { id: 'file.ts#Fn', type: 'symbol' },
        { id: 'doc.md', type: 'doc' },
        { id: 'commit:abc', type: 'commit' },
      ],
      edges: [
        { source: 'dir', target: 'file.ts', type: 'contains' },
        { source: 'file.ts', target: 'file.ts#Fn', type: 'exports' },
        { source: 'file.ts#Fn', target: 'file.ts#Fn', type: 'calls' },
        { source: 'doc.md', target: 'file.ts', type: 'references' },
        { source: 'file.ts', target: 'file.ts', type: 'co-occurrence' },
        { source: 'doc.md', target: 'file.ts', type: 'wikilink' },
      ],
    };

    expect(() => validateGraph(graph)).not.toThrow();
  });

  it('validateGraph rejects a node array containing an invalid node', () => {
    const graph = {
      version: '1.0',
      hash: 'abc123',
      timestamp: 1000,
      nodes: [{ id: 'bad-node', type: 'unknown-type' }],
      edges: [],
    };

    expect(() => validateGraph(graph as any)).toThrow();
  });

  it('validateGraph rejects an edge array containing an invalid edge type', () => {
    const graph = {
      version: '1.0',
      hash: 'abc123',
      timestamp: 1000,
      nodes: [],
      edges: [{ source: 'a', target: 'b', type: 'dislikes' }],
    };

    expect(() => validateGraph(graph as any)).toThrow();
  });

  it('validateNode preserves metadata with deeply nested values', () => {
    const node = {
      id: 'src/complex.ts',
      type: 'file' as const,
      metadata: {
        nested: { deep: { value: 42 } },
        array: [1, 2, 3],
        nullValue: null,
      },
    };

    const validated = validateNode(node);
    expect(validated.metadata.nested).toEqual({ deep: { value: 42 } });
    expect(validated.metadata.array).toEqual([1, 2, 3]);
  });

  it('validateEdge rejects a non-number weight', () => {
    const edge = {
      source: 'a',
      target: 'b',
      type: 'imports',
      weight: 'heavy', // invalid
    };

    expect(() => validateEdge(edge as any)).toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TopologicalRouter – additional edge cases
// ─────────────────────────────────────────────────────────────────────────────
describe('TopologicalRouter – additional edge cases', () => {
  it('handles a single-node graph with no edges', () => {
    const singleNodeGraph: MemoryGraph = {
      version: '1.0',
      hash: 'singlehash',
      timestamp: Date.now(),
      nodes: [{ id: 'solo', type: 'file' }],
      edges: [],
    };

    const router = new TopologicalRouter(singleNodeGraph);
    const context = router.getContext('solo', 3);

    expect(context).toHaveLength(0);
  });

  it('handles a graph with only two nodes and one edge', () => {
    const twoNodeGraph: MemoryGraph = {
      version: '1.0',
      hash: 'twohash',
      timestamp: Date.now(),
      nodes: [
        { id: 'src', type: 'directory' },
        { id: 'src/index.ts', type: 'file' },
      ],
      edges: [{ source: 'src', target: 'src/index.ts', type: 'contains', weight: 0.5 }],
    };

    const router = new TopologicalRouter(twoNodeGraph);
    const fromSrc = router.getContext('src', 1);

    // Should return the child file
    expect(fromSrc.length).toBeGreaterThan(0);
    expect(fromSrc.find((c) => c.node.id === 'src/index.ts')).toBeDefined();
  });

  it('returns results sorted with higher-weight nodes before lower-weight at same distance', () => {
    const graph: MemoryGraph = {
      version: '1.0',
      hash: 'weightsorthash',
      timestamp: Date.now(),
      nodes: [
        { id: 'root', type: 'directory' },
        { id: 'highWeight.ts', type: 'file' },
        { id: 'lowWeight.ts', type: 'file' },
        { id: 'midWeight.ts', type: 'file' },
      ],
      edges: [
        { source: 'root', target: 'highWeight.ts', type: 'contains', weight: 2.0 },
        { source: 'root', target: 'lowWeight.ts', type: 'contains', weight: 0.1 },
        { source: 'root', target: 'midWeight.ts', type: 'contains', weight: 1.0 },
      ],
    };

    const router = new TopologicalRouter(graph);
    const context = router.getContext('root', 1);

    // All at distance 1; should be ordered by descending weight
    expect(context[0].node.id).toBe('highWeight.ts');
    expect(context[1].node.id).toBe('midWeight.ts');
    expect(context[2].node.id).toBe('lowWeight.ts');
  });

  it('does not visit the same node twice when cycles exist at radius 1', () => {
    const cyclicGraph: MemoryGraph = {
      version: '1.0',
      hash: 'cyclichash',
      timestamp: Date.now(),
      nodes: [
        { id: 'A', type: 'file' },
        { id: 'B', type: 'file' },
      ],
      edges: [
        { source: 'A', target: 'B', type: 'imports', weight: 1.0 },
        { source: 'B', target: 'A', type: 'imports', weight: 1.0 },
      ],
    };

    const router = new TopologicalRouter(cyclicGraph);
    const context = router.getContext('A', 5);

    // B is reachable; no duplicates
    const bEntries = context.filter((c) => c.node.id === 'B');
    expect(bEntries).toHaveLength(1);
  });

  it('getContext with maxRadius=1 does not include nodes 2+ hops away', () => {
    const chainGraph: MemoryGraph = {
      version: '1.0',
      hash: 'chainhash',
      timestamp: Date.now(),
      nodes: [
        { id: 'A', type: 'file' },
        { id: 'B', type: 'file' },
        { id: 'C', type: 'file' },
      ],
      edges: [
        { source: 'A', target: 'B', type: 'imports', weight: 1.0 },
        { source: 'B', target: 'C', type: 'imports', weight: 1.0 },
      ],
    };

    const router = new TopologicalRouter(chainGraph);
    const context = router.getContext('A', 1);

    const nodeIds = context.map((c) => c.node.id);
    expect(nodeIds).toContain('B');
    expect(nodeIds).not.toContain('C');
  });
});