// PrismNodeControls - Specialized body content renderers per node type
// Part of the PrismNode split (openspec/changes/codebase-cleanup/design.md §Decision 6)

import React, { type FC, useState, useRef } from 'react';
import { Upload } from 'lucide-react';
import type { CanvasNodeData } from '../../modules/editor/stores/types';
import { setDragImageState, getDragImageState, type DragState } from './PrismNodeControls/dragImageState';
import { getExecThumb } from './PrismNodeControls/imageThumbnails';
import { useImageFilePreview, processImageFile, type ImageFileValue } from '../../hooks/useImageFilePreview';

// Re-export types and helpers for backward compatibility with PrismNode.tsx
export { setDragImageState, getDragImageState };
export type { DragState } from './PrismNodeControls/dragImageState';

// ─── Shared file upload dropzone component ──────────────────────────────────────

interface FileDropzoneProps {
  label: string;
  previewUrl: string | null;
  displayWidth?: number;
  displayHeight?: number;
  fileName?: string;
  isDragOver: boolean;
  onDragEnter: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onUploadClick: () => void;
  onFileChange: (file: File) => void;
  dropLabel: string;
}

const FileDropzone: FC<FileDropzoneProps> = ({
  label,
  previewUrl,
  displayWidth,
  displayHeight,
  fileName,
  isDragOver,
  onDragEnter,
  onDragLeave,
  onDragOver,
  onDrop,
  onUploadClick,
  onFileChange,
  dropLabel,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  if (previewUrl) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div className="dcn-file-info">
          <span className="dcn-file-name" title={fileName}>{fileName ?? label}</span>
        </div>
        <div
          className={`dcn-preview ${isDragOver ? 'dcn-preview-drag-over' : ''}`}
          data-preview
          onDragEnter={onDragEnter}
          onDragLeave={onDragLeave}
          onDragOver={onDragOver}
          onDrop={onDrop}
        >
          <img src={previewUrl} alt="Preview" className="dcn-preview-img" />
          {displayWidth && displayHeight && <span className="dcn-preview-badge">{displayWidth}×{displayHeight}</span>}
          {isDragOver && <div className="dcn-preview-drop-overlay"><span>{dropLabel}</span></div>}
        </div>
        <button
          className="image-file-upload-btn"
          style={{ fontSize: 10, padding: '3px 6px' }}
          onClick={onUploadClick}
        >
          替换{label}
          <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onFileChange(file);
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
      onClick={onUploadClick}
      title={`点击上传或拖放${label}`}
    >
      <Upload size={13} className="dcn-dropzone-icon" />
      <span>上传{label}</span>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFileChange(file);
          e.target.value = '';
        }}
      />
    </div>
  );
};

// ─── Specialized body renderers ──────────────────────────────────────────────

/** LoadImage body — file name + upload button + preview + resolution + replace */
export const LoadImageBody: FC<{
  imageFileValue: ImageFileValue | undefined;
  params: Record<string, unknown>;
  updateNodeParams: (_id: string, _params: Record<string, unknown>) => void;
  nodeId: string;
  executionResult: CanvasNodeData['executionResult'];
  onShowPreview: () => void;
}> = ({ imageFileValue, params, updateNodeParams, nodeId, executionResult }) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const { previewUrl, displayWidth, displayHeight, fileName } = useImageFilePreview(
    imageFileValue,
    executionResult,
    'image'
  );

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
      processImageFile(file).then((result) => {
        updateNodeParams(nodeId, { ...params, imageFile: result });
      });
    }
  };

  const handleUploadClick = () => {
    // Find the hidden input and click it
    const container = document.querySelector(`[data-node-id="${nodeId}"]`);
    const input = container?.querySelector('input[type="file"]') as HTMLInputElement | null;
    input?.click();
  };

  const handleFileChange = (file: File) => {
    processImageFile(file).then((result) => {
      updateNodeParams(nodeId, { ...params, imageFile: result });
    });
  };

  return (
    <FileDropzone
      label="图片"
      previewUrl={previewUrl}
      displayWidth={displayWidth}
      displayHeight={displayHeight}
      fileName={fileName}
      isDragOver={isDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onUploadClick={handleUploadClick}
      onFileChange={handleFileChange}
      dropLabel="拖放替换图片"
    />
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
}> = ({ maskFileValue, params, updateNodeParams, nodeId, executionResult }) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const { previewUrl, displayWidth, displayHeight, fileName } = useImageFilePreview(
    maskFileValue,
    executionResult,
    'mask'
  );

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
      processImageFile(file).then((result) => {
        updateNodeParams(nodeId, { ...params, maskFile: result });
      });
    }
  };

  const handleUploadClick = () => {
    const container = document.querySelector(`[data-node-id="${nodeId}"]`);
    const input = container?.querySelector('input[type="file"]') as HTMLInputElement | null;
    input?.click();
  };

  const handleFileChange = (file: File) => {
    processImageFile(file).then((result) => {
      updateNodeParams(nodeId, { ...params, maskFile: result });
    });
  };

  return (
    <FileDropzone
      label="遮罩"
      previewUrl={previewUrl}
      displayWidth={displayWidth}
      displayHeight={displayHeight}
      fileName={fileName}
      isDragOver={isDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onUploadClick={handleUploadClick}
      onFileChange={handleFileChange}
      dropLabel="拖放替换遮罩"
    />
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
