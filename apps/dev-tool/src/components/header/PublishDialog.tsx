// PublishDialog - configure and publish a workflow for the user-facing app
//
// Refactored: v2 publish dialog with auto-infer and white-list paradigm.
// - Auto-detects source nodes (no incoming edges | load-image type) as Inputs.
// - Auto-detects export/leaf nodes as Outputs.
// - All params hidden by default; developer explicitly white-lists with labels.

import React, { useState, useMemo } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import type { CanvasNode } from '../../store/canvasStore';
import type {
  PublishedWorkflow,
  PublishedInput,
  PublishedOutput,
  PublishedInputConfig,
  PublishedParamConfig,
  PublishedOutputConfig,
  ExportFormat,
} from '@prism/shared-types';
import { Check, Copy, Download, Upload, X, Plus, ChevronDown, ChevronRight, Pencil, CircleDot } from 'lucide-react';
import { copyWorkflowToClipboard, downloadWorkflowAsFile } from '../../utils/workflowExport';

const PREFIX = 'prism:published:';
const CHANNEL_NAME = 'prism-publish-channel';

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

/**
 * Infer source nodes for the Inputs section.
 * Rule: nodes with ZERO incoming edges, OR nodes of type 'load-image' (regardless of edges).
 */
export function inferSourceNodes(
  nodes: CanvasNode[],
  edges: ReturnType<typeof useCanvasStore.getState>['edges']
): CanvasNode[] {
  const hasIncoming = nodesWithIncomingEdges(edges);
  return nodes.filter((n) => n.data.definition && (
    !hasIncoming.has(n.id) || n.data.nodeType === 'load-image'
  ));
}

/**
 * Infer output nodes for the Outputs section.
 * Rule: type === 'export' first; fallback to leaf nodes (no outgoing edges).
 */
export function inferOutputNodes(
  nodes: CanvasNode[],
  edges: ReturnType<typeof useCanvasStore.getState>['edges']
): CanvasNode[] {
  const exportNodes = nodes.filter((n) => n.data.definition && n.data.nodeType === 'export');
  if (exportNodes.length > 0) return exportNodes;
  const hasOutgoing = nodesWithOutgoingEdges(edges);
  return nodes.filter((n) => n.data.definition && !hasOutgoing.has(n.id));
}

/**
 * Build the PublishedConfig from the dialog's edited state.
 * Uses canvas nodeId (UUID) as stable key for nodeTypes and nodeConfigs.
 */
