// @prism/shared-types postbuild script
// Copies validation/*.schema.json into dist/ so runtime consumers that import
// the built package (via `import { ... } from '@prism/shared-types'`) can
// still locate the schema files via `new URL(..., import.meta.url)`.
//
// Only runs the file copy — typecheck and `tsc` already emitted the JS.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(here, '..');

const srcDir = resolve(packageRoot, 'src/validation');
const distDir = resolve(packageRoot, 'dist/src/validation');

mkdirSync(distDir, { recursive: true });

for (const name of ['design-state.schema.json', 'render-request.schema.json', 'render-result.schema.json', 'runtime-template.schema.json']) {
  const from = resolve(srcDir, name);
  const to = resolve(distDir, name);
  const raw = readFileSync(from, 'utf-8');
  writeFileSync(to, raw, 'utf-8');
  process.stdout.write(`copied ${name}\n`);
}
