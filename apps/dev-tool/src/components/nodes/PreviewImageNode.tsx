// PreviewImageNode — specialized node component for Preview Image nodes
//
// Design spec: openspec/changes/node-editor-comfyui-refactor/design.md
// Section 8: Preview Image node
//
// Features:
// - Large image preview (object-fit: contain)
// - Resolution label (W × H)
// - Resize handle in bottom-right corner
// - No inline controls (pure preview node)
// - Output port passthroughs input image

import React, { type FC, useMemo, useState } from 'react';
import {
  Handle,
  Position,
  NodeResizer,
  type NodeProps,
  type Node,
} from '@xyflow/react';
import { useCanvasStore } from '../../store/canvasStore';
import type { CanvasNodeData } from '../../store/canvasStore';
import { PORT_TYPE_COLORS } from '../../utils/portTypeStyles';
import {
  unwrapImageData,
  unwrapPreviewUrl,
} from '@prism/shared-types';
import { NodePreviewModal } from '../canvas/NodePreviewModal';

const STATUS_DOT_CLASS: Record<string, string> = {
  idle:    'dcn-status-dot--idle',
  running: 'dcn-status-dot--running',
  done:    'dcn-status-dot--done',
  error:   'dcn-status-dot--error',
};

interface PreviewImageNodeData extends CanvasNodeData {}

type PreviewImageNodeType = Node<PreviewImageNodeData, 'previewImageNode'>;

