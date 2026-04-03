// Tests for executor utility functions

import { describe, it, expect } from 'vitest';
import { parseInlineExecutor, validateInlineCode, extractFunctionName } from './executorUtils';

describe('parseInlineExecutor', () => {
  it('parses valid inline code into executor function', () => {
    const code = 'return inputs.a + inputs.b;';
    const executor = parseInlineExecutor(code, 'test-executor');

    const result = executor({ a: 1, b: 2 }, {}, {});
    expect(result).toBe(3);
  });

  it('throws error for empty code', () => {
    expect(() => parseInlineExecutor('', 'test')).toThrow('inline code cannot be empty');
  });

  it('throws error for whitespace-only code', () => {
    expect(() => parseInlineExecutor('   \n\t  ', 'test')).toThrow('inline code cannot be empty');
  });

  it('throws error for syntax error in code', () => {
    const code = 'return {{{{invalid'; // syntax error
    expect(() => parseInlineExecutor(code, 'bad-executor')).toThrow(/bad-executor.*parse error/i);
  });

  it('can access params in executor', () => {
    const code = 'return inputs.value * params.multiplier;';
    const executor = parseInlineExecutor(code, 'test');

    const result = executor({ value: 5 }, { multiplier: 3 }, {});
    expect(result).toBe(15);
  });

  it('can return a promise for async executors', async () => {
    const code = 'return Promise.resolve(inputs.value * 2);';
    const executor = parseInlineExecutor(code, 'async-test');

    const result = await executor({ value: 5 }, {}, {});
    expect(result).toBe(10);
  });

  it('returns a function with correct type', () => {
    const executor = parseInlineExecutor('return inputs.x;', 'type-test');
    expect(typeof executor).toBe('function');
  });
});

describe('validateInlineCode', () => {
  it('returns true for valid code', () => {
    expect(validateInlineCode('return inputs.x;')).toBe(true);
    expect(validateInlineCode('const x = 1;\nreturn x;')).toBe(true);
  });

  it('returns false for empty string', () => {
    expect(validateInlineCode('')).toBe(false);
  });

  it('returns false for non-string input', () => {
    expect(validateInlineCode(null as any)).toBe(false);
    expect(validateInlineCode(undefined as any)).toBe(false);
    expect(validateInlineCode(123 as any)).toBe(false);
  });

  it('returns false for code with syntax errors', () => {
    expect(validateInlineCode('return {{{')).toBe(false);
  });
});

describe('extractFunctionName', () => {
  it('extracts named function', () => {
    expect(extractFunctionName('function myFunc() { return 1; }')).toBe('myFunc');
  });

  it('extracts exported function', () => {
    expect(extractFunctionName('export function calculate() { return 1; }')).toBe('calculate');
  });

  it('extracts async function', () => {
    expect(extractFunctionName('async function fetchData() {}')).toBe('fetchData');
  });

  it('returns null for anonymous function', () => {
    expect(extractFunctionName('return 1;')).toBeNull();
  });

  it('returns null for arrow function', () => {
    expect(extractFunctionName('const fn = () => 1;')).toBeNull();
  });
});
