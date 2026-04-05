// canvasToWorkflow.test.ts - Golden Fixtures 测试
import { canvasToWorkflow, isEmptyCanvas } from './canvasToWorkflow';
import { PortDataType } from '@prism/shared-types';

describe('canvasToWorkflow', () => {
  describe('空画布', () => {
    it('空 CanvasNode[] 输出空 Workflow.nodes', () => {
      const nodes: any[] = [];
      const edges: any[] = [];
      const workflowMeta = { id: 'test-id', name: 'Test', version: '1.0.0' };

      const result = canvasToWorkflow(nodes, edges, workflowMeta);

      expect(result.nodes).toEqual([]);
      expect(result.connections).toEqual([]);
    });
  });

  describe('单节点画布', () => {
    it('canvasToWorkflow 生成正确的 Workflow', () => {
      const nodes = [{
        id: 'node-1',
        type: 'prismNode',
        position: { x: 100, y: 200 },
        data: {
          label: 'Load Image',
          nodeType: 'load-image',
          params: { url: 'test.png' },
        },
      }];
      const edges: any[] = [];
      const workflowMeta = { id: 'test-id', name: 'Single Node', version: '1.0.0' };

      const result = canvasToWorkflow(nodes, edges, workflowMeta);

      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0]).toEqual({
        id: 'node-1',
        type: 'load-image',
        position: { x: 100, y: 200 },
        params: { url: 'test.png' },
      });
      expect(result.metadata.updatedAt).toBeDefined();
    });
  });

  describe('两节点+边', () => {
    it('带 extraInputs 的节点正确转换', () => {
      const nodes = [{
        id: 'node-1',
        type: 'prismNode',
        position: { x: 0, y: 0 },
        data: {
          label: 'Load Image',
          nodeType: 'load-image',
          params: {},
          extraInputs: [{ id: 'extra-1', name: 'extra', type: 'image' as const, dataType: PortDataType.IMAGE }],
        },
      }];
      const edges: any[] = [];
      const workflowMeta = { id: 'test-id', name: 'Test', version: '1.0.0' };

      const result = canvasToWorkflow(nodes, edges, workflowMeta);

      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].params).toEqual({});
    });
  });

  describe('isEmptyCanvas', () => {
    it('空数组返回 true', () => {
      expect(isEmptyCanvas([])).toBe(true);
    });
    it('有节点返回 false', () => {
      expect(isEmptyCanvas([{ id: 'node-1', position: { x: 0, y: 0 }, data: { label: 'Test', nodeType: 'test', params: {} } }])).toBe(false);
    });
  });
});
