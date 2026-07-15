/**
 * Unit tests for interface contracts
 */

import { describe, it, expect, vi } from 'vitest';
import type { AssetResolver } from '../interfaces/asset-resolver';
import type { OutputSink } from '../interfaces/output-sink';
import type { TemplateVersionResolver } from '../interfaces/template-version-resolver';

describe('AssetResolver interface', () => {
  it('should have resolve method that returns Promise<ImageData>', async () => {
    const mockAssetResolver: AssetResolver = {
      resolve: vi.fn().mockResolvedValue({
        width: 100,
        height: 100,
        data: new Uint8ClampedArray(40000),
      } as ImageData),
    };

    const assetRef = {
      id: 'test-asset',
      kind: 'inline' as const,
      mimeType: 'image/png',
      checksum: 'sha256:test',
    };

    const result = await mockAssetResolver.resolve(assetRef);
    expect(result).toBeDefined();
    expect(result.width).toBe(100);
    expect(result.height).toBe(100);
    expect(mockAssetResolver.resolve).toHaveBeenCalledWith(assetRef);
  });
});

describe('OutputSink interface', () => {
  it('should have publish method that returns ImageRef', () => {
    const mockOutputSink: OutputSink = {
      publish: vi.fn().mockReturnValue({
        id: 'img-123',
        url: 'data:image/png;base64,abc123',
        width: 100,
        height: 100,
      }),
    };

    const result = mockOutputSink.publish('node-1', 'mockup', { width: 100, height: 100 });
    expect(result).toBeDefined();
    expect(result.id).toBe('img-123');
    expect(mockOutputSink.publish).toHaveBeenCalledWith('node-1', 'mockup', { width: 100, height: 100 });
  });
});

describe('TemplateVersionResolver interface', () => {
  it('should have getVersion method', () => {
    const mockResolver: TemplateVersionResolver = {
      getVersion: vi.fn().mockReturnValue({
        id: 'tv-123',
        templateId: 'tpl-456',
        version: '1.0.0',
        displayName: 'Test Template',
        inputs: [],
        flows: [],
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      }),
      currentVersion: vi.fn().mockReturnValue({
        id: 'tv-789',
        templateId: 'tpl-456',
        version: '2.0.0',
        displayName: 'Test Template Latest',
        inputs: [],
        flows: [],
        createdAt: '2026-06-01T00:00:00Z',
        updatedAt: '2026-06-01T00:00:00Z',
      }),
    };

    const version = mockResolver.getVersion('tpl-456', '1.0.0');
    expect(version).toBeDefined();
    expect(version?.version).toBe('1.0.0');

    const current = mockResolver.currentVersion('tpl-456');
    expect(current).toBeDefined();
    expect(current?.version).toBe('2.0.0');
  });

  it('should return undefined for non-existent template', () => {
    const mockResolver: TemplateVersionResolver = {
      getVersion: vi.fn().mockReturnValue(undefined),
      currentVersion: vi.fn().mockReturnValue(undefined),
    };

    expect(mockResolver.getVersion('non-existent', '1.0.0')).toBeUndefined();
    expect(mockResolver.currentVersion('non-existent')).toBeUndefined();
  });
});
