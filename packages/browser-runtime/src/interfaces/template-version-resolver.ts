/**
 * TemplateVersionResolver Interface
 *
 * Host-provided TemplateVersion resolver.
 *
 * Mirrors the M2-B `TemplateVersionCatalog` interface used by workflow-core.
 * Must be provided explicitly — no implicit fallback.
 *
 * @example
 * const resolver: TemplateVersionResolver = {
 *   getVersion(templateId, version) { ... },
 *   currentVersion(templateId) { ... },
 * };
 */

/**
 * Minimal TemplateVersion shape for browser-runtime.
 * This mirrors the workflow-core TemplateVersion interface.
 */
export interface TemplateVersion {
  /** Template identifier (matches `DesignState.templateId`). */
  templateId: string;
  /** Immutable template version string (matches `DesignState.templateVersion`). */
  version: string;
  /**
   * Declared flows at this version. `flowKey` is unique within the array.
   */
  flows: ReadonlyArray<TemplateVersionFlow>;
  /** ISO-8601 creation timestamp. */
  createdAt: string;
}

/**
 * Minimal Flow shape for browser-runtime TemplateVersionResolver.
 */
export interface TemplateVersionFlow {
  /** Schema version for runtime compatibility. */
  schemaVersion: 1;
  /** Stable flow selector. */
  flowKey: string;
  /** Nodes participating in this flow. */
  nodeRefs: ReadonlyArray<{
    readonly nodeId: string;
    readonly nodeType: string;
  }>;
  /**
   * Authoritative output map. Order is the audit-stable output order.
   */
  explicitOutputs: ReadonlyArray<{
    readonly slot: string;
    readonly nodeId: string;
    readonly port: string;
    readonly kind: string;
  }>;
}

export interface TemplateVersionResolver {
  /**
   * Get specific version of a template.
   *
   * @param templateId - The template identifier
   * @param version - Specific version string (e.g., "1.0.0", "latest")
   * @returns TemplateVersion or undefined if not found
   */
  getVersion(templateId: string, version: string): TemplateVersion | undefined;

  /**
   * Get current (catalog-marked) version of a template.
   *
   * @param templateId - The template identifier
   * @returns TemplateVersion or undefined if template not found
   */
  currentVersion(templateId: string): TemplateVersion | undefined;
}
