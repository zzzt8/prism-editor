// DebugTab — Inspector 调试信息面板
// 显示选中节点的执行耗时、输入快照、输出快照、错误信息。

import React, { useMemo } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { Clock, ArrowDown, ArrowUp, AlertCircle, ChevronDown, ChevronRight } from 'lucide-react';

interface DebugTabProps {
  nodeId: string;
}

const CollapsibleSection: React.FC<{
  title: React.ReactElement;
  children: React.ReactNode;
  defaultOpen?: boolean;
  accentColor?: string;
}> = ({ title, children, defaultOpen = true, accentColor }) => {
  const [open, setOpen] = React.useState(defaultOpen);

  return (
    <div className="debug-section">
      <button
        className="debug-section-header"
        onClick={() => setOpen((o) => !o)}
        type="button"
      >
        <span className="debug-section-chevron">
          {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        </span>
        <span
          className="debug-section-title"
          style={accentColor ? { color: accentColor } : undefined}
        >
          {title}
        </span>
      </button>
      {open && <div className="debug-section-body">{children}</div>}
    </div>
  );
};

const JsonBlock: React.FC<{ data: unknown; maxHeight?: number }> = ({ data, maxHeight = 200 }) => {
  const formatted = useMemo(() => {
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  }, [data]);

  return (
    <pre
      className="debug-json"
      style={{ maxHeight }}
    >
      <code>{formatted}</code>
    </pre>
  );
};


export const DebugTab: React.FC<DebugTabProps> = ({ nodeId }) => {
  const nodes = useCanvasStore((s) => s.nodes);
  const _executionStatus = useCanvasStore((s) => s._executionStatus);
  const _currentNodeId = useCanvasStore((s) => s._currentNodeId);

  // Hooks must be called before any early returns
  const node = nodes.find((n) => n.id === nodeId);
  const { executionResult, executionError } = node?.data ?? {};
  const isRunning = _currentNodeId === nodeId && _executionStatus === 'running';

  // Determine execution state
  const execState = isRunning
    ? ('running' as const)
    : executionError
    ? ('error' as const)
    : executionResult
    ? ('done' as const)
    : ('idle' as const);

  const execStateConfig = {
    idle:    { label: '空闲',    color: '#9ca3af', dot: '#9ca3af' },
    running: { label: '执行中',  color: '#60a5fa', dot: '#60a5fa' },
    done:    { label: '已完成',  color: '#4ade80', dot: '#4ade80' },
    error:   { label: '错误',    color: '#f87171', dot: '#f87171' },
  }[execState];

  // Timing data - always called, handle null case inside
  const timingData = useMemo((): { durationMs: number } | null => {
    if (!executionResult) return null;
    const r = executionResult as Record<string, unknown>;
    const duration = (r['durationMs'] as number)
      ?? ((r['timing'] as Record<string, unknown> | undefined)?.['durationMs'] as number)
      ?? ((r['timing'] as Record<string, unknown> | undefined)?.['duration'] as number);
    if (duration == null) return null;
    return { durationMs: duration as number };
  }, [executionResult]);

  // Input snapshot - always called
  const inputSnapshot = useMemo((): Record<string, unknown> => {
    return (node?.data.params as Record<string, unknown>) ?? {};
  }, [node?.data.params]);

  // Output snapshot
  const outputSnapshot: Record<string, unknown> | null = (executionResult as Record<string, unknown>) ?? null;

  // Error info
  const errorInfo: { message: string } | null = executionError ? { message: String(executionError) } : null;

  const hasAnyData = timingData || Object.keys(inputSnapshot).length > 0 || outputSnapshot || errorInfo;

  if (!node) return null;

  return (
    <div className="inspector-panel-body debug-tab">
      {/* Status row */}
      <div className="debug-status-row">
        <span
          className="debug-status-dot"
          style={{ background: execStateConfig.dot }}
        />
        <span
          className="debug-status-label"
          style={{ color: execStateConfig.color }}
        >
          {execStateConfig.label}
        </span>
        {isRunning && (
          <span className="debug-running-indicator">执行中…</span>
        )}
      </div>

      {/* Error section — always shown when there's an error */}
      {errorInfo && (
        <CollapsibleSection
          title={
            <>
              <AlertCircle size={12} />
              错误信息
            </>
          }
          accentColor="#f87171"
          defaultOpen={true}
        >
          <div className="debug-error-block">
            <span className="debug-error-msg">{errorInfo.message}</span>
          </div>
        </CollapsibleSection>
      )}

      {/* Timing section */}
      {timingData && (
        <CollapsibleSection
          title={
            <>
              <Clock size={12} />
              执行耗时
            </>
          }
          accentColor="#8b5cf6"
          defaultOpen={true}
        >
          <div className="debug-timing">
            <span className="debug-timing-value">
              {timingData.durationMs < 1000
                ? `${timingData.durationMs}ms`
                : `${(timingData.durationMs / 1000).toFixed(2)}s`}
            </span>
          </div>
        </CollapsibleSection>
      )}

      {/* Input snapshot */}
      {Object.keys(inputSnapshot).length > 0 && (
        <CollapsibleSection
          title={
            <>
              <ArrowDown size={12} />
              输入参数
            </>
          }
          accentColor="#60a5fa"
          defaultOpen={false}
        >
          <JsonBlock data={inputSnapshot} />
        </CollapsibleSection>
      )}

      {/* Output snapshot */}
      {outputSnapshot && (
        <CollapsibleSection
          title={
            <>
              <ArrowUp size={12} />
              输出结果
            </>
          }
          accentColor="#22c55e"
          defaultOpen={false}
        >
          <JsonBlock data={outputSnapshot} maxHeight={280} />
        </CollapsibleSection>
      )}

      {/* Empty state */}
      {!hasAnyData && !isRunning && (
        <div className="debug-empty">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <span className="debug-empty-label">尚无调试信息</span>
          <span className="debug-empty-hint">
            节点执行后，在此查看输入输出快照
          </span>
        </div>
      )}

      <style>{`
        .debug-tab {
          display: flex;
          flex-direction: column;
          gap: 0;
        }

        /* Status row */
        .debug-status-row {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 12px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          flex-shrink: 0;
        }

        .debug-status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .debug-status-label {
          font-size: 12px;
          font-weight: 600;
        }

        .debug-running-indicator {
          margin-left: auto;
          font-size: 11px;
          color: #60a5fa;
          animation: dcn-dot-pulse 1s ease-in-out infinite;
        }

        /* Sections */
        .debug-section {
          border-bottom: 1px solid rgba(255,255,255,0.04);
        }

        .debug-section-header {
          display: flex;
          align-items: center;
          gap: 6px;
          width: 100%;
          padding: 8px 12px;
          background: transparent;
          border: none;
          cursor: pointer;
          text-align: left;
          font-family: inherit;
          transition: background 0.1s;
        }

        .debug-section-header:hover {
          background: rgba(255,255,255,0.03);
        }

        .debug-section-chevron {
          display: flex;
          align-items: center;
          color: #52525b;
          flex-shrink: 0;
        }

        .debug-section-title {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 600;
          color: #a1a1aa;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .debug-section-body {
          padding: 0 12px 12px;
        }

        /* Timing */
        .debug-timing {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .debug-timing-value {
          font-size: 18px;
          font-weight: 700;
          font-family: 'Space Grotesk', monospace;
          color: #8b5cf6;
        }

        /* JSON block */
        .debug-json {
          background: #09090b;
          border: 1px solid #27272a;
          border-radius: 6px;
          padding: 10px;
          overflow: auto;
          margin: 0;
          font-size: 10px;
          line-height: 1.6;
          color: #a1a1aa;
          font-family: 'SF Mono', 'Cascadia Code', monospace;
          scrollbar-width: thin;
          scrollbar-color: #3f3f46 transparent;
        }

        .debug-json code {
          white-space: pre;
        }

        /* Error block */
        .debug-error-block {
          background: rgba(248, 113, 113, 0.06);
          border: 1px solid rgba(248, 113, 113, 0.2);
          border-radius: 6px;
          padding: 8px 10px;
        }

        .debug-error-msg {
          font-size: 11px;
          color: #f87171;
          line-height: 1.5;
          word-break: break-word;
        }

        /* Empty state */
        .debug-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 32px 24px;
          color: #52525b;
          text-align: center;
        }

        .debug-empty svg {
          opacity: 0.5;
        }

        .debug-empty-label {
          font-size: 12px;
          color: #71717a;
          font-weight: 500;
        }

        .debug-empty-hint {
          font-size: 11px;
          color: #52525b;
          max-width: 180px;
          line-height: 1.4;
        }
      `}</style>
    </div>
  );
};
