// Prism Editor - Developer Tool App

import React, { useState } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { DevToolLayout } from './layouts/DevToolLayout';
import { NodePanel } from './components/NodePanel';
import { WorkflowCanvas } from './components/canvas/WorkflowCanvas';
import { ParamPanel as Inspector } from './components/ParamPanel';
import { WorkflowHeader } from './components/header/WorkflowHeader';
import { PublishDialog } from './components/header/PublishDialog';
import { WorkflowsView } from './components/WorkflowsView';
import { NewWorkflowModal } from './components/NewWorkflowModal';
import { useAppStore } from './store/appStore';

function App() {
  const view = useAppStore((s) => s.view);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [publishStatus, setPublishStatus] = useState<'idle' | 'loading' | 'done'>('idle');

  const handlePublishClick = () => {
    setPublishStatus('loading');
    setTimeout(() => {
      setPublishStatus('done');
      setShowPublishDialog(true);
    }, 800);
  };

  return (
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
  );
}

export default App;

