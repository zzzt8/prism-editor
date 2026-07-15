/**
 * Tests for asset resolver-backed loader
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AssetRef, DesignState, ImageData } from '@prism/shared-types';
import type { AssetResolver } from '../interfaces/asset-resolver';
import {
  resolveAssetsForDesignState,
  injectResolvedAssets,
} from '../asset-resolver-backed-loader';

describe('resolveAssetsForDesignState', () => {
  let mockAssetResolver: AssetResolver;

  const createAssetRef = (overrides: Partial<AssetRef> = {}): AssetRef => ({
    id: 'test-asset-123',
    kind: 'inline',
    mimeType: 'image/png',
    checksum: 'sha256:test',
    ...overrides,
  });

  const createDesignState = (assets: { slot: string; asset: AssetRef }[] = []): DesignState => ({
    schemaVersion: 1,
    templateId: 'test-template',
    templateVersion: '1.0.0',
    flowKey: 'preview.main',
    inputs: {
      assets: assets.map(a => ({ slot: a.slot, asset: a.asset })),
      params: {},
    },
    createdAt: '2026-01-01T00:00:00Z',
  });

  beforeEach(() => {
    mockAssetResolver = {
      resolve: vi.fn().mockImplementation(async (assetRef: AssetRef) => {
        // Return mock ImageData
        return {
          width: 100,
          height: 100,
          data: new Uint8ClampedArray(40000),
        } as ImageData;
      }),
    };
  });

  it('should return empty maps when designState has no assets', async () => {
    const designState = createDesignState([]);
    const result = await resolveAssetsForDesignState(designState, mockAssetResolver);

    expect(result.bySlot.size).toBe(0);
    expect(result.byAssetId.size).toBe(0);
  });

  it('should resolve assets by slot', async () => {
    const designState = createDesignState([
      { slot: 'base', asset: createAssetRef({ id: 'asset-1' }) },
      { slot: 'overlay', asset: createAssetRef({ id: 'asset-2' }) },
    ]);

    const result = await resolveAssetsForDesignState(designState, mockAssetResolver);

    expect(result.bySlot.has('base')).toBe(true);
    expect(result.bySlot.has('overlay')).toBe(true);
    expect(result.byAssetId.has('asset-1')).toBe(true);
    expect(result.byAssetId.has('asset-2')).toBe(true);
  });

  it('should call assetResolver.resolve for each asset', async () => {
    const assets = [
      { slot: 'base', asset: createAssetRef({ id: 'asset-1' }) },
      { slot: 'overlay', asset: createAssetRef({ id: 'asset-2' }) },
    ];
    const designState = createDesignState(assets);

    await resolveAssetsForDesignState(designState, mockAssetResolver);

    expect(mockAssetResolver.resolve).toHaveBeenCalledTimes(2);
    expect(mockAssetResolver.resolve).toHaveBeenCalledWith(assets[0].asset);
    expect(mockAssetResolver.resolve).toHaveBeenCalledWith(assets[1].asset);
  });

  it('should reuse same ImageData for duplicate asset refs', async () => {
    const sameAsset = createAssetRef({ id: 'shared-asset' });
    const designState = createDesignState([
      { slot: 'base', asset: sameAsset },
      { slot: 'overlay', asset: sameAsset }, // Same asset used twice
    ]);

    const result = await resolveAssetsForDesignState(designState, mockAssetResolver);

    // assetResolver should only be called once for the shared asset
    expect(mockAssetResolver.resolve).toHaveBeenCalledTimes(1);

    // Both slots should point to the same ImageData
    const baseData = result.bySlot.get('base');
    const overlayData = result.bySlot.get('overlay');
    expect(baseData).toBe(overlayData);
  });

  it('should propagate errors from assetResolver', async () => {
    mockAssetResolver.resolve.mockRejectedValueOnce(new Error('Network error'));

    const designState = createDesignState([
      { slot: 'base', asset: createAssetRef({ id: 'failing-asset' }) },
    ]);

    await expect(
      resolveAssetsForDesignState(designState, mockAssetResolver)
    ).rejects.toThrow('Network error');
  });
});

describe('injectResolvedAssets', () => {
  const createDesignState = (params: Record<string, unknown> = {}): DesignState => ({
    schemaVersion: 1,
    templateId: 'test-template',
    templateVersion: '1.0.0',
    flowKey: 'preview.main',
    inputs: {
      assets: [],
      params,
    },
    createdAt: '2026-01-01T00:00:00Z',
  });

  it('should inject ImageData into params by slot', () => {
    const designState = createDesignState();
    const mockImageData = {
      width: 100,
      height: 100,
      data: new Uint8ClampedArray(40000),
    } as unknown as ImageData;

    const resolvedAssets = {
      bySlot: new Map([['base', mockImageData]]),
      byAssetId: new Map(),
    };

    const result = injectResolvedAssets(designState, resolvedAssets);

    expect(result.inputs.params['base']).toBe(mockImageData);
  });

  it('should preserve existing params', () => {
    const designState = createDesignState({ width: 1920, height: 1080 });
    const mockImageData = {
      width: 100,
      height: 100,
      data: new Uint8ClampedArray(40000),
    } as unknown as ImageData;

    const resolvedAssets = {
      bySlot: new Map([['base', mockImageData]]),
      byAssetId: new Map(),
    };

    const result = injectResolvedAssets(designState, resolvedAssets);

    expect(result.inputs.params['width']).toBe(1920);
    expect(result.inputs.params['height']).toBe(1080);
    expect(result.inputs.params['base']).toBe(mockImageData);
  });

  it('should not mutate original DesignState', () => {
    const designState = createDesignState();
    const mockImageData = {
      width: 100,
      height: 100,
      data: new Uint8ClampedArray(40000),
    } as unknown as ImageData;

    const resolvedAssets = {
      bySlot: new Map([['base', mockImageData]]),
      byAssetId: new Map(),
    };

    const result = injectResolvedAssets(designState, resolvedAssets);

    // Original should be unchanged
    expect(designState.inputs.params['base']).toBeUndefined();

    // Result should have injected value
    expect(result.inputs.params['base']).toBe(mockImageData);
  });

  it('should handle multiple slots', () => {
    const designState = createDesignState();
    const imageData1 = { width: 100, height: 100, data: new Uint8ClampedArray(40000) } as unknown as ImageData;
    const imageData2 = { width: 200, height: 200, data: new Uint8ClampedArray(160000) } as unknown as ImageData;

    const resolvedAssets = {
      bySlot: new Map([
        ['base', imageData1],
        ['overlay', imageData2],
      ]),
      byAssetId: new Map(),
    };

    const result = injectResolvedAssets(designState, resolvedAssets);

    expect(result.inputs.params['base']).toBe(imageData1);
    expect(result.inputs.params['overlay']).toBe(imageData2);
  });
});
