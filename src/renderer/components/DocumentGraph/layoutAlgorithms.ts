/**
 * Layout algorithms for the Document Graph visualization.
 *
 * Provides two layout options:
 * - Force-directed: Uses d3-force for organic, physics-based node positioning
 * - Hierarchical: Uses dagre for tree-like, ranked layouts
 *
 * Both algorithms preserve node data and only update positions.
 */

import { Node, Edge } from 'reactflow';
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  forceX,
  forceY,
  SimulationNodeDatum,
  SimulationLinkDatum,
} from 'd3-force';
import dagre from '@dagrejs/dagre';
import type { GraphNodeData } from './graphDataBuilder';

/**
 * Layout configuration options
 */
export interface LayoutOptions {
  /** Node width for layout calculations */
  nodeWidth?: number;
  /** Node height for layout calculations */
  nodeHeight?: number;
  /** Direction for hierarchical layout: 'TB' (top-bottom) or 'LR' (left-right) */
  rankDirection?: 'TB' | 'LR';
  /** Separation between nodes (hierarchical) or base distance (force) */
  nodeSeparation?: number;
  /** Separation between ranks/levels (hierarchical only) */
  rankSeparation?: number;
  /** Center X position for the layout */
  centerX?: number;
  /** Center Y position for the layout */
  centerY?: number;
}

/**
 * Default layout options
 */
const DEFAULT_OPTIONS: Required<LayoutOptions> = {
  nodeWidth: 280,
  nodeHeight: 120,
  rankDirection: 'TB',
  nodeSeparation: 50,
  rankSeparation: 100,
  centerX: 0,
  centerY: 0,
};

/**
 * Extended node datum for d3-force simulation
 */
interface ForceNodeDatum extends SimulationNodeDatum {
  id: string;
  width: number;
  height: number;
  isExternal: boolean;
}

/**
 * Link datum for d3-force simulation
 */
interface ForceLinkDatum extends SimulationLinkDatum<ForceNodeDatum> {
  id: string;
  isExternal: boolean;
}

/**
 * Apply force-directed layout using d3-force.
 *
 * Creates an organic layout where nodes repel each other and edges act as springs.
 * This works well for visualizing document relationships without strict hierarchy.
 *
 * @param nodes - React Flow nodes to position
 * @param edges - React Flow edges defining relationships
 * @param options - Layout configuration options
 * @returns New array of nodes with updated positions
 */
export function applyForceLayout(
  nodes: Node<GraphNodeData>[],
  edges: Edge[],
  options: LayoutOptions = {}
): Node<GraphNodeData>[] {
  if (nodes.length === 0) return [];

  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Create simulation nodes
  const simNodes: ForceNodeDatum[] = nodes.map((node) => ({
    id: node.id,
    x: node.position.x || Math.random() * 500,
    y: node.position.y || Math.random() * 500,
    width: node.type === 'externalLinkNode' ? 160 : opts.nodeWidth,
    height: node.type === 'externalLinkNode' ? 60 : opts.nodeHeight,
    isExternal: node.type === 'externalLinkNode',
  }));

  // Create node lookup map
  const nodeMap = new Map(simNodes.map((n) => [n.id, n]));

  // Create simulation links (only for edges where both nodes exist)
  const simLinks: ForceLinkDatum[] = edges
    .filter((edge) => nodeMap.has(edge.source) && nodeMap.has(edge.target))
    .map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      isExternal: edge.type === 'external',
    }));

  // Calculate link distance based on node sizes
  const baseLinkDistance = opts.nodeSeparation + Math.max(opts.nodeWidth, opts.nodeHeight) / 2;

  // Create and run the force simulation
  const simulation = forceSimulation<ForceNodeDatum>(simNodes)
    .force(
      'link',
      forceLink<ForceNodeDatum, ForceLinkDatum>(simLinks)
        .id((d) => d.id)
        .distance((link) => {
          // External links can be longer
          return link.isExternal ? baseLinkDistance * 1.5 : baseLinkDistance;
        })
        .strength((link) => {
          // External links are weaker
          return link.isExternal ? 0.3 : 0.7;
        })
    )
    .force(
      'charge',
      forceManyBody<ForceNodeDatum>()
        .strength((d) => {
          // External nodes have less repulsion
          return d.isExternal ? -150 : -400;
        })
        .distanceMax(500)
    )
    .force(
      'collide',
      forceCollide<ForceNodeDatum>()
        .radius((d) => Math.max(d.width, d.height) / 2 + 20)
        .strength(0.8)
    )
    .force('center', forceCenter(opts.centerX, opts.centerY))
    .force(
      'x',
      forceX<ForceNodeDatum>(opts.centerX).strength(0.05)
    )
    .force(
      'y',
      forceY<ForceNodeDatum>(opts.centerY).strength(0.05)
    )
    .stop();

  // Run simulation synchronously for a set number of iterations
  const iterations = 300;
  simulation.tick(iterations);

  // Build result nodes with updated positions
  const positionMap = new Map(simNodes.map((n) => [n.id, { x: n.x ?? 0, y: n.y ?? 0 }]));

  return nodes.map((node) => {
    const pos = positionMap.get(node.id);
    return {
      ...node,
      position: pos ?? node.position,
    };
  });
}

/**
 * Apply hierarchical layout using dagre.
 *
 * Creates a tree-like layout with clear levels/ranks. Documents that link to
 * each other are arranged in a directed acyclic graph structure.
 *
 * @param nodes - React Flow nodes to position
 * @param edges - React Flow edges defining relationships
 * @param options - Layout configuration options
 * @returns New array of nodes with updated positions
 */
