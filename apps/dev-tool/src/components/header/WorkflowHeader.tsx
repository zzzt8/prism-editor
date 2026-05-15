// WorkflowHeader - editor top bar

import React, { useState, useRef, useEffect } from 'react';
import {
  Box, Play, Square, CheckCircle2,
  Loader2, FileUp, Settings, User, Save,
  History,
} from 'lucide-react';
import { useCanvasStore } from '../../store/canvasStore';
import { useAppStore } from '../../store/appStore';
import { PanelToggle } from './PanelToggle';

interface WorkflowHeaderProps {
  onPublishClick: () => void;
  publishStatus: 'idle' | 'loading' | 'done';
  onVersionHistoryClick?: () => void;
}

export const WorkflowHeader: React.FC<WorkflowHeaderProps> = ({
  onPublishClick,
  publishStatus,
  onVersionHistoryClick,
}) => {
  const workflowMeta = useCanvasStore((s) => s.workflowMeta);
  const isDirty = useCanvasStore((s) => s.isDirty);
  const nodes = useCanvasStore((s) => s.nodes);
  const executionStatus = useCanvasStore((s) => s._executionStatus);
  const executeWorkflow = useCanvasStore((s) => s.executeWorkflow);
  const cancelExecution = useCanvasStore((s) => s.cancelExecution);
  const importWorkflowFromFile = useCanvasStore((s) => s.importWorkflowFromFile);
  const renameWorkflow = useCanvasStore((s) => s.renameWorkflow);
  const saveWorkflow = useCanvasStore((s) => s.saveWorkflow);
  const _leftPanelOpen = useAppStore((s) => s.leftPanelOpen);
  const _rightPanelOpen = useAppStore((s) => s.rightPanelOpen);

  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(workflowMeta.name);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const statusMsgTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isRunning = executionStatus === 'running';

  const showMsg = (msg: string) => {
    // Clear any existing timer before setting new one
    if (statusMsgTimerRef.current) {
      clearTimeout(statusMsgTimerRef.current);
    }
    setStatusMsg(msg);
    statusMsgTimerRef.current = setTimeout(() => {
      setStatusMsg(null);
      statusMsgTimerRef.current = null;
    }, 2500);
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (statusMsgTimerRef.current) {
        clearTimeout(statusMsgTimerRef.current);
      }
    };
  }, []);

  const handleImportJson = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await importWorkflowFromFile(file);
      showMsg('已导入工作流');
    } catch {
      showMsg('导入失败：无效的工作流 JSON');
    }
    e.target.value = '';
  };

  const handleExecute = async () => {
    if (isRunning) {
      cancelExecution();
      return;
    }
    if (nodes.length === 0) {
      showMsg('画布上没有节点');
      return;
    }
    try {
      const result = await executeWorkflow();
      if (result.status === 'done') showMsg('执行完成');
      else if (result.status === 'cancelled') showMsg('已取消');
      else showMsg(`执行出错: ${result.error}`);
    } catch (err) {
      showMsg(`执行出错: ${String(err)}`);
    }
  };

  const handleSave = async () => {
    try {
      await saveWorkflow();
      showMsg('已保存');
    } catch (err) {
      console.error('保存失败:', err);
      showMsg('保存失败，请检查控制台');
    }
  };

  const handlePublish = () => {
    onPublishClick();
  };

  useEffect(() => {
    if (!editingTitle) {
      setTitleValue(workflowMeta.name);
    }
  }, [workflowMeta.name, editingTitle]);

  const startEditTitle = () => {
    setTitleValue(workflowMeta.name);
    setEditingTitle(true);
    setTimeout(() => titleInputRef.current?.select(), 0);
  };

  const saveTitle = () => {
    const trimmed = titleValue.trim();
    if (trimmed && trimmed !== workflowMeta.name) {
      renameWorkflow(trimmed);
    }
    setEditingTitle(false);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') saveTitle();
    if (e.key === 'Escape') setEditingTitle(false);
  };

  return (
    <>
      <header className="wf-header">
        {/* ── Left Zone ─────────────────────────────── */}
        <div className="wf-header-left">
          <div className="wf-logo-group">
            <div className="wf-logo-icon">
              <Box size={16} />
            </div>
            <span className="wf-logo-text">Prism Editor</span>
          </div>

          <span className="wf-sep">/</span>

          {editingTitle ? (
            <input
              ref={titleInputRef}
              className="wf-title-input"
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={handleTitleKeyDown}
              maxLength={64}
            />
          ) : (
            <span
              className="wf-workflow-name"
              title="双击修改标题"
              onDoubleClick={startEditTitle}
            >
              {workflowMeta.name}
            </span>
          )}

          <span className={`wf-save-badge ${isDirty ? 'wf-save-badge--dirty' : 'wf-save-badge--saved'}`}>
            <span className="wf-save-dot" />
            {isDirty ? 'DRAFT' : 'SAVED'}
          </span>
        </div>

        {/* ── Center Zone ──────────────────────────── */}
        <div className="wf-header-center">
          <PanelToggle />
        </div>

        {/* ── Right Zone ──────────────────────────── */}
        <div className="wf-header-right">
          {/* Save */}
          <button
            className="wf-save-btn"
            onClick={handleSave}
            title="保存 (Ctrl+S)"
          >
            <Save size={14} />
            保存
          </button>

          {/* Execute — purple, like homepage */}
          <button
            className={`wf-execute-btn ${isRunning ? 'wf-execute-btn--running' : 'wf-execute-btn--ready'}`}
            onClick={handleExecute}
            disabled={!isRunning && nodes.length === 0}
            title={isRunning ? '停止执行' : '执行工作流'}
          >
            {isRunning ? (
              <Square size={14} fill="currentColor" />
            ) : (
              <Play size={14} fill="currentColor" />
            )}
            {isRunning ? '停止' : 'Execute'}
          </button>

          {/* Publish */}
          <button
            className="wf-publish-btn"
            onClick={handlePublish}
            title="发布工作流"
            disabled={publishStatus === 'loading'}
          >
            {publishStatus === 'loading' ? (
              <Loader2 size={14} className="wf-spin" />
            ) : publishStatus === 'done' ? (
              <CheckCircle2 size={14} />
            ) : (
              <FileUp size={14} />
            )}
            Publish
          </button>

          {/* Version History */}
          {onVersionHistoryClick && (
            <button
              className="wf-icon-btn"
              onClick={onVersionHistoryClick}
              title="版本历史"
            >
              <History size={14} />
            </button>
          )}

          {/* Import JSON */}
          <button className="wf-icon-btn" onClick={handleImportJson} title="导入 JSON">
            <FileUp size={14} />
          </button>

          {/* Settings */}
          <button className="wf-icon-btn" title="Settings" onClick={() => showMsg('Settings coming soon')}>
            <Settings size={14} />
          </button>

          {/* User */}
          <button className="wf-icon-btn" title="User" onClick={() => showMsg('User settings coming soon')}>
            <User size={14} />
          </button>
        </div>

        {statusMsg && <span className="wf-status-msg">{statusMsg}</span>}

        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      </header>

      <style>{`
        .wf-header {
          height: 56px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 24px;
          background: #18181b;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          position: relative;
          gap: 12px;
          z-index: 40;
        }

        /* Left Zone */
        .wf-header-left {
          display: flex;
          align-items: center;
          gap: 8px;
          flex: 1;
          min-width: 0;
        }

        .wf-logo-group {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-shrink: 0;
        }

        .wf-logo-icon {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: #a855f7;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }

        .wf-logo-text {
          font-size: 15px;
          font-weight: 700;
          color: #f4f4f5;
          letter-spacing: -0.02em;
        }

        .wf-sep {
          color: rgba(255, 255, 255, 0.15);
          font-size: 15px;
          font-weight: 400;
          flex-shrink: 0;
        }

        .wf-workflow-name {
          font-size: 15px;
          font-weight: 500;
          color: #a1a1aa;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          cursor: text;
          transition: color 0.12s;
          flex: 1;
          min-width: 0;
        }
        .wf-workflow-name:hover {
          color: #f4f4f5;
        }

        .wf-title-input {
          flex: 1;
          min-width: 0;
          font-size: 15px;
          font-weight: 500;
          color: #f4f4f5;
          background: #27272a;
          border: 1px solid #a855f7;
          border-radius: 6px;
          padding: 2px 8px;
          outline: none;
          font-family: inherit;
          box-shadow: 0 0 0 2px rgba(177, 161, 255, 0.15);
        }

        .wf-save-badge {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.04em;
          padding: 2px 7px;
          border-radius: 9999px;
          border: 1px solid;
          flex-shrink: 0;
        }

        .wf-save-badge--saved {
          color: #4ade80;
          background: rgba(74, 222, 128, 0.1);
          border-color: rgba(74, 222, 128, 0.25);
        }

        .wf-save-badge--dirty {
          color: #f59e0b;
          background: rgba(245, 158, 11, 0.1);
          border-color: rgba(245, 158, 11, 0.25);
        }

        .wf-save-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: currentColor;
        }

        /* Center Zone */
        .wf-header-center {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        /* PanelToggle styles */
        .panel-toggle-pill {
          display: flex;
          align-items: center;
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 6px;
          padding: 3px;
          gap: 2px;
        }

        .panel-toggle-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          border: none;
          background: transparent;
          color: #a1a1aa;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          border-radius: 6px;
          font-family: inherit;
          transition: background 0.12s, color 0.12s;
          white-space: nowrap;
        }
        .panel-toggle-btn:hover {
          background: #27272a;
          color: #f4f4f5;
        }
        .panel-toggle-btn--active {
          background: #27272a;
          color: #f4f4f5;
        }

        /* Right Zone */
        .wf-header-right {
          display: flex;
          align-items: center;
          gap: 6px;
          flex: 1;
          justify-content: flex-end;
        }

        .wf-execute-btn {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 5px 12px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          border: 1px solid;
          font-family: inherit;
          transition: opacity 0.12s, transform 0.12s;
        }
        .wf-execute-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .wf-save-btn {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 5px 12px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: transparent;
          color: #a1a1aa;
          font-family: inherit;
          transition: background 0.12s, color 0.12s, border-color 0.12s;
        }
        .wf-save-btn:hover {
          background: #27272a;
          color: #f4f4f5;
          border-color: rgba(255, 255, 255, 0.15);
        }
        .wf-save-btn:active {
          transform: scale(0.97);
        }

        /* Purple — matches homepage accent */
        .wf-execute-btn--ready {
          color: #ffffff;
          background: #a855f7;
          border-color: #a855f7;
        }
        .wf-execute-btn--ready:hover:not(:disabled) {
          background: #c084fc;
          border-color: #c084fc;
        }
        /* Stop button stays red */
        .wf-execute-btn--running {
          color: #fff;
          background: #dc2626;
          border-color: #dc2626;
        }
        .wf-execute-btn--running:hover {
          background: #b91c1c;
          border-color: #b91c1c;
        }

        .wf-publish-btn {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 5px 12px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          border: 1px solid rgba(177, 161, 255, 0.35);
          background: rgba(177, 161, 255, 0.08);
          color: #c084fc;
          font-family: inherit;
          transition: background 0.12s, color 0.12s;
        }
        .wf-publish-btn:hover:not(:disabled) {
          background: rgba(177, 161, 255, 0.18);
          color: #c084fc;
        }
        .wf-publish-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .wf-icon-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: transparent;
          color: #a1a1aa;
          cursor: pointer;
          border-radius: 6px;
          transition: background 0.12s, color 0.12s, border-color 0.12s;
        }
        .wf-icon-btn:hover {
          background: #27272a;
          color: #f4f4f5;
          border-color: rgba(255, 255, 255, 0.15);
        }

        .wf-spin {
          animation: wf-spin 0.8s linear infinite;
        }

        @keyframes wf-spin {
          to { transform: rotate(360deg); }
        }

        .wf-status-msg {
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
          bottom: -28px;
          background: #27272a;
          color: #c084fc;
          font-size: 11px;
          padding: 4px 10px;
          border-radius: 6px;
          white-space: nowrap;
          z-index: 100;
          animation: fadeIn 0.15s ease;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          border: 1px solid rgba(177, 161, 255, 0.15);
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </>
  );
};
