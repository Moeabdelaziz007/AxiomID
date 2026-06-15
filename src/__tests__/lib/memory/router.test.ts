/* eslint-disable @typescript-eslint/no-require-imports */
import { MemoryGraph } from '../../../lib/memory/graph';
import { TopologicalRouter } from '../../../lib/memory/router';

describe('TopologicalRouter', () => {
  // Setup a dummy cyclical graph
  // A -> contains -> B (weight: 0.5)
  // B -> imports -> C (weight: 1.0)
  // C -> imports -> D (weight: 1.0)
  // D -> imports -> B (weight: 1.0) - Cycle!
  // A -> contains -> E (weight: 0.5)
  const dummyGraph: MemoryGraph = {
    version: '1.0',
    hash: 'dummyhash',
    timestamp: Date.now(),
    nodes: [
      { id: 'nodeA', type: 'directory' },
      { id: 'nodeB', type: 'file' },
      { id: 'nodeC', type: 'file' },
      { id: 'nodeD', type: 'file' },
      { id: 'nodeE', type: 'file' }
    ],
    edges: [
      { source: 'nodeA', target: 'nodeB', type: 'contains', weight: 0.5 },
      { source: 'nodeB', target: 'nodeC', type: 'imports', weight: 1.0 },
      { source: 'nodeC', target: 'nodeD', type: 'imports', weight: 1.0 },
      { source: 'nodeD', target: 'nodeB', type: 'imports', weight: 1.0 },
      { source: 'nodeA', target: 'nodeE', type: 'contains', weight: 0.5 }
    ]
  };

  let router: TopologicalRouter;

  beforeEach(() => {
    router = new TopologicalRouter(dummyGraph);
  });

  it('should return direct neighbors at distance 1 sorted by weight', () => {
    // For nodeB:
    // Forward edge to nodeC (imports, weight 1.0)
    // Backward edge to nodeA (contains:rev, weight 0.5 * 0.8 = 0.4)
    // Backward edge to nodeD (imports:rev, weight 1.0 * 0.8 = 0.8)
    const context = router.getContext('nodeB', 1);

    expect(context).toHaveLength(3);
    
    // First should be nodeC (distance 1, weight 1.0)
    expect(context[0].node.id).toBe('nodeC');
    expect(context[0].distance).toBe(1);
    expect(context[0].weight).toBe(1.0);

    // Second should be nodeD (distance 1, weight 0.8)
    expect(context[1].node.id).toBe('nodeD');
    expect(context[1].distance).toBe(1);
    expect(context[1].weight).toBe(0.8);

    // Third should be nodeA (distance 1, weight 0.4)
    expect(context[2].node.id).toBe('nodeA');
    expect(context[2].distance).toBe(1);
    expect(context[2].weight).toBe(0.4);
  });

  it('should traverse up to radius 2 and find nodeE from nodeB', () => {
    // Path: nodeB -> nodeA -> nodeE
    const context = router.getContext('nodeB', 2);
    
    const nodeEEntry = context.find(c => c.node.id === 'nodeE');
    expect(nodeEEntry).toBeDefined();
    expect(nodeEEntry?.distance).toBe(2);
    // Weight: accumulated (backward from B to A = 0.4) * forward A to E (0.5) = 0.2
    expect(nodeEEntry?.weight).toBeCloseTo(0.2);
  });

  it('should handle cyclical graphs without infinite loops', () => {
    // Maximum radius larger than cycle size
    const context = router.getContext('nodeB', 5);
    
    // Total nodes in graph except B is 4 (A, C, D, E)
    expect(context).toHaveLength(4);
    
    // None should be nodeB itself
    expect(context.find(c => c.node.id === 'nodeB')).toBeUndefined();
  });

  it('should return empty array for non-existent target node', () => {
    const context = router.getContext('nonExistent');
    expect(context).toHaveLength(0);
  });

  it('should return empty array with maxRadius=0 (no traversal beyond starting node)', () => {
    // With maxRadius=0, the BFS never explores neighbors
    const context = router.getContext('nodeB', 0);
    expect(context).toHaveLength(0);
  });

  it('should use default maxRadius of 2 when not specified', () => {
    // nodeB at radius 2 should find nodeA, nodeC, nodeD (distance 1) and nodeE (distance 2)
    const contextDefault = router.getContext('nodeB');
    const contextRadius2 = router.getContext('nodeB', 2);
    expect(contextDefault).toHaveLength(contextRadius2.length);
    expect(contextDefault.map(c => c.node.id).sort()).toEqual(
      contextRadius2.map(c => c.node.id).sort()
    );
  });

  it('should return correct distance for nodes at distance 2', () => {
    const context = router.getContext('nodeA', 2);
    // nodeA -> nodeB (dist 1), nodeA -> nodeE (dist 1)
    // Then from nodeB: nodeC (dist 2), nodeD (dist 2)
    const nodeC = context.find(c => c.node.id === 'nodeC');
    const nodeD = context.find(c => c.node.id === 'nodeD');
    expect(nodeC?.distance).toBe(2);
    expect(nodeD?.distance).toBe(2);
  });
});

describe('TopologicalRouter — linear chain graph', () => {
  // Simple linear chain: Root -> A -> B -> C
  const linearGraph: MemoryGraph = {
    version: '1.0',
    hash: 'linearhash',
    timestamp: Date.now(),
    nodes: [
      { id: 'root', type: 'directory' },
      { id: 'A', type: 'file' },
      { id: 'B', type: 'file' },
      { id: 'C', type: 'file' },
    ],
    edges: [
      { source: 'root', target: 'A', type: 'contains', weight: 1.0 },
      { source: 'A', target: 'B', type: 'imports', weight: 1.0 },
      { source: 'B', target: 'C', type: 'imports', weight: 1.0 },
    ]
  };

  let linearRouter: import('../../../lib/memory/router').TopologicalRouter;

  beforeEach(() => {
    const { TopologicalRouter } = require('../../../lib/memory/router');
    linearRouter = new TopologicalRouter(linearGraph);
  });

  it('should find C at distance 2 from A (forward traversal)', () => {
    const context = linearRouter.getContext('A', 2);
    const nodeC = context.find(c => c.node.id === 'C');
    expect(nodeC).toBeDefined();
    expect(nodeC?.distance).toBe(2);
  });

  it('should find root at distance 2 from B (backward traversal)', () => {
    const context = linearRouter.getContext('B', 2);
    const root = context.find(c => c.node.id === 'root');
    expect(root).toBeDefined();
    expect(root?.distance).toBe(2);
  });

  it('should not find C from A with maxRadius=1 (too shallow)', () => {
    const context = linearRouter.getContext('A', 1);
    const nodeC = context.find(c => c.node.id === 'C');
    expect(nodeC).toBeUndefined();
  });

  it('results should be sorted by distance ascending', () => {
    const context = linearRouter.getContext('A', 3);
    for (let i = 1; i < context.length; i++) {
      expect(context[i].distance).toBeGreaterThanOrEqual(context[i - 1].distance);
    }
  });
});
