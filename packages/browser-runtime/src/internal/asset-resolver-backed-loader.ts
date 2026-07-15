/**
 * Asset Resolver-Backed Loader
 *
 * Browser runtime loader that uses AssetResolver to resolve DesignState input assets
 * to browser-compatible ImageData.
 *
 * This loader:
 * - Uses AssetResolver.resolve() to get ImageData for each asset
 * - Supports inline, remote, and prism-asset kinds
 * - Reuses existing OffscreenCanvas decoding logic
 * - Does NOT modify existing load-image.ts (preserves Dev Tool behavior)
 */

import type { AssetRef, DesignState, ImageData } from '@prism/shared-types';
import type { AssetResolver } from '../interfaces/asset-resolver';

/**
 * Load ImageData from an inline (base64) asset.
 */
async function loadInlineAsset(assetRef: AssetRef): Promise<ImageData> {
  const dataUrl = `data:${assetRef.mimeType || 'image/png'};base64,${assetRef.id}`;
  return loadImageFromDataUrl(dataUrl);
}

/**
 * Load ImageData from a remote asset URL.
 */
async function loadRemoteAsset(assetRef: AssetRef): Promise<ImageData> {
  const url = (assetRef as { url?: string }).url;
  if (!url) {
    throw new Error(`Remote asset missing URL: ${assetRef.id}`);
  }
  return loadCrossOriginImage(url);
}

/**
 * Load ImageData from a Prism-managed asset URL.
 */
async function loadPrismAsset(assetRef: AssetRef): Promise<ImageData> {
  const url = (assetRef as { url?: string }).url;
  if (!url) {
    throw new Error(`Prism asset missing URL: ${assetRef.id}`);
  }
  return loadCrossOriginImage(url);
}

/**
 * Load ImageData from a data URL using OffscreenCanvas.
 */
async function loadImageFromDataUrl(dataUrl: string): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      const canvas = new OffscreenCanvas(img.width, img.height);
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get 2D context'));
        return;
      }

      ctx.drawImage(img, 0, 0);
      resolve(ctx.getImageData(0, 0, img.width, img.height));
    };

    img.onerror = () => {
      reject(new Error(`Failed to decode image data URL: ${dataUrl.substring(0, 50)}...`));
    };

    img.src = dataUrl;
  });
}

/**
 * Load ImageData from a cross-origin URL using OffscreenCanvas.
 */
async function loadCrossOriginImage(url: string): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const canvas = new OffscreenCanvas(img.width, img.height);
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get 2D context'));
        return;
      }

      ctx.drawImage(img, 0, 0);
      resolve(ctx.getImageData(0, 0, img.width, img.height));
    };

    img.onerror = () => {
      reject(new Error(`Failed to load image from URL: ${url}`));
    };

    img.src = url;
  });
}

export interface ResolvedAssets {
  /** Map of slot name to resolved ImageData */
  bySlot: Map<string, ImageData>;
  /** Map of asset ID to resolved ImageData */
  byAssetId: Map<string, ImageData>;
}

/**
 * Resolve all assets from DesignState using an AssetResolver.
 *
 * This function:
 * 1. Walks DesignState.inputs.assets
 * 2. For each asset binding, resolves via AssetResolver
 * 3. Returns both slot->ImageData and assetId->ImageData maps
 *
 * @param designState - The DesignState containing asset bindings
 * @param assetResolver - The AssetResolver to use for resolution
 * @returns Resolved assets organized by slot and asset ID
 */
export async function resolveAssetsForDesignState(
  designState: DesignState,
  assetResolver: AssetResolver
): Promise<ResolvedAssets> {
  const bySlot = new Map<string, ImageData>();
  const byAssetId = new Map<string, ImageData>();

  const assets = designState.inputs.assets;
  if (!assets || assets.length === 0) {
    return { bySlot, byAssetId };
  }

  for (const binding of assets) {
    const { slot, asset } = binding;

    // Skip if already resolved
    if (byAssetId.has(asset.id)) {
      bySlot.set(slot, byAssetId.get(asset.id)!);
      continue;
    }

    // Resolve via AssetResolver
    const imageData = await assetResolver.resolve(asset);

    bySlot.set(slot, imageData);
    byAssetId.set(asset.id, imageData);
  }

  return { bySlot, byAssetId };
}

/**
 * Inject resolved ImageData into DesignState inputs for executor execution.
 *
 * This creates a modified DesignState where asset slot references
 * are replaced with actual ImageData values for execution.
 *
 * @param designState - Original DesignState with asset references
 * @param resolvedAssets - Resolved assets from resolveAssetsForDesignState
 * @returns Modified DesignState with ImageData injected
 */
export function injectResolvedAssets(
  designState: DesignState,
  resolvedAssets: ResolvedAssets
): DesignState {
  // For browser runtime, we inject ImageData into params for the executor to use
  // The executor will look for imageData in the params under the slot name
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const injectedParams = { ...designState.inputs.params } as any;

  for (const [slot, imageData] of resolvedAssets.bySlot) {
    injectedParams[slot] = imageData;
  }

  return {
    ...designState,
    inputs: {
      ...designState.inputs,
      params: injectedParams,
    },
  };
}
