import { describe, it, expect } from 'vitest';
import { NODE_CATEGORIES, PortDataType, type NodeDefinition } from '@prism/shared-types';
import {
  loadImageDefinition,
  loadMaskDefinition,
  applyMaskDefinition,
  compositeDefinition,
  transformDefinition,
  exportDefinition,
  emptyInputDefinition,
} from './definitions';
import { createRegistry, registerBuiltIn, getAllDefinitions } from './registry';

function isValidPortDefinition(def: unknown): def is { id: string; name: string; type: string; dataType: string; required: boolean } {
  if (typeof def !== 'object' || def === null) return false;
  const obj = def as Record<string, unknown>;
  return (
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.type === 'string' &&
    typeof obj.dataType === 'string' &&
    typeof obj.required === 'boolean'
  );
}

function hasValidFields(
  def: NodeDefinition,
  opts: { expectInputs?: boolean; expectOutputs?: boolean }
): string[] {
  const errors: string[] = [];

  if (typeof def.type !== 'string' || def.type.length === 0) {
    errors.push(`${def.type ?? '<undefined>'}: type must be a non-empty string`);
  }
  if (typeof def.category !== 'string' || def.category.length === 0) {
    errors.push(`${def.type}: category must be a non-empty string`);
  }
  if (typeof def.label !== 'string' || def.label.length === 0) {
    errors.push(`${def.type}: label must be a non-empty string`);
  }

  if (opts.expectInputs !== false) {
    if (!Array.isArray(def.inputs)) {
      errors.push(`${def.type}: inputs must be an array`);
    } else {
      def.inputs.forEach((port) => {
        if (!isValidPortDefinition(port)) {
          errors.push(`${def.type}: input port "${port?.id ?? '?'}" has invalid shape`);
        }
        if (!Object.values(PortDataType).includes(port.dataType as PortDataType)) {
          errors.push(`${def.type}: input port "${port.id}" has unknown dataType "${port.dataType}"`);
        }
      });
    }
  }

  if (opts.expectOutputs !== undefined && opts.expectOutputs) {
    if (!Array.isArray(def.outputs)) {
      errors.push(`${def.type}: outputs must be an array`);
    } else {
      def.outputs.forEach((port) => {
        if (!isValidPortDefinition(port)) {
          errors.push(`${def.type}: output port "${port?.id ?? '?'}" has invalid shape`);
        }
        if (!Object.values(PortDataType).includes(port.dataType as PortDataType)) {
          errors.push(`${def.type}: output port "${port.id}" has unknown dataType "${port.dataType}"`);
        }
      });
    }
  }

  if (!Array.isArray(def.params)) {
    errors.push(`${def.type}: params must be an array`);
  }

  return errors;
}

describe('node-definitions: all definitions exist', () => {
  it('load-image definition exists', () => {
    expect(loadImageDefinition).toBeDefined();
  });
  it('load-mask definition exists', () => {
    expect(loadMaskDefinition).toBeDefined();
  });
  it('apply-mask definition exists', () => {
    expect(applyMaskDefinition).toBeDefined();
  });
  it('composite definition exists', () => {
    expect(compositeDefinition).toBeDefined();
  });
  it('transform definition exists', () => {
    expect(transformDefinition).toBeDefined();
  });
  it('export definition exists', () => {
    expect(exportDefinition).toBeDefined();
  });
  it('empty-input definition exists', () => {
    expect(emptyInputDefinition).toBeDefined();
  });
});

