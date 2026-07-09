// MIME type inference for image URLs.
// Extracted from load-image.ts (split-tiles-service-layer T2).

/** Infer MIME type from URL path extension */
export function inferMimeType(url: string): string {
  const ext = url.split('?')[0].split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'webp':
      return 'image/webp';
    case 'gif':
      return 'image/gif';
    case 'bmp':
      return 'image/bmp';
    case 'ico':
      return 'image/x-icon';
    default:
      return 'image/png'; // conservative default
  }
}