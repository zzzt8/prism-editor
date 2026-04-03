// Tests for globalRegistry custom node support

import { describe, it, expect, beforeEach } from 'vitest';
import { globalRegistry } from './globalRegistry';
import type { NodeDefinition } from '@prism/shared-types';

// Mock executor for testing
const mockExecutor = async (inputs: Record<string, unknown>) => inputs;

describe('globalRegistry custom node support', () => {
  beforeEach(() => {
    // Reset registry state (in real usage, this would be a separate test helper)
  });

  describe('registerNode with isCustom flag', () => {
    it('registers a node as custom when isCustom is true', () => {
      globalRegistry.initialize();

      const customNode: NodeDefinition = {
        type: 'custom/test-node',
        label: 'Test Custom Node',
        category: 'custom',
        inputs: [],
        outputs: [],
        params: [],
      };

      globalRegistry.registerNode(customNode, true);

      expect(globalRegistry.getNode('custom/test-node')).toBeDefined();
      expect(globalRegistry.isCustomNode('custom/test-node')).toBe(true);
    });

    it('registers a node as built-in when isCustom is false', () => {
      globalRegistry.initialize();

      const builtInNode: NodeDefinition = {
        type: 'custom/builtin-test',
        label: 'Built-in Test Node',
        category: 'input',
        inputs: [],
        outputs: [],
        params: [],
      };

      globalRegistry.registerNode(builtInNode, false);

      expect(globalRegistry.getNode('custom/builtin-test')).toBeDefined();
      expect(globalRegistry.isCustomNode('custom/builtin-test')).toBe(false);
    });
  });

  describe('listCustomNodes', () => {
    it('lists only custom nodes', () => {
      globalRegistry.initialize();

      const customNode1: NodeDefinition = {
        type: 'custom/my-node-1',
        label: 'My Custom Node 1',
        category: 'custom',
        inputs: [],
        outputs: [],
        params: [],
      };

      const customNode2: NodeDefinition = {
        type: 'custom/my-node-2',
        label: 'My Custom Node 2',
        category: 'custom',
        inputs: [],
        outputs: [],
        params: [],
      };

      globalRegistry.registerNode(customNode1, true);
      globalRegistry.registerNode(customNode2, true);

      const customNodes = globalRegistry.listCustomNodes();
      expect(customNodes.length).toBeGreaterThanOrEqual(2);
      expect(customNodes.map((n) => n.type)).toContain('custom/my-node-1');
      expect(customNodes.map((n) => n.type)).toContain('custom/my-node-2');
    });
  });

  describe('unregisterCustomNode', () => {
    it('removes a custom node from registry', () => {
      globalRegistry.initialize();

      const customNode: NodeDefinition = {
        type: 'custom/to-remove',
        label: 'Node to Remove',
        category: 'custom',
        inputs: [],
        outputs: [],
        params: [],
      };

      globalRegistry.registerNode(customNode, true);
      expect(globalRegistry.getNode('custom/to-remove')).toBeDefined();

      const removed = globalRegistry.unregisterCustomNode('custom/to-remove');
      expect(removed).toBe(true);
      expect(globalRegistry.getNode('custom/to-remove')).toBeUndefined();
    });

    it('returns false for non-custom node', () => {
      globalRegistry.initialize();

      // Try to unregister a built-in node (should return false)
      const removed = globalRegistry.unregisterCustomNode('load-image');
      expect(removed).toBe(false);
    });

    it('returns false for non-existent node', () => {
      globalRegistry.initialize();

      const removed = globalRegistry.unregisterCustomNode('nonexistent-node-type');
      expect(removed).toBe(false);
    });
  });

  describe('isCustomNode', () => {
    it('returns true for custom nodes', () => {
      globalRegistry.initialize();

      const customNode: NodeDefinition = {
        type: 'custom/verify-node',
        label: 'Verify Custom',
        category: 'custom',
        inputs: [],
        outputs: [],
        params: [],
      };

      globalRegistry.registerNode(customNode, true);
      expect(globalRegistry.isCustomNode('custom/verify-node')).toBe(true);
    });

    it('returns false for built-in nodes', () => {
      globalRegistry.initialize();
      expect(globalRegistry.isCustomNode('load-image')).toBe(false);
    });

    it('returns false for non-existent nodes', () => {
      globalRegistry.initialize();
      expect(globalRegistry.isCustomNode('totally-fake-node')).toBe(false);
    });
  });
});
