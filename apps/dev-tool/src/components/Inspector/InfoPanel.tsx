// InfoPanel — node info panel for Inspector
// Shows: node type, ID, category, ports with connection status, execution status

import React, { useMemo } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { Image, CircleDot, Hash, Type, ToggleLeft, FileText } from 'lucide-react';

interface InfoPanelProps {
  nodeId: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  input: '输入',
  transform: '变换',
  mask: '遮罩',
  composite: '合成',
  output: '输出',
};

const PORT_TYPE_ICONS: Record<string, React.ReactNode> = {
  image: <Image size={12} />,
  mask: <CircleDot size={12} />,
  number: <Hash size={12} />,
  string: <Type size={12} />,
  boolean: <ToggleLeft size={12} />,
  file: <FileText size={12} />,
};

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  idle:     { label: '空闲',     color: '#9ca3af', dot: '#9ca3af' },
  running:   { label: '运行中',   color: '#60a5fa', dot: '#60a5fa' },
  done:     { label: '已完成',   color: '#4ade80', dot: '#4ade80' },
  error:    { label: '错误',     color: '#f87171', dot: '#f87171' },
  cancelled: { label: '已取消',  color: '#9ca3af', dot: '#9ca3af' },
};

export const InfoPanel: React.FC<InfoPanelProps> = ({ nodeId }) => {
  const nodes = useCanvasStore((s) => s.nodes);
  const edges = useCanvasStore((s) => s.edges);
  const _executionStatus = useCanvasStore((s) => s._executionStatus);
  const _currentNodeId = useCanvasStore((s) => s._currentNodeId);

  const node = nodes.find((n) => n.id === nodeId);
  if (!node) return null;

  const { definition, nodeType, extraInputs, extraOutputs } = node.data;

  // Determine execution status for this node
  const nodeExecutionStatus = useMemo(() => {
    if (_currentNodeId === nodeId) return 'running';
    if (node.data.executionError) return 'error';
    if (node.data.executionResult) return 'done';
    return 'idle';
  }, [_currentNodeId, nodeId, node.data.executionError, node.data.executionResult]);

  const statusCfg = STATUS_CONFIG[nodeExecutionStatus] ?? STATUS_CONFIG.idle;

  // Collect all ports
  const inputPorts = useMemo(() => {
    const staticInputs = (definition?.inputs ?? []).map((p: { id: string; name: string; type: string; required?: boolean }) => ({
      ...p,
      source: 'static' as const,
    }));
    const dynamicInputs = (extraInputs ?? []).map((p: { id: string; name: string; type: string }) => ({
      ...p,
      source: 'dynamic' as const,
      required: false,
    }));
    return [...staticInputs, ...dynamicInputs];
  }, [definition, extraInputs]);

  const outputPorts = useMemo(() => {
    const staticOutputs = (definition?.outputs ?? []).map((p: { id: string; name: string; type: string; required?: boolean }) => ({
      ...p,
      source: 'static' as const,
    }));
    const dynamicOutputs = (extraOutputs ?? []).map((p: { id: string; name: string; type: string }) => ({
      ...p,
      source: 'dynamic' as const,
      required: false,
    }));
    return [...staticOutputs, ...dynamicOutputs];
  }, [definition, extraOutputs]);

  // Check if a port is connected
  const isPortConnected = useMemo(() => {
    const connectedSourceHandles = new Set<string>();
    const connectedTargetHandles = new Set<string>();
    for (const edge of edges) {
      if (edge.source === nodeId) connectedSourceHandles.add(edge.sourceHandle ?? '');
      if (edge.target === nodeId) connectedTargetHandles.add(edge.targetHandle ?? '');
    }
    return (portId: string) => connectedSourceHandles.has(portId) || connectedTargetHandles.has(portId);
  }, [edges, nodeId]);

  const category = definition?.category ?? nodeType;

  // Format last execution time
  const lastExecutionTime = useMemo(() => {
    if (!node.data.executionResult && !node.data.executionError) return null;
    return new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }, [node.data.executionResult, node.data.executionError]);

  return (
    <div className="inspector-panel-body">
      {/* Basic info */}
      <div className="param-panel-section">
        <div className="param-panel-section-title">基本信息</div>
        <div className="param-node-info">
          <div className="param-info-row">
            <span className="param-info-label">节点 ID</span>
            <span className="info-mono">{nodeId}</span>
          </div>
          <div className="param-info-row">
            <span className="param-info-label">节点类型</span>
            <span>{nodeType}</span>
          </div>
          <div className="param-info-row">
            <span className="param-info-label">分类</span>
            <span>{CATEGORY_LABELS[category] ?? category}</span>
          </div>
          {definition?.description && (
            <div className="param-info-row param-info-row--column">
              <span className="param-info-label">说明</span>
              <span className="info-description">{definition.description}</span>
            </div>
          )}
        </div>
      </div>

      {/* Input ports */}
      {inputPorts.length > 0 && (
        <div className="param-panel-section">
          <div className="param-panel-section-title">
            输入端口
            <span className="info-port-count">{inputPorts.length}</span>
          </div>
          <div className="info-port-list">
            {inputPorts.map((port) => {
              const connected = isPortConnected(port.id);
              return (
                <div key={port.id} className={`info-port-row${connected ? ' info-port-row--connected' : ''}`}>
                  <span className="info-port-icon">
                    {PORT_TYPE_ICONS[port.type] ?? port.type}
                  </span>
                  <span className="info-port-name">{port.name}</span>
                  <span className="info-port-id">{port.id}</span>
                  <span className={`info-port-status ${connected ? 'info-port-status--connected' : ''}`}>
                    {connected ? '●' : '○'}
                  </span>
                  {port.required && (
                    <span className="param-label-required" title="必填">*</span>
                  )}
                  {port.source === 'dynamic' && (
                    <span className="info-port-dynamic" title="动态端口">+</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Output ports */}
      {outputPorts.length > 0 && (
        <div className="param-panel-section">
          <div className="param-panel-section-title">
            输出端口
            <span className="info-port-count">{outputPorts.length}</span>
          </div>
          <div className="info-port-list">
            {outputPorts.map((port) => {
              const connected = isPortConnected(port.id);
              return (
                <div key={port.id} className={`info-port-row${connected ? ' info-port-row--connected' : ''}`}>
                  <span className="info-port-icon">
                    {PORT_TYPE_ICONS[port.type] ?? port.type}
                  </span>
                  <span className="info-port-name">{port.name}</span>
                  <span className="info-port-id">{port.id}</span>
                  <span className={`info-port-status ${connected ? 'info-port-status--connected' : ''}`}>
                    {connected ? '●' : '○'}
                  </span>
                  {port.required && (
                    <span className="param-label-required" title="必填">*</span>
                  )}
                  {port.source === 'dynamic' && (
                    <span className="info-port-dynamic" title="动态端口">+</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Execution status */}
      <div className="param-panel-section">
        <div className="param-panel-section-title">执行状态</div>
        <div className="info-execution">
          <div className="info-execution-status">
            <span
              className="info-execution-dot"
              style={{ background: statusCfg.dot }}
            />
            <span className="info-execution-label" style={{ color: statusCfg.color }}>
              {statusCfg.label}
            </span>
          </div>
          {lastExecutionTime && (
            <div className="param-info-row">
              <span className="param-info-label">最后执行</span>
              <span className="info-mono">{lastExecutionTime}</span>
            </div>
          )}
          {node.data.executionError && (
            <div className="info-error">
              <span className="info-error-label">错误</span>
              <span className="info-error-msg">{node.data.executionError}</span>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .info-mono {
          font-family: 'SF Mono', 'Cascadia Code', monospace;
          font-size: 11px;
          color: var(--color-text-muted);
        }

        .info-description {
          font-size: 11px;
          color: var(--color-text-muted);
          line-height: 1.5;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .info-port-count {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 18px;
          height: 16px;
          padding: 0 4px;
          background: var(--color-surface-2);
          border: 1px solid var(--color-border);
          border-radius: 10px;
          font-size: 10px;
          font-weight: 500;
          color: var(--color-text-muted);
          margin-left: 6px;
          line-height: 1;
        }

        .info-port-list {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .info-port-row {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 5px 8px;
          background: var(--color-surface-2);
          border: 1px solid var(--color-border);
          border-radius: 6px;
          transition: border-color 0.12s;
        }

        .info-port-row:hover {
          border-color: rgba(99, 102, 241, 0.3);
        }

        .info-port-row--connected {
          border-color: rgba(74, 222, 128, 0.3);
        }

        .info-port-icon {
          flex-shrink: 0;
          width: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--color-text-muted);
        }

        .info-port-name {
          font-size: 12px;
          color: var(--color-text);
          flex-shrink: 0;
        }

        .info-port-id {
          font-size: 10px;
          font-family: 'SF Mono', 'Cascadia Code', monospace;
          color: var(--color-text-muted);
          opacity: 0.6;
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .info-port-status {
          font-size: 10px;
          flex-shrink: 0;
          color: #9ca3af;
        }

        .info-port-status--connected {
          color: #4ade80;
        }

        .info-port-dynamic {
          font-size: 10px;
          font-weight: 700;
          color: var(--color-accent);
          flex-shrink: 0;
        }

        .info-execution {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .info-execution-status {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .info-execution-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          flex-shrink: 0;
          animation: info-pulse 1.5s ease-in-out infinite;
        }

        @keyframes info-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(0.85); }
        }

        .info-execution-label {
          font-size: 13px;
          font-weight: 600;
        }

        .info-error {
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding: 8px 10px;
          background: rgba(248, 113, 113, 0.08);
          border: 1px solid rgba(248, 113, 113, 0.3);
          border-radius: 6px;
        }

        .info-error-label {
          font-size: 10px;
          font-weight: 600;
          color: #f87171;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .info-error-msg {
          font-size: 11px;
          color: #f87171;
          line-height: 1.4;
          word-break: break-word;
        }
      `}</style>
    </div>
  );
};
