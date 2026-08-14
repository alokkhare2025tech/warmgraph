import type { Conflict, ConflictReport, Stage } from '../../shared/types';
import { CONFLICT_COUNTS, CONFLICTS } from '../cypher';
import type { Tracer } from '../execute';
import { investorFrom, toNumber, toStringList } from '../mappers';

/**
 * "Which firms are funding both sides of a fight?"
 *
 * This is the query that makes the case for a graph. The pattern walks
 * investor → round → company → sector → company → round → investor in a single
 * MATCH; the relational version is a four-way self-join over the
 * round-participation table with a de-duplication predicate to stop each pair
 * appearing twice.
 */
export async function getConflicts(tracer: Tracer, limit = 40, rivalsOnly = false): Promise<ConflictReport> {
  // The list is ordered worst-first, so filtering it in the browser would be
  // degenerate — every row on page one is already a declared rivalry. The
  // filter has to reach the query, and the totals have to be counted
  // separately or the summary only ever describes the current page.
  const [rows, counts] = await Promise.all([
    tracer.rows(CONFLICTS, { limit, rivalsOnly }),
    tracer.row(CONFLICT_COUNTS),
  ]);

  const conflicts: Conflict[] = rows.map((row) => {
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

  return {
    conflicts,
    totals: {
      overlaps: toNumber(counts?.overlaps),
      rivalries: toNumber(counts?.rivalries),
    },
    rivalsOnly,
  };
}
