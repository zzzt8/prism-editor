/**
 * Minimal TemplateVersion fixture for Chromium tests.
 *
 * This fixture provides a valid TemplateVersion with at least 2 explicit output slots
 * for testing the Chromium test host.
 */

import type { TemplateVersion, TemplateVersionFlow } from '../../interfaces/template-version-resolver';

export const minimalTemplateVersion: TemplateVersion = {
  templateId: 'test-template',
  version: '1.0.0',
  flows: [
    minimalFlow,
  ],
  createdAt: '2026-01-01T00:00:00Z',
};

/**
 * Minimal Flow with 2 explicit output slots.
 */
const minimalFlow: TemplateVersionFlow = {
  schemaVersion: 1,
  flowKey: 'preview.main',
  nodeRefs: [
    { nodeId: 'load-base', nodeType: 'load-image' },
    { nodeId: 'load-overlay', nodeType: 'load-image' },
    { nodeId: 'composite', nodeType: 'composite' },
    { nodeId: 'export', nodeType: 'export' },
  ],
  explicitOutputs: [
    { slot: 'mockup', nodeId: 'composite', port: 'image', kind: 'image' },
    { slot: 'cutting-preview', nodeId: 'export', port: 'image', kind: 'image' },
  ],
};

/**
 * Helper to create a custom TemplateVersion with specified slots.
 */
export function createTemplateVersion(overrides: {
  templateId?: string;
  version?: string;
  flowKey?: string;
  slots?: string[];
}): TemplateVersion {
  const slots = overrides.slots ?? ['mockup', 'cutting-preview'];
  const flowKey = overrides.flowKey ?? 'preview.main';

  return {
    templateId: overrides.templateId ?? 'test-template',
    version: overrides.version ?? '1.0.0',
    flows: [
      {
        schemaVersion: 1,
        flowKey,
        nodeRefs: [
          { nodeId: 'load-base', nodeType: 'load-image' },
          { nodeId: 'composite', nodeType: 'composite' },
          { nodeId: 'export', nodeType: 'export' },
        ],
        explicitOutputs: slots.map((slot, idx) => ({
          slot,
          nodeId: idx === 0 ? 'composite' : 'export',
          port: 'image',
          kind: 'image',
        })),
      },
    ],
    createdAt: '2026-01-01T00:00:00Z',
  };
}
