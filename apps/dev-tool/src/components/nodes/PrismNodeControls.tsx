// PrismNodeControls - Specialized body content renderers per node type
// Part of the PrismNode split (openspec/changes/codebase-cleanup/design.md §Decision 6)

import React, { type FC, useMemo, useState } from 'react';
import { Upload } from 'lucide-react';
import {
  unwrapImageData,
  unwrapPreviewUrl,
} from '@prism/shared-types';
import type { CanvasNodeData } from '../../modules/editor/stores/types';

interface ImageFileValue {
  dataUrl: string;
  width: number;
  height: number;
  fileName: string;
}

// Execution result thumbnail helper
// Renders ImageData to a canvas capped at 400px so CSS scaling stays under 1.2x
// within the 240px node width.
export function useExecutionThumbnail(
  result: CanvasNodeData['executionResult'],
  execImageKey: string | undefined
) {
  return useMemo(() => {
    if (!result || !execImageKey) return null;
    const topPreview = result['previewUrl'];
    const topW = result['width'] as number | undefined;
    const topH = result['height'] as number | undefined;
    if (typeof topPreview === 'string' && topPreview.length > 0 && topW && topH) {
      return { dataUrl: topPreview, width: topW, height: topH };
    }

    const imgData = result[execImageKey];

    if (imgData && typeof imgData === 'object' && !('data' in imgData) && 'url' in imgData) {
      const ref = imgData as { url?: string; previewUrl?: string; width?: number; height?: number };
      if (ref.url || ref.previewUrl) {
        return {
          dataUrl: ref.url ?? ref.previewUrl ?? '',
          width: ref.width ?? 0,
          height: ref.height ?? 0,
        };
      }
    }

    const imgDataObj = imgData as Record<string, unknown>;
    if (imgData && typeof imgData === 'object' && 'data' in imgDataObj && 'width' in imgDataObj && 'height' in imgDataObj) {
      const width = imgDataObj.width as number;
      const height = imgDataObj.height as number;
      const pUrl = imgDataObj.previewUrl;
      if (typeof pUrl === 'string' && pUrl.length > 0 && width && height) {
        return { dataUrl: pUrl, width, height };
      }
      const imageData = imgDataObj.data;
      if (imageData instanceof ImageData && width && height) {
        try {
          const MAX = 400;
          const scale = Math.min(1, MAX / Math.max(width, height));
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(width * scale);
          canvas.height = Math.round(height * scale);
          const ctx = canvas.getContext('2d');
          if (!ctx) return null;
          ctx.imageSmoothingEnabled = scale < 0.9;
          const tmp = document.createElement('canvas');
          tmp.width = width; tmp.height = height;
          const tmpCtx = tmp.getContext('2d');
          if (!tmpCtx) return null;
          tmpCtx.putImageData(imageData, 0, 0);
          ctx.drawImage(tmp, 0, 0, canvas.width, canvas.height);
          return { dataUrl: canvas.toDataURL('image/png'), width, height };
        } catch { return null; }
      }
    }

    if (imgData instanceof ImageData && imgData.width && imgData.height) {
      try {
        const MAX = 400;
        const scale = Math.min(1, MAX / Math.max(imgData.width, imgData.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(imgData.width * scale);
        canvas.height = Math.round(imgData.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;
        ctx.imageSmoothingEnabled = scale < 0.9;
        const tmp = document.createElement('canvas');
        tmp.width = imgData.width; tmp.height = imgData.height;
        const tmpCtx = tmp.getContext('2d');
        if (!tmpCtx) return null;
        tmpCtx.putImageData(imgData, 0, 0);
        ctx.drawImage(tmp, 0, 0, canvas.width, canvas.height);
        return { dataUrl: canvas.toDataURL('image/png'), width: imgData.width, height: imgData.height };
      } catch { return null; }
    }

    return null;
  }, [result, execImageKey]);
}

// Full preview image helper (for modal)
export function usePreviewImage(
  imageFileValue: { dataUrl?: string; width?: number; height?: number; fileName?: string } | undefined,
  result: CanvasNodeData['executionResult'],
  execImageKey: string | undefined
) {
  return useMemo(() => {
    if (imageFileValue?.dataUrl) return imageFileValue.dataUrl;
    if (!result || !execImageKey) return null;
    const topPreview = result['previewUrl'];
    if (typeof topPreview === 'string' && topPreview.length > 0) return topPreview;

    const imgData = result[execImageKey];

    if (imgData && typeof imgData === 'object' && !('data' in imgData) && 'url' in imgData) {
      const ref = imgData as { url?: string; previewUrl?: string };
      return ref.url ?? ref.previewUrl ?? null;
    }

    if (imgData && typeof imgData === 'object' && 'data' in imgData) {
      const runtimeObj = imgData as { data: unknown; width?: number; height?: number; previewUrl?: string };
      if (typeof runtimeObj.previewUrl === 'string' && runtimeObj.previewUrl.length > 0) {
        return runtimeObj.previewUrl;
      }
      if (runtimeObj.data instanceof ImageData && runtimeObj.width && runtimeObj.height) {
        const MAX = 1200;
        const scale = Math.min(1, MAX / Math.max(runtimeObj.width, runtimeObj.height));
        try {
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(runtimeObj.width * scale);
          canvas.height = Math.round(runtimeObj.height * scale);
          const ctx = canvas.getContext('2d');
          if (!ctx) return null;
          ctx.imageSmoothingEnabled = false;
          const tmp = document.createElement('canvas');
          tmp.width = runtimeObj.width; tmp.height = runtimeObj.height;
          const tmpCtx = tmp.getContext('2d');
          if (!tmpCtx) return null;
          tmpCtx.putImageData(runtimeObj.data, 0, 0);
          ctx.drawImage(tmp, 0, 0, canvas.width, canvas.height);
          return canvas.toDataURL('image/png');
        } catch { return null; }
      }
    }

    if (imgData instanceof ImageData && imgData.width && imgData.height) {
      const MAX = 1200;
      const scale = Math.min(1, MAX / Math.max(imgData.width, imgData.height));
      try {
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(imgData.width * scale);
        canvas.height = Math.round(imgData.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;
        ctx.imageSmoothingEnabled = false;
        const tmp = document.createElement('canvas');
        tmp.width = imgData.width; tmp.height = imgData.height;
        const tmpCtx = tmp.getContext('2d');
        if (!tmpCtx) return null;
        tmpCtx.putImageData(imgData, 0, 0);
        ctx.drawImage(tmp, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL('image/png');
      } catch { return null; }
    }

    return null;
  }, [imageFileValue, result, execImageKey]);
}

// Drag state helper split out to ./PrismNodeControls/dragImageState.ts.
// Imported for local usage; re-exported below as Facade for external callers.
import { setDragImageState, getDragImageState } from './PrismNodeControls/dragImageState';
export type { DragState } from './PrismNodeControls/dragImageState';
export { setDragImageState, getDragImageState } from './PrismNodeControls/dragImageState';

// Helper function to process an image file and update node params
function processImageFile(
  file: File,
  updateNodeParams: (_id: string, _params: Record<string, unknown>) => void,
  nodeId: string,
  _params: Record<string, unknown>,
  paramKey: 'imageFile' | 'maskFile'
) {
  const reader = new FileReader();
  reader.onload = (ev) => {
    const dataUrl = ev.target?.result as string;
    const i = new Image();
    i.onload = () => updateNodeParams(nodeId, { ..._params, [paramKey]: { dataUrl, width: i.naturalWidth, height: i.naturalHeight, fileName: file.name } });
    i.onerror = () => updateNodeParams(nodeId, { ..._params, [paramKey]: { dataUrl, width: 0, height: 0, fileName: file.name } });
    i.src = dataUrl;
  };
  reader.readAsDataURL(file);
}

/** Helper to generate a thumbnail from ImageData — cap at 200px so CSS scaling stays under 2x */
function makeThumbnail(data: ImageData, maxPx = 200): string | null {
  try {
    const scale = Math.min(maxPx / data.width, maxPx / data.height, 1);
    const c = document.createElement('canvas');
    c.width = Math.round(data.width * scale); c.height = Math.round(data.height * scale);
    const ctx = c.getContext('2d');
    if (!ctx) return null;
    ctx.imageSmoothingEnabled = false;
    const t = document.createElement('canvas');
    t.width = data.width; t.height = data.height;
    const tc = t.getContext('2d');
    if (!tc) return null;
    tc.putImageData(data, 0, 0);
    ctx.drawImage(t, 0, 0, c.width, c.height);
    return c.toDataURL('image/png');
  } catch { return null; }
}

function getExecThumb(executionResult: CanvasNodeData['executionResult']): string | null {
  if (!executionResult) return null;
  const topPreview = executionResult['previewUrl'];
  if (typeof topPreview === 'string' && topPreview.length > 0) return topPreview;

  const rawImage = executionResult['image'];
  const fromImage = unwrapPreviewUrl(rawImage as Parameters<typeof unwrapPreviewUrl>[0], undefined);
  if (fromImage) return fromImage;

  const imageData = unwrapImageData(rawImage as Parameters<typeof unwrapImageData>[0]);
  if (!imageData?.width || !imageData?.height) return null;
  try {
    return makeThumbnail(imageData);
  } catch {
    return null;
  }
}

// ─── Specialized body renderers ──────────────────────────────────────────────

/** LoadImage body — file name + upload button + preview + resolution + replace */
export const LoadImageBody: FC<{
  imageFileValue: ImageFileValue | undefined;
  params: Record<string, unknown>;
  updateNodeParams: (_id: string, _params: Record<string, unknown>) => void;
  nodeId: string;
  executionResult: CanvasNodeData['executionResult'];
  onShowPreview: () => void;
}> = ({ imageFileValue, params: _params, updateNodeParams, nodeId, executionResult, onShowPreview: _onShowPreview }) => {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const img = imageFileValue;
  const [isDragOver, setIsDragOver] = useState(false);

  const execPreviewUrl = useMemo(() => {
    if (!executionResult) return null;
    const rawImage = executionResult['image'];
    const previewUrl = unwrapPreviewUrl(rawImage as Parameters<typeof unwrapPreviewUrl>[0], undefined);
    if (previewUrl) return previewUrl;
    const imageData = unwrapImageData(rawImage as Parameters<typeof unwrapImageData>[0]);
    if (!imageData?.width || !imageData?.height) return null;
    try {
      const MAX = 400;
      const scale = Math.min(1, MAX / Math.max(imageData.width, imageData.height));
      const c = document.createElement('canvas');
      c.width = Math.round(imageData.width * scale);
      c.height = Math.round(imageData.height * scale);
      const ctx = c.getContext('2d');
      if (!ctx) return null;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.putImageData(imageData, 0, 0);
      return c.toDataURL('image/png');
    } catch { return null; }
  }, [executionResult]);

  const previewUrl = img?.dataUrl ?? execPreviewUrl;
  const execW = executionResult ? (executionResult['width'] as number | undefined) : undefined;
  const execH = executionResult ? (executionResult['height'] as number | undefined) : undefined;
  const displayW = img?.width ?? execW;
  const displayH = img?.height ?? execH;

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setIsDragOver(true);
    setDragImageState({ paramKey: 'imageFile', nodeId });
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setIsDragOver(false);
    setDragImageState(null);
  };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setIsDragOver(false); setDragImageState(null);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      processImageFile(file, updateNodeParams, nodeId, imageFileValue as unknown as Record<string, unknown> ?? {}, 'imageFile');
    }
  };

  if (previewUrl) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div className="dcn-file-info">
          <span className="dcn-file-name" title={img?.fileName}>{img?.fileName ?? 'Result'}</span>
        </div>
        <div
          className={`dcn-preview ${isDragOver ? 'dcn-preview-drag-over' : ''}`}
          data-preview
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <img src={previewUrl} alt="Preview" className="dcn-preview-img" />
          {displayW && displayH && <span className="dcn-preview-badge">{displayW}×{displayH}</span>}
          {isDragOver && <div className="dcn-preview-drop-overlay"><span>拖放替换图片</span></div>}
        </div>
        <button
          className="image-file-upload-btn"
          style={{ fontSize: 10, padding: '3px 6px' }}
          onClick={() => inputRef.current?.click()}
        >
          替换图片
          <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) processImageFile(file, updateNodeParams, nodeId, imageFileValue as unknown as Record<string, unknown> ?? {}, 'imageFile');
              e.target.value = '';
            }}
          />
        </button>
      </div>
    );
  }

  return (
    <div
      className="dcn-dropzone"
      onClick={() => inputRef.current?.click()}
      title="点击上传或拖放图片"
    >
      <Upload size={13} className="dcn-dropzone-icon" />
      <span>上传图片</span>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) processImageFile(file, updateNodeParams, nodeId, imageFileValue as unknown as Record<string, unknown> ?? {}, 'imageFile');
          e.target.value = '';
        }}
      />
    </div>
  );
};

