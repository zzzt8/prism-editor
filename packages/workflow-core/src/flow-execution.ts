// M2-B: Flow-driven execution engine.
//
// Architecture (per `openspec/changes/m2-b-workflow-core-explicit-flow-resolution`):
// - `executeFlow(flow, designState, options)` is the engine-side execution entry
//   that consumes a resolved `Flow` + the originating `DesignState` (no
//   `ExecuteFromDesignStateParams` synonym bundle — runtime params live in
//   `DesignState.inputs.params` already).
// - Internally, the Flow's `nodeRefs` are treated as a *linear* DAG (each
//   consecutive pair is wired by convention port names — see
//   `STANDARD_PORT_OUT` / `STANDARD_PORT_IN`). This is the smallest
//   representation that lets M2-B drive a 5-scenario test through real
//   per-template Flows instead of the M0 hard-coded 4-node pipeline.
//   M3+ layers can replace this convention with explicit connection graphs
//   without changing the M2-B public surface.
// - Output collection walks `flow.explicitOutputs` in declaration order — never
//   `Object.keys(results).pop()`, never `findFirst` (Guardrails §1.7 / §1.8).
// - Errors throw `FlowResolverError` with stable codes (`FLOW_OUTPUTS_MISSING`,
//   `REQUESTED_OUTPUT_UNKNOWN`, `DECLARED_OUTPUT_NOT_PRODUCED`).
// - The resulting `ExecuteFlowResult` exposes a stable `nodeOutputs` map
//   (keyed by `nodeId`) AND a stable `outputs` list (slot frames, in
//   declared + requested order) so downstream `mapFlowResultToRenderResult`
//   can produce `RenderResult.outputs[]` without further traversal.

import type {
  Connection,
  DesignState,
  ExecutionCache,
  ImageRef,
  ProgressCallback,
  RenderResultOutput,
  Workflow,
  WorkflowNode,
} from '@prism/shared-types';
import type { Flow } from '@prism/shared-types';

import { WorkflowExecutor, type ExecutorResult, type WorkflowExecutorOptions } from './executor';
import type { ExecutionCache as EngineExecutionCache } from './cache';
import { FlowResolverError } from './errors';

/**
 * Conventional output port used to wire `nodeRefs[i] → nodeRefs[i+1]` in
 * the internal linear DAG. Tests can override per-port wiring via the
 * `additionalConnections` option on `executeFlow`; the convention is the
 * M2-B *default* so the 5-scenario tests can stay minimal.
 */
export const STANDARD_PORT_OUT = 'image' as const;
/** Conventional input port receiving the upstream node's `STANDARD_PORT_OUT`. */
export const STANDARD_PORT_IN = 'image' as const;

/**
 * Options for `executeFlow`. Mirrors the executor-relevant subset of
 * `WorkflowExecutorOptions`; the M1-B `params` synonym bundle is **gone**
 * — runtime params come from `DesignState.inputs.params` (Decision 2).
 */
export interface ExecuteFlowOptions {
  readonly signal?: AbortSignal;
  readonly onProgress?: ProgressCallback;
  readonly cache?: ExecutionCache;
  readonly enableCache?: boolean;
  /**
   * Render id override. Defaults to `designState.trace.requestId` then
   * `m2-b-<unixMs>`.
   */
  readonly renderId?: string;
  /**
   * Optional additional port wirings beyond the linear convention.
   * The internal DAG is the **linear chain** of `flow.nodeRefs` plus
   * these extra `Connection`s. Tests can override the default
   * `image → image` convention for specific edges.
   */
  readonly additionalConnections?: ReadonlyArray<Connection>;
  /**
   * Optional injection point — tests can override the default workflow
   * construction strategy (the linear-chain default). Defaults to
   * `defaultBuildWorkflowFromFlow(flow, designState, additionalConnections)`.
   */
  readonly buildWorkflow?: (flow: Flow, designState: DesignState, additional: ReadonlyArray<Connection>) => Workflow;
}

/**
 * Result of `executeFlow`. Exposes both the engine-internal `executorResult`
 * (for advanced consumers) and the audit-stable `outputs` list.
 *
 * `outputs` is the canonical source for `RenderResult.outputs[]`; the
 * order is `flow.explicitOutputs` declaration order (after
 * `requestedOutputSlots` filtering).
 */
export interface ExecuteFlowResult {
  readonly renderId: string;
  readonly flowKey: Flow['flowKey'];
  readonly executorResult: ExecutorResult;
  /**
   * Per-node outputs keyed by `nodeId`; values are the `Record<portName, unknown>`
   * produced by the node executor. Used internally by `mapFlowResultToRenderResult`
   * and exposed for tests.
   */
  readonly nodeOutputs: Readonly<Record<string, Readonly<Record<string, unknown>>>>;
  /** Collectable output frames — order is `flow.explicitOutputs` declared order. */
  readonly outputs: ReadonlyArray<RenderResultOutput>;
  /** `startedAt` recorded for `RenderResult.timingMs`. */
  readonly startedAt: number;
}