describe('node-definitions: structure validation', () => {
  const definitions: Array<{ def: NodeDefinition; expectOutputs: boolean }> = [
    { def: loadImageDefinition, expectOutputs: true },
    { def: loadMaskDefinition, expectOutputs: true },
    { def: applyMaskDefinition, expectOutputs: true },
    { def: compositeDefinition, expectOutputs: true },
    { def: transformDefinition, expectOutputs: true },
    { def: exportDefinition, expectOutputs: false },
    { def: emptyInputDefinition, expectOutputs: true },
  ];

  definitions.forEach(({ def, expectOutputs }) => {
    describe(def.type, () => {
      const errors = hasValidFields(def, { expectOutputs });

      it('has no structural errors', () => {
        expect(errors, errors.join('\n')).toHaveLength(0);
      });

      it('has a valid category', () => {
        const validCategories = Object.values(NODE_CATEGORIES);
        expect(validCategories).toContain(def.category);
      });
    });
  });
});

describe('node-definitions: port schema per node', () => {
  it('load-image has correct input/output schema', () => {
    expect(loadImageDefinition.inputs).toHaveLength(0);
    expect(loadImageDefinition.outputs).toHaveLength(1);
    expect(loadImageDefinition.outputs[0].id).toBe('image');
    expect(loadImageDefinition.outputs[0].dataType).toBe(PortDataType.IMAGE);
    expect(loadImageDefinition.outputs[0].required).toBe(true);
  });

  it('load-mask has correct input/output schema', () => {
    expect(loadMaskDefinition.inputs).toHaveLength(0);
    expect(loadMaskDefinition.outputs).toHaveLength(1);
    expect(loadMaskDefinition.outputs[0].id).toBe('mask');
    expect(loadMaskDefinition.outputs[0].dataType).toBe(PortDataType.MASK);
    expect(loadMaskDefinition.outputs[0].required).toBe(true);
  });

  it('apply-mask has correct input/output schema', () => {
    expect(applyMaskDefinition.inputs).toHaveLength(2);
    expect(applyMaskDefinition.outputs).toHaveLength(1);

    const [imageInput, maskInput] = applyMaskDefinition.inputs;
    expect(imageInput.id).toBe('image');
    expect(imageInput.dataType).toBe(PortDataType.IMAGE);
    expect(maskInput.id).toBe('mask');
    expect(maskInput.dataType).toBe(PortDataType.MASK);

    expect(applyMaskDefinition.outputs[0].id).toBe('image');
    expect(applyMaskDefinition.outputs[0].dataType).toBe(PortDataType.IMAGE);
  });

  it('composite has correct input/output schema', () => {
    expect(compositeDefinition.inputs).toHaveLength(2);
    expect(compositeDefinition.outputs).toHaveLength(1);

    const [base, overlay] = compositeDefinition.inputs;
    expect(base.id).toBe('base');
    expect(base.dataType).toBe(PortDataType.IMAGE);
    expect(overlay.id).toBe('overlay');
    expect(overlay.dataType).toBe(PortDataType.IMAGE);

    expect(compositeDefinition.outputs[0].id).toBe('image');
    expect(compositeDefinition.outputs[0].dataType).toBe(PortDataType.IMAGE);
  });

  it('transform has correct input/output schema', () => {
    expect(transformDefinition.inputs).toHaveLength(1);
    expect(transformDefinition.outputs).toHaveLength(1);
    expect(transformDefinition.inputs[0].id).toBe('image');
    expect(transformDefinition.inputs[0].dataType).toBe(PortDataType.IMAGE);
    expect(transformDefinition.outputs[0].id).toBe('image');
    expect(transformDefinition.outputs[0].dataType).toBe(PortDataType.IMAGE);
  });

  it('export has correct input/output schema', () => {
    expect(exportDefinition.inputs).toHaveLength(1);
    expect(exportDefinition.outputs).toHaveLength(0);
    expect(exportDefinition.inputs[0].id).toBe('image');
    expect(exportDefinition.inputs[0].dataType).toBe(PortDataType.IMAGE);
  });

  it('empty-input has correct input/output schema', () => {
    expect(emptyInputDefinition.inputs).toHaveLength(0);
    expect(emptyInputDefinition.outputs).toHaveLength(1);
    expect(emptyInputDefinition.outputs[0].id).toBe('image');
    expect(emptyInputDefinition.outputs[0].dataType).toBe(PortDataType.IMAGE);
  });
});

