import { useState } from 'react';
import type { Conflict } from '../../shared/types';
import { useReportTraces } from '../App';
import { AsyncBoundary, EmptyState, SkeletonCards } from '../components/states';
import { monthYear } from '../lib/format';
import { useApi } from '../lib/useApi';

/**
 * The screen that exists to make the "why a graph?" argument concrete.
 */
export function ConflictsPage() {
  const [onlyRivals, setOnlyRivals] = useState(false);
  const state = useApi<Conflict[]>('conflicts', { limit: 60 });
  useReportTraces(state.traces);

  const all = state.data ?? [];
  const shown = onlyRivals ? all.filter((conflict) => conflict.declaredRivals) : all;
  const rivalCount = all.filter((conflict) => conflict.declaredRivals).length;

  return (
    <>
      <div className="page-head">
        <h1>Conflicts of interest</h1>
        <p>
          Firms sitting on both sides of a rivalry. This is one <span className="mono">MATCH</span> that walks investor →
          round → company → sector → company → round → investor. In a relational schema it is a four-way self-join over
          the round-participation table, plus a predicate to stop every pair appearing twice.
        </p>
      </div>

      <div className="row row--between row--wrap" style={{ gap: 10, marginBottom: 14 }}>
        <div className="row" style={{ gap: 8 }}>
          <span className="badge badge--danger">{rivalCount} declared rivalries</span>
          <span className="badge badge--warning">{all.length - rivalCount} sector overlaps</span>
        </div>
        <div className="segmented">
          <button type="button" aria-pressed={!onlyRivals} onClick={() => setOnlyRivals(false)}>
            All overlaps
          </button>
          <button type="button" aria-pressed={onlyRivals} onClick={() => setOnlyRivals(true)}>
            Declared rivals only
          </button>
        </div>
      </div>

      <AsyncBoundary
        state={state}
        skeleton={<SkeletonCards count={6} height={150} />}
        isEmpty={() => shown.length === 0}
        empty={
          <EmptyState
            title={onlyRivals ? 'No declared rivalries' : 'No overlapping bets'}
            body={
              onlyRivals
                ? 'No firm in the graph has backed two companies that are modelled as direct competitors.'
                : 'No firm has two portfolio companies in the same sector.'
            }
            icon="✓"
            action={
              onlyRivals ? (
                <button type="button" className="btn btn--sm" onClick={() => setOnlyRivals(false)}>
                  Show all overlaps
                </button>
              ) : undefined
            }
          />
        }
      >
        {() => (
          <div className="grid grid--2">
            {shown.map((conflict, index) => (
              <article
                key={`${conflict.investor.id}-${conflict.companies[0].company.id}-${conflict.companies[1].company.id}-${index}`}
                className="card"
                style={
                  conflict.declaredRivals
                    ? { borderColor: 'color-mix(in srgb, var(--danger) 35%, transparent)' }
                    : undefined
                }
              >
                <div className="row row--between" style={{ alignItems: 'flex-start', gap: 10 }}>
                  <div className="stack">
                    <a href={`#/investor/${conflict.investor.id}`} style={{ fontWeight: 600 }}>
                      {conflict.investor.name}
                    </a>
                    <span className="muted" style={{ fontSize: 12.5 }}>
                      {conflict.investor.type} · {conflict.investor.hq}
                    </span>
                  </div>
                  <span className={conflict.declaredRivals ? 'badge badge--danger' : 'badge badge--warning'}>
                    {conflict.declaredRivals ? 'Direct rivals' : 'Same sector'}
                  </span>
                </div>

                <div className="row" style={{ gap: 8, margin: '14px 0 4px', alignItems: 'stretch' }}>
                  {conflict.companies.map((entry) => (
                    <a
                      key={entry.company.id}
                      href={`#/company/${entry.company.id}`}
                      className="card card--link"
                      style={{ flex: 1, padding: 11, background: 'var(--surface-2)' }}
                    >
                      <div className="stack">
                        <strong style={{ fontSize: 13 }}>{entry.company.name}</strong>
                        <span className="faint" style={{ fontSize: 11.5 }}>
                          {entry.stage} · backed {monthYear(entry.announcedOn)}
                        </span>
                      </div>
                    </a>
                  ))}
                </div>

                <div className="row row--wrap" style={{ gap: 6, marginTop: 10 }}>
                  <span className="badge badge--sector">{conflict.sector}</span>
                  <span className="badge">severity: {conflict.severity}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </AsyncBoundary>
    </>
  );
}
