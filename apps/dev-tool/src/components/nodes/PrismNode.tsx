// Custom Prism node component for React Flow
//
// ComfyUI-Inspired Dense Control Node — embedded port handles in body rows.
// Design spec: openspec/changes/node-editor-comfyui-refactor/design.md
//
// Structure: Header | [Body: Input rows | Content | Output rows]
// - Header: status dot + title + menu button
// - Body rows: each row has its Handle embedded on the inner edge
//
// Mandatory Rule R1: port IDs must be consistent across:
//   NodeDefinition.port.id = Handle.id = edge sourceHandleId/targetHandleId
//   = ctx.requireInput key = executor output key

import React, { type FC, useMemo, useState, useCallback } from 'react';
import {
  Handle,
  Position,
  NodeProps,
  type Node,
} from '@xyflow/react';
import { useCanvasStore } from '../../store/canvasStore';
import type { CanvasNodeData } from '../../store/canvasStore';
import { NodePreviewModal } from '../canvas/NodePreviewModal';
import {
  PORT_TYPE_COLORS,
  getPortTypeStyle,
} from '../../utils/portTypeStyles';
import type { PortDataType } from '@prism/shared-types';
import {
  unwrapImageData,
  unwrapPreviewUrl,
} from '@prism/shared-types';
import { AlertTriangle } from 'lucide-react';

const CATEGORY_COLORS: Record<string, string> = {
  input:     '#22c55e',
  transform:  '#3b82f6',
  mask:      '#f59e0b',
  composite: '#8b5cf6',
  output:    '#ef4444',
};

const STATUS_DOT_CLASS: Record<string, string> = {
  idle:    'dcn-status-dot--idle',
  running: 'dcn-status-dot--running',
  done:    'dcn-status-dot--done',
  error:   'dcn-status-dot--error',
};

interface PrismNodeProps extends Omit<NodeProps, 'data'> {
  data: CanvasNodeData;
}

type PrismNodeType = Node<CanvasNodeData, 'prismNode'>;

// Execution result thumbnail helper
// Renders ImageData to a canvas capped at 400px so CSS scaling stays under 1.2×
// within the 240px node width.  The 512px gate is removed — large images are
// down-sampled faithfully rather than hidden.
function useExecutionThumbnail(
  result: CanvasNodeData['executionResult'],
  execImageKey: string | undefined
) {
  return useMemo(() => {
    if (!result || !execImageKey) return null;
    const imgData = result[execImageKey];

    // If it's an ImageRef (blob URL), use its previewUrl directly
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

    // If it's ImageRuntimeObject with data
    if (imgData && typeof imgData === 'object' && 'data' in imgData && 'width' in imgData && 'height' in imgData) {
      const imageData = imgData.data;
      const width = imgData.width;
      const height = imgData.height;
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
          tmp.width = width;
          tmp.height = height;
          const tmpCtx = tmp.getContext('2d');
          if (!tmpCtx) return null;
          tmpCtx.putImageData(imageData, 0, 0);
          ctx.drawImage(tmp, 0, 0, canvas.width, canvas.height);
          return {
            dataUrl: canvas.toDataURL('image/png'),
            width,
            height,
          };
        } catch {
          return null;
        }
      }
    }

    // If it's raw ImageData (direct from execution)
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
        tmp.width = imgData.width;
        tmp.height = imgData.height;
        const tmpCtx = tmp.getContext('2d');
        if (!tmpCtx) return null;
        tmpCtx.putImageData(imgData, 0, 0);
        ctx.drawImage(tmp, 0, 0, canvas.width, canvas.height);
        return {
          dataUrl: canvas.toDataURL('image/png'),
          width: imgData.width,
          height: imgData.height,
        };
      } catch {
        return null;
      }
    }

    return null;
  }, [result, execImageKey]);
}

// ---------------------------------------------------------------------------
// Full preview image helper (for modal)
// ---------------------------------------------------------------------------

