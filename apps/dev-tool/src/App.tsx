// Prism Editor - Developer Tool App

import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ReactFlowProvider } from '@xyflow/react';
import { DevToolLayout } from './layouts/DevToolLayout';
import { NodePanel } from './components/NodePanel';
import { WorkflowCanvas } from './components/canvas/WorkflowCanvas';
import { ParamPanel as Inspector } from './components/ParamPanel';
import { WorkflowHeader } from './components/header/WorkflowHeader';
import { WorkflowsView } from './components/WorkflowsView';
import { NewWorkflowModal } from './components/NewWorkflowModal';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { PublicRoute, AuthGuard } from './components/AuthGuard';
import { useAuthStore } from './store/authStore';
import {
  cleanupStorage,
} from './storage';
import { ErrorBoundary } from '@prism/shared-ui';

// --- Editor page (rendered inside DevToolLayout) ---
function EditorPage() {
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  return (
    <>
      <DevToolLayout
        header={
          <WorkflowHeader onPublishClick={() => {}} publishStatus="idle" />
        }
        left={<NodePanel />}
        right={<Inspector />}
      >
        <ReactFlowProvider>
          <WorkflowCanvas />
        </ReactFlowProvider>
      </DevToolLayout>

      <NewWorkflowModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={() => setIsModalOpen(false)}
      />
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
