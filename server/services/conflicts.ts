import type { Conflict, Stage } from '../../shared/types.ts';
import { CONFLICTS } from '../cypher.ts';
import type { Tracer } from '../execute.ts';
import { investorFrom, toStringList } from '../mappers.ts';

/**
 * "Which firms are funding both sides of a fight?"
 *
 * This is the query that makes the case for a graph. The pattern walks
 * investor → round → company → sector → company → round → investor in a single
 * MATCH; the relational version is a four-way self-join over the
 * round-participation table with a de-duplication predicate to stop each pair
 * appearing twice.
 */
export async function getConflicts(tracer: Tracer, limit = 40): Promise<Conflict[]> {
  const rows = await tracer.rows(CONFLICTS, { limit });

  return rows.map((row) => {
    const declaredRivals = Boolean(row.declaredRivals);
    return {
      investor: {
        ...investorFrom(row, 'investor'),
        sectors: toStringList(row.investorSectors),
      },
      sector: String(row.sector),
      companies: [
        {
          company: {
            id: String(row.aId),
            name: String(row.aName),
            stage: row.aStage as Stage,
            city: String(row.aCity ?? ''),
            sectors: [String(row.sector)],
          },
          stage: row.aStage as Stage,
          announcedOn: String(row.aDate ?? ''),
        },
        {
          company: {
            id: String(row.bId),
            name: String(row.bName),
            stage: row.bStage as Stage,
            city: String(row.bCity ?? ''),
            sectors: [String(row.sector)],
          },
          stage: row.bStage as Stage,
          announcedOn: String(row.bDate ?? ''),
        },
      ],
      declaredRivals,
      // A shared sector is a flag; an explicitly modelled rivalry is a problem.
      severity: declaredRivals ? 'high' : 'medium',
    };
  });
}
