// Node definition registry

import type { NodeDefinition } from '@prism/shared-types';
import {
  loadImageDefinition,
  loadMaskDefinition,
  applyMaskDefinition,
  compositeDefinition,
  transformDefinition,
  exportDefinition,
  emptyInputDefinition,
} from './definitions';

export type NodeDefinitionRegistry = Map<string, NodeDefinition>;

export function createRegistry(): NodeDefinitionRegistry {
  const registry = new Map<string, NodeDefinition>();

  registerBuiltIn(registry);

  return registry;
}

export function registerBuiltIn(registry: NodeDefinitionRegistry): void {
  const builtIns: NodeDefinition[] = [
    loadImageDefinition,
    loadMaskDefinition,
    applyMaskDefinition,
    compositeDefinition,
    transformDefinition,
    exportDefinition,
    emptyInputDefinition,
  ];

  for (const def of builtIns) {
    registry.set(def.type, def);
  }
}

export function registerCustom(
  registry: NodeDefinitionRegistry,
  definition: NodeDefinition
): void {
  if (registry.has(definition.type)) {
    throw new Error(`Node type already registered: ${definition.type}`);
  }
  registry.set(definition.type, definition);
}

export function getDefinition(
  registry: NodeDefinitionRegistry,
  type: string
): NodeDefinition | undefined {
  return registry.get(type);
}

export function listByCategory(
  registry: NodeDefinitionRegistry,
  category: string
): NodeDefinition[] {
  return [...registry.values()].filter((d) => d.category === category);
}

export function listAll(registry: NodeDefinitionRegistry): NodeDefinition[] {
  return [...registry.values()];
}

/**
 * Get all built-in node definitions as an array.
 * Convenience function for external consumers (e.g., globalRegistry).
 */
export function getAllDefinitions(): NodeDefinition[] {
  const registry = createRegistry();
  return listAll(registry);
}