/** LoadMask body — identical to LoadImage but for mask files */
export const LoadMaskBody: FC<{
  maskFileValue: ImageFileValue | undefined;
  params: Record<string, unknown>;
  updateNodeParams: (_id: string, _params: Record<string, unknown>) => void;
  nodeId: string;
  executionResult: CanvasNodeData['executionResult'];
  onShowPreview: () => void;
}> = ({ maskFileValue, params: _params, updateNodeParams, nodeId, executionResult, onShowPreview: _onShowPreview }) => {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const img = maskFileValue;
  const [isDragOver, setIsDragOver] = useState(false);

  const execPreviewUrl = useMemo(() => {
    if (!executionResult) return null;
    const rawMask = executionResult['mask'];
    const previewUrl = unwrapPreviewUrl(rawMask as Parameters<typeof unwrapPreviewUrl>[0], undefined);
    if (previewUrl) return previewUrl;
    const imageData = unwrapImageData(rawMask as Parameters<typeof unwrapImageData>[0]);
    if (!imageData?.width || !imageData?.height) return null;
    try {
      const MAX = 400;
      const scale = Math.min(1, MAX / Math.max(imageData.width, imageData.height));
      const c = document.createElement('canvas');
      c.width = Math.round(imageData.width * scale); c.height = Math.round(imageData.height * scale);
      const ctx = c.getContext('2d');
      if (!ctx) return null;
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
      ctx.putImageData(imageData, 0, 0);
      return c.toDataURL('image/png');
    } catch { return null; }
  }, [executionResult]);

  const previewUrl = img?.dataUrl ?? execPreviewUrl;
  const execW = executionResult ? (executionResult['width'] as number | undefined) : undefined;
  const execH = executionResult ? (executionResult['height'] as number | undefined) : undefined;
  const displayW = img?.width ?? execW;
  const displayH = img?.height ?? execH;

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setIsDragOver(true);
    setDragImageState({ paramKey: 'maskFile', nodeId });
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setIsDragOver(false); setDragImageState(null);
  };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setIsDragOver(false); setDragImageState(null);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      processImageFile(file, updateNodeParams, nodeId, maskFileValue as unknown as Record<string, unknown> ?? {}, 'maskFile');
    }
  };

  if (previewUrl) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div className="dcn-file-info">
          <span className="dcn-file-name" title={img?.fileName}>{img?.fileName ?? 'Result'}</span>
        </div>
        <div
          className={`dcn-preview ${isDragOver ? 'dcn-preview-drag-over' : ''}`}
          data-preview
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <img src={previewUrl} alt="Mask Preview" className="dcn-preview-img" />
          {displayW && displayH && <span className="dcn-preview-badge">{displayW}×{displayH}</span>}
          {isDragOver && <div className="dcn-preview-drop-overlay"><span>拖放替换遮罩</span></div>}
        </div>
        <button className="image-file-upload-btn" style={{ fontSize: 10, padding: '3px 6px' }}
          onClick={() => inputRef.current?.click()}>
          替换遮罩
          <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) processImageFile(file, updateNodeParams, nodeId, maskFileValue as unknown as Record<string, unknown> ?? {}, 'maskFile');
              e.target.value = '';
            }}
          />
        </button>
      </div>
    );
  }

  return (
    <div
      className="dcn-dropzone"
      onClick={() => inputRef.current?.click()}
      title="点击上传或拖放遮罩"
    >
      <Upload size={13} className="dcn-dropzone-icon" />
      <span>上传遮罩</span>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) processImageFile(file, updateNodeParams, nodeId, maskFileValue as unknown as Record<string, unknown> ?? {}, 'maskFile');
          e.target.value = '';
        }}
      />
    </div>
  );
};

