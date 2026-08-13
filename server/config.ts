import { config as loadDotenv } from 'dotenv';

// Locally we read .env; on Vercel the variables are injected by the platform
// and there is no .env file to find, which dotenv treats as a no-op.
loadDotenv();

export interface CognoConfig {
  uri: string;
  user: string;
  password: string;
  database: string | undefined;
}

export interface ConfigResult {
  ok: boolean;
  config: CognoConfig | null;
  /** Names of the variables that are missing, for a precise error message. */
  missing: string[];
}

/**
 * Reads the CognoDB connection details from the environment.
 *
 * Nothing is ever hard-coded or committed: the URI and password live in .env
 * locally (gitignored) and in Vercel's encrypted environment variables in
 * production. This returns a result object rather than throwing so the API can
 * answer with a helpful 503 instead of crashing the function.
 */
export function readConfig(): ConfigResult {
  const uri = process.env.COGNODB_URI?.trim();
  const user = process.env.COGNODB_USER?.trim() || 'cognodb';
  const password = process.env.COGNODB_PASSWORD?.trim();
  const database = process.env.COGNODB_DATABASE?.trim() || undefined;

  const missing: string[] = [];
  if (!uri) missing.push('COGNODB_URI');
  if (!password) missing.push('COGNODB_PASSWORD');

  if (missing.length > 0) {
    return { ok: false, config: null, missing };
  }

  return {
    ok: true,
    config: { uri: uri!, user, password: password!, database },
    missing: [],
  };
}

/** Query budget. The free c0 instance is small; fail fast rather than hang a page. */
export const QUERY_TIMEOUT_MS = 12_000;

/** How long the driver waits for a connection before giving up. */
export const CONNECTION_TIMEOUT_MS = 8_000;
