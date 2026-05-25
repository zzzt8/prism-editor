// Server test setup - configure environment for API testing

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

// Load .env file if exists (for test database)
// Use process.cwd() which points to server/ directory when running tests
const envPath = resolve(process.cwd(), '.env');

if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      process.env[match[1].trim()] = match[2].trim();
    }
  }
}

// Ensure OSS is disabled during tests (no real cloud calls)
process.env.OSS_ENABLED = 'false';

// Set test database URL (SQLite path for local dev testing)
// Must use absolute path with file: protocol for Prisma
const dbPath = resolve(process.cwd(), 'prisma', 'dev.db');
process.env.DATABASE_URL = `file:${dbPath}`;