/** Transform body */
export const TransformBody: FC<{
  params: Record<string, unknown>;
  updateNodeParams: (_id: string, _params: Record<string, unknown>) => void;
  nodeId: string;
  executionResult: CanvasNodeData['executionResult'];
  onShowPreview: () => void;
}> = ({ params, updateNodeParams, nodeId, executionResult, onShowPreview }) => {
  const scaleAlg = (params['scaleAlgorithm'] as string) ?? 'lanczos';
  const execW = executionResult ? (executionResult['width'] as number) : undefined;
  const execH = executionResult ? (executionResult['height'] as number) : undefined;
  const thumb = getExecThumb(executionResult);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        <select
          style={{ fontSize: 9, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, color: '#fff', padding: '1px 3px', flex: 1, cursor: 'pointer' }}
          value={scaleAlg}
          onChange={(e) => updateNodeParams(nodeId, { ...params, scaleAlgorithm: e.target.value })}
        >
          <option value="lanczos">Lanczos</option>
          <option value="bilinear">Bilinear</option>
          <option value="nearest">Nearest</option>
        </select>
      </div>
      {thumb && (
        <div className="dcn-preview" data-preview onClick={onShowPreview}>
          <img src={thumb} alt="preview" className="dcn-preview-img" />
          {execW && execH && <span className="dcn-preview-badge">{execW}×{execH}</span>}
        </div>
      )}
    </div>
  );
};

