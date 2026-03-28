// Prism Editor - Developer Tool App

import React, { useState } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { DevToolLayout } from './layouts/DevToolLayout';
import { NodePanel } from './components/NodePanel';
import { WorkflowCanvas } from './components/canvas/WorkflowCanvas';
import { ParamPanel } from './components/ParamPanel';
import { WorkflowHeader } from './components/header/WorkflowHeader';

function App() {
  const [leftVisible, setLeftVisible] = useState(true);
  const [rightVisible, setRightVisible] = useState(true);

  return (
    <DevToolLayout
      header={<WorkflowHeader leftVisible={leftVisible} onToggleLeft={() => setLeftVisible((v) => !v)} rightVisible={rightVisible} onToggleRight={() => setRightVisible((v) => !v)} />}
      left={<NodePanel />}
      right={<ParamPanel />}
      leftVisible={leftVisible}
      rightVisible={rightVisible}
    >
      <ReactFlowProvider>
        <WorkflowCanvas />
      </ReactFlowProvider>
    </DevToolLayout>
  );
}

export default App;
