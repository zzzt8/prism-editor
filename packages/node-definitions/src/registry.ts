// Node definition registry

import type { NodeDefinition } from '@prism/shared-types';
import {
  loadImageDefinition,
  applyMaskDefinition,
  compositeDefinition,
  transformDefinition,
  exportDefinition,
  previewImageDefinition,
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
    applyMaskDefinition,
    compositeDefinition,
    transformDefinition,
    exportDefinition,
    previewImageDefinition,
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