/** ApplyMask body */
export const ApplyMaskBody: FC<{
  params: Record<string, unknown>;
  updateNodeParams: (_id: string, _params: Record<string, unknown>) => void;
  nodeId: string;
  executionResult: CanvasNodeData['executionResult'];
  onShowPreview: () => void;
}> = ({ params, updateNodeParams, nodeId, executionResult, onShowPreview }) => {
  const maskType = (params['maskType'] as string) ?? 'alpha';
  const threshold = (params['threshold'] as number) ?? 128;
  const invert = (params['invert'] as boolean) ?? false;
  const thumb = getExecThumb(executionResult);
  const execW = executionResult ? (executionResult['width'] as number) : undefined;
  const execH = executionResult ? (executionResult['height'] as number) : undefined;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <select
        style={{ fontSize: 9, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, color: '#fff', padding: '1px 3px', cursor: 'pointer' }}
        value={maskType}
        onChange={(e) => updateNodeParams(nodeId, { ...params, maskType: e.target.value })}
      >
        <option value="alpha">Alpha Channel</option>
        <option value="brightness">Brightness</option>
        <option value="luminance">Luminance</option>
      </select>
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        <input type="range" min={0} max={255} step={1} value={threshold}
          className="dcn-input-slider"
          style={{ flex: 1, height: 3, accentColor: '#f59e0b' }}
          onChange={(e) => updateNodeParams(nodeId, { ...params, threshold: Number(e.target.value) })}
        />
        <span style={{ fontSize: 9, color: '#f59e0b', minWidth: 24, textAlign: 'right', fontFamily: 'monospace' }}>{threshold}</span>
      </div>
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.6)' }}>反相</span>
        <input type="checkbox" checked={invert}
          style={{ width: 12, height: 12, accentColor: '#f59e0b', cursor: 'pointer' }}
          onChange={(e) => updateNodeParams(nodeId, { ...params, invert: e.target.checked })}
        />
      </div>
      {thumb && (
        <div className="dcn-preview" data-preview onClick={onShowPreview}>
          <img src={thumb} alt="preview" className="dcn-preview-img" />
          {execW && execH && <span className="dcn-preview-badge">{execW}×{execH}</span>}
        </div>
      )}
    </div>
  );
};

