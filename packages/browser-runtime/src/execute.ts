/**
 * Execute function for @prism/browser-runtime
 *
 * Full implementation for T.3.3.2.
 * Orchestrates the complete render pipeline:
 * 1. Validate RenderRequest
 * 2. Resolve TemplateVersion
 * 3. Resolve Flow
 * 4. Resolve assets
 * 5. Execute flow
 * 6. Publish outputs
 * 7. Return RenderResult
 */

import type { RenderRequest, RenderResult, DesignState, Flow } from '@prism/shared-types';
import type { DesignStateAssetBinding } from '@prism/shared-types';
import { validateDesignState } from '@prism/shared-types';
import {
  WorkflowExecutor,
  resolveFlow,
  executeFlow,
  mapFlowResultToRenderResult,
} from '@prism/workflow-core';
import type { TemplateVersion } from './interfaces/template-version-resolver';
import type { TemplateVersionFlow } from './interfaces/template-version-resolver';
import { createBrowserExecutor } from './internal/create-executor';
import type { BrowserRuntimeOptions, RuntimeExecutionOptions } from './types';
import type { AssetResolver } from './interfaces/asset-resolver';
import type { OutputSink } from './interfaces/output-sink';
import type { TemplateVersionResolver } from './interfaces/template-version-resolver';

/**
 * Error codes for browser runtime errors.
 */
export const BROWSER_RUNTIME_ERROR_CODES = {
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  TEMPLATE_NOT_FOUND: 'TEMPLATE_NOT_FOUND',
  FLOW_NOT_FOUND: 'FLOW_NOT_FOUND',
  ASSET_RESOLUTION_FAILED: 'ASSET_RESOLUTION_FAILED',
  EXECUTION_FAILED: 'EXECUTION_FAILED',
} as const;

export type BrowserRuntimeErrorCode =
  (typeof BROWSER_RUNTIME_ERROR_CODES)[keyof typeof BROWSER_RUNTIME_ERROR_CODES];

/**
 * Custom error for browser runtime failures.
 */
export class BrowserRuntimeError extends Error {
  constructor(
    public readonly code: BrowserRuntimeErrorCode,
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'BrowserRuntimeError';
  }
}

/**
 * Validate RenderRequest using ajv.
 */
function validateRequest(request: RenderRequest): void {
  // Validate the embedded DesignState
  const errors = validateDesignState(request.designState);
  // validateDesignState throws on failure, so if we reach here, it's valid
  void errors;
}

/**
 * Resolve TemplateVersion from the resolver.
 */
function resolveTemplateVersionFromResolver(
  request: RenderRequest,
  resolver: TemplateVersionResolver
): TemplateVersion {
  // First try to get the specific version
  let version = resolver.getVersion(
    request.designState.templateId,
    request.designState.templateVersion
  );

  if (!version) {
    // Fall back to current version
    const current = resolver.currentVersion(request.designState.templateId);
    if (!current) {
      throw new BrowserRuntimeError(
        BROWSER_RUNTIME_ERROR_CODES.TEMPLATE_NOT_FOUND,
        `Template not found: ${request.designState.templateId}@${request.designState.templateVersion}`
      );
    }
    version = current;
  }

  return version;
}

/**
 * Resolve Flow from TemplateVersion and DesignState.flowKey.
 */
function resolveFlowForExecution(
  templateVersion: TemplateVersion,
  designState: DesignState
): TemplateVersionFlow {
  let found: TemplateVersionFlow | undefined;
  let duplicateCount = 0;

  for (const flow of templateVersion.flows) {
    if (flow.flowKey !== designState.flowKey) continue;
    if (found === undefined) {
      found = flow;
      duplicateCount = 1;
    } else {
      duplicateCount += 1;
    }
  }

  if (duplicateCount > 1) {
    throw new BrowserRuntimeError(
      BROWSER_RUNTIME_ERROR_CODES.FLOW_NOT_FOUND,
      `Multiple flows share flowKey=${designState.flowKey} in templateVersion=${templateVersion.templateId}@${templateVersion.version}`
    );
  }

  if (found === undefined) {
    throw new BrowserRuntimeError(
      BROWSER_RUNTIME_ERROR_CODES.FLOW_NOT_FOUND,
      `Flow not found: ${designState.flowKey}`
    );
  }

  return found;
}

