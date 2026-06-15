import { MemoryGraph, MemoryNode } from './graph';

export interface RoutedNode {
  node: MemoryNode;
  distance: number;
  weight: number;
}

/**
 * Topological Router for navigating the memory graph.
 * Uses Breadth-First Search (BFS) to gather relevant code context within a specified radius.
 */
export class TopologicalRouter {
  private adjacencyList: Map<string, Array<{ target: string; weight: number; type: string }>>;
  private nodeMap: Map<string, MemoryNode>;

  constructor(graph: MemoryGraph) {
    this.adjacencyList = new Map();
    this.nodeMap = new Map();
    this.buildIndex(graph);
  }

  /**
   * Builds index maps for fast lookup during traversal.
   */
  private buildIndex(graph: MemoryGraph) {
    for (const node of graph.nodes) {
      this.nodeMap.set(node.id, node);
    }

    // Build undirected adjacency list for bidirectional traversal
    for (const edge of graph.edges) {
      // Forward direction
      if (!this.adjacencyList.has(edge.source)) {
        this.adjacencyList.set(edge.source, []);
      }
      this.adjacencyList.get(edge.source)!.push({
        target: edge.target,
        weight: edge.weight,
        type: edge.type
      });

      // Backward direction (to find callers/parent structures)
      if (!this.adjacencyList.has(edge.target)) {
        this.adjacencyList.set(edge.target, []);
      }
      // We weight backward traversals slightly lower to prioritize forward dependencies
      const backwardWeight = edge.weight * 0.8;
      this.adjacencyList.get(edge.target)!.push({
        target: edge.source,
        weight: backwardWeight,
        type: `${edge.type}:rev`
      });
    }
  }

  /**
   * Retrieves context nodes within a given hop radius.
   * Sorts results by distance (closest first) and edge weight (highest first).
   */
  public getContext(targetNodeId: string, maxRadius = 2): RoutedNode[] {
    const startNode = this.nodeMap.get(targetNodeId);
    if (!startNode) {
      return [];
    }

    const visited = new Map<string, { distance: number; weight: number }>();
    const queue: Array<{ id: string; distance: number; accumulatedWeight: number }> = [];

    // Initialize BFS with the target node
    queue.push({ id: targetNodeId, distance: 0, accumulatedWeight: 1.0 });
    visited.set(targetNodeId, { distance: 0, weight: 1.0 });

    while (queue.length > 0) {
      const current = queue.shift()!;
      const { id, distance, accumulatedWeight } = current;

      if (distance >= maxRadius) {
        continue;
      }

      const neighbors = this.adjacencyList.get(id) || [];
      for (const neighbor of neighbors) {
        const nextDistance = distance + 1;
        // Simple multiplicative weight decay along path
        const nextWeight = accumulatedWeight * neighbor.weight;

        const existing = visited.get(neighbor.target);
        if (!existing) {
          visited.set(neighbor.target, { distance: nextDistance, weight: nextWeight });
          queue.push({
            id: neighbor.target,
            distance: nextDistance,
            accumulatedWeight: nextWeight
          });
        } else if (nextDistance < existing.distance || (nextDistance === existing.distance && nextWeight > existing.weight)) {
          // Found a shorter path or heavier path — update and re-queue
          visited.set(neighbor.target, { distance: nextDistance, weight: nextWeight });
          queue.push({
            id: neighbor.target,
            distance: nextDistance,
            accumulatedWeight: nextWeight
          });
        }
      }
    }

    // Exclude the starting node from the results
    visited.delete(targetNodeId);

    // Map to RoutedNode objects and sort
    const results: RoutedNode[] = [];
    for (const [id, stats] of visited.entries()) {
      const node = this.nodeMap.get(id);
      if (node) {
        results.push({
          node,
          distance: stats.distance,
          weight: stats.weight
        });
      }
    }

    // Sort: 
    // 1. Distance ascending (closer is more relevant)
    // 2. Weight descending (stronger connection is more relevant)
    return results.sort((a, b) => {
      if (a.distance !== b.distance) {
        return a.distance - b.distance;
      }
      return b.weight - a.weight;
    });
  }
}
export default TopologicalRouter;