/** Composite body */
export const CompositeBody: FC<{
  params: Record<string, unknown>;
  updateNodeParams: (_id: string, _params: Record<string, unknown>) => void;
  nodeId: string;
  executionResult: CanvasNodeData['executionResult'];
  onShowPreview: () => void;
}> = ({ params, updateNodeParams, nodeId, executionResult, onShowPreview }) => {
  const blendMode = (params['blendMode'] as string) ?? 'normal';
  const opacity = (params['opacity'] as number) ?? 1;
  const thumb = getExecThumb(executionResult);
  const execW = executionResult ? (executionResult['width'] as number) : undefined;
  const execH = executionResult ? (executionResult['height'] as number) : undefined;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <select
        style={{ fontSize: 9, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, color: '#fff', padding: '1px 3px', cursor: 'pointer' }}
        value={blendMode}
        onChange={(e) => updateNodeParams(nodeId, { ...params, blendMode: e.target.value })}
      >
        {['normal','multiply','screen','overlay','darken','lighten','color-dodge','color-burn','hard-light','soft-light','difference','exclusion'].map(m => (
          <option key={m} value={m}>{m}</option>
        ))}
      </select>
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        <input type="range" min={0} max={1} step={0.01} value={opacity}
          className="dcn-input-slider"
          style={{ flex: 1, height: 3, accentColor: '#8b5cf6' }}
          onChange={(e) => updateNodeParams(nodeId, { ...params, opacity: Number(e.target.value) })}
        />
        <span style={{ fontSize: 9, color: '#8b5cf6', minWidth: 32, textAlign: 'right', fontFamily: 'monospace' }}>{Math.round(opacity * 100)}%</span>
      </div>
      {thumb && (
        <div className="dcn-preview" data-preview onClick={onShowPreview}>
          <img src={thumb} alt="preview" className="dcn-preview-img" />
          {execW && execH && <span className="dcn-preview-badge">{execW}×{execH}</span>}
        </div>
      )}
    </div>
  );
};