function usePreviewImage(
  imageFileValue: { dataUrl?: string; width?: number; height?: number; fileName?: string } | undefined,
  result: CanvasNodeData['executionResult'],
  execImageKey: string | undefined
) {
  return useMemo(() => {
    if (imageFileValue?.dataUrl) return imageFileValue.dataUrl;
    if (!result || !execImageKey) return null;
    const imgData = result[execImageKey];

    // If it's a Blob URL (from Export node), use it directly
    if (imgData && typeof imgData === 'object' && !('data' in imgData) && 'url' in imgData) {
      const ref = imgData as { url?: string; previewUrl?: string };
      return ref.url ?? ref.previewUrl ?? null;
    }

    // If it's ImageRuntimeObject with ImageData
    if (imgData && typeof imgData === 'object' && 'data' in imgData) {
      const runtimeObj = imgData as { data: unknown; width?: number; height?: number };
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
        } catch {
          return null;
        }
      }
    }

    // If it's raw ImageData
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
      } catch {
        return null;
      }
    }

    return null;
  }, [imageFileValue, result, execImageKey]);
}

// ---------------------------------------------------------------------------
// Specialized body content per node type
// ---------------------------------------------------------------------------

interface ImageFileValue {
  dataUrl: string;
  width: number;
  height: number;
  fileName: string;
}

// Helper function to process an image file and update node params
function processImageFile(
  file: File,
  updateNodeParams: (id: string, params: Record<string, unknown>) => void,
  nodeId: string,
  params: Record<string, unknown>,
  paramKey: 'imageFile' | 'maskFile'
) {
  const reader = new FileReader();
  reader.onload = (ev) => {
    const dataUrl = ev.target?.result as string;
    const i = new Image();
    i.onload = () => updateNodeParams(nodeId, { ...params, [paramKey]: { dataUrl, width: i.naturalWidth, height: i.naturalHeight, fileName: file.name } });
    i.onerror = () => updateNodeParams(nodeId, { ...params, [paramKey]: { dataUrl, width: 0, height: 0, fileName: file.name } });
    i.src = dataUrl;
  };
  reader.readAsDataURL(file);
}

// Drag state for the whole canvas (shared via window for cross-component communication)
const DRAG_DATA_KEY = '__prism_drag_image';

interface DragState {
  paramKey: 'imageFile' | 'maskFile';
  nodeId: string;
}

export function setDragImageState(state: DragState | null) {
  (window as unknown as Record<string, unknown>)[DRAG_DATA_KEY] = state;
}

export function getDragImageState(): DragState | null {
  return (window as unknown as Record<string, unknown>)[DRAG_DATA_KEY] as DragState | null;
}

/** LoadImage body — file name + upload button + preview + resolution + replace */
const LoadImageBody: FC<{
  imageFileValue: ImageFileValue | undefined;
  params: Record<string, unknown>;
  updateNodeParams: (id: string, params: Record<string, unknown>) => void;
  nodeId: string;
  executionResult: CanvasNodeData['executionResult'];
  onShowPreview: () => void;
}> = ({ imageFileValue, params, updateNodeParams, nodeId, executionResult, onShowPreview }) => {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const img = imageFileValue;
  const [isDragOver, setIsDragOver] = React.useState(false);

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

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
    setDragImageState({ paramKey: 'imageFile', nodeId });
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    setDragImageState(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    setDragImageState(null);

    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      processImageFile(file, updateNodeParams, nodeId, params, 'imageFile');
    }
  };

  if (previewUrl) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div className="dcn-file-info">
          <span className="dcn-file-name" title={img?.fileName}>
            {img?.fileName ?? 'Result'}
          </span>
        </div>
        <div
          className={`dcn-preview ${isDragOver ? 'dcn-preview-drag-over' : ''}`}
          data-preview
          onClick={onShowPreview}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <img src={previewUrl} alt="Preview" className="dcn-preview-img" />
          {displayW && displayH && (
            <span className="dcn-preview-badge">{displayW}×{displayH}</span>
          )}
          {isDragOver && (
            <div className="dcn-preview-drop-overlay">
              <span>拖放替换图片</span>
            </div>
          )}
        </div>
        <button
          className="image-file-upload-btn"
          style={{ fontSize: 10, padding: '3px 6px' }}
          onClick={() => inputRef.current?.click()}
        >
          替换图片
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) processImageFile(file, updateNodeParams, nodeId, params, 'imageFile');
              e.target.value = '';
            }}
          />
        </button>
      </div>
    );
  }

  return (
    <button
      className="image-file-upload-btn"
      style={{ fontSize: 11, padding: '6px 8px' }}
      onClick={() => inputRef.current?.click()}
    >
      上传图片
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) processImageFile(file, updateNodeParams, nodeId, params, 'imageFile');
          e.target.value = '';
        }}
      />
    </button>
  );
};

