// canvasStoreHelpers.ts - Helper functions for useCanvasStore
// These functions are stateless and can be imported without Zustand dependencies

import type { EditorCanvasNode, EditorCanvasEdge } from '@prism/shared-types';
import { PortDataType } from '@prism/shared-types';

// Sync import to ensure registry is initialized immediately
import { globalRegistry } from '@prism/core';

export interface Port {
  id: string;
  name: string;
  label?: string;
  dataType?: string;
}

export const PASTE_OFFSET = 40;

// Module-level initialization flag
let _registryInitialized = false;

/**
 * Find a port by id, name, or label.
 */
export function findPort<T extends Port>(
  ports: T[],
  portId: string
): T | undefined {
  return ports.find((p) => p.id === portId || p.name === portId || p.label === portId);
}

/**
 * Infer PortDataType from port name patterns.
 */
export function inferPortDataType(portName: string): PortDataType | undefined {
  const lower = portName.toLowerCase();
  if (lower === 'image' || lower === 'img' || lower === 'result') return PortDataType.IMAGE;
  if (lower === 'mask' || lower === 'msk' || lower === 'alpha') return PortDataType.MASK;
  if (lower === 'number' || lower === 'num') return PortDataType.NUMBER;
  if (lower === 'string' || lower === 'str' || lower === 'text') return PortDataType.STRING;
  if (lower === 'boolean' || lower === 'bool') return PortDataType.BOOLEAN;
  return undefined;
}

/**
 * Ensure the global node registry is initialized.
 * Uses synchronous initialization to avoid timing issues.
 * Safe to call multiple times.
 */
export function ensureNodeRegistryInitialized(): void {
  if (_registryInitialized) return;
  _registryInitialized = true;

  try {
    globalRegistry.initialize();
  } catch (err) {
    console.error('[canvasStore] globalRegistry.initialize() failed:', err);
  }
}

/**
 * Remaps node IDs and positions for snippet insertion or clipboard paste.
 * - Assigns fresh IDs via idCounter
 * - Offsets positions by PASTE_OFFSET (40px)
 * - Resets runtime state (executionResult, executionError, etc.)
 * - Filters edges to only those where both endpoints are in oldToNewIdMap
 */
export function remapAndInsertNodes(
  fragmentNodes: EditorCanvasNode[],
  fragmentEdges: EditorCanvasEdge[],
  basePosition: { x: number; y: number },
  idCounter: { createNodeId: () => string; createEdgeId: () => string }
): {
  newNodes: EditorCanvasNode[];
  newEdges: EditorCanvasEdge[];
  oldToNewIdMap: Map<string, string>;
} {
  const oldToNewIdMap = new Map<string, string>();

  const newNodes = fragmentNodes.map((origNode) => {
    const newId = idCounter.createNodeId();
    oldToNewIdMap.set(origNode.id, newId);
    return {
      ...origNode,
      id: newId,
      position: {
        x: origNode.position.x + basePosition.x + PASTE_OFFSET,
        y: origNode.position.y + basePosition.y + PASTE_OFFSET,
      },
      data: {
        ...origNode.data,
        executionResult: undefined,
        executionError: undefined,
        bypassed: false,
        minimized: false,
      },
    };
  });

  const fragmentNodeIds = new Set(fragmentNodes.map((n) => n.id));
  const newEdges = fragmentEdges
    .filter((edge) => fragmentNodeIds.has(edge.source) && fragmentNodeIds.has(edge.target))
    .map((edge) => ({
      ...edge,
      id: idCounter.createEdgeId(),
      source: oldToNewIdMap.get(edge.source) ?? edge.source,
      target: oldToNewIdMap.get(edge.target) ?? edge.target,
    }));

  return { newNodes, newEdges, oldToNewIdMap };
}
