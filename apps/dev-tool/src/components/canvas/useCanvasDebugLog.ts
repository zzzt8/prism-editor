// useCanvasDebugLog — debug logging for canvas nodes
// Logs node structure on every nodes change

import { useEffect } from 'react';
import { useCanvasStore } from '../../store/canvasStore';

export function useCanvasDebugLog() {
  useEffect(() => {
    const unsub = useCanvasStore.subscribe((state) => {
      console.log('[DBG WorkflowCanvas] nodes:', JSON.stringify(state.nodes.map((n) => ({
        id: n.id, type: n.type, position: n.position,
        label: n.data.label, nodeType: n.data.nodeType,
        hasDefinition: !!n.data.definition,
      })), null, 2));
    });
    return unsub;
  }, []);
}
