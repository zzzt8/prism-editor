// Prism Editor - Developer Tool App

import React, { useState, useEffect } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { DevToolLayout } from './layouts/DevToolLayout';
import { NodePanel } from './components/NodePanel';
import { WorkflowCanvas } from './components/canvas/WorkflowCanvas';
import { ParamPanel as Inspector } from './components/ParamPanel';
import { WorkflowHeader } from './components/header/WorkflowHeader';
import { PublishDialog } from './components/header/PublishDialog';
import { WorkflowsView } from './components/WorkflowsView';
import { NewWorkflowModal } from './components/NewWorkflowModal';
import { VersionHistory } from './components/VersionHistory';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { PublicRoute } from './components/AuthGuard';
import { useAuthStore } from './store/authStore';
import { useAppStore } from './store/appStore';
import { useCanvasStore } from './store/canvasStore';
import { activeStorageAdapter, ApiStorageAdapter, MigrationStorageAdapter, IndexedDBStorageAdapter, cleanupStorage } from './storage';
import { ErrorBoundary } from './components/common/ErrorBoundary';

type AuthView = 'login' | 'register' | 'authenticated';

function App() {
  const view = useAppStore((s) => s.view);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [publishStatus, setPublishStatus] = useState<'idle' | 'loading' | 'done'>('idle');
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [authView, setAuthView] = useState<AuthView>('login');

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const fetchCurrentUser = useAuthStore((s) => s.fetchCurrentUser);
  const workflowMeta = useCanvasStore((s) => s.workflowMeta);
  const loadWorkflow = useCanvasStore((s) => s.loadWorkflow);

  useEffect(() => {
    fetchCurrentUser().catch(() => {});
  }, []);

  useEffect(() => {
    return () => {
      cleanupStorage();
    };
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      setAuthView('authenticated');
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (useAuthStore.persist.hasHydrated() && useAuthStore.getState().isAuthenticated) {
      setAuthView('authenticated');
    }
    return useAuthStore.persist.onFinishHydration((state) => {
      if (state.isAuthenticated) {
        setAuthView('authenticated');
      }
    });
  }, []);

  const handlePublishClick = () => {
    setPublishStatus('loading');
    setTimeout(() => {
      setPublishStatus('done');
      setShowPublishDialog(true);
    }, 800);
  };

  const renderAuthPage = () => {
    if (authView === 'login') {
      return (
        <PublicRoute redirectTo="/editor">
          <LoginPage onSwitchToRegister={() => setAuthView('register')} />
        </PublicRoute>
      );
    }

    if (authView === 'register') {
      return (
        <PublicRoute redirectTo="/editor">
          <RegisterPage onSwitchToLogin={() => setAuthView('login')} />
        </PublicRoute>
      );
    }

    return null;
  };

  return (
    <ErrorBoundary>
      {authView !== 'authenticated' ? (
        renderAuthPage()
      ) : (
        <>
          {view === 'workflows' ? (
            <WorkflowsView onNewWorkflow={() => setIsModalOpen(true)} />
          ) : (
            <DevToolLayout
              header={
                <WorkflowHeader
                  onPublishClick={handlePublishClick}
                  publishStatus={publishStatus}
                  onVersionHistoryClick={() => setShowVersionHistory(true)}
                />
              }
              left={<NodePanel />}
              right={<Inspector />}
            >
              <ReactFlowProvider>
                <WorkflowCanvas />
              </ReactFlowProvider>
            </DevToolLayout>
          )}

          {showPublishDialog && (
            <PublishDialog onClose={() => { setShowPublishDialog(false); setPublishStatus('idle'); }} />
          )}

          {showVersionHistory && (
            <VersionHistory
              workflowId={workflowMeta.id}
              currentVersion={workflowMeta.version}
              onClose={() => setShowVersionHistory(false)}
              onRollbackComplete={async () => {
                // Reload the workflow to get rolled-back content
                if (workflowMeta.id) {
                  try {
                    const content = await activeStorageAdapter.load(workflowMeta.id);
                    loadWorkflow(content);
                  } catch {
                    // If load fails, just refresh
                  }
                }
              }}
              getVersions={async (page = 1, limit = 20) => {
                if (activeStorageAdapter instanceof MigrationStorageAdapter) {
                  return { data: [], pagination: { page, limit, total: 0, totalPages: 0 } };
                }
                if (activeStorageAdapter instanceof IndexedDBStorageAdapter) {
                  return (activeStorageAdapter as IndexedDBStorageAdapter).getVersions(workflowMeta.id, page, limit);
                }
                return (activeStorageAdapter as ApiStorageAdapter).getVersions(workflowMeta.id, page, limit);
              }}
              getVersionContent={async (versionId) => {
                if (activeStorageAdapter instanceof MigrationStorageAdapter) {
                  throw new Error('版本历史暂不可用（离线模式）');
                }
                if (activeStorageAdapter instanceof IndexedDBStorageAdapter) {
                  return (activeStorageAdapter as IndexedDBStorageAdapter).getVersionContent(workflowMeta.id, versionId);
                }
                return (activeStorageAdapter as ApiStorageAdapter).getVersionContent(workflowMeta.id, versionId);
              }}
              diffVersions={async (fromId, toId) => {
                if (activeStorageAdapter instanceof MigrationStorageAdapter) {
                  throw new Error('版本对比暂不可用（离线模式）');
                }
                if (activeStorageAdapter instanceof IndexedDBStorageAdapter) {
                  return (activeStorageAdapter as IndexedDBStorageAdapter).diffVersions(workflowMeta.id, fromId, toId);
                }
                return (activeStorageAdapter as ApiStorageAdapter).diffVersions(workflowMeta.id, fromId, toId);
              }}
              rollbackWorkflow={async (versionId, newVersion) => {
                if (activeStorageAdapter instanceof MigrationStorageAdapter) {
                  throw new Error('回滚暂不可用（离线模式）');
                }
                if (activeStorageAdapter instanceof IndexedDBStorageAdapter) {
                  return (activeStorageAdapter as IndexedDBStorageAdapter).rollbackWorkflow(workflowMeta.id, versionId, newVersion);
                }
                await (activeStorageAdapter as ApiStorageAdapter).rollbackWorkflow(workflowMeta.id, versionId, newVersion);
              }}
            />
          )}

          <NewWorkflowModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onCreated={() => setIsModalOpen(false)}
          />
        </>
      )}
    </ErrorBoundary>
  );
}

export default App;