export const PreviewImageNode: FC<NodeProps<PreviewImageNodeType>> = ({
  id,
  data,
  selected,
}) => {
  const params = data.params ?? {};
  const label = data.label ?? 'Preview Image';
  const definition = data.definition;
  const currentNodeId = useCanvasStore((s) => s._currentNodeId);

  const execStatus: 'idle' | 'running' | 'done' | 'error' = data.executionError
    ? 'error'
    : data.executionResult
    ? 'done'
    : currentNodeId === id
    ? 'running'
    : 'idle';

  // Image from execution result — supports both old (ImageData) and new (ImageRuntimeObject)
  const resultImage = useMemo(() => {
    if (!data.executionResult) return null;
    const rawImage = data.executionResult['image'];
    return unwrapImageData(rawImage as Parameters<typeof unwrapImageData>[0]) ?? null;
  }, [data.executionResult]);

  // Full-size preview URL — use previewUrl directly when available
  const previewDataUrl = useMemo(() => {
    if (!data.executionResult) return null;
    const rawImage = data.executionResult['image'];
    const pUrl = unwrapPreviewUrl(rawImage as Parameters<typeof unwrapPreviewUrl>[0], undefined);
    if (pUrl) return pUrl;
    if (!resultImage) return null;
    try {
      const MAX = 1200;
      const scale = Math.min(1, MAX / Math.max(resultImage.width, resultImage.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(resultImage.width * scale);
      canvas.height = Math.round(resultImage.height * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      ctx.imageSmoothingEnabled = false;
      const tmp = document.createElement('canvas');
      tmp.width = resultImage.width;
      tmp.height = resultImage.height;
      const tmpCtx = tmp.getContext('2d');
      if (!tmpCtx) return null;
      tmpCtx.putImageData(resultImage, 0, 0);
      ctx.drawImage(tmp, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/png');
    } catch {
      return null;
    }
  }, [resultImage]);

  // Inline thumbnail — cap at 400px so CSS up-scaling stays under 1.5×
  // (240px node / 400px canvas ≈ 0.6× down-scale, smooth; 2048 image → 400px)
  const thumbnail = useMemo(() => {
    if (!resultImage) return null;
    try {
      const MAX = 400;
      const scale = Math.min(1, MAX / Math.max(resultImage.width, resultImage.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(resultImage.width * scale);
      canvas.height = Math.round(resultImage.height * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      // Enable smoothing for down-scaling large images to avoid harsh pixelation
      ctx.imageSmoothingEnabled = scale < 1;
      ctx.imageSmoothingQuality = 'high';
      const tmp = document.createElement('canvas');
      tmp.width = resultImage.width;
      tmp.height = resultImage.height;
      const tmpCtx = tmp.getContext('2d');
      if (!tmpCtx) return null;
      tmpCtx.putImageData(resultImage, 0, 0);
      ctx.drawImage(tmp, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/png');
    } catch {
      return null;
    }
  }, [resultImage]);

  const [showPreview, setShowPreview] = useState(false);

  const categoryColor = '#ef4444'; // OUTPUT category

  return (
    <div
      className={[
        'dcn-node',
        'dcn-node--preview-image',
        `dcn-node--${execStatus}`,
        selected ? 'dcn-node--selected' : '',
        data.minimized ? 'dcn-node--minimized' : '',
        data.bypassed ? 'dcn-node--bypassed' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ '--node-color': categoryColor } as React.CSSProperties}
    >
      {/* Resize handle — always shown */}
      <NodeResizer
        minWidth={160}
        minHeight={100}
        maxWidth={800}
        maxHeight={600}
        handleStyle={{
          backgroundColor: categoryColor,
          borderRadius: '2px',
          width: 10,
          height: 10,
        }}
        lineStyle={{ borderColor: categoryColor }}
        isVisible={selected}
      />

      {/* ── Header ── */}
      <div className={`dcn-header dcn-header--cat-output`}>
        <span className={`dcn-status-dot ${STATUS_DOT_CLASS[execStatus]}`} />
        <span className="dcn-title">{label}</span>
      </div>

      {/* ── Left input port ── */}
      <div className="dcn-ports-left">
        <div className="dcn-port dcn-port--left">
          <Handle
            type="target"
            position={Position.Left}
            id="image"
            title="Image [🖼]"
            className="dcn-port-handle"
            style={{
              backgroundColor: '#3b82f6',
              borderColor: '#3b82f6',
            }}
          />
        </div>
      </div>

      {/* ── Preview area ── */}
      <div className="dcn-body dcn-preview-area">
        {resultImage ? (
          <div
            className="dcn-preview dcn-preview--clickable dcn-preview--full"
            style={{ cursor: 'zoom-in' }}
            onClick={() => setShowPreview(true)}
          >
            <img
              src={thumbnail ?? ''}
              alt="Preview"
              className="dcn-preview-img"
              style={{ maxHeight: 350 }}
            />
          </div>
        ) : (
          <div className="dcn-preview-placeholder">
            <span style={{ fontSize: 28, opacity: 0.4 }}>🖼</span>
            <span style={{ fontSize: 10, opacity: 0.5, color: 'rgba(255,255,255,0.5)' }}>
              连接图像节点
            </span>
          </div>
        )}
      </div>

      {/* ── Right output port (passthrough) ── */}
      <div className="dcn-ports-right">
        <div className="dcn-port dcn-port--right">
          {thumbnail && (
            <div className="dcn-output-thumb" title="输出预览">
              <img src={thumbnail} alt="output" />
            </div>
          )}
          <Handle
            type="source"
            position={Position.Right}
            id="image"
            title="Image [🖼]"
            className="dcn-port-handle"
            style={{
              backgroundColor: '#3b82f6',
              borderColor: '#3b82f6',
            }}
          />
        </div>
      </div>

      {/* ── Resolution label ── */}
      {resultImage && (
        <div className="dcn-preview-badge" style={{ bottom: 4, right: 20, position: 'absolute' }}>
          {resultImage.width}×{resultImage.height}
        </div>
      )}

      {/* Preview modal */}
      {showPreview && previewDataUrl && (
        <NodePreviewModal
          imageUrl={previewDataUrl}
          nodeLabel={label}
          portName="Image"
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
};

PreviewImageNode.displayName = 'PreviewImageNode';