/** Export body */
export const ExportBody: FC<{
  executionResult: CanvasNodeData['executionResult'];
  onShowPreview: () => void;
}> = ({ executionResult, onShowPreview }) => {
  const ready = !!executionResult;
  const previewUrl = executionResult?.['previewUrl'] as string | undefined;
  const execW = executionResult?.['width'] as number | undefined;
  const execH = executionResult?.['height'] as number | undefined;

  if (previewUrl) {
    return (
      <div className="dcn-preview" data-preview onClick={onShowPreview}>
        <img src={previewUrl} alt="Preview" className="dcn-preview-img" />
        {execW && execH && <span className="dcn-preview-badge">{execW}×{execH}</span>}
      </div>
    );
  }

  return (
    <div className="dcn-preview-placeholder">
      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>预览区域</span>
      <span style={{ fontSize: 9, color: ready ? '#22c55e' : 'rgba(255,255,255,0.3)' }}>{ready ? '就绪' : '待执行'}</span>
    </div>
  );
};

const emptyInputStyle: React.CSSProperties = {
  fontSize: 9,
  background: 'rgba(0,0,0,0.3)',
  border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: 6,
  color: '#fff',
  padding: '1px 4px',
  cursor: 'pointer',
  outline: 'none',
};

/** Empty Input body — inline width / height / backgroundColor controls, ref ComfyUI EmptyImage */
export const EmptyInputBody: FC<{
  params: Record<string, unknown>;
  updateNodeParams: (_id: string, _params: Record<string, unknown>) => void;
  nodeId: string;
}> = ({ params, updateNodeParams, nodeId }) => {
  const width = (params['width'] as number) ?? 512;
  const height = (params['height'] as number) ?? 512;
  const bgColor = (params['backgroundColor'] as string) ?? '#ffffff';

  // Valid hex color for preview swatch (only show for hex — rgba is not a solid color)
  const isValidHex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(bgColor);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Width / Height row */}
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.6)' }}>W</span>
        <input
          type="number"
          min={1}
          max={8192}
          value={width}
          style={{ ...emptyInputStyle, width: 52 }}
          onChange={(e) => updateNodeParams(nodeId, { ...params, width: Number(e.target.value) })}
        />
        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.6)' }}>H</span>
        <input
          type="number"
          min={1}
          max={8192}
          value={height}
          style={{ ...emptyInputStyle, width: 52 }}
          onChange={(e) => updateNodeParams(nodeId, { ...params, height: Number(e.target.value) })}
        />
      </div>

      {/* BackgroundColor row */}
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.6)' }}>C</span>
        <input
          type="text"
          value={bgColor}
          style={{ ...emptyInputStyle, flex: 1, fontFamily: 'monospace' }}
          placeholder="#ffffff"
          onChange={(e) => updateNodeParams(nodeId, { ...params, backgroundColor: e.target.value })}
        />
        {isValidHex && (
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: 3,
              background: bgColor,
              border: '1px solid rgba(255,255,255,0.2)',
              flexShrink: 0,
            }}
          />
        )}
      </div>
    </div>
  );
};
