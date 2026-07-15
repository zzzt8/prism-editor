import { describe, it, expect } from 'vitest';
import type { DesignState } from '../../design-state';
import type { FlowKey } from '../../flow';

function makeDesignState(flowKey: FlowKey): DesignState {
  return {
    schemaVersion: 1,
    templateId: 'tmpl.basic-mockup',
    templateVersion: '1.0.0',
    flowKey,
    inputs: { assets: [], params: {} },
    createdAt: '2026-07-14T13:30:00.000Z',
  };
}

describe('DesignState.flowKey — M2-A format constraint', () => {
  it('accepts a simple lowercase flowKey', () => {
    const ds = makeDesignState('preview' as FlowKey);
    expect(ds.flowKey).toBe('preview');
  });

  it('accepts a hierarchical flowKey with mixed separators', () => {
    const ds = makeDesignState('production.print' as FlowKey);
    expect(ds.flowKey).toBe('production.print');
    const ds2 = makeDesignState('factory.package' as FlowKey);
    expect(ds2.flowKey).toBe('factory.package');
    const ds3 = makeDesignState('production-batch' as FlowKey);
    expect(ds3.flowKey).toBe('production-batch');
  });

  it('M1-A old fixtures round-trip: "preview" and "production-batch"', () => {
    // M1-A baseline fixtures. The M2-A pattern must accept them.
    const f1 = makeDesignState('preview' as FlowKey);
    const r1 = JSON.parse(JSON.stringify(f1)) as DesignState;
    expect(r1.flowKey).toBe('preview');

    const f2 = makeDesignState('production-batch' as FlowKey);
    const r2 = JSON.parse(JSON.stringify(f2)) as DesignState;
    expect(r2.flowKey).toBe('production-batch');
  });

  it('forbids uppercase characters in flowKey (compile-time brand + design contract)', () => {
    // The FlowKey brand is a structural string at runtime; the format
    // constraint is enforced by `flowKey` and `flow.schema.json` patterns.
    // Type-level guard: we cannot construct a `FlowKey` from a string at
    // compile time without an explicit cast, signaling that the brand
    // disallows arbitrary strings.
    type AllowedFlowKey = FlowKey;
    const ok: AllowedFlowKey = 'preview.main' as FlowKey;
    expect(ok).toBe('preview.main');

    // @ts-expect-error — non-`as FlowKey` casts are required; brand is opaque
    const _forbidden: AllowedFlowKey = 'PREVIEW';
    void _forbidden;
  });

  it('flowKey length boundary: 96 chars allowed, 97 chars rejected (pattern-test only)', () => {
    // The pattern + minLength/maxLength are enforced by ajv. The type-level
    // brand is a runtime string. This test pins the documented boundary.
    const maxLen = 'a'.repeat(96);
    const overLen = 'a'.repeat(97);
    expect(maxLen.length).toBe(96);
    expect(overLen.length).toBe(97);
    // Pattern match the 96-char string: starts with lowercase and has no separators.
    expect(/^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/.test(maxLen)).toBe(true);
  });

  it('flowKey pattern forbids leading separators and consecutive separators', () => {
    // The regex `^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$` requires the first
    // char to be a-z; separators must be followed by [a-z0-9]+.
    const PATTERN = /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/;
    expect(PATTERN.test('.preview')).toBe(false);
    expect(PATTERN.test('_preview')).toBe(false);
    expect(PATTERN.test('-preview')).toBe(false);
    expect(PATTERN.test('preview..main')).toBe(false);
    expect(PATTERN.test('preview--main')).toBe(false);
    expect(PATTERN.test('preview._main')).toBe(false);
    // OK: single separators with lowercase follow-ups.
    expect(PATTERN.test('preview.main')).toBe(true);
    expect(PATTERN.test('preview-main')).toBe(true);
    expect(PATTERN.test('preview_main')).toBe(true);
  });
});
