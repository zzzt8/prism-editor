// PublishDialog - configure and publish a workflow for the user-facing app
//
// Refactored v3:
// - Manual selection: developer explicitly toggles which nodes are exposed as user inputs.
// - Each candidate shows: node name, type badge, toggle checkbox, and X to remove.
// - Only toggled nodes appear in the published inputs and require a user-facing label.
// - Un-selected nodes keep their built-in test data in the workflow.

import React, { useState, useMemo, useCallback } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import type { CanvasNode } from '../../store/canvasStore';
import { usePublishStore } from '../../modules/editor/stores/publishSlice';
import type { ParamControlType } from '@prism/shared-types';
import { createId } from '@prism/shared-types';
import type {
  PublishedWorkflow,
  PublishedInput,
  PublishedOutput,
  PublishedInputConfig,
  PublishedParamConfig,
  PublishedOutputConfig,
  ExportFormat,
  PublishedParamDefinition,
} from '@prism/shared-types';
import { Check, Copy, Download, Upload, X, Plus, ChevronDown, ChevronRight, Pencil, CircleDot, Eye, EyeOff, Lock } from 'lucide-react';
import { copyWorkflowToClipboard, downloadWorkflowAsFile } from '../../utils/workflowExport';
import { inferControlType, inferOptions } from '../../modules/editor/mappers/workflowToPublished';
import { useAuthStore } from '../../store/authStore';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

const CHANNEL_NAME = 'prism-publish-channel';

/** Source-only nodes (no incoming edges) — the only sensible user-upload entry points. */
function getInputCandidateNodes(
  nodes: CanvasNode[],
  edges: ReturnType<typeof useCanvasStore.getState>['edges']
): CanvasNode[] {
  const withIncoming = nodesWithIncomingEdges(edges);
  return nodes.filter((n) => n.data.definition != null && !withIncoming.has(n.id));
}

/** Build a set of node IDs that appear as a source (have at least one incoming edge) */
function nodesWithIncomingEdges(edges: ReturnType<typeof useCanvasStore.getState>['edges']): Set<string> {
  const s = new Set<string>();
  for (const e of edges) s.add(e.target);
  return s;
}

/** Build a set of node IDs that appear as a target (have at least one outgoing edge) */
function nodesWithOutgoingEdges(edges: ReturnType<typeof useCanvasStore.getState>['edges']): Set<string> {
  const s = new Set<string>();
  for (const e of edges) s.add(e.source);
  return s;
}

/** Infer output nodes: export nodes first; fallback to leaf nodes. */
export function inferOutputNodes(
  nodes: CanvasNode[],
  edges: ReturnType<typeof useCanvasStore.getState>['edges']
): CanvasNode[] {
  const exportNodes = nodes.filter((n) => n.data.definition && n.data.nodeType === 'export');
  if (exportNodes.length > 0) return exportNodes;
  const hasOutgoing = nodesWithOutgoingEdges(edges);
  return nodes.filter((n) => n.data.definition && !hasOutgoing.has(n.id));
}

/** Strip base64 dataUrl from imageFile/maskFile params — we only need metadata (dimensions, filename).
 *
 *  IMPORTANT: only strip the dataUrl for nodes that are NOT selected as user-input sources.
 *  For nodes exposed as user inputs, the user provides the URL at runtime via mergedParams.url
 *  (injected by PublishedWorkflowExecutor.reconstruct()). Those nodes still get their dataUrl
 *  cleaned because we never store large blobs in published config.
 *
 *  For non-user-input load-image/load-mask nodes, the developer already set the dataUrl
 *  (via dev-tool UI), and it should be preserved so the executor can read it.
 *  We still strip the actual base64 string — but for load-image/load-mask, we do NOT strip
 *  the dataUrl here; instead we rely on the executor's normal priority chain:
 *    imageFile.dataUrl → params.url → params.blob
 *  Since we're not stripping it, the executor falls back to params.url if imageFile is empty.
 *
 *  Wait — we DO strip it for ALL nodes (to keep published workflows small).
 *  The executor's `params.url` fallback is set by PublishedWorkflowExecutor.reconstruct()
 *  for nodes that ARE user inputs (injected from inputValues). For nodes that are NOT
 *  user inputs, we need to preserve the URL so the executor can load it.
 *  Solution: only strip dataUrl for user-input nodes (identified by being in config.inputs).
 */
