import { describe, it, expect } from 'vitest';
import {
  PortDataType,
  isPipelineData,
  toPipeline,
  isCompatible,
  canConnectByDataType,
  TYPE_COMPATIBILITY,
  type PipelineData,
  type TypeConnectionResult,
} from '@prism/shared-types';

describe('PortDataType enum', () => {
  it('has correct string values for all standard types', () => {
    expect(PortDataType.IMAGE).toBe('image');
    expect(PortDataType.MASK).toBe('mask');
    expect(PortDataType.VIDEO).toBe('video');
    expect(PortDataType.AUDIO).toBe('audio');
    expect(PortDataType.FILE).toBe('file');
    expect(PortDataType.JSON).toBe('json');
    expect(PortDataType.STRING).toBe('string');
    expect(PortDataType.NUMBER).toBe('number');
    expect(PortDataType.BOOLEAN).toBe('boolean');
    expect(PortDataType.ANY).toBe('any');
    expect(PortDataType.VOID).toBe('void');
  });
});

describe('isPipelineData()', () => {
  it('returns true for a valid PipelineData object', () => {
    const data: PipelineData<string> = {
      type: PortDataType.STRING,
      data: 'hello',
      metadata: {},
    };
    expect(isPipelineData(data)).toBe(true);
  });

  it('returns false for a plain string', () => {
    expect(isPipelineData('hello')).toBe(false);
  });

  it('returns false for a plain object missing fields', () => {
    expect(isPipelineData({ type: PortDataType.STRING })).toBe(false);
  });

  it('returns false for null', () => {
    expect(isPipelineData(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isPipelineData(undefined)).toBe(false);
  });

  it('returns false for an array', () => {
    expect(isPipelineData([PortDataType.IMAGE])).toBe(false);
  });
});

describe('toPipeline()', () => {
  it('creates PipelineData with the correct type and data', () => {
    const result = toPipeline('hello', PortDataType.STRING);
    expect(result.type).toBe(PortDataType.STRING);
    expect(result.data).toBe('hello');
    expect(result.metadata).toEqual({});
  });

  it('freezes the returned object', () => {
    const result = toPipeline(42, PortDataType.NUMBER);
    expect(Object.isFrozen(result)).toBe(true);
  });

  it('includes custom metadata', () => {
    const result = toPipeline('test', PortDataType.STRING, {
      label: 'my-string',
      timestamp: 1234567890,
    });
    expect(result.metadata.label).toBe('my-string');
    expect(result.metadata.timestamp).toBe(1234567890);
  });

  it('auto-extracts width/height from ImageData-like object', () => {
    // Simulate an ImageData-like object
    const mockImageData = {
      width: 800,
      height: 600,
      data: new Uint8ClampedArray(800 * 600 * 4),
    };
    const result = toPipeline(mockImageData, PortDataType.IMAGE);
    expect(result.metadata.width).toBe(800);
    expect(result.metadata.height).toBe(600);
    expect(result.metadata.channels).toBe(4);
  });

  it('prefers explicit metadata over auto-extracted', () => {
    const mockImageData = {
      width: 800,
      height: 600,
      data: new Uint8ClampedArray(800 * 600 * 4),
    };
    const result = toPipeline(mockImageData, PortDataType.IMAGE, {
      width: 1024,
    });
    expect(result.metadata.width).toBe(1024); // explicit overrides auto
    expect(result.metadata.height).toBe(600);   // auto from data
  });

  it('does not crash for non-ImageData objects', () => {
    const result = toPipeline({ key: 'value' }, PortDataType.JSON);
    expect(result.type).toBe(PortDataType.JSON);
    expect(result.metadata.width).toBeUndefined();
  });
});

describe('TYPE_COMPATIBILITY matrix', () => {
  it('IMAGE accepts IMAGE, MASK, FILE', () => {
    const allowed = TYPE_COMPATIBILITY[PortDataType.IMAGE];
    expect(allowed).toContain(PortDataType.IMAGE);
    expect(allowed).toContain(PortDataType.MASK);
    expect(allowed).toContain(PortDataType.FILE);
    expect(allowed).not.toContain(PortDataType.NUMBER);
  });

  it('MASK accepts MASK and IMAGE', () => {
    const allowed = TYPE_COMPATIBILITY[PortDataType.MASK];
    expect(allowed).toContain(PortDataType.MASK);
    expect(allowed).toContain(PortDataType.IMAGE);
    expect(allowed).toHaveLength(2);
  });

  it('scalar types accept only themselves', () => {
    for (const scalar of [PortDataType.STRING, PortDataType.NUMBER, PortDataType.BOOLEAN]) {
      const allowed = TYPE_COMPATIBILITY[scalar];
      expect(allowed).toHaveLength(1);
      expect(allowed).toContain(scalar);
    }
  });

  it('ANY accepts every type', () => {
    const allowed = TYPE_COMPATIBILITY[PortDataType.ANY];
    expect(allowed).toContain(PortDataType.IMAGE);
    expect(allowed).toContain(PortDataType.MASK);
    expect(allowed).toContain(PortDataType.VIDEO);
    expect(allowed).toContain(PortDataType.AUDIO);
    expect(allowed).toContain(PortDataType.FILE);
    expect(allowed).toContain(PortDataType.JSON);
    expect(allowed).toContain(PortDataType.STRING);
    expect(allowed).toContain(PortDataType.NUMBER);
    expect(allowed).toContain(PortDataType.BOOLEAN);
    expect(allowed).toContain(PortDataType.ANY);
    expect(allowed).toContain(PortDataType.VOID);
  });

  it('VOID accepts nothing', () => {
    expect(TYPE_COMPATIBILITY[PortDataType.VOID]).toHaveLength(0);
  });

  it('VIDEO and AUDIO accept only themselves', () => {
    expect(TYPE_COMPATIBILITY[PortDataType.VIDEO]).toEqual([PortDataType.VIDEO]);
    expect(TYPE_COMPATIBILITY[PortDataType.AUDIO]).toEqual([PortDataType.AUDIO]);
  });

  it('FILE and JSON accept only themselves', () => {
    expect(TYPE_COMPATIBILITY[PortDataType.FILE]).toEqual([PortDataType.FILE]);
    expect(TYPE_COMPATIBILITY[PortDataType.JSON]).toEqual([PortDataType.JSON]);
  });
});

describe('isCompatible()', () => {
  it('returns true for identical types', () => {
    expect(isCompatible(PortDataType.IMAGE, PortDataType.IMAGE)).toBe(true);
    expect(isCompatible(PortDataType.NUMBER, PortDataType.NUMBER)).toBe(true);
  });

  it('returns true for IMAGE→MASK compatibility', () => {
    expect(isCompatible(PortDataType.IMAGE, PortDataType.MASK)).toBe(true);
  });

  it('returns false for NUMBER→IMAGE', () => {
    expect(isCompatible(PortDataType.NUMBER, PortDataType.IMAGE)).toBe(false);
  });

  it('returns true for ANY accepting anything', () => {
    expect(isCompatible(PortDataType.IMAGE, PortDataType.ANY)).toBe(true);
    expect(isCompatible(PortDataType.VOID, PortDataType.ANY)).toBe(true);
  });

  it('returns false for anything connecting to VOID', () => {
    expect(isCompatible(PortDataType.IMAGE, PortDataType.VOID)).toBe(false);
  });
});

describe('canConnectByDataType()', () => {
  it('returns valid=true for compatible ports', () => {
    const result = canConnectByDataType(
      { dataType: PortDataType.IMAGE },
      { dataType: PortDataType.IMAGE }
    );
    expect(result.valid).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it('returns valid=false with reason for incompatible types', () => {
    const result = canConnectByDataType(
      { dataType: PortDataType.NUMBER },
      { dataType: PortDataType.IMAGE }
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('Type mismatch');
    expect(result.sourceType).toBe(PortDataType.NUMBER);
    expect(result.targetType).toBe(PortDataType.IMAGE);
  });

  it('allows IMAGE→MASK connection', () => {
    const result = canConnectByDataType(
      { dataType: PortDataType.IMAGE },
      { dataType: PortDataType.MASK }
    );
    expect(result.valid).toBe(true);
  });

  it('allows NUMBER→NUMBER connection', () => {
    const result = canConnectByDataType(
      { dataType: PortDataType.NUMBER },
      { dataType: PortDataType.NUMBER }
    );
    expect(result.valid).toBe(true);
  });

  it('rejects VOID target', () => {
    const result = canConnectByDataType(
      { dataType: PortDataType.IMAGE },
      { dataType: PortDataType.VOID }
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('Type mismatch');
  });
});
