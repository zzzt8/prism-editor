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
 * This mirrors the RuntimeTemplate interface from shared-types.
 */
export interface TemplateVersion {
  id: string;
  templateId: string;
  version: string;
  displayName: string;
  inputs: ReadonlyArray<{ readonly id: string; readonly name: string; readonly type: string; readonly required: boolean }>;
  flows: ReadonlyArray<{ readonly flowKey: string; readonly nodes: ReadonlyArray<{ readonly id: string; readonly type: string }> }>;
  createdAt: string;
  updatedAt: string;
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
