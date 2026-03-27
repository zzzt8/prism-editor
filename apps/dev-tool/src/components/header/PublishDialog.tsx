// PublishDialog - configure and publish a workflow for the user-facing app

import React, { useState, useMemo, useCallback } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import type {
  PublishedInput,
  PublishedOutput,
  PublishedWorkflow,
  PublishedParamVisibility,
} from '@prism/shared-types';

const PREFIX = 'prism:published:';

interface PublishDialogProps {
  onClose: () => void;
}

/**
 * Build PublishedInput[] for the publish dialog.
 * Uses topological order (stable index) as node key for PublishedInput.id stability.
 * The key format is "{nodeIndex}:{portId}" — e.g. "0:image".
 */
function buildPublishedInputs(nodes: ReturnType<typeof useCanvasStore.getState>['nodes']) {
  const result: PublishedInput[] = [];
  // Sort nodes by their canvas id order for stable indexing
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const def = node.data.definition;
    if (!def) continue;
    for (const inp of def.inputs) {
      result.push({
        id: `${i}:${inp.id}`,
        name: inp.name,
        type: inp.type,
        required: true,
        visible: true,
      });
    }
  }
  return result;
}

/**
 * Build PublishedOutput[] for the publish dialog.
 * Uses topological order (stable index) as node key for PublishedOutput.id stability.
 * The key format is "{nodeIndex}:{portId}" — e.g. "0:result".
 */
function buildPublishedOutputs(nodes: ReturnType<typeof useCanvasStore.getState>['nodes']) {
  const result: PublishedOutput[] = [];
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const def = node.data.definition;
    if (!def) continue;
    for (const out of def.outputs) {
      result.push({
        id: `${i}:${out.id}`,
        name: out.name,
        type: out.type,
      });
    }
  }
  return result;
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

