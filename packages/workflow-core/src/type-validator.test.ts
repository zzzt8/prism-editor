import { describe, it, expect } from 'vitest';
import { PortDataType, type NodeDefinition } from '@prism/shared-types';
import {
  TypeMismatchError,
  type TypeCheckingOptions,
} from '@prism/workflow-core';
import { TypeValidator } from '@prism/workflow-core';

// Helper: creates a minimal NodeDefinition for testing
const makeNodeDef = (
  type: string,
  inputs: Array<{ id: string; name: string; dataType: PortDataType; required: boolean }>,
  outputs: Array<{ id: string; name: string; dataType: PortDataType; required: boolean }>
): NodeDefinition => ({
  type,
  category: 'test',
  label: type,
  inputs: inputs.map((i) => ({ ...i, type: 'image' as const })),
  outputs: outputs.map((o) => ({ ...o, type: 'image' as const })),
  params: [],
});

// Helper: creates a minimal PipelineData object
const pipeline = <T>(data: T, type: PortDataType) =>
  Object.freeze({ type, data, metadata: Object.freeze({}) });

const imageNodeDef = makeNodeDef(
  'image-processor',
  [{ id: 'img', name: 'img', dataType: PortDataType.IMAGE, required: true }],
  [{ id: 'result', name: 'result', dataType: PortDataType.IMAGE, required: true }]
);

const maskNodeDef = makeNodeDef(
  'mask-processor',
  [{ id: 'msk', name: 'msk', dataType: PortDataType.MASK, required: true }],
  [{ id: 'result', name: 'result', dataType: PortDataType.MASK, required: true }]
);

const numNodeDef = makeNodeDef(
  'number-processor',
  [{ id: 'num', name: 'num', dataType: PortDataType.NUMBER, required: true }],
  [{ id: 'result', name: 'result', dataType: PortDataType.NUMBER, required: true }]
);

describe('TypeValidator', () => {
  describe('type checking disabled', () => {
    it('passes all inputs through when enabled=false', () => {
      const validator = new TypeValidator([imageNodeDef], { enabled: false });
      const raw = { img: { foo: 'bar' } };
      const result = validator.validateInputs('n1', 'image-processor', raw);
      expect(result).toBe(raw);
    });
  });

  describe('required inputs', () => {
    it('throws when a required input is missing', () => {
      const validator = new TypeValidator([imageNodeDef]);
      expect(() =>
        validator.validateInputs('n1', 'image-processor', {})
      ).toThrow(TypeMismatchError);
    });

    it('throws with correct type info in error', () => {
      const validator = new TypeValidator([imageNodeDef]);
      try {
        validator.validateInputs('n1', 'image-processor', {});
        expect.fail('should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(TypeMismatchError);
        const e = err as TypeMismatchError;
        expect(e.nodeId).toBe('n1');
        expect(e.portName).toBe('img');
        expect(e.expectedType).toBe(PortDataType.IMAGE);
        expect(e.actualType).toBe(PortDataType.VOID);
        expect(e.message).toContain('img');
        expect(e.message).toContain('void');
      }
    });

    it('does not throw for optional missing inputs', () => {
      const optDef = makeNodeDef(
        'opt-node',
        [{ id: 'opt', name: 'opt', dataType: PortDataType.IMAGE, required: false }],
        [{ id: 'out', name: 'out', dataType: PortDataType.IMAGE, required: true }]
      );
      const validator = new TypeValidator([optDef]);
      const result = validator.validateInputs('n1', 'opt-node', {});
      expect(result['opt']).toBeUndefined();
    });
  });

  describe('type matching', () => {
    it('passes through when input type matches port dataType', () => {
      const validator = new TypeValidator([imageNodeDef]);
      const input = pipeline({ width: 100, height: 100 }, PortDataType.IMAGE);
      const result = validator.validateInputs('n1', 'image-processor', { img: input });
      expect(result['img']).toBe(input);
    });

    it('passes through non-PipelineData values unchanged', () => {
      const validator = new TypeValidator([imageNodeDef]);
      const result = validator.validateInputs('n1', 'image-processor', { img: 'just-a-string' });
      expect(result['img']).toBe('just-a-string');
    });
  });

  describe('type compatibility', () => {
    it('throws when source type is incompatible with target', () => {
      const validator = new TypeValidator([numNodeDef]);
      const input = pipeline(42, PortDataType.NUMBER);
      // Try to connect NUMBER to IMAGE (which doesn't accept NUMBER)
      const imgWithNumberDef = makeNodeDef(
        'img-node',
        [{ id: 'img', name: 'img', dataType: PortDataType.IMAGE, required: true }],
        [{ id: 'out', name: 'out', dataType: PortDataType.IMAGE, required: true }]
      );
      const validator2 = new TypeValidator([imgWithNumberDef]);
      expect(() =>
        validator2.validateInputs('n1', 'img-node', { img: input })
      ).toThrow(TypeMismatchError);
    });

    it('warns when no node definition exists for the type', () => {
      const warnings: string[] = [];
      const validator = new TypeValidator([], {
        onDiagnostic: (msg) => warnings.push(msg),
      });
      validator.validateInputs('n1', 'unknown-node', { img: 'value' });
      expect(warnings.some((w) => w.includes('unknown-node'))).toBe(true);
    });
  });

  describe('auto-conversion', () => {
    it('auto-converts compatible types when autoConvert=true', () => {
      const validator = new TypeValidator([maskNodeDef]);
      // IMAGE connected to MASK port — should auto-convert
      const imageInput = pipeline(
        { width: 100, height: 100, data: new Uint8ClampedArray(100 * 100 * 4) } as unknown as ImageData,
        PortDataType.IMAGE
      );
      const result = validator.validateInputs('n1', 'mask-processor', { msk: imageInput });
      // The auto-converter should be applied (result may differ from input)
      expect(result).toBeDefined();
      expect(result['msk']).toBeDefined();
    });

    it('throws when autoConvert=false and types differ', () => {
      const validator = new TypeValidator([maskNodeDef], { autoConvert: false });
      const imageInput = pipeline(
        { width: 100, height: 100 } as unknown as ImageData,
        PortDataType.IMAGE
      );
      expect(() =>
        validator.validateInputs('n1', 'mask-processor', { msk: imageInput })
      ).toThrow(TypeMismatchError);
    });
  });

  describe('TypeMismatchError', () => {
    it('has correct name and message format', () => {
      const err = new TypeMismatchError(
        'node-42',
        'image',
        PortDataType.IMAGE,
        PortDataType.NUMBER,
        'Test reason'
      );
      expect(err.name).toBe('TypeMismatchError');
      expect(err.nodeId).toBe('node-42');
      expect(err.portName).toBe('image');
      expect(err.expectedType).toBe(PortDataType.IMAGE);
      expect(err.actualType).toBe(PortDataType.NUMBER);
      expect(err.message).toContain('node-42');
      expect(err.message).toContain('image');
      expect(err.message).toContain('image');
      expect(err.message).toContain('number');
      expect(err.message).toContain('Test reason');
    });
  });
});
