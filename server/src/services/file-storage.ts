/**
 * File storage service for production renders.
 *
 * Files are stored locally in server/assets/renders/ directory.
 * URL access is provided via /api/assets/renders/:filename route.
 */

import path from 'path';
import fs from 'fs/promises';
import { createHash } from 'crypto';

export interface StoredFile {
  name: string;
  url: string;
  mimeType: string;
  size: number;
}

export interface ImageData {
  data: Uint8ClampedArray | Buffer;
  width: number;
  height: number;
  channels?: number;
}

/**
 * Get the renders directory path.
 * Creates the directory if it doesn't exist.
 */
async function getRendersDir(): Promise<string> {
  const rendersDir = path.resolve(process.cwd(), 'assets', 'renders');
  await fs.mkdir(rendersDir, { recursive: true });
  return rendersDir;
}

/**
 * Generate a unique filename for a render.
 * Format: {uuid}.{format}
 */
function generateFilename(workflowName: string, format: string = 'png'): string {
  const uuid = createHash('sha256')
    .update(`${workflowName}-${Date.now()}-${Math.random().toString(36)}`)
    .digest('hex')
    .substring(0, 16);
  return `${uuid}.${format}`;
}

/**
 * Save image data to a file and return the file metadata.
 */
export async function saveRenderedImage(
  workflowName: string,
  imageData: ImageData,
  mimeType: string = 'image/png'
): Promise<StoredFile> {
  const rendersDir = await getRendersDir();
  const format = mimeType === 'image/png' ? 'png' : mimeType === 'image/jpeg' ? 'jpg' : 'png';
  const filename = generateFilename(workflowName, format);
  const filePath = path.join(rendersDir, filename);

  // Convert ImageData to buffer based on format
  let buffer: Buffer;
  if (imageData.data instanceof Buffer) {
    buffer = imageData.data;
  } else {
    buffer = Buffer.from(imageData.data);
  }

  // Apply format conversion if needed
  let finalBuffer = buffer;
  const mimeTypeLower = mimeType.toLowerCase();
  if (mimeTypeLower === 'image/jpeg' || mimeTypeLower === 'image/jpg') {
    // For JPEG, we need to convert RGBA to RGB using sharp
    const sharp = (await import('sharp')).default;
    finalBuffer = await sharp(buffer).removeAlpha().jpeg({ quality: 90 }).toBuffer();
  }

  await fs.writeFile(filePath, finalBuffer);

  const stats = await fs.stat(filePath);

  return {
    name: filename,
    url: `/api/assets/renders/${filename}`,
    mimeType,
    size: stats.size,
  };
}

/**
 * Save a base64-encoded image string to a file.
 */
export async function saveBase64Image(
  workflowName: string,
  base64Data: string,
  mimeType: string = 'image/png'
): Promise<StoredFile> {
  const rendersDir = await getRendersDir();
  const format = mimeType === 'image/png' ? 'png' : mimeType === 'image/jpeg' ? 'jpg' : 'png';
  const filename = generateFilename(workflowName, format);
  const filePath = path.join(rendersDir, filename);

  // Remove data URL prefix if present
  const base64Content = base64Data.replace(/^data:[^;]+;base64,/, '');
  const buffer = Buffer.from(base64Content, 'base64');

  await fs.writeFile(filePath, buffer);

  const stats = await fs.stat(filePath);

  return {
    name: filename,
    url: `/api/assets/renders/${filename}`,
    mimeType,
    size: stats.size,
  };
}

/**
 * Delete a rendered file.
 */
export async function deleteRenderedFile(filename: string): Promise<boolean> {
  const rendersDir = await getRendersDir();
  const filePath = path.join(rendersDir, filename);

  try {
    await fs.unlink(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if a rendered file exists.
 */
export async function fileExists(filename: string): Promise<boolean> {
  const rendersDir = await getRendersDir();
  const filePath = path.join(rendersDir, filename);

  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the full path to a rendered file.
 */
export function getFilePath(filename: string): string {
  return path.resolve(process.cwd(), 'assets', 'renders', filename);
}
