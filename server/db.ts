import neo4j, { type Driver, type QueryResult, type Session } from 'neo4j-driver';
import { CONNECTION_TIMEOUT_MS, QUERY_TIMEOUT_MS, readConfig } from './config.ts';
import { ApiError } from './errors.ts';

/**
 * CognoDB speaks openCypher over Bolt, so the *official* Neo4j driver is the
 * client — there is no CognoDB-specific SDK. Everything below is standard
 * neo4j-driver usage pointed at a bolt+s:// CognoDB URI.
 */

// Vercel keeps a warm Node process between invocations. Caching the driver on
// globalThis means we reuse the connection pool instead of paying a TLS
// handshake per request — and it survives module reloads in `tsx watch`.
const DRIVER_KEY = Symbol.for('warmgraph.driver');
type DriverHolder = { [DRIVER_KEY]?: Driver };

function cache(): DriverHolder {
  return globalThis as unknown as DriverHolder;
}

export function getDriver(): Driver {
  const existing = cache()[DRIVER_KEY];
  if (existing) return existing;

  const { ok, config, missing } = readConfig();
  if (!ok || !config) {
    throw new ApiError(
      'NOT_CONFIGURED',
      'The application is not connected to a database yet.',
      `Missing environment variable(s): ${missing.join(', ')}. Copy .env.example to .env and fill in your CognoDB details.`,
    );
  }

  const driver = neo4j.driver(
    config.uri,
    neo4j.auth.basic(config.user, config.password),
    {
      // Return plain JS numbers instead of the driver's Integer wrapper. Our
      // largest values are USD amounts in the billions, far inside Number's
      // safe range, so nothing is lost and the JSON stays clean.
      disableLosslessIntegers: true,
      connectionTimeout: CONNECTION_TIMEOUT_MS,
      // The free c0 tier allows 200 connections; a small pool is plenty and
      // keeps a burst of serverless invocations from exhausting the instance.
      maxConnectionPoolSize: 12,
      connectionAcquisitionTimeout: 10_000,
      maxTransactionRetryTime: 6_000,
      userAgent: 'warmgraph/1.0',
    },
  );

  cache()[DRIVER_KEY] = driver;
  return driver;
}

/** Translates driver-level failures into the API's error vocabulary. */
export function toApiError(err: unknown): ApiError {
  if (err instanceof ApiError) return err;

  const e = err as { code?: string; message?: string; name?: string };
  const code = e?.code ?? '';
  const message = e?.message ?? String(err);

  if (code.includes('Security.Unauthorized') || /authentication|unauthorized/i.test(message)) {
    return new ApiError(
      'DB_AUTH_FAILED',
      'The database rejected our credentials.',
      'Check COGNODB_USER and COGNODB_PASSWORD. CognoDB shows the password once at provision time; rotate it from the console if it was lost.',
    );
  }

  if (
    code.includes('ServiceUnavailable') ||
    e?.name === 'Neo4jError' && /routing|unable to connect|connection/i.test(message) ||
    /ECONNREFUSED|ENOTFOUND|ETIMEDOUT|EAI_AGAIN|socket hang up/i.test(message)
  ) {
    return new ApiError(
      'DB_UNREACHABLE',
      'Could not reach the CognoDB instance.',
      'Verify COGNODB_URI (it should start with bolt+s://) and that the instance is running in the CognoDB console.',
    );
  }

  if (/timed out|timeout/i.test(message)) {
    return new ApiError('TIMEOUT', 'The database took too long to answer.', 'The free c0 instance is burstable; retry in a moment.');
  }

  return new ApiError('INTERNAL', 'The database returned an unexpected error.', message);
}

/**
 * Converts whole JS numbers into Bolt integers before they leave the process.
 *
 * `disableLosslessIntegers` only governs the *inbound* direction. Outbound, a
 * plain JS number is encoded as a 64-bit float, so `LIMIT $limit` arrives as
 * `10.0` and the server rejects it — and every year, headcount and USD amount
 * in the seed data would be stored as a float. Normalising here, once, means
 * neither the queries nor the seed script have to think about it.
 *
 * Recurses through the arrays and maps used by the batched `UNWIND` writes.
 * Genuinely fractional numbers are left alone.
 */
function toBoltParams(value: unknown): unknown {
  if (typeof value === 'number') {
    return Number.isInteger(value) ? neo4j.int(value) : value;
  }
  if (Array.isArray(value)) return value.map(toBoltParams);
  if (value !== null && typeof value === 'object' && value.constructor === Object) {
    const converted: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) converted[key] = toBoltParams(entry);
    return converted;
  }
  return value;
}

export interface RunOptions {
  /** Read queries are routed to followers when the deployment has them. */
  write?: boolean;
  database?: string;
}

/**
 * Runs a single parameterised Cypher statement.
 *
 * `params` is always passed to the driver separately — there is no string
 * concatenation of user input into Cypher anywhere in this codebase.
 */
export async function run(
  cypher: string,
  params: Record<string, unknown> = {},
  options: RunOptions = {},
): Promise<QueryResult> {
  const driver = getDriver();
  const { config } = readConfig();
  let session: Session | null = null;

  try {
    session = driver.session({
      defaultAccessMode: options.write ? neo4j.session.WRITE : neo4j.session.READ,
      database: options.database ?? config?.database,
    });
    return await session.run(cypher, toBoltParams(params) as Record<string, unknown>, {
      timeout: QUERY_TIMEOUT_MS,
    });
  } catch (err) {
    throw toApiError(err);
  } finally {
    await session?.close().catch(() => {
      /* closing a already-broken session must not mask the original error */
    });
  }
}

/** Convenience wrapper: run a query and map each record with `fn`. */
export async function runMapped<T>(
  cypher: string,
  params: Record<string, unknown>,
  fn: (row: Record<string, unknown>) => T,
  options: RunOptions = {},
): Promise<T[]> {
  const result = await run(cypher, params, options);
  return result.records.map((record) => fn(record.toObject() as Record<string, unknown>));
}

export async function closeDriver(): Promise<void> {
  const driver = cache()[DRIVER_KEY];
  if (driver) {
    delete cache()[DRIVER_KEY];
    await driver.close();
  }
}