export function applyHierarchicalLayout(
  nodes: Node<GraphNodeData>[],
  edges: Edge[],
  options: LayoutOptions = {}
): Node<GraphNodeData>[] {
  if (nodes.length === 0) return [];

  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Create a new dagre graph
  const g = new dagre.graphlib.Graph();

  // Configure the graph
  g.setGraph({
    rankdir: opts.rankDirection,
    nodesep: opts.nodeSeparation,
    ranksep: opts.rankSeparation,
    marginx: 50,
    marginy: 50,
  });

  // Default edge label
  g.setDefaultEdgeLabel(() => ({}));

  // Add nodes to the graph
  for (const node of nodes) {
    const width = node.type === 'externalLinkNode' ? 160 : opts.nodeWidth;
    const height = node.type === 'externalLinkNode' ? 60 : opts.nodeHeight;

    g.setNode(node.id, {
      width,
      height,
      label: node.id,
    });
  }

  // Add edges to the graph
  for (const edge of edges) {
    // Only add edge if both nodes exist
    if (g.hasNode(edge.source) && g.hasNode(edge.target)) {
      g.setEdge(edge.source, edge.target, {
        minlen: edge.type === 'external' ? 2 : 1,
      });
    }
  }

  // Run the layout algorithm
  dagre.layout(g);

  // Extract positions from dagre and update nodes
  return nodes.map((node) => {
    const dagreNode = g.node(node.id);
    if (!dagreNode) {
      return node;
    }

    // Dagre returns center positions, convert to top-left for React Flow
    const width = node.type === 'externalLinkNode' ? 160 : opts.nodeWidth;
    const height = node.type === 'externalLinkNode' ? 60 : opts.nodeHeight;

    return {
      ...node,
      position: {
        x: dagreNode.x - width / 2,
        y: dagreNode.y - height / 2,
      },
    };
  });
}

/**
 * Interpolate between two positions for smooth animation.
 *
 * @param start - Starting position
 * @param end - Ending position
 * @param t - Interpolation factor (0-1)
 * @returns Interpolated position
 */
export function interpolatePosition(
  start: { x: number; y: number },
  end: { x: number; y: number },
  t: number
): { x: number; y: number } {
  // Clamp t to [0, 1]
  const clampedT = Math.max(0, Math.min(1, t));

  // Use easing function for smoother animation (ease-out cubic)
  const easedT = 1 - Math.pow(1 - clampedT, 3);

  return {
    x: start.x + (end.x - start.x) * easedT,
    y: start.y + (end.y - start.y) * easedT,
  };
}

/**
 * Create intermediate frames for animating between layouts.
 *
 * @param startNodes - Nodes with starting positions
 * @param endNodes - Nodes with ending positions
 * @param frameCount - Number of intermediate frames
 * @returns Array of node arrays, one per frame
 */
export function createLayoutTransitionFrames(
  startNodes: Node<GraphNodeData>[],
  endNodes: Node<GraphNodeData>[],
  frameCount: number = 30
): Node<GraphNodeData>[][] {
  if (startNodes.length === 0 || endNodes.length === 0) return [endNodes];
  if (frameCount <= 1) return [endNodes];

  // Create position lookup for end positions
  const endPositions = new Map(endNodes.map((n) => [n.id, n.position]));

  const frames: Node<GraphNodeData>[][] = [];

  for (let i = 0; i <= frameCount; i++) {
    const t = i / frameCount;

    const frameNodes = startNodes.map((node) => {
      const endPos = endPositions.get(node.id);
      if (!endPos) return node;

      return {
        ...node,
        position: interpolatePosition(node.position, endPos, t),
      };
    });

    frames.push(frameNodes);
  }

  return frames;
}

/**
 * Store for persisting node positions during a session.
 * Positions are stored in memory and lost on page refresh.
 */
const positionStore = new Map<string, Map<string, { x: number; y: number }>>();

/**
 * Save node positions to the in-memory store.
 *
 * @param graphId - Unique identifier for the graph (e.g., rootPath)
 * @param nodes - Nodes with positions to save
 */
export function saveNodePositions(graphId: string, nodes: Node<GraphNodeData>[]): void {
  const positions = new Map<string, { x: number; y: number }>();

  for (const node of nodes) {
    positions.set(node.id, { ...node.position });
  }

  positionStore.set(graphId, positions);
}

/**
 * Restore saved node positions from the in-memory store.
 *
 * @param graphId - Unique identifier for the graph
 * @param nodes - Nodes to restore positions for
 * @returns Nodes with restored positions (unchanged if no saved positions)
 */
export function restoreNodePositions(
  graphId: string,
  nodes: Node<GraphNodeData>[]
): Node<GraphNodeData>[] {
  const savedPositions = positionStore.get(graphId);
  if (!savedPositions) return nodes;

  return nodes.map((node) => {
    const savedPos = savedPositions.get(node.id);
    if (!savedPos) return node;

    return {
      ...node,
      position: { ...savedPos },
    };
  });
}

/**
 * Clear saved positions for a graph.
 *
 * @param graphId - Unique identifier for the graph
 */
export function clearNodePositions(graphId: string): void {
  positionStore.delete(graphId);
}

/**
 * Check if a graph has saved positions.
 *
 * @param graphId - Unique identifier for the graph
 * @returns True if positions are saved for this graph
 */
export function hasSavedPositions(graphId: string): boolean {
  return positionStore.has(graphId);
}
