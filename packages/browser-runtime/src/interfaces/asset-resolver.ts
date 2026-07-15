/**
 * AssetResolver Interface
 *
 * Host-provided asset resolver — resolves DesignState input assets to
 * browser-compatible ImageData.
 *
 * M3 scope: interface definition + test host memory implementation.
 * M4 scope: DevToolAssetResolver, ComposerAssetResolver.
 *
 * Constraints:
 * - Only resolves INPUT assets (AssetRef → ImageData)
 * - Blob/ImageData/ImageBitmap exist ONLY in browser runtime memory
 * - Must NEVER write Blob/Canvas/ImageBitmap to DesignState/RenderRequest/RenderResult
 * - Must NEVER write blob URLs to persistent JSON
 *
 * @example
 * // Inline asset (base64 encoded)
 * resolve({ id: 'user-upload-123', kind: 'inline', mimeType: 'image/png', checksum: 'sha256:...' })
 *
 * // Remote asset (CDN/OSS URL)
 * resolve({ id: 'cdn-asset-456', kind: 'remote', url: 'https://...' })
 *
 * // Prism-managed asset
 * resolve({ id: 'prism-asset-789', kind: 'prism-asset', url: '/api/assets/...' })
 */

import type { AssetRef, ImageData } from '@prism/shared-types';

export interface AssetResolver {
  /**
   * Resolve an AssetRef to browser-compatible ImageData.
   *
   * @param assetRef - The asset reference from DesignState.inputs.assets
   * @returns Promise resolving to ImageData suitable for executor input
   * @throws Error if asset cannot be resolved (network failure, unsupported format, etc.)
   */
  resolve(assetRef: AssetRef): Promise<ImageData>;
}
