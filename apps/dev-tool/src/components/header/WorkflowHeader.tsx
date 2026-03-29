// WorkflowHeader - top bar with workflow management actions

import React, { useState, useRef } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { useWorkflowStore } from '../../store/workflowStore';
import { SaveDialog } from './SaveDialog';
import { OpenDialog } from './OpenDialog';
import { PublishDialog } from './PublishDialog';

interface WorkflowHeaderProps {
  leftVisible?: boolean;
  onToggleLeft?: () => void;
  rightVisible?: boolean;
  onToggleRight?: () => void;
}

export const WorkflowHeader: React.FC<WorkflowHeaderProps> = ({
  leftVisible = true,
  onToggleLeft,
  rightVisible = true,
  onToggleRight,
}) => {
  const workflowMeta = useCanvasStore((s) => s.workflowMeta);
  const isDirty = useCanvasStore((s) => s.isDirty);
  const nodes = useCanvasStore((s) => s.nodes);
  const executionStatus = useCanvasStore((s) => s._executionStatus);
  const currentNodeId = useCanvasStore((s) => s._currentNodeId);
  const executeWorkflow = useCanvasStore((s) => s.executeWorkflow);
  const cancelExecution = useCanvasStore((s) => s.cancelExecution);
  const newWorkflow = useCanvasStore((s) => s.loadWorkflow);
  const importWorkflowFromFile = useCanvasStore((s) => s.importWorkflowFromFile);
  const exportWorkflowAsJson = useCanvasStore((s) => s.exportWorkflowAsJson);
  const loadSavedWorkflows = useWorkflowStore((s) => s.loadSavedWorkflows);

  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showOpenDialog, setShowOpenDialog] = useState(false);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [executingMsg, setExecutingMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const showMsg = (msg: string) => {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(null), 2500);
  };

  const handleNew = () => {
    if (isDirty && !window.confirm('当前有未保存的更改，确定要新建工作流吗？')) return;
    newWorkflow({
      id: crypto.randomUUID(),
      name: 'Untitled Workflow',
      version: '1.0.0',
      nodes: [],
      connections: [],
      inputs: [],
      outputs: [],
      metadata: { createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    });
  };

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
    if (executionStatus === 'running') {
      cancelExecution();
      return;
    }
    if (nodes.length === 0) {
      showMsg('画布上没有节点');
      return;
    }
    setExecutingMsg('执行中…');
    try {
      const result = await executeWorkflow();
      if (result.status === 'done') {
        showMsg('执行完成');
      } else if (result.status === 'cancelled') {
        showMsg('已取消');
      } else {
        showMsg(`执行出错: ${result.error}`);
      }
    } catch (err) {
      showMsg(`执行出错: ${String(err)}`);
    } finally {
      setExecutingMsg(null);
    }
  };

  const isRunning = executionStatus === 'running';
  const executeLabel = isRunning ? '停止' : '执行';
  const executeTitle = isRunning ? '停止执行' : '执行工作流';

  return (
    <>
      <header className="dev-tool-header">
        <div className="dev-tool-header-left">
          <h1 className="dev-tool-title">Prism Editor</h1>
          <span className="dev-tool-subtitle">
            {workflowMeta.name}
            {isDirty && <span className="dirty-dot" title="有未保存的更改">●</span>}
          </span>
        </div>

        <div className="dev-tool-header-actions">
          {onToggleLeft && (
            <button
              className={`header-panel-toggle ${leftVisible ? 'header-panel-toggle--active' : ''}`}
              onClick={onToggleLeft}
              title={leftVisible ? '隐藏节点面板' : '显示节点面板'}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <path d="M9 3v18"/>
              </svg>
              <span>节点</span>
            </button>
          )}

          {onToggleRight && (
            <button
              className={`header-panel-toggle ${rightVisible ? 'header-panel-toggle--active' : ''}`}
              onClick={onToggleRight}
              title={rightVisible ? '隐藏属性面板' : '显示属性面板'}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <path d="M15 3v18"/>
              </svg>
              <span>属性</span>
            </button>
          )}

          <div className="header-divider" />
          <button className="header-btn" onClick={handleNew} title="新建工作流">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="12" y1="18" x2="12" y2="12"/>
              <line x1="9" y1="15" x2="15" y2="15"/>
            </svg>
            新建
          </button>

          <button className="header-btn" onClick={() => { loadSavedWorkflows(); setShowOpenDialog(true); }} title="打开工作流">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            </svg>
            打开
          </button>

          <button className="header-btn header-btn-primary" onClick={() => setShowSaveDialog(true)} title="保存工作流">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
              <polyline points="17 21 17 13 7 13 7 21"/>
              <polyline points="7 3 7 8 15 8"/>
            </svg>
            保存
          </button>

          <button className="header-btn header-btn-publish" onClick={() => setShowPublishDialog(true)} title="发布工作流">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="17 1 21 5 17 9"/>
              <path d="M3 11V9a4 4 0 0 1 4-4h14"/>
              <polyline points="7 23 3 19 7 15"/>
              <path d="M21 13v2a4 4 0 0 1-4 4H3"/>
            </svg>
            发布
          </button>

          <button
            className={`header-btn header-btn-execute ${isRunning ? 'header-btn-execute--running' : 'header-btn-execute--ready'}`}
            onClick={handleExecute}
            disabled={!isRunning && nodes.length === 0}
            title={executeTitle}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {isRunning ? (
                <>
                  <rect x="6" y="6" width="12" height="12" rx="1"/>
                </>
              ) : (
                <polygon points="5 3 19 12 5 21 5 3"/>
              )}
            </svg>
            {executeLabel}
            {executingMsg && <span className="execute-spinner" />}
          </button>

          <div className="header-divider" />

          <button className="header-btn" onClick={exportWorkflowAsJson} title="导出为 JSON 文件">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            导出
          </button>

          <button className="header-btn" onClick={handleImportJson} title="从 JSON 文件导入">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            导入
          </button>
        </div>

        {statusMsg && <span className="header-status">{statusMsg}</span>}

        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      </header>

      {showSaveDialog && <SaveDialog onClose={() => setShowSaveDialog(false)} />}
      {showOpenDialog && <OpenDialog onClose={() => setShowOpenDialog(false)} />}
      {showPublishDialog && <PublishDialog onClose={() => setShowPublishDialog(false)} />}
    </>
  );
};
