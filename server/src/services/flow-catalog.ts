// M2-C: Server Deterministic Render Entry
//
// FlowCatalog implements the TemplateVersionCatalog interface defined by M2-B
// (packages/workflow-core/src/flow-resolver.ts).
//
// Interface contract (M2-B, sync):
//   TemplateVersionCatalog {
//     currentVersion(templateId: string): TemplateVersion | undefined
//     getVersion(templateId: string, version: string): TemplateVersion | undefined
//   }
//
// Since Prisma is async, FlowCatalog eagerly populates an in-memory cache
// at construction time. All subsequent lookups are synchronous Map reads.
// This is the correct pattern for M2-C: server startup pre-loads the catalog
// so that executeFromDesignState (called per-request) gets O(1) sync lookups.
//
// Per Guardrails §1.7: no findFirst; §1.8: output order handled by executeFlow.

import type { TemplateVersion } from '@prism/workflow-core';
import type { TemplateVersionCatalog } from '@prism/workflow-core';

import { prisma } from '../db/client.js';
import { listFlows } from './product-template-service.js';

/**
 * Prisma-backed TemplateVersionCatalog.
 *
 * Eagerly loads all ProductTemplate + Workflow rows into memory on construction.
 * All interface methods are synchronous (Map lookups) after initialization.
 *
 * Usage pattern (server startup):
 *   const catalog = await FlowCatalog.create();
 *   // pass catalog to executeFromDesignState options on each request
 */
export class FlowCatalog implements TemplateVersionCatalog {
  private readonly _current = new Map<string, TemplateVersion>();
  private readonly _byVersion = new Map<string, TemplateVersion>();

  /**
   * Factory: constructs a fully-populated FlowCatalog from Prisma.
   * Call once at server startup, not per-request.
   */
  static async create(): Promise<FlowCatalog> {
    const catalog = new FlowCatalog();
    await catalog.#loadFromPrisma();
    return catalog;
  }

  // Intentionally private: always use create()
  private constructor() {}

  currentVersion(templateId: string): TemplateVersion | undefined {
    return this._current.get(templateId);
  }

  getVersion(templateId: string, version: string): TemplateVersion | undefined {
    return this._byVersion.get(`${templateId}@${version}`);
  }

  async #loadFromPrisma(): Promise<void> {
    const templates = await prisma.productTemplate.findMany();

    await Promise.all(
      templates.map(async (t) => {
        const tv = await this.#buildTemplateVersion(t.id, t.version);
        this._current.set(t.id, tv);
        this._byVersion.set(`${t.id}@${t.version}`, tv);
      }),
    );
  }

  async #buildTemplateVersion(
    templateId: string,
    version: string,
  ): Promise<TemplateVersion> {
    // listFlows returns Omit<Workflow, 'content'>[] — fetch full content via Prisma
    const rows = await prisma.workflow.findMany({
      where: { templateId },
      orderBy: { createdAt: 'asc' },
    });

    const flows = rows.map((row) => {
      const parsed = JSON.parse(row.content) as import('@prism/shared-types').Flow;
      return parsed;
    });

    return {
      templateId,
      version,
      flows,
      createdAt: new Date().toISOString(),
    };
  }
}
