// @prism/workflow-core
// 工作流核心引擎包

export * from './executor';
export * from './topo-sort';
export * from './context';
export * from './cache';
export * from './type-converter-registry';
export * from './type-validator';
export type { TypeConverterFn } from '@prism/shared-types';

// M2-B: explicit flow-resolution surface. `resolveFlow` and
// `resolveTemplateVersion` are the entry points callers use instead of
// passing the synonym `params` bundle.
export {
  resolveFlow,
  resolveTemplateVersion,
  InMemoryTemplateVersionCatalog,
} from './flow-resolver';
export type {
  TemplateVersion,
  TemplateVersionCatalog,
} from './flow-resolver';

// M2-B: flow-execution engine.
export {
  executeFlow,
  collectOutputsByExplicitOutputs,
  defaultBuildWorkflowFromFlow,
  STANDARD_PORT_OUT,
  STANDARD_PORT_IN,
} from './flow-execution';
export type {
  ExecuteFlowOptions,
  ExecuteFlowResult,
} from './flow-execution';

// M2-B: stable flow-resolver error surface.
export {
  FlowResolverError,
  FLOW_RESOLVER_ERROR_CODES,
} from './errors';
export type { FlowResolverErrorCode } from './errors';

// M2-B: design-state public contract — the legacy
// `ExecuteFromDesignStateParams` synonym bundle is gone.
export {
  mapFlowResultToRenderResult,
  buildRenderResultOutputs,
  assertValidDesignState,
} from './design-state-execution';

// M1-B / M2-B options types — keep on the public surface as the
// `executeFromDesignState` argument / return shape.
export type {
  ExecuteFromDesignStateOptions,
  ExecuteFromDesignStateResult,
} from './executor';

// Node.js specific executor for server-side production rendering
export * from './executor-nodejs';
