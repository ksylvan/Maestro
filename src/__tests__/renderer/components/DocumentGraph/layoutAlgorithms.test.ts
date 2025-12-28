/**
 * Tests for the Document Graph layout algorithms
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Node, Edge } from 'reactflow';
import {
  applyForceLayout,
  applyHierarchicalLayout,
  interpolatePosition,
  createLayoutTransitionFrames,
  saveNodePositions,
  restoreNodePositions,
  clearNodePositions,
  hasSavedPositions,
} from '../../../../renderer/components/DocumentGraph/layoutAlgorithms';
import type { GraphNodeData, DocumentNodeData, ExternalLinkNodeData } from '../../../../renderer/components/DocumentGraph/graphDataBuilder';

/**
 * Create a mock document node
 */
function createDocumentNode(id: string, x = 0, y = 0): Node<DocumentNodeData> {
  return {
    id,
    type: 'documentNode',
    position: { x, y },
    data: {
      nodeType: 'document',
      title: id,
      lineCount: 100,
      wordCount: 500,
      size: '1 KB',
      filePath: `${id}.md`,
    },
  };
}

/**
 * Create a mock external link node
 */
function createExternalNode(domain: string, x = 0, y = 0): Node<ExternalLinkNodeData> {
  return {
    id: `ext-${domain}`,
    type: 'externalLinkNode',
    position: { x, y },
    data: {
      nodeType: 'external',
      domain,
      linkCount: 1,
      urls: [`https://${domain}`],
    },
  };
}

/**
 * Create a mock edge
 */
function createEdge(source: string, target: string, type = 'default'): Edge {
  return {
    id: `${source}-${target}`,
    source,
    target,
    type,
  };
}

