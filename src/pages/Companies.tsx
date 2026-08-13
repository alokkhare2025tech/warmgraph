import { useState } from 'react';
import type { CompanyListItem, DirectoryFilters } from '../../shared/types';
import { useReportTraces } from '../App';
import { AsyncBoundary, EmptyState, SkeletonRows } from '../components/states';
import { usd } from '../lib/format';
import { navigate } from '../lib/router';
import { useApi, useDebounced } from '../lib/useApi';

export function CompaniesPage() {
  const [q, setQ] = useState('');
  const [sector, setSector] = useState('');
  const [stage, setStage] = useState('');

  const debouncedQ = useDebounced(q);
  const filters = useApi<DirectoryFilters>('filters');
  const companies = useApi<CompanyListItem[]>('companies', { q: debouncedQ, sector, stage, limit: 120 });
  useReportTraces(companies.traces, filters.traces);

  return (
    <>
      <div className="page-head">
        <h1>Companies</h1>
        <p>The startups in the graph, ranked by capital raised. Click through for the cap table and the founding team.</p>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="row row--wrap" style={{ gap: 10 }}>
          <input
            className="input"
            style={{ flex: '1 1 220px' }}
            placeholder="Filter by name…"
            value={q}
            onChange={(event) => setQ(event.target.value)}
            aria-label="Filter companies by name"
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
            style={{ flex: '0 1 160px' }}
            value={stage}
            onChange={(event) => setStage(event.target.value)}
            aria-label="Filter by stage"
          >
            <option value="">All stages</option>
            {(filters.data?.stages ?? []).map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      </div>

      <AsyncBoundary
        state={companies}
        skeleton={<SkeletonRows count={10} />}
        isEmpty={(data) => data.length === 0}
        empty={
          <EmptyState
            title="No companies match"
            body="Nothing in the graph fits that combination of sector and stage."
            icon="⌕"
            action={
              <button
                type="button"
                className="btn btn--sm"
                onClick={() => {
                  setQ('');
                  setSector('');
                  setStage('');
                }}
              >
                Clear filters
              </button>
            }
          />
        }
      >
        {(data) => (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Company</th>
                    <th>Stage</th>
                    <th>Sectors</th>
                    <th>City</th>
                    <th className="num">Raised</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((company) => (
                    <tr
                      key={company.id}
                      onClick={() => navigate(`#/company/${company.id}`)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td>
                        <strong style={{ fontWeight: 500 }}>{company.name}</strong>
                      </td>
                      <td>
                        <span className="badge">{company.stage}</span>
                      </td>
                      <td>
                        <span className="row row--wrap" style={{ gap: 5 }}>
                          {company.sectors.map((name) => (
                            <span key={name} className="badge badge--sector">
                              {name}
                            </span>
                          ))}
                        </span>
                      </td>
                      <td className="muted">{company.city}</td>
                      <td className="num mono">{usd(company.totalRaisedUsd)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </AsyncBoundary>
    </>
  );
}
