// Prism Editor - Developer Tool App

import React from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { NodePanel } from './components/NodePanel';
import { WorkflowCanvas } from './components/canvas/WorkflowCanvas';

function App() {
  return (
    <div className="dev-tool-layout">
      <header className="dev-tool-header">
        <h1 className="dev-tool-title">Prism Editor</h1>
        <span className="dev-tool-subtitle">开发者工具</span>
      </header>

      <div className="dev-tool-body">
        <ReactFlowProvider>
          <NodePanel />
          <WorkflowCanvas />
        </ReactFlowProvider>
      </div>
    </div>
  );
}

export default App;