/** LoadMask body — identical to LoadImage but for mask files */
const LoadMaskBody: FC<{
  maskFileValue: ImageFileValue | undefined;
  params: Record<string, unknown>;
  updateNodeParams: (id: string, params: Record<string, unknown>) => void;
  nodeId: string;
  executionResult: CanvasNodeData['executionResult'];
  onShowPreview: () => void;
}> = ({ maskFileValue, params, updateNodeParams, nodeId, executionResult, onShowPreview }) => {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const img = maskFileValue;
  const [isDragOver, setIsDragOver] = React.useState(false);

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

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
    setDragImageState({ paramKey: 'maskFile', nodeId });
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    setDragImageState(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    setDragImageState(null);

    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      processImageFile(file, updateNodeParams, nodeId, params, 'maskFile');
    }
  };

  if (previewUrl) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div className="dcn-file-info">
          <span className="dcn-file-name" title={img?.fileName}>
            {img?.fileName ?? 'Result'}
          </span>
        </div>
        <div
          className={`dcn-preview ${isDragOver ? 'dcn-preview-drag-over' : ''}`}
          data-preview
          onClick={onShowPreview}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <img src={previewUrl} alt="Mask Preview" className="dcn-preview-img" />
          {displayW && displayH && (
            <span className="dcn-preview-badge">{displayW}×{displayH}</span>
          )}
          {isDragOver && (
            <div className="dcn-preview-drop-overlay">
              <span>拖放替换遮罩</span>
            </div>
          )}
        </div>
        <button
          className="image-file-upload-btn"
          style={{ fontSize: 10, padding: '3px 6px' }}
          onClick={() => inputRef.current?.click()}
        >
          替换遮罩
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) processImageFile(file, updateNodeParams, nodeId, params, 'maskFile');
              e.target.value = '';
            }}
          />
        </button>
      </div>
    );
  }

  return (
    <button
      className="image-file-upload-btn"
      style={{ fontSize: 11, padding: '6px 8px' }}
      onClick={() => inputRef.current?.click()}
    >
      上传遮罩
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) processImageFile(file, updateNodeParams, nodeId, params, 'maskFile');
          e.target.value = '';
        }}
      />
    </button>
  );
};

/** Helper to generate a thumbnail from ImageData — cap at 200px so CSS scaling
    stays under 2× (a 2048 image → 200px canvas → ~1.2× up-scale in the node) */
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
  const rawImage = executionResult['image'];
  const imageData = unwrapImageData(rawImage as Parameters<typeof unwrapImageData>[0]);
  if (!imageData?.width || !imageData?.height) return null;
  return makeThumbnail(imageData);
}

/** Transform body */
const TransformBody: FC<{
  params: Record<string, unknown>;
  updateNodeParams: (id: string, params: Record<string, unknown>) => void;
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
          style={{ fontSize: 9, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 3, color: '#fff', padding: '1px 3px', flex: 1, cursor: 'pointer' }}
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
          {execW && execH && (
            <span className="dcn-preview-badge">{execW}×{execH}</span>
          )}
        </div>
      )}
    </div>
  );
};

/** ApplyMask body */
const ApplyMaskBody: FC<{
  params: Record<string, unknown>;
  updateNodeParams: (id: string, params: Record<string, unknown>) => void;
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
        style={{ fontSize: 9, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 3, color: '#fff', padding: '1px 3px', cursor: 'pointer' }}
        value={maskType}
        onChange={(e) => updateNodeParams(nodeId, { ...params, maskType: e.target.value })}
      >
        <option value="alpha">Alpha Channel</option>
        <option value="brightness">Brightness</option>
        <option value="luminance">Luminance</option>
      </select>
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        <input
          type="range" min={0} max={255} step={1} value={threshold}
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
          {execW && execH && (
            <span className="dcn-preview-badge">{execW}×{execH}</span>
          )}
        </div>
      )}
    </div>
  );
};

