import { useState } from 'react';
import type { DirectoryFilters, InvestorListItem } from '../../shared/types';
import { useReportTraces } from '../App';
import { AsyncBoundary, EmptyState, SkeletonCards } from '../components/states';
import { usd } from '../lib/format';
import { useApi, useDebounced } from '../lib/useApi';

export function InvestorsPage() {
  const [q, setQ] = useState('');
  const [sector, setSector] = useState('');
  const [type, setType] = useState('');

  const debouncedQ = useDebounced(q);
  const filters = useApi<DirectoryFilters>('filters');
  const investors = useApi<InvestorListItem[]>('investors', { q: debouncedQ, sector, type, limit: 90 });
  useReportTraces(investors.traces, filters.traces);

  const clearable = Boolean(q || sector || type);

  return (
    <>
      <div className="page-head">
        <h1>Investors</h1>
        <p>Every firm in the graph, with the sectors its thesis actually covers and the size of its portfolio.</p>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="row row--wrap" style={{ gap: 10 }}>
          <input
            className="input"
            style={{ flex: '1 1 220px' }}
            placeholder="Filter by name…"
            value={q}
            onChange={(event) => setQ(event.target.value)}
            aria-label="Filter investors by name"
          />
          <select
            className="select"
            style={{ flex: '0 1 190px' }}
            value={sector}
            onChange={(event) => setSector(event.target.value)}
            aria-label="Filter by sector"
          >
            <option value="">All sectors</option>
            {(filters.data?.sectors ?? []).map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <select
            className="select"
            style={{ flex: '0 1 170px' }}
            value={type}
            onChange={(event) => setType(event.target.value)}
            aria-label="Filter by investor type"
          >
            <option value="">All types</option>
            {(filters.data?.investorTypes ?? []).map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          {clearable ? (
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => {
                setQ('');
                setSector('');
                setType('');
              }}
            >
              Clear
            </button>
          ) : null}
        </div>
      </div>

      <AsyncBoundary
        state={investors}
        skeleton={<SkeletonCards count={9} height={126} />}
        isEmpty={(data) => data.length === 0}
        empty={
          <EmptyState
            title="No firms match those filters"
            body="Try removing a filter, or search for a firm by name."
            icon="⌕"
            action={
              <button
                type="button"
                className="btn btn--sm"
                onClick={() => {
                  setQ('');
                  setSector('');
                  setType('');
                }}
              >
                Clear filters
              </button>
            }
          />
        }
      >
        {(data) => (
          <>
            <div className="section-head">
              <h2>{data.length} firms</h2>
              <span>Sorted by portfolio size</span>
            </div>
            <div className="grid grid--2">
              {data.map((investor) => (
                <a key={investor.id} className="card card--link" href={`#/investor/${investor.id}`}>
                  <div className="row row--between" style={{ alignItems: 'flex-start', gap: 10 }}>
                    <div className="stack">
                      <strong>{investor.name}</strong>
                      <span className="muted" style={{ fontSize: 12.5 }}>
                        {investor.type} · {investor.hq}
                      </span>
                    </div>
                    <span className="badge badge--investor nowrap">{usd(investor.checkSizeUsd)} cheque</span>
                  </div>
                  <p className="muted" style={{ fontSize: 12.5, margin: '10px 0 0' }}>
                    {investor.thesis}
                  </p>
                  <div className="row row--wrap" style={{ marginTop: 10, gap: 6 }}>
                    <span className="badge">{investor.portfolioSize} companies</span>
                    {investor.sectors.slice(0, 3).map((name) => (
                      <span key={name} className="badge badge--sector">
                        {name}
                      </span>
                    ))}
                  </div>
                </a>
              ))}
            </div>
          </>
        )}
      </AsyncBoundary>
    </>
  );
}
