import { useState } from 'react';
import { useReportTraces } from '../App';
import { CypherBlock } from '../components/Cypher';
import { AsyncBoundary, SkeletonRows } from '../components/states';
import { useApi } from '../lib/useApi';

interface CatalogueEntry {
  name: string;
  purpose: string;
  text: string;
  note?: string;
}

/**
 * The whole Cypher catalogue, served from the same module the API executes.
 * If a query changes, this page changes with it — there is no second copy.
 */
export function QueriesPage() {
  const state = useApi<CatalogueEntry[]>('queries');
  const [filter, setFilter] = useState('');
  useReportTraces(state.traces);

  return (
    <>
      <div className="page-head">
        <h1>Cypher library</h1>
        <p>
          Every statement this application can run, exactly as it is stored in <span className="mono">server/cypher.ts</span>.
          Values the user controls are always bound parameters — the <span className="mono">$name</span> tokens below — so
          no query text is ever assembled from user input.
        </p>
      </div>

      <input
        className="input"
        style={{ maxWidth: 340, marginBottom: 16 }}
        placeholder="Filter by name or purpose…"
        value={filter}
        onChange={(event) => setFilter(event.target.value)}
        aria-label="Filter queries"
      />

      <AsyncBoundary state={state} skeleton={<SkeletonRows count={6} />}>
        {(data) => {
          const term = filter.trim().toLowerCase();
          const shown = term
            ? data.filter(
                (entry) => entry.name.toLowerCase().includes(term) || entry.purpose.toLowerCase().includes(term),
              )
            : data;

          if (shown.length === 0) {
            return <p className="muted">No query matches “{filter}”.</p>;
          }

          return (
            <div className="stack" style={{ gap: 16 }}>
              {shown.map((entry) => (
                <section className="query-block" key={entry.name}>
                  <div className="query-block__head">
                    <div className="stack">
                      <span className="query-block__name">{entry.name}</span>
                      <span className="faint" style={{ fontSize: 12.5 }}>
                        {entry.purpose}
                      </span>
                    </div>
                  </div>
                  <CypherBlock source={entry.text} />
                  {entry.note ? (
                    <p className="params" style={{ fontFamily: 'var(--sans)', fontSize: 12.5 }}>
                      {entry.note}
                    </p>
                  ) : null}
                </section>
              ))}
            </div>
          );
        }}
      </AsyncBoundary>
    </>
  );
}