/**
 * Build the engine-internal `Workflow` from a `Flow` declaration.
 *
 * Default wiring convention: linear chain — for each consecutive pair
 * `(nodes[i], nodes[i+1])`, add a `Connection(named(STANDARD_PORT_OUT) → named(STANDARD_PORT_IN))`.
 *
 * Node `params` are read from `DesignState.inputs.params['nodeParams']`
 * when available (the convention), else default to `{}`.
 */
export function defaultBuildWorkflowFromFlow(
  flow: Flow,
  designState: DesignState,
  additionalConnections: ReadonlyArray<Connection> = [],
): Workflow {
  const nodes: WorkflowNode[] = flow.nodeRefs.map((ref, idx) => {
    const nodeParams = readNodeParams(designState, ref.nodeId);
    return {
      id: ref.nodeId,
      type: ref.nodeType,
      position: { x: idx, y: 0 },
      params: nodeParams,
    };
  });

  const connections: Connection[] = additionalConnections.slice();
  for (let i = 0; i + 1 < nodes.length; i += 1) {
    const from = nodes[i];
    const to = nodes[i + 1];
    connections.push({
      id: `${from.id}.${STANDARD_PORT_OUT}->${to.id}.${STANDARD_PORT_IN}`,
      from: { nodeId: from.id, port: STANDARD_PORT_OUT },
      to: { nodeId: to.id, port: STANDARD_PORT_IN },
    });
  }

  return {
    id: `m2-b:${designState.templateId}@${designState.templateVersion}:${flow.flowKey}`,
    name: `flow:${flow.flowKey}`,
    version: designState.templateVersion,
    nodes,
    connections,
    inputs: [],
    outputs: [],
    metadata: {
      createdAt: designState.createdAt,
      updatedAt: designState.createdAt,
      description: `M2-B flow resolution (flowKey=${flow.flowKey})`,
    },
  };
}

function readNodeParams(designState: DesignState, nodeId: string): Record<string, unknown> {
  const raw = designState.inputs.params;
  if (raw === undefined || raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return {};
  }
  const nodeParams = (raw as Record<string, unknown>)['nodeParams'];
  if (!nodeParams || typeof nodeParams !== 'object' || Array.isArray(nodeParams)) {
    return {};
  }
  const entry = (nodeParams as Record<string, unknown>)[nodeId];
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
    return {};
  }
  return { ...(entry as Record<string, unknown>) };
}

/**
 * Resolve the public image ref for a single explicit output entry.
 *
 * Searches the node outputs map for `(nodeId, port)`. Returns the value
 * cast to `ImageRef` — no deep-copy. If the port value is missing or
 * structurally not an ImageRef, returns `undefined`.
 */
function pickOutputImage(
  nodeOutputs: Readonly<Record<string, Readonly<Record<string, unknown>>>>,
  nodeId: string,
  port: string,
): ImageRef | undefined {
  const ports = nodeOutputs[nodeId];
  if (!ports) return undefined;
  const candidate = ports[port];
  if (!candidate || typeof candidate !== 'object') return undefined;
  return candidate as ImageRef;
}

/**
 * Walk `flow.explicitOutputs` in declaration order, collecting `RenderResultOutput`s
 * for each slot that is also present in `requestedOutputSlots` (the
 * `DesignState` itself can carry `requestedOutputSlots` — see `ExecuteFlowOptions`;
 * if absent, all declared outputs are produced).
 *
 * Throws `FlowResolverError` (`REQUESTED_OUTPUT_UNKNOWN` or
 * `DECLARED_OUTPUT_NOT_PRODUCED`) on contract violations. Pure & deterministic:
 * output order does **not** depend on the order of `requestedOutputSlots` or
 * the executor's node completion order (Guardrails §1.8).
 */
