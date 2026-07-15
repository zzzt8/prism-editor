/**
 * Minimal DesignState fixture for Chromium tests.
 *
 * This fixture provides a valid DesignState with flowKey for testing.
 */

import type { DesignState, DesignStateAssetBinding, AssetRef } from '@prism/shared-types';
import type { FlowKey } from '@prism/shared-types';

/**
 * Minimal AssetRef for testing.
 */
export function createMinimalAssetRef(overrides: Partial<AssetRef> = {}): AssetRef {
  return {
    id: 'test-asset-001',
    kind: 'inline',
    mimeType: 'image/png',
    checksum: 'sha256:abc123',
    ...overrides,
  };
}

/**
 * Create a DesignStateAssetBinding for testing.
 */
export function createAssetBinding(
  slot: string,
  overrides: Partial<AssetRef> = {}
): DesignStateAssetBinding {
  return {
    slot,
    asset: createMinimalAssetRef(overrides),
  };
}

/**
 * Minimal DesignState with flowKey.
 */
export const minimalDesignState: DesignState = {
  schemaVersion: 1,
  templateId: 'test-template',
  templateVersion: '1.0.0',
  flowKey: 'preview.main' as FlowKey,
  inputs: {
    assets: [],
    params: {},
  },
  createdAt: '2026-01-01T00:00:00Z',
};

/**
 * Helper to create a custom DesignState.
 */
export function createDesignState(overrides: {
  templateId?: string;
  templateVersion?: string;
  flowKey?: string;
  assets?: DesignStateAssetBinding[];
  params?: Record<string, unknown>;
}): DesignState {
  return {
    schemaVersion: 1,
    templateId: overrides.templateId ?? 'test-template',
    templateVersion: overrides.templateVersion ?? '1.0.0',
    flowKey: (overrides.flowKey ?? 'preview.main') as FlowKey,
    inputs: {
      assets: overrides.assets ?? [],
      params: overrides.params ?? {},
    },
    createdAt: '2026-01-01T00:00:00Z',
  };
}

/**
 * Create a DesignState with inline base64 assets.
 */
export function createDesignStateWithInlineAssets(
  slots: string[],
  base64Images: string[]
): DesignState {
  return createDesignState({
    assets: slots.map((slot, idx) =>
      createAssetBinding(slot, {
        id: base64Images[idx] ?? 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        kind: 'inline',
        mimeType: 'image/png',
      })
    ),
  });
}
