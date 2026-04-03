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
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { PublicRoute } from './components/AuthGuard';
import { useAuthStore } from './store/authStore';
import { useAppStore } from './store/appStore';
import { useCanvasStore } from './store/canvasStore';
import { activeStorageAdapter, cleanupStorage } from './storage';
import { ErrorBoundary } from '@prism/shared-ui';

type AuthView = 'login' | 'register' | 'authenticated';

function App() {
  const view = useAppStore((s) => s.view);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [publishStatus, setPublishStatus] = useState<'idle' | 'loading' | 'done'>('idle');
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
        </>
      )}
    </ErrorBoundary>
  );
}

export default App;