export function collectOutputsByExplicitOutputs(
  flow: Flow,
  requestedSlots: ReadonlyArray<string>,
  nodeOutputs: Readonly<Record<string, Readonly<Record<string, unknown>>>>,
): ReadonlyArray<RenderResultOutput> {
  if (flow.explicitOutputs.length === 0) {
    throw new FlowResolverError(
      'FLOW_OUTPUTS_MISSING',
      `Flow ${flow.flowKey} declares zero explicitOutputs (Guardrails §1.8)`,
      { flowKey: flow.flowKey, templateId: flow.flowKey },
    );
  }

  const requestedSet = new Set(requestedSlots);
  const collected: RenderResultOutput[] = [];
  const seenSlots = new Set<string>();

  for (const decl of flow.explicitOutputs) {
    if (!requestedSet.has(decl.slot)) continue;
    if (seenSlots.has(decl.slot)) continue;
    seenSlots.add(decl.slot);

    const image = pickOutputImage(nodeOutputs, decl.nodeId, decl.port);
    if (!image) {
      throw new FlowResolverError(
        'DECLARED_OUTPUT_NOT_PRODUCED',
        `Explicit output slot "${decl.slot}" (nodeId=${decl.nodeId}, port=${decl.port}) was not produced`,
        {
          flowKey: flow.flowKey,
          slot: decl.slot,
          nodeId: decl.nodeId,
          port: decl.port,
        },
      );
    }

    collected.push({
      id: `${flow.flowKey}.${decl.slot}`,
      image,
      slot: decl.slot,
      flowKey: flow.flowKey,
    });
  }

  // After collecting: ensure every requested slot has been seen at least once.
  // (If a requested slot is missing in `flow.explicitOutputs`, it cannot have
  // been collected.)
  for (const requested of requestedSlots) {
    if (!seenSlots.has(requested)) {
      throw new FlowResolverError(
        'REQUESTED_OUTPUT_UNKNOWN',
        `Requested output slot "${requested}" is not declared in Flow ${flow.flowKey}.explicitOutputs`,
        { flowKey: flow.flowKey, slot: requested },
      );
    }
  }

  return collected;
}

/**
 * Run a resolved `Flow` against a `DesignState`, collecting outputs in
 * `flow.explicitOutputs` declaration order.
 *
 * Pipeline:
 * 1. Build the internal `Workflow` from the Flow (linear chain convention).
 * 2. Execute via `WorkflowExecutor.execute()` (existing executor, unchanged).
 * 3. Collect outputs by `flow.explicitOutputs` order, filtered through
 *    `options.requestedOutputSlots ?? designState.requestedOutputSlots ?? []`.
 *
 * If neither options nor `designState.requestedOutputSlots` provide a slot
 * list, the function returns an empty list (treats the request as "no slots
 * requested" — the request is malformed upstream; M2-C's `RenderRequest`
 * wrapper enforces `requestedOutputSlots` non-empty).
 *
 * @throws {FlowResolverError} on FLOW_OUTPUTS_MISSING / REQUESTED_OUTPUT_UNKNOWN /
 *   DECLARED_OUTPUT_NOT_PRODUCED contract violations.
 */
export async function executeFlow(
  executor: WorkflowExecutor,
  flow: Flow,
  designState: DesignState,
  options: ExecuteFlowOptions = {},
): Promise<ExecuteFlowResult> {
  const startedAt = Date.now();
  const renderId =
    options.renderId ??
    designState.trace?.requestId ??
    `m2-b-${startedAt.toString(36)}`;

  const additional = options.additionalConnections ?? [];
  const workflow = (options.buildWorkflow ?? defaultBuildWorkflowFromFlow)(flow, designState, additional);

  const execResult = await executor.execute(workflow, {
    signal: options.signal,
    onProgress: options.onProgress,
    cache: options.cache as EngineExecutionCache | undefined,
    enableCache: options.enableCache,
  } satisfies WorkflowExecutorOptions);

  const nodeOutputs: Record<string, Readonly<Record<string, unknown>>> = {};
  for (const [nodeId, ports] of Object.entries(execResult.results)) {
    nodeOutputs[nodeId] = Object.freeze({ ...ports });
  }

  const requestedSlots = readRequestedSlots(designState);
  const outputs =
    requestedSlots.length > 0
      ? collectOutputsByExplicitOutputs(flow, requestedSlots, nodeOutputs)
      : collectOutputsByExplicitOutputs(
          flow,
          flow.explicitOutputs.map((o) => o.slot),
          nodeOutputs,
        );

  return {
    renderId,
    flowKey: flow.flowKey,
    executorResult: execResult,
    nodeOutputs,
    outputs,
    startedAt,
  };
}

/**
 * Read the requested output slots attached to a `DesignState`.
 *
 * `DesignState` does not currently declare `requestedOutputSlots` directly
 * (that lives on `RenderRequest`). M2-B treats `designState.inputs.params.requestedOutputSlots`
 * as the optional carrier used by the engine — when present, it must be
 * an array of strings. When absent, callers can pass the slot list via
 * `ExecuteFlowOptions.requestedOutputSlots`.
 */
function readRequestedSlots(designState: DesignState): ReadonlyArray<string> {
  const raw = designState.inputs.params;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return [];
  const slots = (raw as Record<string, unknown>)['requestedOutputSlots'];
  if (!Array.isArray(slots)) return [];
  return slots.filter((s): s is string => typeof s === 'string');
}