describe('layoutAlgorithms', () => {
  describe('applyForceLayout', () => {
    it('should return empty array for empty input', () => {
      const result = applyForceLayout([], []);
      expect(result).toEqual([]);
    });

    it('should position a single node at center', () => {
      const nodes: Node<GraphNodeData>[] = [createDocumentNode('doc1')];
      const result = applyForceLayout(nodes, [], { centerX: 0, centerY: 0 });

      expect(result).toHaveLength(1);
      // Single node should be near center (within reasonable bounds due to forces)
      expect(result[0].position.x).toBeCloseTo(0, -1); // Allow some variance
      expect(result[0].position.y).toBeCloseTo(0, -1);
    });

    it('should position multiple nodes with spacing', () => {
      const nodes: Node<GraphNodeData>[] = [
        createDocumentNode('doc1'),
        createDocumentNode('doc2'),
        createDocumentNode('doc3'),
      ];
      const edges: Edge[] = [
        createEdge('doc1', 'doc2'),
        createEdge('doc2', 'doc3'),
      ];

      const result = applyForceLayout(nodes, edges);

      expect(result).toHaveLength(3);

      // Nodes should be separated (not all at same position)
      const positions = result.map((n) => n.position);
      const allSamePosition = positions.every(
        (p) => p.x === positions[0].x && p.y === positions[0].y
      );
      expect(allSamePosition).toBe(false);
    });

    it('should handle nodes without edges', () => {
      const nodes: Node<GraphNodeData>[] = [
        createDocumentNode('doc1'),
        createDocumentNode('doc2'),
      ];

      const result = applyForceLayout(nodes, []);

      expect(result).toHaveLength(2);
      // Nodes should still be positioned
      expect(result[0].position).toBeDefined();
      expect(result[1].position).toBeDefined();
    });

    it('should handle external link nodes differently', () => {
      const nodes: Node<GraphNodeData>[] = [
        createDocumentNode('doc1'),
        createExternalNode('github.com'),
      ];
      const edges: Edge[] = [createEdge('doc1', 'ext-github.com', 'external')];

      const result = applyForceLayout(nodes, edges);

      expect(result).toHaveLength(2);
      // Both nodes should have positions
      expect(result[0].position).toBeDefined();
      expect(result[1].position).toBeDefined();
    });

    it('should preserve node data after layout', () => {
      const nodes: Node<GraphNodeData>[] = [createDocumentNode('doc1')];
      const result = applyForceLayout(nodes, []);

      const data = result[0].data as DocumentNodeData;
      expect(data.nodeType).toBe('document');
      expect(data.title).toBe('doc1');
      expect(data.filePath).toBe('doc1.md');
    });

    it('should use custom layout options', () => {
      const nodes: Node<GraphNodeData>[] = [
        createDocumentNode('doc1'),
        createDocumentNode('doc2'),
      ];
      const edges: Edge[] = [createEdge('doc1', 'doc2')];

      const result = applyForceLayout(nodes, edges, {
        centerX: 500,
        centerY: 500,
        nodeSeparation: 100,
      });

      expect(result).toHaveLength(2);
      // Nodes should be roughly centered around 500, 500
      const avgX = (result[0].position.x + result[1].position.x) / 2;
      const avgY = (result[0].position.y + result[1].position.y) / 2;
      expect(avgX).toBeCloseTo(500, -2);
      expect(avgY).toBeCloseTo(500, -2);
    });
  });

  describe('applyHierarchicalLayout', () => {
    it('should return empty array for empty input', () => {
      const result = applyHierarchicalLayout([], []);
      expect(result).toEqual([]);
    });

    it('should position nodes in hierarchical order', () => {
      const nodes: Node<GraphNodeData>[] = [
        createDocumentNode('doc1'),
        createDocumentNode('doc2'),
        createDocumentNode('doc3'),
      ];
      const edges: Edge[] = [
        createEdge('doc1', 'doc2'),
        createEdge('doc1', 'doc3'),
      ];

      const result = applyHierarchicalLayout(nodes, edges, { rankDirection: 'TB' });

      expect(result).toHaveLength(3);

      // doc1 should be above doc2 and doc3 (lower Y in TB layout)
      const doc1 = result.find((n) => n.id === 'doc1');
      const doc2 = result.find((n) => n.id === 'doc2');
      const doc3 = result.find((n) => n.id === 'doc3');

      expect(doc1!.position.y).toBeLessThan(doc2!.position.y);
      expect(doc1!.position.y).toBeLessThan(doc3!.position.y);
      // doc2 and doc3 should be at similar Y (same rank)
      expect(doc2!.position.y).toBeCloseTo(doc3!.position.y, 0);
    });

    it('should handle LR (left-right) direction', () => {
      const nodes: Node<GraphNodeData>[] = [
        createDocumentNode('doc1'),
        createDocumentNode('doc2'),
      ];
      const edges: Edge[] = [createEdge('doc1', 'doc2')];

      const result = applyHierarchicalLayout(nodes, edges, { rankDirection: 'LR' });

      expect(result).toHaveLength(2);

      const doc1 = result.find((n) => n.id === 'doc1');
      const doc2 = result.find((n) => n.id === 'doc2');

      // doc1 should be to the left of doc2 (lower X in LR layout)
      expect(doc1!.position.x).toBeLessThan(doc2!.position.x);
    });

    it('should handle disconnected components', () => {
      const nodes: Node<GraphNodeData>[] = [
        createDocumentNode('doc1'),
        createDocumentNode('doc2'),
        createDocumentNode('doc3'),
      ];
      const edges: Edge[] = [createEdge('doc1', 'doc2')];
      // doc3 is disconnected

      const result = applyHierarchicalLayout(nodes, edges);

      expect(result).toHaveLength(3);
      // All nodes should have positions
      expect(result[0].position).toBeDefined();
      expect(result[1].position).toBeDefined();
      expect(result[2].position).toBeDefined();
    });

    it('should handle external links with longer edges', () => {
      const nodes: Node<GraphNodeData>[] = [
        createDocumentNode('doc1'),
        createExternalNode('github.com'),
      ];
      const edges: Edge[] = [createEdge('doc1', 'ext-github.com', 'external')];

      const result = applyHierarchicalLayout(nodes, edges, { rankDirection: 'TB' });

      expect(result).toHaveLength(2);
      // External node should be below document (minlen: 2)
      const doc = result.find((n) => n.id === 'doc1');
      const ext = result.find((n) => n.id === 'ext-github.com');
      expect(doc!.position.y).toBeLessThan(ext!.position.y);
    });

    it('should apply node and rank separation options', () => {
      const nodes: Node<GraphNodeData>[] = [
        createDocumentNode('doc1'),
        createDocumentNode('doc2'),
        createDocumentNode('doc3'),
      ];
      const edges: Edge[] = [
        createEdge('doc1', 'doc2'),
        createEdge('doc1', 'doc3'),
      ];

      const defaultResult = applyHierarchicalLayout(nodes, edges);
      const spacedResult = applyHierarchicalLayout(nodes, edges, {
        nodeSeparation: 200,
        rankSeparation: 300,
      });

      // Spaced result should have more separation
      const defaultDoc2 = defaultResult.find((n) => n.id === 'doc2');
      const defaultDoc3 = defaultResult.find((n) => n.id === 'doc3');
      const spacedDoc2 = spacedResult.find((n) => n.id === 'doc2');
      const spacedDoc3 = spacedResult.find((n) => n.id === 'doc3');

      const defaultSep = Math.abs(defaultDoc2!.position.x - defaultDoc3!.position.x);
      const spacedSep = Math.abs(spacedDoc2!.position.x - spacedDoc3!.position.x);

      expect(spacedSep).toBeGreaterThan(defaultSep);
    });
  });

  describe('interpolatePosition', () => {
    it('should return start position at t=0', () => {
      const start = { x: 0, y: 0 };
      const end = { x: 100, y: 100 };
      const result = interpolatePosition(start, end, 0);

      expect(result.x).toBe(0);
      expect(result.y).toBe(0);
    });

    it('should return end position at t=1', () => {
      const start = { x: 0, y: 0 };
      const end = { x: 100, y: 100 };
      const result = interpolatePosition(start, end, 1);

      expect(result.x).toBe(100);
      expect(result.y).toBe(100);
    });

    it('should interpolate at midpoint with easing', () => {
      const start = { x: 0, y: 0 };
      const end = { x: 100, y: 100 };
      const result = interpolatePosition(start, end, 0.5);

      // Due to ease-out cubic, midpoint should be past 50%
      expect(result.x).toBeGreaterThan(50);
      expect(result.y).toBeGreaterThan(50);
      expect(result.x).toBeLessThan(100);
      expect(result.y).toBeLessThan(100);
    });

    it('should clamp t to valid range', () => {
      const start = { x: 0, y: 0 };
      const end = { x: 100, y: 100 };

      const resultNeg = interpolatePosition(start, end, -0.5);
      expect(resultNeg.x).toBe(0);
      expect(resultNeg.y).toBe(0);

      const resultOver = interpolatePosition(start, end, 1.5);
      expect(resultOver.x).toBe(100);
      expect(resultOver.y).toBe(100);
    });
  });

  describe('createLayoutTransitionFrames', () => {
    it('should return end nodes for empty input', () => {
      const result = createLayoutTransitionFrames([], []);
      expect(result).toEqual([[]]);
    });

    it('should return end nodes for single frame', () => {
      const startNodes: Node<GraphNodeData>[] = [createDocumentNode('doc1', 0, 0)];
      const endNodes: Node<GraphNodeData>[] = [createDocumentNode('doc1', 100, 100)];

      const result = createLayoutTransitionFrames(startNodes, endNodes, 1);
      expect(result).toEqual([endNodes]);
    });

    it('should create correct number of frames', () => {
      const startNodes: Node<GraphNodeData>[] = [createDocumentNode('doc1', 0, 0)];
      const endNodes: Node<GraphNodeData>[] = [createDocumentNode('doc1', 100, 100)];

      const result = createLayoutTransitionFrames(startNodes, endNodes, 10);
      expect(result).toHaveLength(11); // 0 to 10 inclusive
    });

    it('should start at start positions and end at end positions', () => {
      const startNodes: Node<GraphNodeData>[] = [createDocumentNode('doc1', 0, 0)];
      const endNodes: Node<GraphNodeData>[] = [createDocumentNode('doc1', 100, 100)];

      const result = createLayoutTransitionFrames(startNodes, endNodes, 10);

      // First frame should be at start position
      expect(result[0][0].position.x).toBe(0);
      expect(result[0][0].position.y).toBe(0);

      // Last frame should be at end position
      const lastFrame = result[result.length - 1];
      expect(lastFrame[0].position.x).toBe(100);
      expect(lastFrame[0].position.y).toBe(100);
    });

    it('should preserve node data through frames', () => {
      const startNodes: Node<GraphNodeData>[] = [createDocumentNode('doc1', 0, 0)];
      const endNodes: Node<GraphNodeData>[] = [createDocumentNode('doc1', 100, 100)];

      const result = createLayoutTransitionFrames(startNodes, endNodes, 5);

      for (const frame of result) {
        const data = frame[0].data as DocumentNodeData;
        expect(data.nodeType).toBe('document');
        expect(data.title).toBe('doc1');
      }
    });
  });

  describe('position persistence', () => {
    const testGraphId = 'test-graph';

    beforeEach(() => {
      clearNodePositions(testGraphId);
    });

    it('should report no saved positions initially', () => {
      expect(hasSavedPositions(testGraphId)).toBe(false);
    });

    it('should save and restore node positions', () => {
      const nodes: Node<GraphNodeData>[] = [
        createDocumentNode('doc1', 100, 200),
        createDocumentNode('doc2', 300, 400),
      ];

      saveNodePositions(testGraphId, nodes);
      expect(hasSavedPositions(testGraphId)).toBe(true);

      // Create new nodes at different positions
      const newNodes: Node<GraphNodeData>[] = [
        createDocumentNode('doc1', 0, 0),
        createDocumentNode('doc2', 0, 0),
      ];

      const restoredNodes = restoreNodePositions(testGraphId, newNodes);

      expect(restoredNodes[0].position).toEqual({ x: 100, y: 200 });
      expect(restoredNodes[1].position).toEqual({ x: 300, y: 400 });
    });

    it('should return original nodes if no positions saved', () => {
      const nodes: Node<GraphNodeData>[] = [createDocumentNode('doc1', 50, 50)];

      const result = restoreNodePositions('nonexistent-graph', nodes);

      expect(result).toBe(nodes);
      expect(result[0].position).toEqual({ x: 50, y: 50 });
    });

    it('should return original node if its position not saved', () => {
      const nodes: Node<GraphNodeData>[] = [createDocumentNode('doc1', 100, 100)];
      saveNodePositions(testGraphId, nodes);

      // Try to restore a different node
      const newNodes: Node<GraphNodeData>[] = [
        createDocumentNode('doc2', 50, 50),
      ];

      const result = restoreNodePositions(testGraphId, newNodes);

      // Should return original since doc2 wasn't saved
      expect(result[0].position).toEqual({ x: 50, y: 50 });
    });

    it('should clear saved positions', () => {
      const nodes: Node<GraphNodeData>[] = [createDocumentNode('doc1', 100, 100)];
      saveNodePositions(testGraphId, nodes);

      expect(hasSavedPositions(testGraphId)).toBe(true);

      clearNodePositions(testGraphId);

      expect(hasSavedPositions(testGraphId)).toBe(false);
    });

    it('should handle multiple graphs independently', () => {
      const graph1 = 'graph-1';
      const graph2 = 'graph-2';

      clearNodePositions(graph1);
      clearNodePositions(graph2);

      const nodes1: Node<GraphNodeData>[] = [createDocumentNode('doc1', 100, 100)];
      const nodes2: Node<GraphNodeData>[] = [createDocumentNode('doc1', 200, 200)];

      saveNodePositions(graph1, nodes1);
      saveNodePositions(graph2, nodes2);

      const newNodes: Node<GraphNodeData>[] = [createDocumentNode('doc1', 0, 0)];

      const restored1 = restoreNodePositions(graph1, newNodes);
      const restored2 = restoreNodePositions(graph2, newNodes);

      expect(restored1[0].position).toEqual({ x: 100, y: 100 });
      expect(restored2[0].position).toEqual({ x: 200, y: 200 });
    });
  });
});
