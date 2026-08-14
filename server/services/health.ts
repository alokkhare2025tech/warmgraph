import type { HealthReport } from '../../shared/types';
import { readConfig } from '../config';
import { HEALTH_PING, HEALTH_SEEDED } from '../cypher';
import { getDriver, run, toApiError } from '../db';
import { toNumber } from '../mappers';

/**
 * Never throws. The frontend polls this to decide whether to show the
 * "database unreachable" banner, so a failure here has to come back as data,
 * not as an error response.
 */
export async function checkHealth(): Promise<HealthReport> {
  const { ok: configured, missing } = readConfig();

  if (!configured) {
    return {
      configured: false,
      reachable: false,
      seeded: false,
      latencyMs: null,
      serverVersion: null,
      nodeCount: null,
      message: `Not configured — missing ${missing.join(', ')}. Copy .env.example to .env and add your CognoDB connection details.`,
    };
  }

  const startedAt = Date.now();
  try {
    await run(HEALTH_PING.text);
    const latencyMs = Date.now() - startedAt;

    let serverVersion: string | null = null;
    try {
      const info = await getDriver().getServerInfo();
      serverVersion = info.protocolVersion ? `Bolt ${info.protocolVersion}` : null;
    } catch {
      // Server info is a nicety; a failure here must not fail the health check.
    }

    let nodeCount: number | null = null;
    try {
      const result = await run(HEALTH_SEEDED.text);
      nodeCount = toNumber(result.records[0]?.get('nodeCount'));
    } catch {
      nodeCount = null;
    }

    const seeded = (nodeCount ?? 0) > 0;
    return {
      configured: true,
      reachable: true,
      seeded,
      latencyMs,
      serverVersion,
      nodeCount,
      message: seeded
        ? `Connected — ${nodeCount?.toLocaleString()} entities, ${latencyMs} ms round trip.`
        : 'Connected, but the graph is empty. Run `npm run seed` to load the dataset.',
    };
  } catch (err) {
    const apiError = toApiError(err);
    return {
      configured: true,
      reachable: false,
      seeded: false,
      latencyMs: null,
      serverVersion: null,
      nodeCount: null,
      message: `${apiError.message} ${apiError.hint ?? ''}`.trim(),
    };
  }
}
