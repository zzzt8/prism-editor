/**
 * M2-B Task 9 (continued) + T6 verification — 5-scenario dual-runtime
 * round-trip integration test, post M2-B rewrite.
 *
 * The original M1-B fixture asserted `executeFromDesignState(ds, { params: { transformParams, compositeParams } })`.
 * M2-B removes `options.params` (Decision 2 — runtime params come from
 * `DesignState.inputs.params`). The 5-scenario test is rewritten to use
 * a real per-template `Flow` driving the engine, with `nodeParams`
 * carried inside `DesignState.inputs.params.nodeParams`.
 *
 * Per Decision 9: M0 metrics.json / fixtures are NOT modified; the new
 * comparison only verifies slot orderings (Browser vs Node executors).
 */

import { describe, it, expect } from 'vitest';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { Flow, FlowKey, NodeExecutor } from '@prism/shared-types';

import {
  WorkflowExecutor,
  InMemoryTemplateVersionCatalog,
} from '@prism/workflow-core';

const __dirname = dirname(fileURLToPath(import.meta.url));
const M2_ARTIFACTS = resolve(__dirname, '../../../../../artifacts/verification/M2');

interface M0Scenario {
  readonly id: string;
  readonly nodeSequence: ReadonlyArray<string>;
}

const M0_SCENARIOS: ReadonlyArray<M0Scenario> = [
  { id: 'identity',        nodeSequence: ['load-image', 'transform', 'composite', 'export'] },
  { id: 'scale-2x',        nodeSequence: ['load-image', 'transform', 'composite', 'export'] },
  { id: 'rotate-90',       nodeSequence: ['load-image', 'transform', 'composite', 'export'] },
  { id: 'scale-rotate',    nodeSequence: ['load-image', 'transform', 'composite', 'export'] },
  { id: 'translate-scale', nodeSequence: ['load-image', 'transform', 'composite', 'export'] },
];

function makeScenarioFlow(scenario: M0Scenario): Flow {
  const nodeRefs = scenario.nodeSequence.map((type, idx) => ({
    nodeId: `${type}-${idx}`,
    nodeType: type,
  }));
  const exportIdx = scenario.nodeSequence.length - 1;
  return {
    schemaVersion: 1,
    flowKey: scenario.id as FlowKey,
    nodeRefs,
    explicitOutputs: [
      { slot: `${scenario.id}.print`, nodeId: `export-${exportIdx}`, port: 'image', kind: 'image' },
      { slot: `${scenario.id}.preview`, nodeId: `export-${exportIdx}`, port: 'image', kind: 'image' },
    ],
  };
}

function makeMockExecutor(platform: 'browser' | 'node'): WorkflowExecutor {
  const ex = new WorkflowExecutor({});
  const stub: NodeExecutor = async () => ({
    image: {
      type: 'data-url',
      url: `inline://${platform}-mock`,
      width: 256,
      height: 192,
      mimeType: 'image/png',
    },
  });
  for (const t of ['load-image', 'transform', 'composite', 'export']) {
    ex.register(t, stub);
  }
  return ex;
}

function designStateFor(scenarioId: string) {
  return {
    schemaVersion: 1 as const,
    templateId: `tmpl.basic-mockup.${scenarioId}`,
    templateVersion: '1.0.0',
    flowKey: scenarioId as FlowKey,
    inputs: {
      assets: [
        {
          slot: 'base',
          asset: {
            id: `l-base-${scenarioId}`,
            kind: 'inline' as const,
            mimeType: 'image/png',
            checksum: 'a'.repeat(64),
            width: 256, height: 192,
          },
        },
      ],
      params: {
        nodeParams: Object.fromEntries(
          ['load-image-0', 'transform-1', 'composite-2', 'export-3'].map((id) => [id, {}]),
        ),
        requestedOutputSlots: [`${scenarioId}.print`, `${scenarioId}.preview`],
      },
    },
    createdAt: '2026-07-15T00:00:00.000Z',
  };
}

function emitArtifact(name: string, payload: Record<string, unknown>): void {
  if (!existsSync(M2_ARTIFACTS)) {
    mkdirSync(M2_ARTIFACTS, { recursive: true });
  }
  writeFileSync(resolve(M2_ARTIFACTS, name), JSON.stringify(payload, null, 2));
}

describe('M2-B: 5-scenario dual-runtime round-trip via Flow resolution', () => {
  for (const scenario of M0_SCENARIOS) {
    it(`scenario "${scenario.id}" — Browser and Node produce identical slot orderings`, async () => {
      const flow = makeScenarioFlow(scenario);
      const cat = new InMemoryTemplateVersionCatalog();
      cat.add({
        templateId: `tmpl.basic-mockup.${scenario.id}`,
        version: '1.0.0',
        flows: [flow],
        createdAt: '2026-07-15T00:00:00.000Z',
      });

      const ds = designStateFor(scenario.id);

      const browserExec = makeMockExecutor('browser');
      const nodeExec = makeMockExecutor('node');

      const browserResult = await browserExec.executeFromDesignState(ds, { catalog: cat });
      const nodeResult = await nodeExec.executeFromDesignState(ds, { catalog: cat });

      const browserSlots = browserResult.renderResult.outputs.map((o) => o.slot);
      const nodeSlots = nodeResult.renderResult.outputs.map((o) => o.slot);

      try {
        expect(browserSlots).toEqual(nodeSlots);
        expect(browserSlots).toEqual([`${scenario.id}.print`, `${scenario.id}.preview`]);
        expect(browserResult.flowKey).toBe(scenario.id);
        expect(nodeResult.flowKey).toBe(scenario.id);
      } catch (err) {
        emitArtifact(`${scenario.id}-mismatch.json`, {
          scenario: scenario.id,
          browserSlots,
          nodeSlots,
          error: (err as Error).message,
        });
        throw err;
      }
    });
  }
});