/** Composite body */
const CompositeBody: FC<{
  params: Record<string, unknown>;
  updateNodeParams: (id: string, params: Record<string, unknown>) => void;
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
        style={{ fontSize: 9, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 3, color: '#fff', padding: '1px 3px', cursor: 'pointer' }}
        value={blendMode}
        onChange={(e) => updateNodeParams(nodeId, { ...params, blendMode: e.target.value })}
      >
        {['normal','multiply','screen','overlay','darken','lighten','color-dodge','color-burn','hard-light','soft-light','difference','exclusion'].map(m => (
          <option key={m} value={m}>{m}</option>
        ))}
      </select>
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        <input
          type="range" min={0} max={1} step={0.01} value={opacity}
          className="dcn-input-slider"
          style={{ flex: 1, height: 3, accentColor: '#8b5cf6' }}
          onChange={(e) => updateNodeParams(nodeId, { ...params, opacity: Number(e.target.value) })}
        />
        <span style={{ fontSize: 9, color: '#8b5cf6', minWidth: 32, textAlign: 'right', fontFamily: 'monospace' }}>{Math.round(opacity * 100)}%</span>
      </div>
      {thumb && (
        <div className="dcn-preview" data-preview onClick={onShowPreview}>
          <img src={thumb} alt="preview" className="dcn-preview-img" />
          {execW && execH && (
            <span className="dcn-preview-badge">{execW}×{execH}</span>
          )}
        </div>
      )}
    </div>
  );
};

