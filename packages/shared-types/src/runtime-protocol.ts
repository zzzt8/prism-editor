// Runtime protocol abstraction — unified interface for consuming published workflows

/**
 * Three modes for consuming a published workflow.
 * Corresponds to the architecture constraint 6.1 "unified publish protocol".
 */
export type RuntimeProtocolType = 'page' | 'api' | 'embed';

/** HTTP method for API-style runtime */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * A single runtime endpoint for API-style protocols.
 */
export interface RuntimeEndpoint {
  method: HttpMethod;
  path: string;
  params?: string[]; // parameter names accepted by this endpoint
  headers?: Record<string, string>; // default headers
}

/**
 * Configuration for embed-style runtime.
 * Used when a published workflow is embedded in a third-party page.
 */
export interface EmbedConfig {
  /** HTML element ID that will contain the workflow UI */
  containerId: string;
  /** Theme to apply: 'light' | 'dark' | 'auto' */
  theme?: 'light' | 'dark' | 'auto';
  /** Callback fired when workflow execution completes */
  onResult?: (_result: unknown) => void;
  /** Callback fired on execution error */
  onError?: (_error: unknown) => void;
}

/**
 * Runtime protocol — abstracts how a consumer interacts with a published workflow.
 *
 * - 'page': Full-page navigation to the published workflow URL
 * - 'api': Direct HTTP API calls to workflow endpoints
 * - 'embed': Embedded widget within a third-party page
 */
export interface RuntimeProtocol {
  type: RuntimeProtocolType;
  /** Endpoints available for API-style runtime */
  endpoints?: RuntimeEndpoint[];
  /** Configuration for embed-style runtime */
  embedConfig?: EmbedConfig;
}
