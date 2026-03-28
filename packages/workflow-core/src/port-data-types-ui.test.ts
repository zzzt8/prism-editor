import { describe, it, expect } from 'vitest';
import { PortDataType } from '@prism/shared-types';
import { canConnectByDataType, TYPE_COMPATIBILITY } from '@prism/shared-types';
import { createRegistry } from '@prism/node-definitions';

/**
 * UI Integration Tests for port data types (Section 8)
 *
 * Verifies the integration between:
 * 1. The port-data-types system (canConnectByDataType)
 * 2. Node definitions (node-definitions with dataType fields)
 * 3. Canvas store connection validation
 *
 * Run with: pnpm --filter @prism/workflow-core test
 */

describe('Section 8: Dev Tool UI Integration - Connection Type Validation', () => {
  describe('8.1 Type compatibility matrix covers all node port combinations', () => {
    it('load-image outputs IMAGE which connects to transform/image inputs', () => {
      const registry = createRegistry();
      const loadImageDef = registry.get('load-image');
      const transformDef = registry.get('transform');

      expect(loadImageDef).toBeDefined();
      expect(transformDef).toBeDefined();

      const outputPort = loadImageDef!.outputs[0];
      const inputPort = transformDef!.inputs[0];

      expect(outputPort.dataType).toBe(PortDataType.IMAGE);
      expect(inputPort.dataType).toBe(PortDataType.IMAGE);

      const result = canConnectByDataType(
        { dataType: outputPort.dataType },
        { dataType: inputPort.dataType }
      );
      expect(result.valid).toBe(true);
    });

    it('transform outputs IMAGE which connects to composite/apply-mask inputs', () => {
      const registry = createRegistry();
      const transformDef = registry.get('transform');
      const compositeDef = registry.get('composite');
      const maskDef = registry.get('apply-mask');

      const transformOut = transformDef!.outputs[0];
      const compositeIn = compositeDef!.inputs[0];
      const maskIn = maskDef!.inputs[0];

      // transform → composite (IMAGE → IMAGE)
      expect(canConnectByDataType(
        { dataType: transformOut.dataType },
        { dataType: compositeIn.dataType }
      ).valid).toBe(true);

      // transform → apply-mask image (IMAGE → IMAGE)
      expect(canConnectByDataType(
        { dataType: transformOut.dataType },
        { dataType: maskIn.dataType }
      ).valid).toBe(true);
    });

    it('apply-mask outputs IMAGE which connects to composite/transform/export', () => {
      const registry = createRegistry();
      const maskDef = registry.get('apply-mask');
      const compositeDef = registry.get('composite');
      const exportDef = registry.get('export');

      const maskOut = maskDef!.outputs[0];
      const compositeIn = compositeDef!.inputs[0];
      const exportIn = exportDef!.inputs[0];

      // apply-mask → composite (IMAGE → IMAGE)
      expect(canConnectByDataType(
        { dataType: maskOut.dataType },
        { dataType: compositeIn.dataType }
      ).valid).toBe(true);

      // apply-mask → export (IMAGE → IMAGE)
      expect(canConnectByDataType(
        { dataType: maskOut.dataType },
        { dataType: exportIn.dataType }
      ).valid).toBe(true);
    });

    it('composite outputs IMAGE which connects to composite/transform/export', () => {
      const registry = createRegistry();
      const compositeDef = registry.get('composite');
      const exportDef = registry.get('export');

      const compositeOut = compositeDef!.outputs[0];
      const exportIn = exportDef!.inputs[0];

      expect(canConnectByDataType(
        { dataType: compositeOut.dataType },
        { dataType: exportIn.dataType }
      ).valid).toBe(true);
    });
  });

  describe('8.2 Incompatible connections are rejected with detailed messages', () => {
    it('rejects NUMBER → IMAGE connection', () => {
      const result = canConnectByDataType(
        { dataType: PortDataType.NUMBER },
        { dataType: PortDataType.IMAGE }
      );
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Type mismatch');
      expect(result.sourceType).toBe(PortDataType.NUMBER);
      expect(result.targetType).toBe(PortDataType.IMAGE);
    });

    it('rejects STRING → IMAGE connection', () => {
      const result = canConnectByDataType(
        { dataType: PortDataType.STRING },
        { dataType: PortDataType.IMAGE }
      );
      expect(result.valid).toBe(false);
      expect(result.reason).toBeDefined();
    });

    it('rejects BOOLEAN → MASK connection', () => {
      const result = canConnectByDataType(
        { dataType: PortDataType.BOOLEAN },
        { dataType: PortDataType.MASK }
      );
      expect(result.valid).toBe(false);
    });

    it('rejects any connection targeting VOID', () => {
      const result = canConnectByDataType(
        { dataType: PortDataType.IMAGE },
        { dataType: PortDataType.VOID }
      );
      expect(result.valid).toBe(false);
    });

    it('IMAGE → MASK is allowed (auto-conversion)', () => {
      const result = canConnectByDataType(
        { dataType: PortDataType.IMAGE },
        { dataType: PortDataType.MASK }
      );
      expect(result.valid).toBe(true);
    });

    it('MASK → IMAGE is allowed (auto-conversion)', () => {
      const result = canConnectByDataType(
        { dataType: PortDataType.MASK },
        { dataType: PortDataType.IMAGE }
      );
      expect(result.valid).toBe(true);
    });
  });

  describe('8.3 Port type colors cover all data types', () => {
    it('TYPE_COMPATIBILITY has entries for all PortDataType values', () => {
      const allTypes = Object.values(PortDataType);
      for (const type of allTypes) {
        expect(TYPE_COMPATIBILITY[type]).toBeDefined();
        expect(Array.isArray(TYPE_COMPATIBILITY[type])).toBe(true);
      }
    });

    it('ANY PortDataType is the superset that accepts everything', () => {
      const anyAccepts = TYPE_COMPATIBILITY[PortDataType.ANY];
      expect(anyAccepts.length).toBeGreaterThan(5);
      for (const type of Object.values(PortDataType)) {
        expect(anyAccepts).toContain(type);
      }
    });

    it('VOID accepts nothing', () => {
      expect(TYPE_COMPATIBILITY[PortDataType.VOID]).toHaveLength(0);
    });
  });

  describe('8.4 Node definitions have correct dataType for all ports', () => {
    it('every built-in node has dataType on all ports', () => {
      const registry = createRegistry();
      const nodeTypes = ['load-image', 'apply-mask', 'composite', 'transform', 'export'];

      for (const nodeType of nodeTypes) {
        const def = registry.get(nodeType);
        expect(def).toBeDefined();

        for (const input of def!.inputs) {
          expect(input.dataType).toBeDefined();
          expect(input.dataType).toBeTruthy();
        }
        for (const output of def!.outputs) {
          expect(output.dataType).toBeDefined();
          expect(output.dataType).toBeTruthy();
        }
      }
    });

    it('node port dataType values match the PortDataType enum', () => {
      const registry = createRegistry();
      const def = registry.get('load-image')!;

      for (const port of [...def.inputs, ...def.outputs]) {
        expect(Object.values(PortDataType)).toContain(port.dataType);
      }
    });

    it('ApplyMask has correct dataType for its image and mask inputs', () => {
      const registry = createRegistry();
      const maskDef = registry.get('apply-mask')!;

      const imageInput = maskDef.inputs.find((i) => i.id === 'image');
      const maskInput = maskDef.inputs.find((i) => i.id === 'mask');

      expect(imageInput?.dataType).toBe(PortDataType.IMAGE);
      expect(maskInput?.dataType).toBe(PortDataType.MASK);
    });
  });
});
