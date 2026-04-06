// Prism Editor - User App
//
// Hash-based routing (no router library dependency):
//   #/               → list page
//   #/workflow/:id   → run page

import React, { useEffect } from 'react';
import { useSelectedWorkflowStore } from './modules/selection/selectedWorkflowStore';
import { parseRoute, navigateToList } from './router';
import { WorkflowListPage } from './pages/WorkflowListPage';
import { WorkflowRunPage } from './pages/WorkflowRunPage';
import { ErrorBoundary } from '@prism/shared-ui';

function App() {
  const { selectWorkflow, clearSelection, selectedWorkflow } = useSelectedWorkflowStore();

  // Sync route → store on mount and on every hash change.
  // Do NOT depend on selectedWorkflow: when route is #/workflow/:id, selectWorkflow()
  // updates the store and would re-run this effect, calling selectWorkflow again in a loop.
  useEffect(() => {
    const syncFromRoute = () => {
      const route = parseRoute();
      if (route.kind === 'run') {
        selectWorkflow(route.sourceId);
      } else {
        const hasSelection = useSelectedWorkflowStore.getState().selectedWorkflow != null;
        if (hasSelection) {
          clearSelection();
        }
      }
    };

    syncFromRoute();
    window.addEventListener('hashchange', syncFromRoute);
    return () => window.removeEventListener('hashchange', syncFromRoute);
  }, [selectWorkflow, clearSelection]);

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

