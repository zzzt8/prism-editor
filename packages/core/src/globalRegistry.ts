import type { NodeDefinition } from '@prism/shared-types';
import type { NodeExecutor, NodeExecutorMap } from '@prism/shared-types';
import { getAllDefinitions } from '@prism/node-definitions';
import { nodeExecutors } from '@prism/image-ops';

/**
 * Global registry for node definitions and executors.
 * Singleton pattern - all consumers share the same registry instance.
 */
const _definitions = new Map<string, NodeDefinition>();
const _executors = new Map<string, NodeExecutor>();
const _customNodeTypes = new Set<string>(); // Track which nodes are custom-loaded
let _initialized = false;

export interface LoadedNodePackageInfo {
  name: string;
  version: string;
  nodeTypes: string[];
  loadedAt: string;
}

export interface GlobalRegistry {
  initialize(): void;
  registerNode(def: NodeDefinition, isCustom?: boolean): void;
  registerExecutor(type: string, fn: NodeExecutor): void;
  registerAll(definitions: NodeDefinition[], executors: NodeExecutorMap, isCustom?: boolean): void;
  getNode(type: string): NodeDefinition | undefined;
  getExecutor(type: string): NodeExecutor | undefined;
  listNodes(): NodeDefinition[];
  listBuiltInNodes(): NodeDefinition[];
  listCustomNodes(): NodeDefinition[];
  isCustomNode(type: string): boolean;
  unregisterCustomNode(type: string): boolean;
  getExecutors(): NodeExecutorMap;
}

export const globalRegistry: GlobalRegistry = {
  initialize(): void {
    if (_initialized) return;
    _initialized = true;

    // Register all built-in node definitions
    const definitions = getAllDefinitions();
    for (const def of definitions) {
      _definitions.set(def.type, def);
    }

    // Register all built-in executors
    for (const [type, fn] of Object.entries(nodeExecutors)) {
      _executors.set(type, fn);
    }
  },

  registerNode(def: NodeDefinition, isCustom = false): void {
    if (_definitions.has(def.type)) {
      console.warn(`[globalRegistry] Node type "${def.type}" is already registered. Skipping.`);
      return;
    }
    _definitions.set(def.type, def);
    if (isCustom) {
      _customNodeTypes.add(def.type);
    }
  },

  registerExecutor(type: string, fn: NodeExecutor): void {
    if (_executors.has(type)) {
      console.warn(`[globalRegistry] Executor type "${type}" is already registered. Skipping.`);
      return;
    }
    _executors.set(type, fn);
  },

  registerAll(definitions: NodeDefinition[], executors: NodeExecutorMap, _isCustom = false): void {
    for (const def of definitions) {
      this.registerNode(def, isCustom);
    }
    for (const [type, fn] of Object.entries(executors)) {
      this.registerExecutor(type, fn);
    }
  },

  getNode(type: string): NodeDefinition | undefined {
    return _definitions.get(type);
  },

  getExecutor(type: string): NodeExecutor | undefined {
    return _executors.get(type);
  },

  listNodes(): NodeDefinition[] {
    return Array.from(_definitions.values());
  },

  listBuiltInNodes(): NodeDefinition[] {
    return Array.from(_definitions.values()).filter((d) => !_customNodeTypes.has(d.type));
  },

  listCustomNodes(): NodeDefinition[] {
    return Array.from(_definitions.values()).filter((d) => _customNodeTypes.has(d.type));
  },

  isCustomNode(_type: string): boolean {
    return _customNodeTypes.has(type);
  },

  unregisterCustomNode(type: string): boolean {
    if (!_customNodeTypes.has(type)) {
      return false;
    }
    _customNodeTypes.delete(type);
    _definitions.delete(type);
    _executors.delete(type);
    return true;
  },

  getExecutors(): NodeExecutorMap {
    return Object.fromEntries(_executors);
  },
};
