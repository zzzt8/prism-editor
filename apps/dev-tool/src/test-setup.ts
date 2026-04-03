// Test setup: polyfill localStorage for Node.js test environment
// and extend expect with jest-dom matchers

import * as matchers from '@testing-library/jest-dom/vitest';

// Polyfill localStorage
const storage: Record<string, string> = {};

function resetStorage(): void {
  Object.keys(storage).forEach((k) => delete storage[k]);
}

(global as Record<string, unknown>).localStorage = {
  getItem: (key: string) => storage[key] ?? null,
  setItem: (key: string, value: string) => { storage[key] = value; },
  removeItem: (key: string) => { delete storage[key]; },
  clear: () => resetStorage(),
  key: (index: number) => Object.keys(storage)[index] ?? null,
  get length() { return Object.keys(storage).length; },
} as unknown as Storage;

// Extend expect with jest-dom matchers (available via test globals)
declare global {
  namespace Vitest {
    interface Expect {
      toBeInTheDocument(): void;
      toHaveTextContent(content: string | RegExp): void;
      toHaveAttribute(attr: string, value?: string): void;
      toBeVisible(): void;
      toBeDisabled(): void;
      toBeEnabled(): void;
      toHaveClass(...classes: string[]): void;
      toHaveValue(value: string | number | string[]): void;
      toBeChecked(): void;
      toBeEmptyDOMElement(): void;
      toBeInTheDOM(): void;
    }
  }
}

expect.extend(matchers);

export { resetStorage };