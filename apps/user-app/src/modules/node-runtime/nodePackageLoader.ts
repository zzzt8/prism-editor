// nodePackageLoader - loads, caches, and registers required node packages
//
// Exported functions:
//   loadRequiredNodes(workflow) - loads all required nodes for a workflow
//   importRequiredNode(manifest) - registers a node package manifest to the global registry

import {
  safeValidateNodePackage,
  type NodePackageManifest,
  type NodeDefinition,
  type NodeExecutor,
  type PublishedWorkflow,
} from '@prism/shared-types';
import { globalRegistry } from '@prism/core';
import { createInlineExecutor } from './inlineExecutorRunner';
import { NodePackageRepository } from '../../modules/repositories';
import type { NodeLoadError } from '../selection/selectedWorkflowStore';
import { DEFAULT_SECURITY_CONFIG, isUrlAllowed, validateManifest, type SecurityConfig } from './securityConfig';

const nodePackageRepo = new NodePackageRepository();

// 可配置的 SecurityConfig，默认为宽松配置
let securityConfig: SecurityConfig = DEFAULT_SECURITY_CONFIG;

export function setSecurityConfig(config: SecurityConfig): void {
  securityConfig = config;
}

export function getSecurityConfig(): SecurityConfig {
  return securityConfig;
}

export async function loadRequiredNodes(workflow: PublishedWorkflow): Promise<NodeLoadError[]> {
  const errors: NodeLoadError[] = [];
  const requiredNodes = workflow.config?.requiredNodes;

  if (!requiredNodes || Object.keys(requiredNodes).length === 0) {
    return errors;
  }

  for (const [packageName, pkgInfo] of Object.entries(requiredNodes)) {
    if (pkgInfo.url) {
      try {
        const cached = nodePackageRepo.getFromCache(pkgInfo.url);
        if (cached) {
          importRequiredNode(cached);
          continue;
        }

        const response = await fetch(pkgInfo.url);
        if (!response.ok) {
          errors.push({ packageName, message: `Failed to fetch package: ${response.status}` });
          continue;
        }

        const json = await response.json();
        const result = safeValidateNodePackage(json);
        if (!result.success) {
          const issues = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
          errors.push({ packageName, message: `Invalid package: ${issues}` });
          continue;
        }

        // Manifest 校验（T2）
        const validation = validateManifest(result.data, securityConfig);
        if (!validation.valid) {
          errors.push({ packageName, message: `Manifest validation failed: ${validation.errors.join('; ')}` });
          continue;
        }

        nodePackageRepo.cache(result.data);
        importRequiredNode(result.data);
      } catch (err) {
        errors.push({ packageName, message: `Failed to load: ${String(err)}` });
      }
    } else {
      errors.push({
        packageName,
        message: `Package "${packageName}" is required but not available. Please import it manually.`,
      });
    }
  }

  return errors;
}

export function importRequiredNode(manifest: NodePackageManifest): void {
  const executors: Record<string, NodeExecutor> = {};

  for (const execDef of manifest.executors) {
    const source = execDef.source;
    if (source.type === 'inline') {
      // T3: inline executor 在 Worker 中执行
      executors[execDef.id] = createInlineExecutor(execDef.id, source.code);
    } else if (source.type === 'url') {
      // URL 白名单校验（T4）
      if (!isUrlAllowed(source.url, securityConfig)) {
        throw new Error(
          `URL executor "${execDef.id}" blocked: "${source.url}" is not in the allowed URL whitelist`
        );
      }
      const url = source.url;
      executors[execDef.id] = async (inputs, params, context) => {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ inputs, params }),
        });
        if (!response.ok) {
          throw new Error(`Executor URL returned ${response.status}`);
        }
        return response.json();
      };
    }
  }

  for (const def of manifest.definitions as NodeDefinition[]) {
    if (globalRegistry.getNode(def.type)) {
      console.warn(`[nodePackageLoader] Node "${def.type}" is already registered`);
      continue;
    }
    globalRegistry.registerNode(def, true);

    const executorId = def.executor ?? def.type;
    if (executors[executorId]) {
      globalRegistry.registerExecutor(executorId, executors[executorId]);
    }
  }
}
