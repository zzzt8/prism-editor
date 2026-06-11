// Prism Editor - User App
//
// Hash-based routing (no router library dependency):
//   #/               → published workflow list page
//   #/workflow/:id   → published workflow run page
//   #/templates/     → product template list page (template store)
//   #/template/:id    → product template run page

import React, { useEffect } from 'react';
import { useSelectedWorkflowStore } from './modules/selection/selectedWorkflowStore';
import { parseRoute, navigateToList } from './router';
import { WorkflowListPage } from './pages/WorkflowListPage';
import { WorkflowRunPage } from './pages/WorkflowRunPage';
import { ProductTemplateListPage } from './pages/ProductTemplateListPage';
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
      {route.kind === 'run' && <WorkflowRunPage />}
      {route.kind === 'template-list' && <ProductTemplateListPage />}
      {route.kind === 'template-run' && <ProductTemplateRunPage />}
      {route.kind === 'list' && <WorkflowListPage />}
    </ErrorBoundary>
  );
}

function ProductTemplateRunPage() {
  return <div className="home-layout"><div className="ua-page"><p>ProductTemplate Run Page (Task 3.3)</p></div></div>;
}

export default App;

