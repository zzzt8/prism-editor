// Prism Editor - User App
//
// Hash-based routing (no router library dependency):
//   #/               → list page
//   #/workflow/:id   → run page

import React, { useEffect } from 'react';
import { useUserAppStore } from './store/publishedStore';
import { parseRoute, navigateToList } from './router';
import { WorkflowListPage } from './pages/WorkflowListPage';
import { WorkflowRunPage } from './pages/WorkflowRunPage';
import { ErrorBoundary } from './components/common/ErrorBoundary';

function App() {
  const { selectWorkflow, clearSelection, selectedWorkflow } = useUserAppStore();

  // Sync route → store on mount and on every hash change
  useEffect(() => {
    const syncFromRoute = () => {
      const route = parseRoute();
      if (route.kind === 'run') {
        selectWorkflow(route.sourceId);
      } else {
        if (selectedWorkflow) clearSelection();
      }
    };

    // Run once on mount
    syncFromRoute();

    // Listen to hash changes
    window.addEventListener('hashchange', syncFromRoute);
    return () => window.removeEventListener('hashchange', syncFromRoute);
  }, [selectedWorkflow, selectWorkflow, clearSelection]);

  // Also sync store → route when selection changes programmatically
  useEffect(() => {
    const route = parseRoute();
    if (route.kind === 'run' && !selectedWorkflow) {
      navigateToList();
    }
  }, [selectedWorkflow]);

  const route = parseRoute();
  return (
    <ErrorBoundary>
      {route.kind === 'run' ? <WorkflowRunPage /> : <WorkflowListPage />}
    </ErrorBoundary>
  );
}

export default App;