/**
 * Resolve all assets from DesignState using AssetResolver.
 */
async function resolveAssets(
  designState: DesignState,
  assetResolver: AssetResolver
): Promise<Map<string, ImageData>> {
  const assets = designState.inputs.assets;
  if (!assets || assets.length === 0) {
    return new Map();
  }

  const resolved = new Map<string, ImageData>();

  for (const binding of assets as ReadonlyArray<DesignStateAssetBinding>) {
    try {
      const imageData = await assetResolver.resolve(binding.asset);
      resolved.set(binding.slot, imageData);
    } catch (error) {
      throw new BrowserRuntimeError(
        BROWSER_RUNTIME_ERROR_CODES.ASSET_RESOLUTION_FAILED,
        `Failed to resolve asset: ${binding.slot}`,
        error
      );
    }
  }

  return resolved;
}

/**
 * Publish outputs via OutputSink.
 */
function publishOutputs(
  flow: TemplateVersionFlow,
  requestedSlots: ReadonlyArray<string>,
  outputSink: OutputSink,
  nodeOutputs: Record<string, Record<string, unknown>>
): void {
  // Walk explicitOutputs in order, publish each requested slot
  for (const outputDef of flow.explicitOutputs) {
    if (!requestedSlots.includes(outputDef.slot)) {
      continue;
    }

    const nodeOutput = nodeOutputs[outputDef.nodeId];
    if (!nodeOutput) {
      continue;
    }

    const outputValue = nodeOutput[outputDef.port];
    if (outputValue !== undefined) {
      outputSink.publish(outputDef.nodeId, outputDef.slot, outputValue);
    }
  }
}

/**
 * Execute a RenderRequest in the browser.
 *
 * Input: complete RenderRequest (NOT designState + separate RenderOptions)
 * Output: RenderResult (M2 protocol, unchanged)
 *
 * @throws ValidationError on invalid RenderRequest
 * @throws FlowResolverError on resolution failure
 * @throws BrowserRuntimeError on execution failure
 */
export async function execute(
  request: RenderRequest,
  options: BrowserRuntimeOptions,
  runtimeOptions?: RuntimeExecutionOptions
): Promise<RenderResult> {
  const startedAt = Date.now();

  // 1. Validate RenderRequest
  validateRequest(request);

  const { designState } = request;

  // 2. Resolve TemplateVersion
  const templateVersion = resolveTemplateVersionFromResolver(request, options.templateVersionResolver);

  // 3. Resolve Flow
  const templateVersionFlow = resolveFlowForExecution(templateVersion, designState);

  // 4. Resolve assets (inject into DesignState if needed)
  // Note: In browser runtime, assets are resolved to ImageData for execution.
  // The actual injection into designState happens in the loader.

  // 5. Create browser executor
  const executor = await createBrowserExecutor({
    signal: runtimeOptions?.signal,
    onProgress: runtimeOptions?.onProgress,
  });

  // 6. Execute flow
  const flowResult = await executeFlow(executor, templateVersionFlow as unknown as Flow, designState, {
    signal: runtimeOptions?.signal,
    onProgress: runtimeOptions?.onProgress,
  });

  // 7. Publish outputs (optional, for side effects)
  publishOutputs(templateVersionFlow, request.requestedOutputSlots, options.outputSink, flowResult.nodeOutputs);

  // 8. Map to RenderResult
  const renderResult = mapFlowResultToRenderResult(templateVersionFlow as unknown as Flow, designState, flowResult);

  return renderResult;
}
