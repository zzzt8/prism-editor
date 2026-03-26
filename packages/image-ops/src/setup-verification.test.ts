import { describe, it, expect } from 'vitest';

describe('setup verification', () => {
  it('canvas ImageData is polyfilled globally', () => {
    expect(typeof ImageData).toBe('function');
  });
});