function buildPublishedConfig(opts: {
  nodes: CanvasNode[];
  edges: ReturnType<typeof useCanvasStore.getState>['edges'];
  inputLabels: Record<string, string>;
  outputLabels: Record<string, string>;
  outputFormats: Record<string, ExportFormat>;
  whitelist: PublishedParamConfig[];
}): PublishedWorkflow['config'] {
  const { nodes, edges, inputLabels, outputLabels, outputFormats, whitelist } = opts;

  const nodeConfigs: PublishedWorkflow['config']['nodeConfigs'] = {};
  const nodeTypes: Record<string, string> = {};
  const nodeIndexMap: Record<string, string> = {};

  for (const node of nodes) {
    const def = node.data.definition;
    if (!def) continue;
    const nodeKey = node.id;
    nodeIndexMap[node.id] = nodeKey;
    nodeTypes[nodeKey] = node.data.nodeType;
    nodeConfigs[nodeKey] = {
      params: { ...node.data.params },
      _internalParams: {},
    };
  }

  // Convert white-list array into per-node exposed params map
  for (const entry of whitelist) {
    if (!nodeConfigs[entry.nodeId]) continue;
    const current = nodeConfigs[entry.nodeId].params[entry.paramId];
    // Only inject if not already set from node's own params
    if (current === undefined) {
      nodeConfigs[entry.nodeId].params[entry.paramId] = null;
    }
  }

  // Build PublishedInputConfig[]
  const sourceNodes = inferSourceNodes(nodes, edges);
  const inputs: PublishedInputConfig[] = sourceNodes.map((n) => ({
    nodeId: n.id,
    label: inputLabels[n.id] ?? '',
    type: (n.data.nodeType === 'load-image' ? 'image' : n.data.nodeType === 'load-mask' ? 'mask' : 'string'),
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
    // New v2 fields
    inputs,
    exposedParams: whitelist,
    outputs,
  };
}

function savePublishedWorkflow(pw: PublishedWorkflow): void {
  localStorage.setItem(`${PREFIX}${pw.sourceId}`, JSON.stringify(pw));
  const indexKey = `${PREFIX}index`;
  const ids: string[] = JSON.parse(localStorage.getItem(indexKey) ?? '[]');
  if (!ids.includes(pw.sourceId)) {
    ids.push(pw.sourceId);
    localStorage.setItem(indexKey, JSON.stringify(ids));
  }
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

  const [publishName, setPublishName] = useState(workflowMeta.name);
  const [publishDesc, setPublishDesc] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);
  const [lastPublished, setLastPublished] = useState<PublishedWorkflow | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Derived node lists ──────────────────────────────────────────────────
  const sourceNodes = useMemo(() => inferSourceNodes(nodes, edges), [nodes, edges]);
  const outputNodes = useMemo(() => inferOutputNodes(nodes, edges), [nodes, edges]);

  // ── Input labels: nodeId → developer-provided user-facing label ────────
  const [inputLabels, setInputLabels] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const n of sourceNodes) init[n.id] = '';
    return init;
  });

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

  // ── Node-browser panel toggle ──────────────────────────────────────────
  const [nodeBrowserOpen, setNodeBrowserOpen] = useState(false);
  // Inline editing of a whitelist entry
  const [editingEntryKey, setEditingEntryKey] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState('');

  // Re-sync when canvas nodes change
  React.useEffect(() => {
    setInputLabels((prev) => {
      const next: Record<string, string> = {};
      for (const n of sourceNodes) next[n.id] = prev[n.id] ?? '';
      return next;
    });
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
    setBrowserChecked((prev) => {
      const next: Record<string, boolean> = {};
      for (const e of whitelist) next[`${e.nodeId}:${e.paramId}`] = true;
      return next;
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
    } else {
      // Check: add to whitelist with empty label (required before publish)
      setBrowserChecked((p) => ({ ...p, [key]: true }));
      setWhitelist((p) => [...p, { nodeId, paramId, label: '' }]);
      setWhitelistLabels((p) => ({ ...p, [key]: paramName }));
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
    // Validate input labels
    for (const n of sourceNodes) {
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
      const config = buildPublishedConfig({ nodes, edges, inputLabels, outputLabels, outputFormats, whitelist });
  const publishedInputs: PublishedWorkflow['inputs'] = config.inputs.map((i) => ({
    id: i.nodeId,
    name: i.label,
    // Map PublishedInputConfig.type (image|mask|string) to PortType
    type: (i.type === 'image' ? 'image' : i.type === 'mask' ? 'mask' : 'string') as PublishedInput['type'],
    required: true,
    visible: true,
  }));
  const publishedOutputs: PublishedWorkflow['outputs'] = config.outputs.map((o) => ({
    id: o.nodeId,
    name: o.label,
    type: 'image' as PublishedOutput['type'],
  }));
  const pw: PublishedWorkflow = {
    id: crypto.randomUUID(),
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

      savePublishedWorkflow(pw);
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
                发布版本 {workflowMeta.version} · {nodes.length} 个节点 · {sourceNodes.length} 个输入 · {outputNodes.length} 个输出
              </div>
              <div className="publish-success-primary">
                <button className="dialog-btn dialog-btn-primary" onClick={() => window.open('http://localhost:3001', '_blank')}>
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
                检测到 {sourceNodes.length} 个图片来源节点
              </span>
            </div>

            {sourceNodes.length === 0 ? (
              <div className="publish-empty">
                未检测到图片上传节点，请在画布中添加 Load Image 节点
              </div>
            ) : (
              <div className="publish-source-list">
                {sourceNodes.map((node) => {
                  const def = node.data.definition;
                  return (
                    <div key={node.id} className="publish-source-card">
                      <div className="publish-source-header">
                        <span className="publish-source-icon">
                          <Upload size={13} />
                        </span>
                        <span className="publish-source-node-label">{node.data.label}</span>
                        <span className="publish-source-type-badge">{def?.category}</span>
                      </div>
                      <div className="publish-source-label-row">
                        <label className="dialog-label" style={{ marginBottom: 0 }}>
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

                  return (
                    <div key={key} className="publish-whitelist-row">
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
