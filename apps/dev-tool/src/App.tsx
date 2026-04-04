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
import { activeStorageAdapter, IndexedDBStorageAdapter, ApiStorageAdapter, cleanupStorage } from './storage';
import { ErrorBoundary } from '@prism/shared-ui';

type AuthView = 'login' | 'register' | 'authenticated';

// Wrapper component to connect VersionHistory with storage layer
function VersionHistoryWrapper({
  workflowId,
  currentVersion,
  onClose,
  onRollbackComplete,
}: {
  workflowId: string;
  currentVersion: string;
  onClose: () => void;
  onRollbackComplete?: () => void;
}) {
  return (
    <VersionHistory
      workflowId={workflowId}
      currentVersion={currentVersion}
      onClose={onClose}
      onRollbackComplete={onRollbackComplete}
      getVersions={async (page = 1, limit = 20) => {
        if (activeStorageAdapter instanceof IndexedDBStorageAdapter) {
          return activeStorageAdapter.getVersions(workflowId, page, limit);
        }
        if (activeStorageAdapter instanceof ApiStorageAdapter) {
          return activeStorageAdapter.getVersions(workflowId, page, limit);
        }
        return { data: [], pagination: { page, limit, total: 0, totalPages: 0 } };
      }}
      getVersionContent={async (versionId: string) => {
        if (activeStorageAdapter instanceof IndexedDBStorageAdapter) {
          return activeStorageAdapter.getVersionContent(workflowId, versionId);
        }
        if (activeStorageAdapter instanceof ApiStorageAdapter) {
          return activeStorageAdapter.getVersionContent(workflowId, versionId);
        }
        throw new Error('版本历史暂不可用');
      }}
      diffVersions={async (fromId: string, toId: string) => {
        if (activeStorageAdapter instanceof IndexedDBStorageAdapter) {
          return activeStorageAdapter.diffVersions(workflowId, fromId, toId);
        }
        if (activeStorageAdapter instanceof ApiStorageAdapter) {
          return activeStorageAdapter.diffVersions(workflowId, fromId, toId);
        }
        throw new Error('版本对比暂不可用');
      }}
      rollbackWorkflow={async (versionId: string, newVersion?: string) => {
        if (activeStorageAdapter instanceof IndexedDBStorageAdapter) {
          return activeStorageAdapter.rollbackWorkflow(workflowId, versionId, newVersion);
        }
        if (activeStorageAdapter instanceof ApiStorageAdapter) {
          return activeStorageAdapter.rollbackWorkflow(workflowId, versionId, newVersion);
        }
        throw new Error('回滚暂不可用');
      }}
    />
  );
}

function App() {
  const view = useAppStore((s) => s.view);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [publishStatus, setPublishStatus] = useState<'idle' | 'loading' | 'done'>('idle');
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [authView, setAuthView] = useState<AuthView>('login');

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const fetchCurrentUser = useAuthStore((s) => s.fetchCurrentUser);

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

  const handleVersionHistoryClick = () => {
    setShowVersionHistory(true);
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
                  onVersionHistoryClick={handleVersionHistoryClick}
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

          <NewWorkflowModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onCreated={() => setIsModalOpen(false)}
          />

          {showVersionHistory && (
            <VersionHistoryWrapper
              workflowId={useCanvasStore.getState().workflowMeta.id}
              currentVersion={useCanvasStore.getState().workflowMeta.version}
              onClose={() => setShowVersionHistory(false)}
              onRollbackComplete={async () => {
                // Reload the workflow to get rolled-back content
                const { workflowMeta } = useCanvasStore.getState();
                if (workflowMeta.id) {
                  try {
                    const content = await activeStorageAdapter.load(workflowMeta.id);
                    useCanvasStore.getState().loadWorkflow(content);
                  } catch {
                    // If load fails, just refresh
                  }
                }
              }}
            />
          )}
        </>
      )}
    </ErrorBoundary>
  );
}

export default App;