describe('node-definitions: categories', () => {
  it('load-image and load-mask are INPUT category', () => {
    expect(loadImageDefinition.category).toBe(NODE_CATEGORIES.INPUT);
    expect(loadMaskDefinition.category).toBe(NODE_CATEGORIES.INPUT);
    expect(emptyInputDefinition.category).toBe(NODE_CATEGORIES.INPUT);
  });

  it('apply-mask is MASK category', () => {
    expect(applyMaskDefinition.category).toBe(NODE_CATEGORIES.MASK);
  });

  it('composite is COMPOSITE category', () => {
    expect(compositeDefinition.category).toBe(NODE_CATEGORIES.COMPOSITE);
  });

  it('transform is TRANSFORM category', () => {
    expect(transformDefinition.category).toBe(NODE_CATEGORIES.TRANSFORM);
  });

  it('export is OUTPUT category', () => {
    expect(exportDefinition.category).toBe(NODE_CATEGORIES.OUTPUT);
  });
});

describe('node-definitions: params per node', () => {
  it('load-image has imageFile param', () => {
    expect(loadImageDefinition.params.some((p) => p.id === 'imageFile')).toBe(true);
  });

  it('load-mask has maskFile param', () => {
    expect(loadMaskDefinition.params.some((p) => p.id === 'maskFile')).toBe(true);
  });

  it('apply-mask has maskType, threshold, invert params', () => {
    const ids = applyMaskDefinition.params.map((p) => p.id);
    expect(ids).toContain('maskType');
    expect(ids).toContain('threshold');
    expect(ids).toContain('invert');
  });

  it('composite has blendMode, opacity, canvasWidth, canvasHeight, overlayX, overlayY params', () => {
    const ids = compositeDefinition.params.map((p) => p.id);
    expect(ids).toContain('blendMode');
    expect(ids).toContain('opacity');
    expect(ids).toContain('canvasWidth');
    expect(ids).toContain('canvasHeight');
    expect(ids).toContain('overlayX');
    expect(ids).toContain('overlayY');
  });

  it('transform has translateX, translateY, scaleX, scaleY, rotation, crop params', () => {
    const ids = transformDefinition.params.map((p) => p.id);
    expect(ids).toContain('translateX');
    expect(ids).toContain('translateY');
    expect(ids).toContain('scaleX');
    expect(ids).toContain('scaleY');
    expect(ids).toContain('rotation');
    expect(ids).toContain('cropX');
    expect(ids).toContain('cropY');
    expect(ids).toContain('cropWidth');
    expect(ids).toContain('cropHeight');
  });

  it('export has no params', () => {
    expect(exportDefinition.params).toHaveLength(0);
  });

  it('empty-input has width, height, backgroundColor params', () => {
    const ids = emptyInputDefinition.params.map((p) => p.id);
    expect(ids).toContain('width');
    expect(ids).toContain('height');
    expect(ids).toContain('backgroundColor');
  });
});

describe('node-definitions: registry', () => {
  it('createRegistry returns a Map with all 7 built-in nodes', () => {
    const registry = createRegistry();
    expect(registry.size).toBe(7);
  });

  it('registerBuiltIn adds all definitions to registry', () => {
    const registry = new Map();
    registerBuiltIn(registry);
    expect(registry.size).toBe(7);
  });

  it('getAllDefinitions returns array of 7 definitions', () => {
    const defs = getAllDefinitions();
    expect(defs).toHaveLength(7);
  });

  it('each definition is registered under its type as key', () => {
    const registry = createRegistry();
    const expected = [
      'load-image',
      'load-mask',
      'apply-mask',
      'composite',
      'transform',
      'export',
      'empty-input',
    ];
    expected.forEach((type) => {
      expect(registry.has(type)).toBe(true);
      expect(registry.get(type)?.type).toBe(type);
    });
  });
});
