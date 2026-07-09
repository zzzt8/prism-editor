// WorkflowHeader - editor top bar

import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Play, Square, CheckCircle2,
  Loader2, FileUp, Settings, User, Save,
} from 'lucide-react';
import { useCanvasStore } from '../../store/canvasStore';
import { useAppStore } from '../../store/appStore';
import { PanelToggle } from './PanelToggle';
import './WorkflowHeaderStyles.css';

interface WorkflowHeaderProps {
  onPublishClick: () => void;
  publishStatus: 'idle' | 'loading' | 'done';
}

type LiveBadgeState = 'hidden' | 'idle' | 'debouncing' | 'running';

export const WorkflowHeader: React.FC<WorkflowHeaderProps> = ({
  onPublishClick,
  publishStatus,
}) => {
  const workflowMeta = useCanvasStore((s) => s.workflowMeta);
  const isDirty = useCanvasStore((s) => s.isDirty);
  const nodes = useCanvasStore((s) => s.nodes);
  const executionStatus = useCanvasStore((s) => s._executionStatus);
  const liveDebouncing = useCanvasStore((s) => s._liveDebouncing);
  const executeWorkflow = useCanvasStore((s) => s.executeWorkflow);
  const cancelExecution = useCanvasStore((s) => s.cancelExecution);
  const importWorkflowFromFile = useCanvasStore((s) => s.importWorkflowFromFile);
  const renameWorkflow = useCanvasStore((s) => s.renameWorkflow);
  const saveWorkflow = useCanvasStore((s) => s.saveWorkflow);
  const livePreviewEnabled = useAppStore((s) => s.livePreviewEnabled);

  const navigate = useNavigate();

  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(workflowMeta.name);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const statusMsgTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isRunning = executionStatus === 'running';
  const isFrontendWorkflow = workflowMeta.targetPlatform === 'browser';

  const liveBadgeState: LiveBadgeState = (() => {
    if (!isFrontendWorkflow) return 'hidden';
    if (!livePreviewEnabled) return 'hidden';
    if (isRunning) return 'running';
    if (liveDebouncing) return 'debouncing';
    return 'idle';
  })();

  const liveBadgeLabel = (() => {
    switch (liveBadgeState) {
      case 'running': return 'Live · 合成中…';
      case 'debouncing': return 'Live · 等待稳定中';
      case 'idle': return 'Live';
      default: return '';
    }
  })();

  const executeButtonLabel = (() => {
    if (isRunning) return '停止';
    if (isFrontendWorkflow) return '重跑';
    return 'Execute';
  })();

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

          {liveBadgeState !== 'hidden' && (
            <span
              className={`wf-live-badge wf-live-badge--${liveBadgeState}`}
              data-testid="wf-live-badge"
              title={
                liveBadgeState === 'running'
                  ? '正在执行实时合成'
                  : liveBadgeState === 'debouncing'
                    ? '参数稳定后将自动合成'
                    : '实时合成已启用'
              }
            >
              <span className="wf-live-dot" />
              {liveBadgeLabel}
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
            title={isRunning ? '停止执行' : isFrontendWorkflow ? '跳过防抖立即执行' : '执行工作流'}
            data-testid="wf-execute-btn"
          >
            {isRunning ? (
              <Square size={14} fill="currentColor" />
            ) : (
              <Play size={14} fill="currentColor" />
            )}
            {executeButtonLabel}
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

          {/* Import JSON */}
          <button className="wf-icon-btn" onClick={handleImportJson} title="导入 JSON">
            <FileUp size={14} />
          </button>

          {/* Settings */}
          <button className="wf-icon-btn" title="Settings" onClick={() => navigate('/settings')}>
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

    </>
  );
};
