// DebugTab — Inspector 调试信息面板
// 显示选中节点的执行耗时、输入快照、输出快照、错误信息。

import React, { useMemo } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { Clock, ArrowDown, ArrowUp, AlertCircle, ChevronDown, ChevronRight } from 'lucide-react';
import './Inspector.module.css';

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
  const nodeData = node?.data;
  const executionResult = nodeData?.executionResult;
  const executionError = nodeData?.executionError;
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

    </div>
  );
};
