/**
 * Copy CSS modules to dist directory
 * TypeScript build only copies .ts/.tsx files, so we need to copy .css files manually
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const srcDir = path.join(__dirname, '..', 'src', 'components');
const distDir = path.join(__dirname, '..', 'dist', 'src', 'components');

function copyCSSFiles(source, destination) {
  if (!fs.existsSync(destination)) {
    fs.mkdirSync(destination, { recursive: true });
  }

  const entries = fs.readdirSync(source, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(source, entry.name);
    const destPath = path.join(destination, entry.name);

    if (entry.isDirectory()) {
      copyCSSFiles(srcPath, destPath);
    } else if (entry.name.endsWith('.css')) {
      fs.copyFileSync(srcPath, destPath);
      console.log(`Copied: ${entry.name}`);
    }
  }
}

console.log('Copying CSS modules to dist...');
copyCSSFiles(srcDir, distDir);
console.log('Done!');
