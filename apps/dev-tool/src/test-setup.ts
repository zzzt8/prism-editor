// Test setup: polyfill localStorage for Node.js test environment
// and extend expect with jest-dom matchers

import * as matchers from '@testing-library/jest-dom/vitest';

// Polyfill localStorage
const storage: Record<string, string> = {};

function resetStorage(): void {
  Object.keys(storage).forEach((k) => delete storage[k]);
}

(global as Record<string, unknown>).localStorage = {
  getItem: (_key: string) => storage[_key] ?? null,
  setItem: (_key: string, _value: string) => { storage[_key] = _value; },
  removeItem: (_key: string) => { delete storage[_key]; },
  clear: () => resetStorage(),
  key: (_index: number) => Object.keys(storage)[_index] ?? null,
  get length() { return Object.keys(storage).length; },
} as unknown as Storage;

// Extend expect with jest-dom matchers (available via test globals)
declare global {
  namespace Vitest {
    interface Expect {
      toBeInTheDocument(): void;
      toHaveTextContent(_content: string | RegExp): void;
      toHaveAttribute(_attr: string, _value?: string): void;
      toBeVisible(): void;
      toBeDisabled(): void;
      toBeEnabled(): void;
      toHaveClass(..._classes: string[]): void;
      toHaveValue(_value: string | number | string[]): void;
      toBeChecked(): void;
      toBeEmptyDOMElement(): void;
      toBeInTheDOM(): void;
    }
  }
}

expect.extend(matchers);

export { resetStorage };