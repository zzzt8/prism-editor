// Server test setup - configure environment for API testing

import { readFileSync } from 'fs';

// Load .env file if exists (for test database)
try {
  const envContent = readFileSync('./.env', 'utf-8');
  for (const line of envContent.split('\n')) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      process.env[match[1].trim()] = match[2].trim();
    }
  }
} catch {
  // .env file not found, use defaults
}

// Ensure OSS is disabled during tests (no real cloud calls)
process.env.OSS_ENABLED = 'false';

// Set test database URL if needed (SQLite path for local dev testing)
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'file:./dev.db';
}
