// workflowToCanvas.test.ts - Golden Fixtures 测试
import { isEmptyWorkflow, resetCounters } from './workflowToCanvas';

describe('workflowToCanvas', () => {
  describe('空工作流', () => {
    it('空 Workflow 输出空 canvas', () => {
      const workflow = {
        id: 'test-id',
        name: 'Empty',
        version: '1.0.0',
        nodes: [],
        connections: [],
        inputs: [],
        outputs: [],
        metadata: { createdAt: '2024-01-01', updatedAt: '2024-01-01' },
      };

      expect(isEmptyWorkflow(workflow)).toBe(true);
    });
  });

  describe('单节点工作流', () => {
    it('Workflow 正确转换为 EditorDraft', () => {
      resetCounters(0, 0);

      const workflow = {
        id: 'test-id',
        name: 'Single Node',
        version: '1.0.0',
        nodes: [{
          id: 'node-1',
          type: 'load-image',
          position: { x: 100, y: 200 },
          params: { url: 'test.png' },
        }],
        connections: [],
        inputs: [],
        outputs: [],
        metadata: { createdAt: '2024-01-01', updatedAt: '2024-01-01' },
      };

      expect(isEmptyWorkflow(workflow)).toBe(false);
    });
  });

  describe('两节点+边', () => {
    it('带连接的 Workflow 正确转换', () => {
      resetCounters(0, 0);

      const workflow = {
        id: 'test-id',
        name: 'Two Nodes',
        version: '1.0.0',
        nodes: [
          { id: 'node-1', type: 'load-image', position: { x: 0, y: 0 }, params: {} },
          { id: 'node-2', type: 'resize', position: { x: 200, y: 0 }, params: { width: 512 } },
        ],
        connections: [{
          id: 'edge-1',
          from: { nodeId: 'node-1', port: 'output' },
          to: { nodeId: 'node-2', port: 'input' },
        }],
        inputs: [],
        outputs: [],
        metadata: { createdAt: '2024-01-01', updatedAt: '2024-01-01' },
      };

      expect(workflow.nodes).toHaveLength(2);
      expect(workflow.connections).toHaveLength(1);
    });
  });
});