function sanitizeParamsForPublish(
  params: Record<string, unknown>,
  nodeId: string,
  isUserInputNode: boolean,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(params)) {
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      const obj = val as Record<string, unknown>;
      if ('dataUrl' in obj) {
        if (isUserInputNode) {
          // User-input nodes get their URL injected from inputValues at runtime;
          // strip the dataUrl to keep published workflow size small.
          out[key] = {
            width: obj['width'],
            height: obj['height'],
            fileName: obj['fileName'],
          };
        } else {
          // Non-user-input nodes: preserve dataUrl so the executor can load it.
          out[key] = obj;
        }
        continue;
      }
    }
    out[key] = val;
  }
  return out;
}

/**
 * Build the PublishedConfig from the dialog's edited state.
 * Uses canvas nodeId (UUID) as stable key for nodeTypes and nodeConfigs.
 *
 * @param userInputNodes  Node IDs explicitly selected as user-facing inputs.
 */
function buildPublishedConfig(opts: {
  nodes: CanvasNode[];
  edges: ReturnType<typeof useCanvasStore.getState>['edges'];
  userInputNodes: CanvasNode[];
  inputLabels: Record<string, string>;
  outputLabels: Record<string, string>;
  outputFormats: Record<string, ExportFormat>;
  whitelist: PublishedParamConfig[];
  paramDefinitions?: PublishedParamDefinition[];
}): PublishedWorkflow['config'] {
  const { nodes, edges, userInputNodes, inputLabels, outputLabels, outputFormats, whitelist } = opts;

  const nodeConfigs: PublishedWorkflow['config']['nodeConfigs'] = {};
  const nodeTypes: Record<string, string> = {};
  const nodeIndexMap: Record<string, string> = {};

  const userInputNodeIds = new Set(userInputNodes.map((n) => n.id));

  for (const node of nodes) {
    const def = node.data.definition;
    if (!def) continue;
    const nodeKey = node.id;
    nodeIndexMap[node.id] = nodeKey;
    nodeTypes[nodeKey] = node.data.nodeType;
    nodeConfigs[nodeKey] = {
      params: sanitizeParamsForPublish(
        node.data.params,
        nodeKey,
        userInputNodeIds.has(nodeKey)
      ),
      _internalParams: {},
    };
  }

  // Convert white-list array into per-node exposed params map
  for (const entry of whitelist) {
    if (!nodeConfigs[entry.nodeId]) continue;
    const current = nodeConfigs[entry.nodeId].params[entry.paramId];
    if (current === undefined) {
      nodeConfigs[entry.nodeId].params[entry.paramId] = null;
    }
  }

  // Build PublishedInputConfig[] — only from explicitly selected nodes
  const inputs: PublishedInputConfig[] = userInputNodes.map((n) => ({
    nodeId: n.id,
    label: inputLabels[n.id] ?? '',
    type: n.data.nodeType === 'load-image' ? 'image' : n.data.nodeType === 'load-mask' ? 'mask' : 'string',
  }));

  // Build PublishedOutputConfig[]
  const outputNodes = inferOutputNodes(nodes, edges);
  const outputs: PublishedOutputConfig[] = outputNodes.map((n) => ({
    nodeId: n.id,
    label: outputLabels[n.id] ?? '',
    format: outputFormats[n.id] ?? 'png',
  }));

  return {
    connections: edges.map((e) => ({
      id: e.id,
      from: { nodeId: e.source, port: e.sourceHandle ?? 'out' },
      to: { nodeId: e.target, port: e.targetHandle ?? 'in' },
    })),
    nodeTypes,
    nodeIndexMap,
    internalParams: {},
    nodeConfigs,
    inputs,
    exposedParams: whitelist,
    outputs,
    paramDefinitions: opts.paramDefinitions,
  };
}

function broadcastPublish(pw: PublishedWorkflow) {
  try {
    const channel = new BroadcastChannel(CHANNEL_NAME);
    channel.postMessage({ type: 'workflow-published', payload: pw });
    channel.close();
  } catch {
    // BroadcastChannel not supported
  }
}

