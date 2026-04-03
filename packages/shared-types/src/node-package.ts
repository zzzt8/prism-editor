// Node package schema — format for distributing custom node packages

import { z } from 'zod';

/**
 * Source of executor code — either inline TypeScript or a URL to load.
 */
export type ExecutorSource =
  | { type: 'inline'; code: string }
  | { type: 'url'; url: string };

/**
 * Type guards for ExecutorSource
 */
export function isInlineExecutor(source: ExecutorSource): source is { type: 'inline'; code: string } {
  return source.type === 'inline';
}

export function isUrlExecutor(source: ExecutorSource): source is { type: 'url'; url: string } {
  return source.type === 'url';
}

/**
 * An executor defined in a node package.
 */
export interface ExecutorDefinition {
  /** Unique identifier for this executor */
  id: string;
  /** Human-readable name */
  name: string;
  /** Version constraint (e.g., ">=1.0.0") */
  version?: string;
  /** Source of the executor code */
  source: ExecutorSource;
  /** Optional metadata */
  description?: string;
  /** Optional dependencies for this executor */
  dependencies?: Record<string, string>;
}

/**
 * Manifest for a node package.
 * This is the root object stored in `package.json` of a node package.
 */
export interface NodePackageManifest {
  /** Package name */
  name: string;
  /** Semantic version */
  version: string;
  /** Node definitions exported by this package */
  definitions: import('./node').NodeDefinition[];
  /** Executors for the definitions */
  executors: ExecutorDefinition[];
  /** Metadata */
  description?: string;
  author?: string;
  license?: string;
  /** Peer dependency constraints (e.g., { "@prism/core": ">=1.0.0" }) */
  peerDependencies?: Record<string, string>;
  /** Dependencies for executors */
  executorDependencies?: Record<string, string>;
}

/**
 * A loaded node package with validated manifest.
 */
export interface LoadedNodePackage {
  manifest: NodePackageManifest;
  /** Time when the package was loaded */
  loadedAt: string;
  /** Checksum for integrity verification */
  checksum?: string;
}

// ─── Zod Schemas ─────────────────────────────────────────────────────────────

const ExecutorSourceSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('inline'),
    code: z.string().min(1, 'inline code cannot be empty'),
  }),
  z.object({
    type: z.literal('url'),
    url: z.string().url(),
  }),
]);

export const ExecutorDefinitionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  version: z.string().optional(),
  source: ExecutorSourceSchema,
  description: z.string().optional(),
  dependencies: z.record(z.string(), z.string()).optional(),
});

export const NodePackageManifestSchema = z.object({
  name: z.string().min(1),
  version: z.string(),
  definitions: z.array(z.any()), // Validated separately per NodeDefinition schema
  executors: z.array(ExecutorDefinitionSchema),
  description: z.string().optional(),
  author: z.string().optional(),
  license: z.string().optional(),
  peerDependencies: z.record(z.string(), z.string()).optional(),
  executorDependencies: z.record(z.string(), z.string()).optional(),
});

/**
 * Validate raw JSON as a NodePackageManifest.
 * Returns the parsed manifest or throws a Zod error.
 * Note: definitions array is validated as any[]; individual NodeDefinition validation
 * should be done separately when registering nodes.
 */
export function validateNodePackage(json: unknown): NodePackageManifest {
  return NodePackageManifestSchema.parse(json) as NodePackageManifest;
}

/**
 * Validate raw JSON, returning a result instead of throwing.
 */
export function safeValidateNodePackage(
  json: unknown
): { success: true; data: NodePackageManifest } | { success: false; error: z.ZodError } {
  const result = NodePackageManifestSchema.safeParse(json);
  if (result.success) {
    return { success: true, data: result.data as NodePackageManifest };
  }
  return { success: false, error: result.error };
}

// ─── JSON Schema Export ───────────────────────────────────────────────────────

/**
 * JSON Schema representation of NodePackageManifest.
 * Useful for documentation, code generation, and external validation.
 */
export const nodePackageJsonSchema = NodePackageManifestSchema.toJSONSchema();

/**
 * JSON Schema for ExecutorSource union.
 */
export const executorSourceJsonSchema = ExecutorSourceSchema.toJSONSchema();
