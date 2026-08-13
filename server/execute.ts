import type { QueryTrace } from '../shared/types.ts';
import type { CypherStatement } from './cypher.ts';
import { run } from './db.ts';

type Row = Record<string, any>;

/**
 * Runs statements from the catalogue and records what it ran.
 *
 * Every endpoint creates one Tracer, hands it to the service layer, and returns
 * `tracer.traces` alongside the data. That is what powers the "Query behind
 * this screen" drawer: the UI is showing the actual execution log, not a
 * hand-written copy that can drift out of date.
 */
export class Tracer {
  readonly traces: QueryTrace[] = [];

  async rows(stmt: CypherStatement, params: Record<string, unknown> = {}): Promise<Row[]> {
    const startedAt = Date.now();
    const result = await run(stmt.text, params);
    const rows = result.records.map((record) => record.toObject() as Row);

    this.traces.push({
      name: stmt.name,
      purpose: stmt.purpose,
      cypher: stmt.text,
      params,
      tookMs: Date.now() - startedAt,
      rows: rows.length,
    });

    return rows;
  }

  /** Same as `rows`, but for statements that return at most one record. */
  async row(stmt: CypherStatement, params: Record<string, unknown> = {}): Promise<Row | null> {
    const rows = await this.rows(stmt, params);
    return rows[0] ?? null;
  }
}
