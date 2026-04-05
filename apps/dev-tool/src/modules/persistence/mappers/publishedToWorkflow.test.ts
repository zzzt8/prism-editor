// publishedToWorkflow.test.ts - Golden Fixtures 测试
import { publishedToWorkflow, validatePublishedWorkflow } from './publishedToWorkflow';

describe('publishedToWorkflow', () => {
  describe('基本重建', () => {
    it('PublishedWorkflow 正确重建为 Workflow', () => {
      const published = {
        id: 'pub-1',
        sourceId: 'wf-1',
        name: 'Published Workflow',
        sourceName: 'wf-1',
        version: '1.0.0',
        inputs: [],
        outputs: [],
        config: {
          nodeTypes: {
            'node-1': 'load-image',
            'node-2': 'resize',
          },
          nodeIndexMap: {
            'node-1': '0',
            'node-2': '1',
          },
          nodeConfigs: {
            'node-1': { params: { url: 'test.png' } },
            'node-2': { params: { width: 512 } },
          },
          internalParams: {},
          inputs: [],
          exposedParams: [],
          outputs: [],
        },
        publishedAt: '2024-01-01T00:00:00.000Z',
      };

      const result = publishedToWorkflow(published);

      expect(result.id).toBe('wf-1');
      expect(result.nodes).toHaveLength(2);
      expect(result.nodes[0].type).toBe('load-image');
      expect(result.nodes[0].params).toEqual({ url: 'test.png' });
      expect(result.nodes[1].type).toBe('resize');
    });
  });

  describe('带 _internalParams 的节点', () => {
    it('正确合并 _internalParams 和 params', () => {
      const published = {
        id: 'pub-1',
        sourceId: 'wf-1',
        name: 'With Internal',
        sourceName: 'wf-1',
        version: '1.0.0',
        inputs: [],
        outputs: [],
        config: {
          nodeTypes: { 'node-1': 'test-node' },
          nodeIndexMap: { 'node-1': '0' },
          nodeConfigs: {
            'node-1': {
              params: { visible: true },
              _internalParams: { _cacheKey: 'abc' },
            },
          },
          internalParams: {},
          inputs: [],
          exposedParams: [],
          outputs: [],
        },
        publishedAt: '2024-01-01T00:00:00.000Z',
      };

      const result = publishedToWorkflow(published);

      expect(result.nodes[0].params).toEqual({ _cacheKey: 'abc', visible: true });
    });
  });
});
