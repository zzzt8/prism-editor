// Test setup: polyfill localStorage for Node.js test environment
// Each test file re-initialises the store to avoid cross-file pollution.

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

export { resetStorage };
