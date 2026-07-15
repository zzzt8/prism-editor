/**
 * Tests for execute function
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { RenderRequest, DesignState, ImageData } from '@prism/shared-types';
import type { AssetResolver } from '../interfaces/asset-resolver';
import type { OutputSink } from '../interfaces/output-sink';
import type { TemplateVersionResolver, TemplateVersion } from '../interfaces/template-version-resolver';
import { execute, BrowserRuntimeError, BROWSER_RUNTIME_ERROR_CODES } from '../execute';

describe('execute', () => {
  let mockAssetResolver: AssetResolver;
  let mockOutputSink: OutputSink;
  let mockTemplateVersionResolver: TemplateVersionResolver;

  const createMinimalDesignState = (overrides: Partial<DesignState> = {}): DesignState => ({
    schemaVersion: 1,
    templateId: 'test-template',
    templateVersion: '1.0.0',
    flowKey: 'preview.main',
    inputs: {
      assets: [],
      params: {},
    },
    createdAt: '2026-01-01T00:00:00Z',
    ...overrides,
  });

  const createMinimalTemplateVersion = (): TemplateVersion => ({
    templateId: 'test-template',
    version: '1.0.0',
    flows: [],
    createdAt: '2026-01-01T00:00:00Z',
  });

  const createRenderRequest = (overrides: Partial<RenderRequest> = {}): RenderRequest => ({
    designState: createMinimalDesignState(),
    requestedOutputSlots: ['mockup'],
    ...overrides,
  });

  beforeEach(() => {
    mockAssetResolver = {
      resolve: vi.fn().mockResolvedValue({
        width: 100,
        height: 100,
        data: new Uint8ClampedArray(40000),
      } as ImageData),
    };

    mockOutputSink = {
      publish: vi.fn().mockReturnValue({
        id: 'img-123',
        url: 'data:image/png;base64,abc123',
        width: 100,
        height: 100,
      }),
    };

    mockTemplateVersionResolver = {
      getVersion: vi.fn(),
      currentVersion: vi.fn(),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('validation', () => {
    it('should throw on invalid RenderRequest', async () => {
      const invalidRequest = {
        designState: {
          // Missing required fields
          schemaVersion: 1,
        },
        requestedOutputSlots: [],
      } as unknown as RenderRequest;

      await expect(
        execute(invalidRequest, {
          assetResolver: mockAssetResolver,
          templateVersionResolver: mockTemplateVersionResolver,
          outputSink: mockOutputSink,
        })
      ).rejects.toThrow();
    });
  });

  describe('template resolution', () => {
    it('should throw TEMPLATE_NOT_FOUND when template does not exist', async () => {
      vi.mocked(mockTemplateVersionResolver.getVersion).mockReturnValue(undefined);
      vi.mocked(mockTemplateVersionResolver.currentVersion).mockReturnValue(undefined);

      await expect(
        execute(
          createRenderRequest(),
          {
            assetResolver: mockAssetResolver,
            templateVersionResolver: mockTemplateVersionResolver,
            outputSink: mockOutputSink,
          }
        )
      ).rejects.toThrow(BrowserRuntimeError);

      await expect(
        execute(
          createRenderRequest(),
          {
            assetResolver: mockAssetResolver,
            templateVersionResolver: mockTemplateVersionResolver,
            outputSink: mockOutputSink,
          }
        )
      ).rejects.toMatchObject({
        code: BROWSER_RUNTIME_ERROR_CODES.TEMPLATE_NOT_FOUND,
      });
    });

    it('should resolve from getVersion first', async () => {
      const templateVersion = createMinimalTemplateVersion();
      vi.mocked(mockTemplateVersionResolver.getVersion).mockReturnValue(templateVersion);

      const request = createRenderRequest({
        designState: createMinimalDesignState({
          flowKey: 'preview.main',
        }),
      });

      // The flow lookup will fail since there are no flows, but template resolution should succeed
      await expect(
        execute(request, {
          assetResolver: mockAssetResolver,
          templateVersionResolver: mockTemplateVersionResolver,
          outputSink: mockOutputSink,
        })
      ).rejects.toMatchObject({
        code: BROWSER_RUNTIME_ERROR_CODES.FLOW_NOT_FOUND,
      });
    });

    it('should fallback to currentVersion when getVersion returns undefined', async () => {
      const templateVersion = createMinimalTemplateVersion();
      vi.mocked(mockTemplateVersionResolver.getVersion).mockReturnValue(undefined);
      vi.mocked(mockTemplateVersionResolver.currentVersion).mockReturnValue(templateVersion);

      const request = createRenderRequest({
        designState: createMinimalDesignState({
          templateVersion: 'latest',
        }),
      });

      await expect(
        execute(request, {
          assetResolver: mockAssetResolver,
          templateVersionResolver: mockTemplateVersionResolver,
          outputSink: mockOutputSink,
        })
      ).rejects.toMatchObject({
        code: BROWSER_RUNTIME_ERROR_CODES.FLOW_NOT_FOUND,
      });
    });
  });

  describe('flow resolution', () => {
    it('should throw FLOW_NOT_FOUND when flow does not exist', async () => {
      const templateVersion = createMinimalTemplateVersion();
      vi.mocked(mockTemplateVersionResolver.getVersion).mockReturnValue(templateVersion);

      const request = createRenderRequest({
        designState: createMinimalDesignState({
          flowKey: 'nonexistent.flow',
        }),
      });

      await expect(
        execute(request, {
          assetResolver: mockAssetResolver,
          templateVersionResolver: mockTemplateVersionResolver,
          outputSink: mockOutputSink,
        })
      ).rejects.toMatchObject({
        code: BROWSER_RUNTIME_ERROR_CODES.FLOW_NOT_FOUND,
      });
    });
  });
});

describe('BrowserRuntimeError', () => {
  it('should have correct properties', () => {
    const error = new BrowserRuntimeError(
      BROWSER_RUNTIME_ERROR_CODES.VALIDATION_FAILED,
      'Test error message',
      new Error('cause')
    );

    expect(error.code).toBe('VALIDATION_FAILED');
    expect(error.message).toBe('Test error message');
    expect(error.cause).toBeInstanceOf(Error);
    expect(error.name).toBe('BrowserRuntimeError');
  });
});

describe('BROWSER_RUNTIME_ERROR_CODES', () => {
  it('should have all expected error codes', () => {
    expect(BROWSER_RUNTIME_ERROR_CODES.VALIDATION_FAILED).toBe('VALIDATION_FAILED');
    expect(BROWSER_RUNTIME_ERROR_CODES.TEMPLATE_NOT_FOUND).toBe('TEMPLATE_NOT_FOUND');
    expect(BROWSER_RUNTIME_ERROR_CODES.FLOW_NOT_FOUND).toBe('FLOW_NOT_FOUND');
    expect(BROWSER_RUNTIME_ERROR_CODES.ASSET_RESOLUTION_FAILED).toBe('ASSET_RESOLUTION_FAILED');
    expect(BROWSER_RUNTIME_ERROR_CODES.EXECUTION_FAILED).toBe('EXECUTION_FAILED');
  });
});
