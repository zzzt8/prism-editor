/**
 * Helpers for importing node packages into the local registry
 */

import { globalRegistry, parseInlineExecutor } from '@prism/core';
import type { NodePackageManifest, NodeExecutor } from '@prism/shared-types';

const STORAGE_KEY = 'prism-node-packages';

interface StoredPackage {
  manifest: NodePackageManifest;
  nodeTypes: string[];
  loadedAt: string;
}

/**
 * Register a node package manifest into globalRegistry and localStorage.
 * Used by both ImportModal (file import) and MarketplaceList (API download).
 */
export async function registerNodePackage(manifest: NodePackageManifest): Promise<string[]> {
  // Parse executors into actual functions
  const parsedExecutors: Record<string, NodeExecutor> = {};
  for (const execDef of manifest.executors) {
    if (execDef.source.type === 'inline') {
      parsedExecutors[execDef.id] = parseInlineExecutor(execDef.source.code, execDef.id);
    } else if (execDef.source.type === 'url') {
      const url = execDef.source.url;
      parsedExecutors[execDef.id] = async (inputs, params) => {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ inputs, params }),
        });
        if (!response.ok) {
          throw new Error(`Executor URL returned ${response.status}: ${response.statusText}`);
        }
        return response.json();
      };
    }
  }

  // Initialize global registry
  globalRegistry.initialize();
  const nodeTypes: string[] = [];

  // Register nodes
  for (const def of manifest.definitions) {
    if (globalRegistry.getNode(def.type)) {
      throw new Error(`Node type "${def.type}" is already registered`);
    }
    globalRegistry.registerNode(def, true);
    nodeTypes.push(def.type);

    const executorId = (def as unknown as { executor?: string }).executor ?? def.type;
    if (parsedExecutors[executorId]) {
      globalRegistry.registerExecutor(executorId, parsedExecutors[executorId]);
    }
  }

  // Save to localStorage
  const stored = localStorage.getItem(STORAGE_KEY);
  const packages: StoredPackage[] = stored ? JSON.parse(stored) : [];
  packages.push({
    manifest,
    nodeTypes,
    loadedAt: new Date().toISOString(),
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(packages));

  return nodeTypes;
}