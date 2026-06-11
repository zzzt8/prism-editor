// Prism Editor - User App
//
// Hash-based routing (no router library dependency):
//   #/               → published workflow list page
//   #/workflow/:id   → published workflow run page

import React, { useEffect } from 'react';
import { useSelectedWorkflowStore } from './modules/selection/selectedWorkflowStore';
import { parseRoute, navigateToList } from './router';
import { WorkflowListPage } from './pages/WorkflowListPage';
import { WorkflowRunPage } from './pages/WorkflowRunPage';
import { ErrorBoundary } from '@prism/shared-ui';

function App() {
  const { selectWorkflow, clearSelection, selectedWorkflow } = useSelectedWorkflowStore();

  useEffect(() => {
    const syncFromRoute = () => {
      const route = parseRoute();
      if (route.kind === 'run') {
        selectWorkflow(route.publishedId);
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

  useEffect(() => {
    const route = parseRoute();
    if (route.kind === 'run' && !selectedWorkflow) {
      navigateToList();
    }
  }, [selectedWorkflow]);

  const route = parseRoute();
  return (
    <ErrorBoundary>
      {route.kind === 'run' && <WorkflowRunPage />}
      {route.kind === 'list' && <WorkflowListPage />}
    </ErrorBoundary>
  );
}

export default App;
