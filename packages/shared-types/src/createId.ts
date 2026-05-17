// createId - cross-environment unique ID generation
// Works in browser (HTTP/HTTPS), Node.js, and Web Workers.
// Falls back gracefully when Web Crypto API is unavailable.

/**
 * Generate a unique ID string.
 *
 * @param prefix - Optional prefix for the fallback (default: 'id')
 * @returns A UUID v4 string, or a prefixed fallback string
 */
export function createId(prefix = 'id'): string {
  const cryptoObj = globalThis.crypto;

  if (cryptoObj?.randomUUID) {
    return cryptoObj.randomUUID();
  }

  if (cryptoObj?.getRandomValues) {
    const bytes = new Uint8Array(16);
    cryptoObj.getRandomValues(bytes);

    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');

    return [
      hex.slice(0, 8),
      hex.slice(8, 12),
      hex.slice(12, 16),
      hex.slice(16, 20),
      hex.slice(20),
    ].join('-');
  }

  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