export const PublishDialog: React.FC<PublishDialogProps> = ({ onClose }) => {
  const { nodes, edges, workflowMeta } = useCanvasStore();

  const [publishName, setPublishName] = useState(workflowMeta.name);
  const [publishDesc, setPublishDesc] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Per-node, per-param visibility state: nodeId → paramId → visibility
  const [visibility, setVisibility] = useState<
    Record<string, Record<string, PublishedParamVisibility>>
  >(() => {
    const init: Record<string, Record<string, PublishedParamVisibility>> = {};
    for (const node of nodes) {
      const def = node.data.definition;
      if (!def) continue;
      init[node.id] = {};
      for (const p of def.params) {
      // Default: all visible. Developer explicitly marks internal params as hidden.
      init[node.id][p.id] = 'visible';
      }
    }
    return init;
  });

  // Toggle a single param's visibility
  const toggleParam = (nodeId: string, paramId: string) => {
    setVisibility((prev) => ({
      ...prev,
      [nodeId]: {
        ...prev[nodeId],
        [paramId]: prev[nodeId][paramId] === 'visible' ? 'hidden' : 'visible',
      },
    }));
  };

  // Auto-populated inputs/outputs (seed for the editable list)
  const autoInputs = useMemo(() => buildPublishedInputs(nodes), [nodes]);
  const autoOutputs = useMemo(() => buildPublishedOutputs(nodes), [nodes]);

  // Editable inputs state — initialized once from autoInputs; developer customises here
  const [editedInputs, setEditedInputs] = useState<PublishedInput[]>(() =>
    autoInputs.length > 0
      ? autoInputs.map((inp) => ({ ...inp }))
      : []
  );

  // Editable outputs state
  const [editedOutputs, setEditedOutputs] = useState<PublishedOutput[]>(() =>
    autoOutputs.length > 0
      ? autoOutputs.map((out) => ({ ...out }))
      : []
  );

  // Re-sync when canvas nodes change (user adds/removes nodes mid-dialog)
  React.useEffect(() => {
    setEditedInputs(autoInputs.length > 0 ? autoInputs.map((inp) => ({ ...inp })) : []);
    setEditedOutputs(autoOutputs.length > 0 ? autoOutputs.map((out) => ({ ...out })) : []);
  }, [autoInputs, autoOutputs]);

  // ── Input field helpers ───────────────────────────────────────────────────
  const updateInput = useCallback(
    (id: string, patch: Partial<PublishedInput>) =>
      setEditedInputs((prev) =>
        prev.map((inp) => (inp.id === id ? { ...inp, ...patch } : inp))
      ),
    []
  );

  const removeInput = useCallback(
    (id: string) => setEditedInputs((prev) => prev.filter((inp) => inp.id !== id)),
    []
  );

  // ── Output field helpers ─────────────────────────────────────────────────
  const updateOutput = useCallback(
    (id: string, patch: Partial<PublishedOutput>) =>
      setEditedOutputs((prev) =>
        prev.map((out) => (out.id === id ? { ...out, ...patch } : out))
      ),
    []
  );

  const removeOutput = useCallback(
    (id: string) => setEditedOutputs((prev) => prev.filter((out) => out.id !== id)),
    []
  );

  const handlePublish = async () => {
    if (!publishName.trim()) {
      setError('请输入发布名称');
      return;
    }
    if (nodes.length === 0) {
      setError('画布上没有节点，无法发布');
      return;
    }

    setPublishing(true);
    setError(null);

    try {
      const nodeConfigs: PublishedWorkflow['config']['nodeConfigs'] = {};
      const nodeIndexMap: Record<string, string> = {};
      const publishedVisibility: Record<string, Record<string, PublishedParamVisibility>> = {};
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        const def = node.data.definition;
        if (!def) continue;
        const nodeKey = String(i);
        nodeIndexMap[node.id] = nodeKey;

        // Use index-key for paramVisibility so ExposedParamsForm can look it up correctly.
        // (The canvas UUID was written before but ExposedParamsForm reads via index traversal.)
        if (visibility[node.id]) {
          publishedVisibility[nodeKey] = { ...visibility[node.id] };
        }

        // Only exposed params go into the config; internal ones use their defaults
        const exposed: Record<string, unknown> = {};
        const internal: Record<string, unknown> = {};
        for (const p of def.params) {
          const vis = visibility[node.id]?.[p.id] ?? 'visible';
          if (vis === 'visible') {
            exposed[p.id] = node.data.params[p.id] ?? p.default;
          } else {
            internal[p.id] = node.data.params[p.id] ?? p.default;
          }
        }
        nodeConfigs[nodeKey] = {
          params: exposed,
          _internalParams: internal,
        };
      }

      // Build PublishedWorkflow from current canvas state
      // Use developer-customised inputs/outputs from the editor
      const pw: PublishedWorkflow = {
        id: crypto.randomUUID(),
        sourceId: workflowMeta.id,
        name: publishName.trim(),
        description: publishDesc.trim() || undefined,
        sourceName: workflowMeta.name,
        version: workflowMeta.version,
        inputs: editedInputs,
        outputs: editedOutputs,
        config: {
          connections: edges.map((e) => ({
            id: e.id,
            from: { nodeId: e.source, port: e.sourceHandle ?? 'out' },
            to: { nodeId: e.target, port: e.targetHandle ?? 'in' },
          })),
          nodeTypes: Object.fromEntries(
            nodes.map((n, i) => [String(i), n.data.nodeType])
          ),
          nodeIndexMap,
          internalParams: {},
          nodeConfigs,
          paramVisibility: publishedVisibility,
        },
        publishedAt: new Date().toISOString(),
      };

      savePublishedWorkflow(pw);
      setPublished(true);
    } catch (err) {
      setError(String(err));
      setPublishing(false);
    }
  };

  if (published) {
    return (
      <div className="dialog-overlay" onClick={onClose}>
        <div className="dialog" role="dialog" aria-modal="true">
          <div className="dialog-header">
            <span className="dialog-title">发布成功</span>
            <button className="dialog-close" onClick={onClose}>✕</button>
          </div>
          <div className="dialog-body">
            <div className="publish-success">
              <div className="publish-success-icon">✓</div>
              <div className="publish-success-msg">
                <strong>{publishName}</strong> 已成功发布
              </div>
              <div className="publish-success-sub">
                发布版本 {workflowMeta.version} · {nodes.length} 个节点 · {editedInputs.length} 个输入 · {editedOutputs.length} 个输出
              </div>
            </div>
          </div>
          <div className="dialog-footer">
            <button className="dialog-btn dialog-btn-primary" onClick={onClose}>
              完成
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dialog-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dialog dialog-wide" role="dialog" aria-modal="true">
        <div className="dialog-header">
          <span className="dialog-title">发布工作流</span>
          <button className="dialog-close" onClick={onClose}>✕</button>
        </div>

        <div className="dialog-body">
          {/* Basic info */}
          <div className="dialog-field">
            <label className="dialog-label" htmlFor="publish-name">发布名称</label>
            <input
              id="publish-name"
              className="dialog-input"
              type="text"
              value={publishName}
              onChange={(e) => setPublishName(e.target.value)}
              placeholder="用户将看到的名称"
              autoFocus
            />
          </div>
          <div className="dialog-field">
            <label className="dialog-label" htmlFor="publish-desc">描述（可选）</label>
            <input
              id="publish-desc"
              className="dialog-input"
              type="text"
              value={publishDesc}
              onChange={(e) => setPublishDesc(e.target.value)}
              placeholder="简短描述这个工作流的用途"
            />
          </div>

          {/* Param visibility section */}
          <div className="publish-section">
            <div className="publish-section-title">
              参数可见性
              <span className="publish-section-hint">控制哪些参数在用户端可见</span>
            </div>

            {nodes.length === 0 ? (
              <div className="publish-empty">画布上没有节点</div>
            ) : (
              nodes.map((node) => {
                const def = node.data.definition;
                if (!def || def.params.length === 0) return null;
                return (
                  <div key={node.id} className="publish-node-block">
                    <div className="publish-node-header">
                      <span className="publish-node-icon">
                        {def.category === 'input' ? '↓' : def.category === 'output' ? '↑' : '◈'}
                      </span>
                      <span className="publish-node-name">{node.data.label}</span>
                      <span className="publish-node-type">{def.category}</span>
                    </div>
                    <div className="publish-param-list">
                      {def.params.map((p) => {
                        const vis = visibility[node.id]?.[p.id] ?? 'visible';
                        return (
                          <label key={p.id} className="publish-param-row">
                            <span className="publish-param-name" title={p.description ?? ''}>
                              {p.name}
                              {p.required && vis === 'hidden' && (
                                <span className="publish-param-required">*</span>
                              )}
                            </span>
                            <button
                              type="button"
                              className={`publish-vis-toggle publish-vis-toggle--${vis}`}
                              onClick={() => toggleParam(node.id, p.id)}
                              title={vis === 'visible' ? '点击设为内部参数' : '点击设为可见参数'}
                            >
                              {vis === 'visible' ? '可见' : '内部'}
                            </button>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* ── Input items editor ─────────────────────────────────────────── */}
          <div className="publish-section">
            <div className="publish-section-title">
              输入项
              <span className="publish-section-hint">
                {editedInputs.length === 0
                  ? '画布上无可用输入端口'
                  : '配置用户需要提供的输入参数'}
              </span>
            </div>

            {editedInputs.length === 0 ? (
              <div className="publish-empty">无可用输入端口（画布上没有带输入端口的节点）</div>
            ) : (
              <div className="publish-io-editor">
                {editedInputs.map((inp) => (
                  <div key={inp.id} className="publish-io-row">
                    <div className="publish-io-row-header">
                      <span className="publish-io-port-icon" title={inp.type}>↓</span>
                      <input
                        className="publish-io-name-input"
                        value={inp.name}
                        onChange={(e) => updateInput(inp.id, { name: e.target.value })}
                        placeholder="输入项名称"
                        size={Math.max(inp.name.length, 8)}
                      />
                      <span className="publish-io-type-badge">{inp.type}</span>
                    </div>
                    <div className="publish-io-row-fields">
                      <input
                        className="publish-io-desc-input"
                        value={inp.description ?? ''}
                        onChange={(e) => updateInput(inp.id, { description: e.target.value })}
                        placeholder="说明（可选）"
                      />
                      <div className="publish-io-toggles">
                        <label className="publish-io-toggle" title="必填">
                          <span className="publish-io-toggle-label">必填</span>
                          <button
                            type="button"
                            className={`publish-io-toggle-btn publish-io-toggle-btn--${inp.required ? 'on' : 'off'}`}
                            onClick={() => updateInput(inp.id, { required: !inp.required })}
                          >
                            {inp.required ? '是' : '否'}
                          </button>
                        </label>
                        <label className="publish-io-toggle" title="用户可见">
                          <span className="publish-io-toggle-label">可见</span>
                          <button
                            type="button"
                            className={`publish-io-toggle-btn publish-io-toggle-btn--${inp.visible ? 'on' : 'off'}`}
                            onClick={() => updateInput(inp.id, { visible: !inp.visible })}
                          >
                            {inp.visible ? '是' : '否'}
                          </button>
                        </label>
                      </div>
                      {inp.visible && (
                        <input
                          className="publish-io-default-input"
                          value={inp.defaultValue != null ? String(inp.defaultValue) : ''}
                          onChange={(e) =>
                            updateInput(inp.id, {
                              defaultValue: e.target.value === '' ? undefined : e.target.value,
                            })
                          }
                          placeholder="默认值（可选）"
                        />
                      )}
                      <button
                        type="button"
                        className="publish-io-remove-btn"
                        onClick={() => removeInput(inp.id)}
                        title="移除此项"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Output items editor ────────────────────────────────────────── */}
          <div className="publish-section">
            <div className="publish-section-title">
              输出项
              <span className="publish-section-hint">
                {editedOutputs.length === 0
                  ? '画布上无可用输出端口'
                  : '配置工作流执行后的输出结果'}
              </span>
            </div>

            {editedOutputs.length === 0 ? (
              <div className="publish-empty">无可用输出端口（画布上没有带输出端口的节点）</div>
            ) : (
              <div className="publish-io-editor">
                {editedOutputs.map((out) => (
                  <div key={out.id} className="publish-io-row">
                    <div className="publish-io-row-header">
                      <span className="publish-io-port-icon" title={out.type}>↑</span>
                      <input
                        className="publish-io-name-input"
                        value={out.name}
                        onChange={(e) => updateOutput(out.id, { name: e.target.value })}
                        placeholder="输出项名称"
                        size={Math.max(out.name.length, 8)}
                      />
                      <span className="publish-io-type-badge">{out.type}</span>
                    </div>
                    <div className="publish-io-row-fields">
                      <input
                        className="publish-io-desc-input"
                        value={out.description ?? ''}
                        onChange={(e) => updateOutput(out.id, { description: e.target.value })}
                        placeholder="说明（可选）"
                      />
                      <button
                        type="button"
                        className="publish-io-remove-btn"
                        onClick={() => removeOutput(out.id)}
                        title="移除此项（用户将无法获取此输出）"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && <div className="dialog-error">{error}</div>}
        </div>

        <div className="dialog-footer">
          <button className="dialog-btn dialog-btn-secondary" onClick={onClose} disabled={publishing}>
            取消
          </button>
          <button className="dialog-btn dialog-btn-primary" onClick={handlePublish} disabled={publishing}>
            {publishing ? '发布中…' : '发布'}
          </button>
        </div>
      </div>
    </div>
  );
};
