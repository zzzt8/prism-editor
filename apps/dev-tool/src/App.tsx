// Prism Editor - Developer Tool App

import React from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { NodePanel } from './components/NodePanel';
import { WorkflowCanvas } from './components/canvas/WorkflowCanvas';
import { ParamPanel } from './components/ParamPanel';
import { WorkflowHeader } from './components/header/WorkflowHeader';

function App() {
  return (
    <div className="dev-tool-layout">
      <WorkflowHeader />

      <div className="dev-tool-body">
        <NodePanel />
        <ReactFlowProvider>
          <WorkflowCanvas />
        </ReactFlowProvider>
        <ParamPanel />
      </div>
    </div>
  );
}

export default App;
