// M2-B: Explicit Flow Resolution.
//
// Architecture (per `openspec/changes/m2-b-workflow-core-explicit-flow-resolution`):
// - `TemplateVersion` is the immutable, versioned snapshot loaded from the catalog.
// - `TemplateVersionCatalog` is the dependency-injected lookup surface; M2-B tests
//   build an in-memory catalog, M2-C will plug in the Prisma-backed catalog.
// - `resolveTemplateVersion(templateId, version?)` looks up a version explicitly;
//   when `version` is omitted, the catalog's `currentVersion` is consulted (also
//   explicit — never `findFirst` over an unordered record).
// - `resolveFlow(templateVersion, flowKey)` is a precise key match; it rejects
//   both "not found" and "duplicate flowKey" via `FlowResolverError`.
//
// Per PRISM_ARCHITECTURE_GUARDRAILS §1.7 "Flow 选择必须显式":
// - No `findFirst` / `findUnique` Prisma call in this file.
// - No `Object.keys(...).pop()` style traversal.
// - Duplicate flowKey errors are surfaced — they are a *catalog-data* bug and
//   must never silently collapse to "first match wins".

import type { Flow, FlowKey } from '@prism/shared-types';

import { FlowResolverError } from './errors';

/**
 * Immutable per-template version snapshot.
 *
 * Mirrors the relevant subset of `RuntimeTemplate.flows[]` projection that the
 * engine actually needs to resolve and execute a Flow. `TemplateVersion` is the
 * precision-required identification key for `resolveFlow` (Guardrails §1.4
 * "TemplateVersion 必须参与精确定位"): a `FlowKey` is only unique within a
 * specific `TemplateVersion`.
 */
export interface TemplateVersion {
  /** Template identifier (matches `DesignState.templateId`). */
  readonly templateId: string;
  /** Immutable template version string (matches `DesignState.templateVersion`). */
  readonly version: string;
  /**
   * Declared flows at this version. `flowKey` is unique within the array;
   * schema-level uniqueness is enforced by ajv at load time. The resolver
   * additionally throws `DUPLICATE_FLOW_KEY` if a duplicate slips in via
   * an in-memory or 3rd-party catalog.
   */
  readonly flows: ReadonlyArray<Flow>;
  /** ISO-8601 creation timestamp; carried for audit logging. */
  readonly createdAt: string;
}

/**
 * Catalog lookup surface for `TemplateVersion`s.
 *
 * Dependency-injected: tests build an in-memory catalog, the server layer
 * (M2-C) plugs in a Prisma-backed implementation. The contract guarantees
 * `currentVersion(templateId)` returns the version that a missing-version
 * request should land on — no implicit "first row wins" behavior.
 */
export interface TemplateVersionCatalog {
  /**
   * Look up the current (catalog-marked) version of a template. Returns
   * `undefined` if the template id is unknown. Implementations MUST be
   * deterministic for a given catalog snapshot — two calls in a row return
   * the same `TemplateVersion`.
   */
  currentVersion(templateId: string): TemplateVersion | undefined;
  /** Look up a template by id + version; `undefined` if no such version exists. */
  getVersion(templateId: string, version: string): TemplateVersion | undefined;
}

/**
 * In-memory `TemplateVersionCatalog` implementation.
 *
 * Useful for unit tests and ad-hoc M2-B scenarios. The store is a plain
 * `Map<TemplateVersionKey, TemplateVersion>`; per-template `current` is a
 * separate explicit field. Lookup functions never implicitly traverse or
 * "choose the first record" — they are simple keyed lookups.
 */
export class InMemoryTemplateVersionCatalog implements TemplateVersionCatalog {
  private readonly byKey = new Map<string, TemplateVersion>();
  private readonly current = new Map<string, string>();

  /**
   * Add a `TemplateVersion` and (optionally) mark it as the catalog-current
   * version for its `templateId`.
   */
  add(version: TemplateVersion, markCurrent: boolean = true): void {
    this.byKey.set(this.keyOf(version), version);
    if (markCurrent && !this.current.has(version.templateId)) {
      this.current.set(version.templateId, version.version);
    }
  }

  currentVersion(templateId: string): TemplateVersion | undefined {
    const v = this.current.get(templateId);
    if (v === undefined) return undefined;
    return this.byKey.get(this.keyOf({ templateId, version: v } as TemplateVersion));
  }

  getVersion(templateId: string, version: string): TemplateVersion | undefined {
    return this.byKey.get(`${templateId}@${version}`);
  }

  private keyOf(v: { templateId: string; version: string }): string {
    return `${v.templateId}@${v.version}`;
  }
}

/**
 * Resolve a `TemplateVersion` by id + (optional) explicit version.
 *
 * - `version` provided → `catalog.getVersion(templateId, version)`.
 * - `version` absent → `catalog.currentVersion(templateId)` (catalog marks
 *   which version is "current"; this function never silently picks one).
 *
 * Throws `FlowResolverError('TEMPLATE_VERSION_NOT_FOUND', ...)` if no
 * matching `TemplateVersion` exists.
 */
export function resolveTemplateVersion(
  templateId: string,
  version?: string,
  catalog?: TemplateVersionCatalog,
): TemplateVersion {
  if (!catalog) {
    throw new FlowResolverError(
      'TEMPLATE_VERSION_NOT_FOUND',
      `No catalog injected to resolve template ${templateId}`,
      { templateId, version },
    );
  }
  const resolved =
    version !== undefined
      ? catalog.getVersion(templateId, version)
      : catalog.currentVersion(templateId);
  if (!resolved) {
    throw new FlowResolverError(
      'TEMPLATE_VERSION_NOT_FOUND',
      `TemplateVersion not found (templateId=${templateId}, version=${version ?? '<current>'})`,
      { templateId, version: version ?? null },
    );
  }
  return resolved;
}

/**
 * Resolve a unique `Flow` by stable `(templateVersion, flowKey)` key.
 *
 * - Walks `templateVersion.flows` looking for the exact `flowKey`. Iterates
 *   in declaration order — which is also the catalog-side order; it is
 *   NOT a `findFirst({where:...})` shortcut.
 * - Two flows sharing the same `flowKey` is a catalog-data bug and surfaces
 *   as `DUPLICATE_FLOW_KEY`.
 * - Missing flowKey throws `FLOW_NOT_FOUND`.
 *
 * The returned `Flow` reference is the same object the caller supplied
 * (deep equality expected; no copy is made).
 */
export function resolveFlow(
  templateVersion: TemplateVersion,
  flowKey: FlowKey,
): Flow {
  let found: Flow | undefined;
  let duplicateCount = 0;
  for (const flow of templateVersion.flows) {
    if (flow.flowKey !== flowKey) continue;
    if (found === undefined) {
      found = flow;
      duplicateCount = 1;
    } else {
      duplicateCount += 1;
    }
  }
  if (duplicateCount > 1) {
    throw new FlowResolverError(
      'DUPLICATE_FLOW_KEY',
      `Multiple flows share flowKey=${flowKey} in templateVersion=${templateVersion.templateId}@${templateVersion.version}`,
      {
        templateId: templateVersion.templateId,
        templateVersion: templateVersion.version,
        flowKey,
        duplicateCount,
      },
    );
  }
  if (found === undefined) {
    throw new FlowResolverError(
      'FLOW_NOT_FOUND',
      `flowKey=${flowKey} not found in templateVersion=${templateVersion.templateId}@${templateVersion.version}`,
      {
        templateId: templateVersion.templateId,
        templateVersion: templateVersion.version,
        flowKey,
      },
    );
  }
  return found;
}