export const PublishDialog: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { nodes, edges, workflowMeta } = useCanvasStore();
  const { setParamDefinitions } = usePublishStore();

  const [publishName, setPublishName] = useState(workflowMeta.name);
  const [publishDesc, setPublishDesc] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);
  const [lastPublished, setLastPublished] = useState<PublishedWorkflow | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Derived node lists ──────────────────────────────────────────────────
  const outputNodes = useMemo(() => inferOutputNodes(nodes, edges), [nodes, edges]);

  // Only source nodes (no incoming edges) can be exposed as user uploads
  const candidateNodes = useMemo(() => getInputCandidateNodes(nodes, edges), [nodes, edges]);

  // ── User-input selection (manual toggle) ────────────────────────────────
  const [selectedInputIds, setSelectedInputIds] = useState<Set<string>>(new Set<string>());

  // ── Input labels: nodeId → developer-provided user-facing label ────────
  const [inputLabels, setInputLabels] = useState<Record<string, string>>({});

  // Drop selections that are no longer valid source nodes (e.g. graph rewired).
  React.useEffect(() => {
    const allowed = new Set(candidateNodes.map((n) => n.id));
    setSelectedInputIds((prev) => {
      const kept = [...prev].filter((id) => allowed.has(id));
      if (kept.length === prev.size && kept.every((id) => prev.has(id))) return prev;
      return new Set(kept);
    });
    setInputLabels((l) => {
      let changed = false;
      const next = { ...l };
      for (const k of Object.keys(next)) {
        if (!allowed.has(k)) {
          delete next[k];
          changed = true;
        }
      }
      return changed ? next : l;
    });
  }, [candidateNodes]);

  // ── Output labels & formats ────────────────────────────────────────────
  const [outputLabels, setOutputLabels] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const n of outputNodes) init[n.id] = '';
    return init;
  });
  const [outputFormats, setOutputFormats] = useState<Record<string, ExportFormat>>(() => {
    const init: Record<string, ExportFormat> = {};
    for (const n of outputNodes) init[n.id] = 'png';
    return init;
  });

  // ── White-list: explicitly exposed params ──────────────────────────────
  const [whitelist, setWhitelist] = useState<PublishedParamConfig[]>([]);
  // Map for O(1) lookup: "nodeId:paramId" → label (for editing)
  const [whitelistLabels, setWhitelistLabels] = useState<Record<string, string>>({});
  // Which checkboxes in the node-browser are checked
  const [browserChecked, setBrowserChecked] = useState<Record<string, boolean>>({});
  // Per-param visibility state (nodeId:paramId → visibility)
  const [paramVisibilities, setParamVisibilities] = useState<Record<string, 'visible' | 'hidden' | 'locked'>>({});
  // Per-param controlType state
  const [paramControlTypes, setParamControlTypes] = useState<Record<string, ParamControlType>>({});
  // Per-param validation expanded state
  const [validationExpanded, setValidationExpanded] = useState<Record<string, boolean>>({});

  // ── Node-browser panel toggle ──────────────────────────────────────────
  const [nodeBrowserOpen, setNodeBrowserOpen] = useState(false);
  // Inline editing of a whitelist entry
  const [editingEntryKey, setEditingEntryKey] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState('');

  // ── Toggle a node as a user input ───────────────────────────────────────
  const toggleInputNode = useCallback((nodeId: string, selected: boolean) => {
    setSelectedInputIds((prev) => {
      const next = new Set(prev);
      if (selected) { next.add(nodeId); }
      else {
        next.delete(nodeId);
        setInputLabels((l) => { const n = { ...l }; delete n[nodeId]; return n; });
      }
      return next;
    });
  }, []);

  // ── Derived: nodes currently selected as user inputs ───────────────────
  const selectedInputNodes = useMemo(
    () => candidateNodes.filter((n) => selectedInputIds.has(n.id)),
    [candidateNodes, selectedInputIds]
  );

  // Re-sync when canvas nodes change
  React.useEffect(() => {
    setOutputLabels((prev) => {
      const next: Record<string, string> = {};
      for (const n of outputNodes) next[n.id] = prev[n.id] ?? '';
      return next;
    });
    setOutputFormats((prev) => {
      const next: Record<string, ExportFormat> = {};
      for (const n of outputNodes) next[n.id] = prev[n.id] ?? 'png';
      return next;
    });
    // Prune whitelist entries whose nodes no longer exist
    const validNodeIds = new Set(nodes.map((n) => n.id));
    setWhitelist((prev) => prev.filter((e) => validNodeIds.has(e.nodeId)));
    setBrowserChecked(() => {
      const n: Record<string, boolean> = {};
      for (const e of whitelist) n[`${e.nodeId}:${e.paramId}`] = true;
      return n;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges]);

  // ── Toggle a param in the node-browser ─────────────────────────────────
  const toggleBrowserParam = (nodeId: string, paramId: string, paramName: string) => {
    const key = `${nodeId}:${paramId}`;
    const checked = browserChecked[key];
    if (checked) {
      // Un-check: remove from whitelist and labels
      setBrowserChecked((p) => { const n = { ...p }; delete n[key]; return n; });
      setWhitelist((p) => p.filter((e) => `${e.nodeId}:${e.paramId}` !== key));
      setWhitelistLabels((p) => { const n = { ...p }; delete n[key]; return n; });
      setParamVisibilities((p) => { const n = { ...p }; delete n[key]; return n; });
      setParamControlTypes((p) => { const n = { ...p }; delete n[key]; return n; });
    } else {
      // Check: add to whitelist with empty label (required before publish)
      setBrowserChecked((p) => ({ ...p, [key]: true }));
      setWhitelist((p) => [...p, { nodeId, paramId, label: '' }]);
      setWhitelistLabels((p) => ({ ...p, [key]: paramName }));
      // Initialize visibility and controlType
      setParamVisibilities((p) => ({ ...p, [key]: 'visible' }));
      // Infer controlType from paramDef (will be set below after lookup)
      const node = nodes.find((n) => n.id === nodeId);
      const paramDef = node?.data.definition?.params.find((p) => p.id === paramId);
      let inferredType: ParamControlType = 'string';
      if (paramDef) {
        if (paramDef.type === 'select') inferredType = 'select';
        else if (paramDef.type === 'boolean') inferredType = 'boolean';
        else if (paramDef.type === 'number') inferredType = 'number';
        else if (paramDef.type === 'image-file') inferredType = 'image-file';
      }
      setParamControlTypes((p) => ({ ...p, [key]: inferredType }));
    }
  };

  // ── Apply label from browser inline input ───────────────────────────────
  const applyBrowserLabel = (nodeId: string, paramId: string) => {
    const key = `${nodeId}:${paramId}`;
    const label = whitelistLabels[key] ?? '';
    setWhitelist((p) => p.map((e) =>
      `${e.nodeId}:${e.paramId}` === key ? { ...e, label } : e
    ));
  };

  // ── Remove a whitelist entry ─────────────────────────────────────────────
  const removeWhitelistEntry = (nodeId: string, paramId: string) => {
    const key = `${nodeId}:${paramId}`;
    setBrowserChecked((p) => { const n = { ...p }; delete n[key]; return n; });
    setWhitelist((p) => p.filter((e) => `${e.nodeId}:${e.paramId}` !== key));
    setWhitelistLabels((p) => { const n = { ...p }; delete n[key]; return n; });
    setParamVisibilities((p) => { const n = { ...p }; delete n[key]; return n; });
    setParamControlTypes((p) => { const n = { ...p }; delete n[key]; return n; });
    setValidationExpanded((p) => { const n = { ...p }; delete n[key]; return n; });
  };

  // ── Start inline edit of a whitelist label ─────────────────────────────
  const startEditLabel = (nodeId: string, paramId: string, currentLabel: string) => {
    setEditingEntryKey(`${nodeId}:${paramId}`);
    setEditingLabel(currentLabel);
  };

  const commitEditLabel = () => {
    if (!editingEntryKey) return;
    setWhitelist((p) => p.map((e) =>
      `${e.nodeId}:${e.paramId}` === editingEntryKey ? { ...e, label: editingLabel } : e
    ));
    setEditingEntryKey(null);
    setEditingLabel('');
  };
  // ── Publish to server ────────────────────────────────────────────────────────
  const publishToServer = async (pw: PublishedWorkflow, workflowId: string): Promise<void> => {
    const { accessToken } = useAuthStore.getState();
    if (!accessToken) {
      throw new Error('请先登录后再发布');
    }

    const response = await fetch(`${API_BASE}/published`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        workflowId,
        publishedBy: pw.name,
        content: JSON.stringify(pw),
      }),
    });

    if (!response.ok) {
      let msg = `发布失败: ${response.status}`;
      try {
        const body = await response.json();
        if (body.error) msg = body.error;
      } catch { /* ignore */ }
      throw new Error(msg);
    }
  };



  // ── Validation & publish ────────────────────────────────────────────────
  const handlePublish = async () => {
    if (!publishName.trim()) {
      setError('请输入发布名称');
      return;
    }
    if (nodes.length === 0) {
      setError('画布上没有节点，无法发布');
      return;
    }
    // Validate input labels — only for selected input nodes
    for (const n of selectedInputNodes) {
      if (!inputLabels[n.id]?.trim()) {
        setError(`请为「${n.data.label}」设置面向用户的名称`);
        return;
      }
    }
    // Validate output labels
    for (const n of outputNodes) {
      if (!outputLabels[n.id]?.trim()) {
        setError(`请为「${n.data.label}」设置面向用户的名称`);
        return;
      }
    }
    // Validate whitelist labels
    for (const e of whitelist) {
      if (!e.label?.trim()) {
        const node = nodes.find((n) => n.id === e.nodeId);
        const paramNode = node?.data.definition?.params.find((p) => p.id === e.paramId);
        setError(`请为「${node?.data.label ?? e.nodeId}」→「${paramNode?.name ?? e.paramId}」设置面向用户的参数名称`);
        return;
      }
    }

    setPublishing(true);
    setError(null);

    try {
      // Build paramDefinitions from whitelist using inferControlType/inferOptions
      const paramDefinitions: PublishedParamDefinition[] = whitelist.map((entry) => {
        const node = nodes.find((n) => n.id === entry.nodeId);
        const paramDef = node?.data.definition?.params.find((p) => p.id === entry.paramId);
        const schemaType = node?.data.definition?.paramSchema?.[entry.paramId]?.type;
        const key = `${entry.nodeId}:${entry.paramId}`;
        const inferred = inferControlType(schemaType, paramDef, entry.paramId);
        return {
          nodeId: entry.nodeId,
          paramId: entry.paramId,
          label: entry.label,
          controlType: paramControlTypes[key] ?? inferred,
          options: inferOptions(paramDef),
          defaultValue: paramDef?.default,
          validation: {
            required: paramDef?.required ?? false,
            min: paramDef?.min,
            max: paramDef?.max,
          },
          visibility: paramVisibilities[key] ?? 'visible',
          description: paramDef?.description,
        };
      });

      // Sync to publish store
      setParamDefinitions(paramDefinitions);

      const config = buildPublishedConfig({ nodes, edges, userInputNodes: selectedInputNodes, inputLabels, outputLabels, outputFormats, whitelist, paramDefinitions });
  const publishedInputs: PublishedWorkflow['inputs'] = config.inputs.map((i) => ({
    id: i.nodeId,
    name: i.label,
    // Map PublishedInputConfig.type (image|mask|string) to PortType
    type: (i.type === 'image' ? 'image' : i.type === 'mask' ? 'mask' : 'string') as PublishedInput['type'],
    required: true,
    visible: true,
  }));
  const publishedOutputs: PublishedWorkflow['outputs'] = config.outputs.map((o) => ({
    // Output ID must use {nodeId}:{portId} format so that WorkflowRunPage.handleRun()
    // can correctly parse nodeId and portId via output.id.indexOf(':').
    // The executor result for an export/composite node is keyed as {nodeId}:image.
    id: `${o.nodeId}:image`,
    name: o.label,
    type: 'image' as PublishedOutput['type'],
  }));
  const pw: PublishedWorkflow = {
    id: createId(),
    sourceId: workflowMeta.id,
    name: publishName.trim(),
    description: publishDesc.trim() || undefined,
    sourceName: workflowMeta.name,
    version: workflowMeta.version,
    inputs: publishedInputs,
    outputs: publishedOutputs,
    config,
    publishedAt: new Date().toISOString(),
  };

      // Write to server (requires auth); user sees error if not logged in
      await publishToServer(pw, workflowMeta.id);

      broadcastPublish(pw);
      setLastPublished(pw);
      setPublished(true);
    } catch (err) {
      setError(String(err));
    } finally {
      setPublishing(false);
    }
  };

  // ── Success screen ──────────────────────────────────────────────────────
  if (published) {
    return (
      <div className="dialog-overlay" onClick={onClose}>
        <div className="dialog" role="dialog" aria-modal="true">
          <div className="dialog-header">
            <span className="dialog-title">发布成功</span>
            <button className="dialog-close" onClick={onClose}><X size={16} /></button>
          </div>
          <div className="dialog-body">
            <div className="publish-success">
              <div className="publish-success-icon"><Check size={32} /></div>
              <div className="publish-success-msg">
                <strong>{publishName}</strong> 已成功发布
              </div>
              <div className="publish-success-sub">
                发布版本 {workflowMeta.version} · {nodes.length} 个节点 · {selectedInputNodes.length} 个用户输入 · {outputNodes.length} 个输出
              </div>
              <div className="publish-success-primary">
                <button className="dialog-btn dialog-btn-primary" onClick={() => window.open('http://localhost:3002', '_blank')}>
                  在运行端测试
                </button>
              </div>
              <div className="publish-success-secondary">
                <button
                  className={`dialog-btn dialog-btn-secondary ${copySuccess ? 'dialog-btn--success' : ''}`}
                  onClick={async () => {
                    if (!lastPublished) return;
                    const ok = await copyWorkflowToClipboard(lastPublished);
                    if (ok) { setCopySuccess(true); setTimeout(() => setCopySuccess(false), 2000); }
                  }}
                >
                  <Copy size={13} />{copySuccess ? '已复制' : '复制 JSON'}
                </button>
                <button
                  className="dialog-btn dialog-btn-secondary"
                  onClick={() => lastPublished && downloadWorkflowAsFile(lastPublished)}
                >
                  <Download size={13} />导出文件
                </button>
              </div>
            </div>
          </div>
          <div className="dialog-footer">
            <button className="dialog-btn dialog-btn-primary" onClick={onClose}>完成</button>
          </div>
        </div>
      </div>
    );
  }

  // ── Main publish form ───────────────────────────────────────────────────
  return (
    <div className="dialog-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dialog dialog-wide" role="dialog" aria-modal="true">
        <div className="dialog-header">
          <span className="dialog-title">发布工作流</span>
          <button className="dialog-close" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="dialog-body">

          {/* ── Basic info ─────────────────────────────────────────────────── */}
          <div className="dialog-field">
            <label className="dialog-label" htmlFor="publish-name">发布名称</label>
            <input
              id="publish-name" className="dialog-input" type="text"
              value={publishName} onChange={(e) => setPublishName(e.target.value)}
              placeholder="用户将看到的名称" autoFocus
            />
          </div>
          <div className="dialog-field">
            <label className="dialog-label" htmlFor="publish-desc">描述（可选）</label>
            <input
              id="publish-desc" className="dialog-input" type="text"
              value={publishDesc} onChange={(e) => setPublishDesc(e.target.value)}
              placeholder="简短描述这个工作流的用途"
            />
          </div>

          {/* ── Section 1: 定义用户上传内容 ────────────────────────────────── */}
          <div className="publish-section">
            <div className="publish-section-title">
              定义用户上传内容
              <span className="publish-section-hint">
                仅显示无上游连线的节点（如「加载图片」「加载蒙版」）· 未勾选则沿用画布上的测试数据
              </span>
            </div>

            {candidateNodes.length === 0 ? (
              <div className="publish-empty">
                画布中暂无可用节点
              </div>
            ) : (
              <div className="publish-input-candidates">
                {candidateNodes.map((node) => {
                  const def = node.data.definition;
                  const isSelected = selectedInputIds.has(node.id);
                  const nodeTypeIcon =
                    node.data.nodeType === 'load-image' ? <Upload size={11} /> :
                    node.data.nodeType === 'load-mask'  ? <CircleDot size={11} /> :
                    <CircleDot size={11} />;
                  const typeLabel =
                    node.data.nodeType === 'load-image' ? '图片' :
                    node.data.nodeType === 'load-mask'  ? '蒙版' : def?.category ?? '节点';

                  return (
                    <div key={node.id} className={`publish-input-candidate ${isSelected ? 'publish-input-candidate--selected' : ''}`}>
                      <div className="publish-input-candidate-row">
                        {/* Toggle checkbox */}
                        <label className="publish-input-toggle">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => toggleInputNode(node.id, e.target.checked)}
                          />
                          <span className="publish-input-candidate-icon">
                            {nodeTypeIcon}
                          </span>
                          <span className="publish-input-candidate-name">{node.data.label}</span>
                          <span className="publish-source-type-badge">{typeLabel}</span>
                        </label>
                        {/* Remove button — only visible when selected */}
                        <button
                          className={`publish-icon-btn publish-icon-btn--danger ${!isSelected ? 'publish-icon-btn--hidden' : ''}`}
                          title="移除，不开放给用户"
                          onClick={() => toggleInputNode(node.id, false)}
                        >
                          <X size={11} />
                        </button>
                      </div>

                      {/* Label input — only shown when selected */}
                      {isSelected && (
                        <div className="publish-input-label-row">
                          <label className="dialog-label" style={{ marginBottom: 0, fontSize: 11 }}>
                            面向用户的名称
                          </label>
                          <input
                            className="dialog-input"
                            style={{ flex: 1 }}
                            value={inputLabels[node.id] ?? ''}
                            onChange={(e) => setInputLabels((p) => ({ ...p, [node.id]: e.target.value }))}
                            placeholder="如：产品白底图"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Section 2: 开放给用户的调节参数 ──────────────────────────── */}
          <div className="publish-section">
            <div className="publish-section-title">
              开放给用户的调节参数
              <span className="publish-section-hint">可选</span>
            </div>

            {/* White-list entries */}
            {whitelist.length > 0 ? (
              <div className="publish-whitelist-list">
                {whitelist.map((entry) => {
                  const key = `${entry.nodeId}:${entry.paramId}`;
                  const node = nodes.find((n) => n.id === entry.nodeId);
                  const paramDef = node?.data.definition?.params.find((p) => p.id === entry.paramId);
                  const isEditing = editingEntryKey === key;
                  const visibility = paramVisibilities[key] ?? 'visible';
                  const controlType = paramControlTypes[key] ?? 'string';
                  const isValidationExpanded = validationExpanded[key] ?? false;

                  return (
                    <div key={key} className="publish-whitelist-row">
                      <div className="publish-whitelist-row-main">
                        <span className="publish-whitelist-path">
                          {node?.data.label ?? entry.nodeId} → {paramDef?.name ?? entry.paramId}
                        </span>
                        {isEditing ? (
                          <div className="publish-whitelist-edit-row">
                            <input
                              className="dialog-input"
                              value={editingLabel}
                              onChange={(e) => setEditingLabel(e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Enter') commitEditLabel(); }}
                              autoFocus
                            />
                            <button className="dialog-btn dialog-btn-primary" onClick={commitEditLabel}>保存</button>
                            <button className="dialog-btn dialog-btn-secondary" onClick={() => setEditingEntryKey(null)}>取消</button>
                          </div>
                        ) : (
                          <div className="publish-whitelist-actions">
                            <span className="publish-whitelist-label">{entry.label || '(未命名)'}</span>
                            {/* Visibility toggle */}
                            <button
                              className={`publish-icon-btn ${visibility === 'visible' ? '' : visibility === 'locked' ? 'publish-icon-btn--locked' : 'publish-icon-btn--hidden'}`}
                              title={visibility === 'visible' ? '可见' : visibility === 'locked' ? '锁定' : '隐藏'}
                              onClick={() => setParamVisibilities((p) => ({ ...p, [key]: visibility === 'visible' ? 'locked' : visibility === 'locked' ? 'hidden' : 'visible' }))}
                            >
                              {visibility === 'visible' ? <Eye size={12} /> : visibility === 'locked' ? <Lock size={12} /> : <EyeOff size={12} />}
                            </button>
                            {/* ControlType selector */}
                            <select
                              className="dialog-select dialog-select--sm"
                              value={controlType}
                              onChange={(e) => setParamControlTypes((p) => ({ ...p, [key]: e.target.value as ParamControlType }))}
                            >
                              <option value="string">文本</option>
                              <option value="number">数字</option>
                              <option value="boolean">开关</option>
                              <option value="select">下拉</option>
                              <option value="image-file">图片</option>
                            </select>
                            <button
                              className="publish-icon-btn"
                              title="编辑名称"
                              onClick={() => startEditLabel(entry.nodeId, entry.paramId, entry.label)}
                            >
                              <Pencil size={12} />
                            </button>
                            <button
                              className="publish-icon-btn publish-icon-btn--danger"
                              title="移除"
                              onClick={() => removeWhitelistEntry(entry.nodeId, entry.paramId)}
                            >
                              <X size={12} />
                            </button>
                          </div>
                        )}
                      </div>
                      {/* Validation collapsible panel */}
                      <div className="publish-whitelist-validation">
                        <button
                          className="publish-whitelist-validation-toggle"
                          onClick={() => setValidationExpanded((p) => ({ ...p, [key]: !p[key] }))}
                        >
                          {isValidationExpanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                          校验规则
                        </button>
                        {isValidationExpanded && (
                          <div className="publish-whitelist-validation-body">
                            <label className="dialog-label">
                              <input
                                type="checkbox"
                                checked={paramDef?.required ?? false}
                                disabled
                              />{' '}
                              必填
                            </label>
                            {(controlType === 'number') && (
                              <div className="publish-whitelist-validation-row">
                                <label className="dialog-label">最小值</label>
                                <input
                                  className="dialog-input dialog-input--sm"
                                  type="number"
                                  value={paramDef?.min ?? ''}
                                  disabled
                                />
                                <label className="dialog-label">最大值</label>
                                <input
                                  className="dialog-input dialog-input--sm"
                                  type="number"
                                  value={paramDef?.max ?? ''}
                                  disabled
                                />
                              </div>
                            )}
                            {paramDef?.description && (
                              <p className="publish-whitelist-desc">{paramDef.description}</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="publish-empty publish-empty--muted">
                暂无对用户开放的参数
              </div>
            )}

            {/* Add params button */}
            <button
              className="dialog-btn dialog-btn-secondary"
              style={{ marginTop: '8px', width: '100%' }}
              onClick={() => setNodeBrowserOpen((p) => !p)}
            >
              <Plus size={13} />
              {nodeBrowserOpen ? '收起参数列表' : '添加向用户暴露的参数'}
              {nodeBrowserOpen ? <ChevronDown size={13} style={{ marginLeft: 4 }} /> : <ChevronRight size={13} style={{ marginLeft: 4 }} />}
            </button>

            {/* Node-browser panel */}
            {nodeBrowserOpen && (
              <div className="publish-node-browser">
                {nodes.map((node) => {
                  const def = node.data.definition;
                  if (!def || def.params.length === 0) return null;
                  return (
                    <div key={node.id} className="publish-browser-node">
                      <div className="publish-browser-node-header">
                        <span className="publish-source-icon">
                          {def.category === 'INPUT' ? <Upload size={11} /> :
                           def.category === 'OUTPUT' ? <Download size={11} /> :
                           <CircleDot size={11} />}
                        </span>
                        <span className="publish-source-node-label">{node.data.label}</span>
                      </div>
                      <div className="publish-browser-params">
                        {def.params.map((p) => {
                          const key = `${node.id}:${p.id}`;
                          const checked = !!browserChecked[key];
                          return (
                            <div key={p.id} className="publish-browser-param-row">
                              <label className="publish-browser-checkbox-label">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => toggleBrowserParam(node.id, p.id, p.name)}
                                />
                                <span title={p.description ?? ''}>{p.name}</span>
                              </label>
                              {checked && (
                                <div className="publish-browser-param-label-row">
                                  <input
                                    className="dialog-input"
                                    style={{ flex: 1 }}
                                    value={whitelistLabels[key] ?? ''}
                                    onChange={(e) => setWhitelistLabels((prev) => ({ ...prev, [key]: e.target.value }))}
                                    onBlur={() => applyBrowserLabel(node.id, p.id)}
                                    placeholder="面向用户的参数名称"
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                {nodes.every((n) => !n.data.definition || n.data.definition.params.length === 0) && (
                  <div className="publish-empty publish-empty--muted">所有节点均无参数</div>
                )}
              </div>
            )}
          </div>

          {/* ── Section 3: 最终输出 ───────────────────────────────────────── */}
          <div className="publish-section">
            <div className="publish-section-title">
              最终输出
              <span className="publish-section-hint">
                {outputNodes.length > 0 ? `检测到 ${outputNodes.length} 个输出节点` : '未检测到输出节点'}
              </span>
            </div>

            {outputNodes.length === 0 ? (
              <div className="publish-empty">
                未检测到输出节点，请确保画布中有 Export 节点或末端节点
              </div>
            ) : (
              <div className="publish-output-list">
                {outputNodes.map((node) => {
                  const def = node.data.definition;
                  return (
                    <div key={node.id} className="publish-source-card">
                      <div className="publish-source-header">
                        <span className="publish-source-icon">
                          <Download size={13} />
                        </span>
                        <span className="publish-source-node-label">{node.data.label}</span>
                        <span className="publish-source-type-badge">{def?.category}</span>
                      </div>
                      <div className="publish-source-label-row">
                        <label className="dialog-label" style={{ marginBottom: 0 }}>面向用户的名称</label>
                        <input
                          className="dialog-input"
                          style={{ flex: 1 }}
                          value={outputLabels[node.id] ?? ''}
                          onChange={(e) => setOutputLabels((p) => ({ ...p, [node.id]: e.target.value }))}
                          placeholder="如：生成结果图"
                        />
                      </div>
                      <div className="publish-source-label-row">
                        <label className="dialog-label" style={{ marginBottom: 0 }}>导出格式</label>
                        <select
                          className="dialog-select"
                          value={outputFormats[node.id] ?? 'png'}
                          onChange={(e) => setOutputFormats((p) => ({ ...p, [node.id]: e.target.value as ExportFormat }))}
                        >
                          <option value="png">PNG</option>
                          <option value="jpeg">JPEG</option>
                          <option value="webp">WebP</option>
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {error && <div className="dialog-error">{error}</div>}
        </div>

        <div className="dialog-footer">
          <button className="dialog-btn dialog-btn-secondary" onClick={onClose} disabled={publishing}>取消</button>
          <button className="dialog-btn dialog-btn-primary" onClick={handlePublish} disabled={publishing}>
            {publishing ? '发布中…' : '发布'}
          </button>
        </div>
      </div>
    </div>
  );
};
