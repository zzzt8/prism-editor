// Download utilities for the user app
// Supports single image, multi-size, and ZIP archive downloads.

/** Trigger a browser download from a Blob */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Revoke after a short delay so the download completes before cleanup
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Trigger a browser download from a data URL */
export function downloadDataUrl(dataUrl: string, filename: string): void {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

const MIME_EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

export function mimeToExt(mime: string): string {
  return MIME_EXT[mime] ?? 'png';
}

/** Resolve the image data URL and MIME type from a node executor output value. */
export function extractImageData(resultValue: unknown): { dataUrl: string; mimeType: string } | null {
  if (resultValue == null) return null;

  const rv = resultValue as Record<string, unknown>;

  // Support both flat outputs and wrapped { result: outputs } structures
  const effective: Record<string, unknown> =
    rv && typeof rv === 'object' && 'result' in rv && typeof rv.result === 'object'
      ? (rv.result as Record<string, unknown>)
      : rv;

  const dataUrl: string | null =
    typeof effective.dataUrl === 'string' && effective.dataUrl.length > 0
      ? effective.dataUrl
      : typeof effective.previewUrl === 'string' && effective.previewUrl.startsWith('data:')
      ? effective.previewUrl
      : null;

  if (!dataUrl) return null;

  const mimeType: string =
    typeof effective.mimeType === 'string' && effective.mimeType.length > 0
      ? effective.mimeType
      : 'image/png';

  return { dataUrl, mimeType };
}

/** Convert a data URL or HTTP URL to a Blob */
export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  if (dataUrl.startsWith('data:')) {
    const commaIdx = dataUrl.indexOf(',');
    const meta = dataUrl.slice(5, commaIdx); // e.g. "image/png;base64"
    const isBase64 = meta.includes(';base64');
    const mime = meta.replace(';base64', '').replace(';charset=', '') || 'image/png';
    const body = dataUrl.slice(commaIdx + 1);

    if (isBase64) {
      const binary = atob(body);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return new Blob([bytes], { type: mime });
    } else {
      // URL-encoded body (rare)
      const decoded = decodeURIComponent(body);
      return new Blob([decoded], { type: mime });
    }
  }

  const res = await fetch(dataUrl);
  if (!res.ok) throw new Error(`Failed to fetch image: ${res.status} ${res.statusText}`);
  return res.blob();
}

/** Resize an image by drawing it onto a canvas at a target size */
async function resizeDataUrl(
  dataUrl: string,
  width: number,
  height: number
): Promise<Blob> {
  const img = await loadImage(dataUrl);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get canvas context');
  ctx.drawImage(img, 0, 0, width, height);
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => {
      if (b) resolve(b);
      else reject(new Error('Failed to create blob from resized image'));
    });
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
  });
}

// ── JSZip lazy import ───────────────────────────────────────────────────────────
// Dynamically import JSZip so apps that don't need ZIP downloads don't pay the
// bundle cost. If the import fails we surface a clear error message.

async function loadJsZip(): Promise<typeof import('jszip')> {
  const jszip = await import('jszip');
  return jszip.default ?? jszip;
}

// ── Public download API ────────────────────────────────────────────────────────

/**
 * Download a single image result.
 * @param resultValue  Node executor output value containing dataUrl/previewUrl
 * @param filename     Base filename (without extension)
 */
export async function downloadSingleImage(
  resultValue: unknown,
  filename: string
): Promise<void> {
  const extracted = extractImageData(resultValue);
  if (!extracted) throw new Error('无可用图片数据');
  const ext = mimeToExt(extracted.mimeType);
  const blob = await dataUrlToBlob(extracted.dataUrl);
  downloadBlob(blob, `${filename}.${ext}`);
}

/**
 * Download an image at multiple sizes.
 * @param resultValue  Node executor output value
 * @param filename     Base filename
 * @param sizes        Pixel widths to export at (height derived from aspect ratio)
 */
export async function downloadMultiSize(
  resultValue: unknown,
  filename: string,
  sizes: number[]
): Promise<void> {
  const extracted = extractImageData(resultValue);
  if (!extracted) throw new Error('无可用图片数据');
  const ext = mimeToExt(extracted.mimeType);

  // Load original to derive aspect ratio
  const img = await loadImage(extracted.dataUrl);
  const origW = img.naturalWidth;
  const origH = img.naturalHeight;
  const ratio = origH / origW;

  for (const w of sizes) {
    const h = Math.round(w * ratio);
    const blob = await resizeDataUrl(extracted.dataUrl, w, h);
    const suffix = w === origW ? '' : `@${w}w`;
    downloadBlob(blob, `${filename}${suffix}.${ext}`);
    // Small delay between triggers to avoid browser blocking multiple downloads
    await new Promise((r) => setTimeout(r, 100));
  }
}

/**
 * Pack multiple image results into a single ZIP archive and trigger download.
 * @param items          Array of { resultValue, filename } entries
 * @param archiveName    ZIP archive filename (without .zip)
 */
export async function downloadZipPack(
  items: { resultValue: unknown; filename: string }[],
  archiveName: string
): Promise<void> {
  const JSZip = await loadJsZip();
  const zip = new JSZip();

  for (const { resultValue, filename } of items) {
    const extracted = extractImageData(resultValue);
    if (!extracted) continue;
    const ext = mimeToExt(extracted.mimeType);
    const blob = await dataUrlToBlob(extracted.dataUrl);
    zip.file(`${filename}.${ext}`, blob);
  }

  const content = await zip.generateAsync({ type: 'blob' });
  downloadBlob(content, `${archiveName}.zip`);
}