/** Export body */
const ExportBody: FC<{
  executionResult: CanvasNodeData['executionResult'];
  onShowPreview: () => void;
}> = ({ executionResult, onShowPreview }) => {
  const ready = !!executionResult;

  // Get preview URL directly from execution result
  const previewUrl = executionResult?.['previewUrl'] as string | undefined;
  const execW = executionResult?.['width'] as number | undefined;
  const execH = executionResult?.['height'] as number | undefined;

  // Preview area - shows image or placeholder
  if (previewUrl) {
    return (
      <div className="dcn-preview" data-preview onClick={onShowPreview}>
        <img src={previewUrl} alt="Preview" className="dcn-preview-img" />
        {execW && execH && (
          <span className="dcn-preview-badge">{execW}×{execH}</span>
        )}
      </div>
    );
  }

  return (
    <div className="dcn-preview-placeholder">
      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>预览区域</span>
      <span style={{ fontSize: 9, color: ready ? '#4ade80' : 'rgba(255,255,255,0.3)' }}>{ready ? '就绪' : '待执行'}</span>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Port row renderers (embedded handle in body row)
// ---------------------------------------------------------------------------

/** Input port row — Handle embedded on the left inside the body */
const InputPortRow: FC<{ portId: string; portName: string; dataType: PortDataType }> = ({
  portId,
  portName,
  dataType,
}) => {
  const portColor = PORT_TYPE_COLORS[dataType] ?? '#6b7280';
  const typeInfo = getPortTypeStyle(dataType);

  return (
    <div className="dcn-port-row dcn-port-row--input">
      {/* Embedded target Handle — ComfyUI style, left edge */}
      <Handle
        type="target"
        position={Position.Left}
        id={portId}
        title={`${portName} [${typeInfo.shortLabel}]`}
        className="react-flow__handle-comfy"
        style={{ backgroundColor: portColor, color: portColor }}
      />
      {/* Port label on the right */}
      <span className="dcn-port-label">{portName}</span>
    </div>
  );
};

/** Output port row — Handle embedded on the right */
const OutputPortRow: FC<{ portId: string; portName: string; dataType: PortDataType }> = ({
  portId,
  portName,
  dataType,
}) => {
  const portColor = PORT_TYPE_COLORS[dataType] ?? '#6b7280';
  const typeInfo = getPortTypeStyle(dataType);

  return (
    <div className="dcn-port-row dcn-port-row--output">
      {/* Embedded source Handle — ComfyUI style, right edge */}
      <Handle
        type="source"
        position={Position.Right}
        id={portId}
        title={`${portName} [${typeInfo.shortLabel}]`}
        className="react-flow__handle-comfy"
        style={{ backgroundColor: portColor, color: portColor }}
      />
      {/* Port label on the left */}
      <span className="dcn-port-label">{portName}</span>
    </div>
  );
};

/** Paired port row — Input on left, Output on right, aligned by index */
const PairedPortRow: FC<{
  input?: { portId: string; portName: string; dataType: PortDataType };
  output?: { portId: string; portName: string; dataType: PortDataType };
}> = ({ input, output }) => {
  const inputColor = input ? (PORT_TYPE_COLORS[input.dataType] ?? '#6b7280') : '#6b7280';
  const outputColor = output ? (PORT_TYPE_COLORS[output.dataType] ?? '#6b7280') : '#6b7280';
  const inputTypeInfo = input ? getPortTypeStyle(input.dataType) : null;
  const outputTypeInfo = output ? getPortTypeStyle(output.dataType) : null;

  return (
    <div className="dcn-port-row dcn-port-row--paired">
      {/* Left side: Input */}
      <div className="dcn-port-side dcn-port-side--left">
        {input ? (
          <>
            <Handle
              type="target"
              position={Position.Left}
              id={input.portId}
              title={`${input.portName} [${inputTypeInfo?.shortLabel ?? ''}]`}
              className="react-flow__handle-comfy"
              style={{ backgroundColor: inputColor, color: inputColor }}
            />
            <span className="dcn-port-label">{input.portName}</span>
          </>
        ) : (
          <span className="dcn-port-placeholder" />
        )}
      </div>
      {/* Right side: Output */}
      <div className="dcn-port-side dcn-port-side--right">
        {output ? (
          <>
            <span className="dcn-port-label">{output.portName}</span>
            <Handle
              type="source"
              position={Position.Right}
              id={output.portId}
              title={`${output.portName} [${outputTypeInfo?.shortLabel ?? ''}]`}
              className="react-flow__handle-comfy"
              style={{ backgroundColor: outputColor, color: outputColor }}
            />
          </>
        ) : (
          <span className="dcn-port-placeholder" />
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main PrismNode component
// ---------------------------------------------------------------------------

export const PrismNode: FC<NodeProps<PrismNodeType>> = ({ id, data, selected }) => {
  const params = data.params ?? {};
  const definition = data.definition;
  const label = data.label ?? data.nodeType ?? 'Unknown';
  const currentNodeId = useCanvasStore((s) => s._currentNodeId);
  const updateNodeParams = useCanvasStore((s) => s.updateNodeParams);

  // Execution status derived from canvas state
  const execStatus: 'idle' | 'running' | 'done' | 'error' = data.executionError
    ? 'error'
    : data.executionResult
    ? 'done'
    : currentNodeId === id
    ? 'running'
    : 'idle';

  // Category color for header and selected border
  const categoryColor = definition
    ? (CATEGORY_COLORS[definition.category] ?? '#6b7280')
    : '#6b7280';

  // Image file value from params
  const imageFileValue = params['imageFile'] as ImageFileValue | undefined;
  const maskFileValue = params['maskFile'] as ImageFileValue | undefined;

  // Find the primary image output port key for thumbnail/preview
  const execImageKey = definition?.outputs.find(
    (o) => o.type === 'image' || o.type === 'mask'
  )?.id;

  const executionThumbnail = useExecutionThumbnail(data.executionResult, execImageKey);
  const previewImage = usePreviewImage(imageFileValue, data.executionResult, execImageKey);

  // Param summary
  const paramSummary = useMemo(() => {
    if (!definition?.params) return [];
    return definition.params
      .filter((p) => {
        const val = params[p.id];
        return val !== undefined && val !== '' && val !== null && val !== p.default;
      })
      .slice(0, 3)
      .map((p) => ({ label: p.name, value: params[p.id] }));
  }, [definition, params]);

  // Merged ports — extraInputs/extraOutputs come from canvasStore instance data
  const allInputs = useMemo(
    () => [...(definition?.inputs ?? []), ...(data.extraInputs ?? [])],
    [definition, data.extraInputs]
  );
  const allOutputs = useMemo(
    () => [...(definition?.outputs ?? []), ...(data.extraOutputs ?? [])],
    [definition, data.extraOutputs]
  );

  // Preview modal state
  const [showPreview, setShowPreview] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(label);

  const handleTitleClick = useCallback(() => {
    setTitleValue(label);
    setIsEditingTitle(true);
  }, [label]);

  const handleTitleBlur = useCallback(() => {
    setIsEditingTitle(false);
  }, []);

  const handleTitleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' || e.key === 'Escape') {
        (e.target as HTMLInputElement).blur();
      }
    },
    []
  );

  // Image node flag
  const isImageNode =
    definition?.outputs?.some((o) => o.type === 'image' || o.type === 'mask') ?? false;

  const hasInputs = allInputs.length > 0;
  const hasOutputs = allOutputs.length > 0;
  const hasBodyContent =
    data.nodeType === 'load-image' ||
    data.nodeType === 'load-mask' ||
    data.nodeType === 'transform' ||
    data.nodeType === 'apply-mask' ||
    data.nodeType === 'composite' ||
    data.nodeType === 'export' ||
    paramSummary.length > 0 ||
    !!executionThumbnail;

  // Determine which sections to show
  // Show divider between Ports (inputs + outputs) and Widgets area
  const hasAnyPorts = allInputs.length > 0 || allOutputs.length > 0;
  const showPortDivider = hasAnyPorts && (hasBodyContent || hasOutputs);

  // Build paired port rows: align inputs and outputs by index
  // Row i: input[i] on left, output[i] on right
  // Extra ports (when counts don't match) go below as unpaired rows
  const maxPorts = Math.max(allInputs.length, allOutputs.length);
  const pairedRows: Array<{
    input?: (typeof allInputs)[0];
    output?: (typeof allOutputs)[0];
  }> = [];
  const unpairedInputs: typeof allInputs = [];
  const unpairedOutputs: typeof allOutputs = [];

  for (let i = 0; i < maxPorts; i++) {
    const inp = allInputs[i];
    const out = allOutputs[i];
    if (inp && out) {
      pairedRows.push({ input: inp, output: out });
    } else if (inp) {
      unpairedInputs.push(inp);
    } else if (out) {
      unpairedOutputs.push(out);
    }
  }

  return (
    <>
      <div
        className={[
          'dcn-node',
          'prism-node',
          `dcn-node--${execStatus}`,
          selected ? 'dcn-node--selected' : '',
          data.minimized ? 'dcn-node--minimized' : '',
          data.bypassed ? 'dcn-node--bypassed' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        data-node-id={id}
        style={{
          '--node-color': categoryColor,
        } as React.CSSProperties}
      >
        {/* ── Header ── */}
        <div className={`dcn-header dcn-header--cat-${definition?.category ?? 'default'}`}>
        <span className={`dcn-status-dot ${STATUS_DOT_CLASS[execStatus]}`} />

        {isEditingTitle ? (
          <input
            className="dcn-title"
            style={{
              background: 'rgba(0,0,0,0.2)',
              border: 'none',
              outline: 'none',
              color: 'rgba(255,255,255,0.95)',
              padding: '0 2px',
              width: '100%',
            }}
            value={titleValue}
            onChange={(e) => setTitleValue(e.target.value)}
            onBlur={handleTitleBlur}
            onKeyDown={handleTitleKeyDown}
            autoFocus
          />
        ) : (
          <span
            className="dcn-title"
            onDoubleClick={handleTitleClick}
            title="双击修改别名"
          >
            {label}
          </span>
        )}

        <div className="dcn-header-actions">
          <button
            className="dcn-header-btn"
            title="节点菜单"
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            ≡
          </button>
        </div>
      </div>

      {/* ── Body — ComfyUI-style embedded port rows ── */}
      <div className="dcn-body">
        {/* Error banner */}
        {data.executionError && (
          <div className="dcn-error" title={data.executionError}>
            <AlertTriangle size={11} className="dcn-error-icon" />
            <span className="dcn-error-msg">
              {data.executionError.length > 40
                ? data.executionError.slice(0, 40) + '…'
                : data.executionError}
            </span>
          </div>
        )}

        {/* Paired port rows — inputs and outputs aligned by index */}
        {pairedRows.map((row, idx) => (
          <PairedPortRow
            key={`paired-${idx}`}
            input={row.input ? { portId: row.input.id, portName: row.input.name, dataType: row.input.dataType as PortDataType } : undefined}
            output={row.output ? { portId: row.output.id, portName: row.output.name, dataType: row.output.dataType as PortDataType } : undefined}
          />
        ))}

        {/* Unpaired inputs (extra rows below when inputs > outputs) */}
        {unpairedInputs.map((input) => (
          <InputPortRow
            key={input.id}
            portId={input.id}
            portName={input.name}
            dataType={input.dataType as PortDataType}
          />
        ))}

        {/* Unpaired outputs (extra rows below when outputs > inputs) */}
        {unpairedOutputs.map((output) => (
          <OutputPortRow
            key={output.id}
            portId={output.id}
            portName={output.name}
            dataType={output.dataType as PortDataType}
          />
        ))}

        {/* Divider between Ports section and Widgets area */}
        {showPortDivider && <div className="dcn-section-divider" />}

        {/* Specialized body content — Widgets section */}
        {data.nodeType === 'load-image' && (
          <LoadImageBody
            imageFileValue={imageFileValue}
            params={params}
            updateNodeParams={updateNodeParams}
            nodeId={id}
            executionResult={data.executionResult}
            onShowPreview={() => setShowPreview(true)}
          />
        )}

        {data.nodeType === 'load-mask' && (
          <LoadMaskBody
            maskFileValue={maskFileValue}
            params={params}
            updateNodeParams={updateNodeParams}
            nodeId={id}
            executionResult={data.executionResult}
            onShowPreview={() => setShowPreview(true)}
          />
        )}

        {data.nodeType === 'transform' && (
          <TransformBody
            params={params}
            updateNodeParams={updateNodeParams}
            nodeId={id}
            executionResult={data.executionResult}
            onShowPreview={() => setShowPreview(true)}
          />
        )}

        {data.nodeType === 'apply-mask' && (
          <ApplyMaskBody
            params={params}
            updateNodeParams={updateNodeParams}
            nodeId={id}
            executionResult={data.executionResult}
            onShowPreview={() => setShowPreview(true)}
          />
        )}

        {data.nodeType === 'composite' && (
          <CompositeBody
            params={params}
            updateNodeParams={updateNodeParams}
            nodeId={id}
            executionResult={data.executionResult}
            onShowPreview={() => setShowPreview(true)}
          />
        )}

        {data.nodeType === 'export' && (
          <ExportBody
            executionResult={data.executionResult}
            onShowPreview={() => setShowPreview(true)}
          />
        )}

        {/* Generic fallback: param chips + thumbnail */}
        {![
          'load-image','transform','apply-mask','composite','export'
        ].includes(data.nodeType) && (
          <>
            {paramSummary.length > 0 && (
              <div className="dcn-params">
                {paramSummary.map((p) => (
                  <span key={p.label} className="dcn-param-chip">
                    {p.label}: {String(p.value)}
                  </span>
                ))}
              </div>
            )}
            {executionThumbnail && (
              <div
                className="dcn-preview"
                onClick={() => setShowPreview(true)}
              >
                <img
                  src={executionThumbnail.dataUrl}
                  alt="输出预览"
                  className="dcn-preview-img"
                />
                <span className="dcn-preview-badge">
                  {executionThumbnail.width}×{executionThumbnail.height}
                </span>
              </div>
            )}
          </>
        )}

      </div>

      {/* Preview modal */}
      {showPreview && previewImage && (
        <NodePreviewModal
          imageUrl={previewImage}
          nodeLabel={label}
          portName={
            definition?.outputs.find((o) => o.type === 'image' || o.type === 'mask')?.name ??
            '输出'
          }
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  </>
);
};

PrismNode.displayName = 'PrismNode';
