import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

// Load .env.local so DATABASE_URL is available in test worker processes.
// Works both as a globalSetup (via exported setup()) and as a setupFile (top-level run).
function loadEnvLocal() {
  const envPath = resolve(process.cwd(), '.env.local');
  if (!existsSync(envPath)) return;

  const lines = readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    if (key && !(key in process.env)) {
      process.env[key] = value;
    }
  }
}

// Top-level: runs when used as setupFiles
loadEnvLocal();

// Export: called by vitest when used as globalSetup
export function setup() {
  loadEnvLocal();
}
