// Custom Prism node component for React Flow
//
// ComfyUI-Inspired Dense Control Node — embedded port handles in body rows.
// Design spec: openspec/changes/node-editor-comfyui-refactor/design.md
//
// Mandatory Rule R1: port IDs must be consistent across:
//   NodeDefinition.port.id = Handle.id = edge sourceHandleId/targetHandleId
//   = ctx.requireInput key = executor output key
//
// Split into sub-components (openspec/changes/codebase-cleanup/design.md §Decision 6):
//   PrismNodeHeader.tsx   — title bar, status dot, category color
//   PrismNodePorts.tsx    — Input/Output/Paired port row renderers
//   PrismNodeControls.tsx — specialized body content per node type
//   PrismNode.tsx         — main component (composes the above)

import React, { type FC, useMemo, useState } from 'react';
import { type NodeProps } from '@xyflow/react';
import { useCanvasStore } from '../../store/canvasStore';
import type { CanvasNodeData } from '../../store/canvasStore';
import { NodePreviewModal } from '../canvas/NodePreviewModal';
import type { PortDataType } from '@prism/shared-types';
import { PrismNodeHeader, CATEGORY_COLORS } from './PrismNodeHeader';
import { InputPortRow, OutputPortRow, PairedPortRow } from './PrismNodePorts';
import {
  LoadImageBody,
  LoadMaskBody,
  TransformBody,
  ApplyMaskBody,
  CompositeBody,
  ExportBody,
  useExecutionThumbnail,
  usePreviewImage,
  setDragImageState,
  getDragImageState,
} from './PrismNodeControls';
import { AlertTriangle } from 'lucide-react';

interface PrismNodeProps extends Omit<NodeProps, 'data'> {
  data: CanvasNodeData;
}

// ---------------------------------------------------------------------------
// Main PrismNode component
// ---------------------------------------------------------------------------

export const PrismNode: FC<PrismNodeProps> = ({ id, data, selected }) => {
  const params = data.params ?? {};
  const definition = data.definition;
  const label = data.label ?? data.nodeType ?? 'Unknown';
  const updateNodeParams = useCanvasStore((s) => s.updateNodeParams);

  // Execution status derived from node data (not global store)
  // This prevents unnecessary re-renders of all nodes when any node executes
  const execStatus: 'idle' | 'running' | 'done' | 'error' = data.executionError
    ? 'error'
    : data.executionResult
    ? 'done'
    : data._executingNodeId === id
    ? 'running'
    : 'idle';

  // Category color for header and selected border
  const categoryColor = definition
    ? (CATEGORY_COLORS[definition.category] ?? '#6b7280')
    : '#6b7280';

  // Image file value from params
  const imageFileValue = params['imageFile'] as { dataUrl: string; width: number; height: number; fileName: string } | undefined;
  const maskFileValue = params['maskFile'] as { dataUrl: string; width: number; height: number; fileName: string } | undefined;

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

  // Node index badge (1-based)
  const nodeIndex = parseInt(id.replace('node-', ''), 10);

  // Build paired port rows: align inputs and outputs by index
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

  const hasBodyContent =
    data.nodeType === 'load-image' ||
    data.nodeType === 'load-mask' ||
    data.nodeType === 'transform' ||
    data.nodeType === 'apply-mask' ||
    data.nodeType === 'composite' ||
    data.nodeType === 'export' ||
    paramSummary.length > 0 ||
    !!executionThumbnail;

  const hasAnyPorts = allInputs.length > 0 || allOutputs.length > 0;
  const showPortDivider = hasAnyPorts && (hasBodyContent || allOutputs.length > 0);

  return (
    <div className="dcn-node-wrapper">
      {/* ── Node index badge — floats outside top-right of node box ── */}
      <span className="dcn-node-index" title={`节点 #${nodeIndex}`}>
        #{nodeIndex}
      </span>

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
        {/* ── Node index badge — outside top-right corner ── */}
        <span className="dcn-node-index" title={`节点 #${nodeIndex}`}>
          #{nodeIndex}
        </span>

        {/* ── Header ── */}
        <PrismNodeHeader
          label={label}
          execStatus={execStatus}
          categoryColor={categoryColor}
          definition={definition}
        />

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

          {/* Paired port rows */}
          {pairedRows.map((row, idx) => (
            <PairedPortRow
              key={`paired-${idx}`}
              input={row.input ? { portId: row.input.id, portName: row.input.name, dataType: row.input.dataType as PortDataType } : undefined}
              output={row.output ? { portId: row.output.id, portName: row.output.name, dataType: row.output.dataType as PortDataType } : undefined}
            />
          ))}

          {/* Unpaired inputs */}
          {unpairedInputs.map((input) => (
            <InputPortRow
              key={input.id}
              portId={input.id}
              portName={input.name}
              dataType={input.dataType as PortDataType}
            />
          ))}

          {/* Unpaired outputs */}
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
            'load-image',
            'load-mask',
            'transform',
            'apply-mask',
            'composite',
            'export',
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
    </div>
  );
};

PrismNode.displayName = 'PrismNode';

// Re-export drag state utilities for WorkflowCanvas and other consumers
export { setDragImageState, getDragImageState };
export type { DragState } from './PrismNodeControls';
