import type { EcosystemStats, Stage } from '../../shared/types.js';
import { STATS_COUNTS, STATS_MOST_CONNECTED, STATS_STAGE_BREAKDOWN, STATS_TOP_SECTORS } from '../cypher.js';
import type { Tracer } from '../execute.js';
import { personFrom, toNumber } from '../mappers.js';

export async function getStats(tracer: Tracer): Promise<EcosystemStats> {
  // Four independent reads — issue them together rather than in series so the
  // dashboard costs one round trip's worth of latency, not four.
  const [counts, sectors, stages, connectors] = await Promise.all([
    tracer.row(STATS_COUNTS),
    tracer.rows(STATS_TOP_SECTORS, { limit: 8 }),
    tracer.rows(STATS_STAGE_BREAKDOWN),
    tracer.rows(STATS_MOST_CONNECTED, { limit: 6 }),
  ]);

  return {
    counts: {
      people: toNumber(counts?.people),
      companies: toNumber(counts?.companies),
      investors: toNumber(counts?.investors),
      rounds: toNumber(counts?.rounds),
      relationships: toNumber(counts?.relationships),
    },
    topSectors: sectors.map((row) => ({
      sector: String(row.sector),
      companies: toNumber(row.companies),
      totalRaisedUsd: toNumber(row.totalRaisedUsd),
    })),
    stageBreakdown: stages.map((row) => ({
      stage: row.stage as Stage,
      rounds: toNumber(row.rounds),
      totalRaisedUsd: toNumber(row.totalRaisedUsd),
    })),
    mostConnected: connectors.map((row) => ({
      ...personFrom(row),
      connections: toNumber(row.connections),
    })),
  };
}
