// Prism Editor - Developer Tool App

import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ReactFlowProvider } from '@xyflow/react';
import { DevToolLayout } from './layouts/DevToolLayout';
import { NodePanel } from './components/NodePanel';
import { WorkflowCanvas } from './components/canvas/WorkflowCanvas';
import { ParamPanel as Inspector } from './components/ParamPanel';
import { WorkflowHeader } from './components/header/WorkflowHeader';
import { PublishDialog } from './components/header/PublishDialog';
import { ProductTemplateEditor } from './components/ProductTemplateEditor';
import { WorkflowsView } from './components/WorkflowsView';
import { NewWorkflowModal } from './components/NewWorkflowModal';
import { VersionHistory } from './components/VersionHistory';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { PublicRoute, AuthGuard } from './components/AuthGuard';
import { useAuthStore } from './store/authStore';
import { useCanvasStore } from './store/canvasStore';
import {
  IndexedDBStorageAdapter,
  ApiStorageAdapter,
  activeStorageAdapter,
  cleanupStorage,
} from './storage';
import { ErrorBoundary } from '@prism/shared-ui';

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

// --- Editor page (rendered inside DevToolLayout) ---
function EditorPage() {
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [showPublishDialog, setShowPublishDialog] = React.useState(false);
  const [publishStatus, setPublishStatus] = React.useState<'idle' | 'loading' | 'done'>('idle');
  const [showVersionHistory, setShowVersionHistory] = React.useState(false);

  const workflowMeta = useCanvasStore((s) => s.workflowMeta);

  const handlePublishClick = () => {
    setPublishStatus('loading');
    setTimeout(() => {
      setPublishStatus('done');
      setShowPublishDialog(true);
    }, 800);
  };

  return (
    <>
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

      {showPublishDialog && (
        <PublishDialog
          onClose={() => {
            setShowPublishDialog(false);
            setPublishStatus('idle');
          }}
        />
      )}

      <NewWorkflowModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={() => setIsModalOpen(false)}
      />

      <ProductTemplateEditor />

      {showVersionHistory && (
        <VersionHistoryWrapper
          workflowId={workflowMeta.id}
          currentVersion={workflowMeta.version}
          onClose={() => setShowVersionHistory(false)}
          onRollbackComplete={async () => {
            const { workflowMeta: meta } = useCanvasStore.getState();
            if (meta.id) {
              try {
                const content = await activeStorageAdapter.load(meta.id);
                useCanvasStore.getState().loadWorkflow(content);
              } catch {
                // If load fails, just refresh
              }
            }
          }}
        />
      )}
    </>
  );
}

// --- Root / Workflows page ---
function HomePage() {
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  return (
    <>
      <WorkflowsView onNewWorkflow={() => setIsModalOpen(true)} />
      <NewWorkflowModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={() => setIsModalOpen(false)}
      />
    </>
  );
}

// --- App with routes ---
function AppRoutes() {
  return (
    <Routes>
      {/* Public routes — redirect to / if already authenticated */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute>
            <RegisterPage />
          </PublicRoute>
        }
      />

      {/* Protected routes */}
      <Route
        path="/"
        element={
          <AuthGuard>
            <HomePage />
          </AuthGuard>
        }
      />
      <Route
        path="/workflow/:workflowId"
        element={
          <AuthGuard>
            <EditorPage />
          </AuthGuard>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  const fetchCurrentUser = useAuthStore((s) => s.fetchCurrentUser);
  const _isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    fetchCurrentUser().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      cleanupStorage();
    };
  }, []);

  return (
    <ErrorBoundary>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <AppRoutes />
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
