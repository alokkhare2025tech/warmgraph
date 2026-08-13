import type { InvestorDetail } from '../../shared/types';
import { useReportTraces } from '../App';
import { AsyncBoundary, SkeletonRows } from '../components/states';
import { monthYear, usd } from '../lib/format';
import { usePersona } from '../lib/persona';
import { useApi } from '../lib/useApi';

export function InvestorPage({ id }: { id: string }) {
  const state = useApi<InvestorDetail>('investor', { id });
  const { persona } = usePersona();
  useReportTraces(state.traces);

  return (
    <AsyncBoundary state={state} skeleton={<SkeletonRows count={8} />}>
      {(data) => (
        <>
          <div className="page-head">
            <div className="row row--between row--wrap" style={{ gap: 12, alignItems: 'flex-start' }}>
              <div className="stack">
                <h1>{data.investor.name}</h1>
                <p style={{ marginTop: 4 }}>{data.investor.thesis}</p>
                <div className="row row--wrap" style={{ gap: 6, marginTop: 8 }}>
                  <span className="badge badge--investor">{data.investor.type}</span>
                  <span className="badge">{data.investor.hq}</span>
                  <span className="badge">{usd(data.investor.checkSizeUsd)} typical cheque</span>
                  {data.investor.sectors.map((sector) => (
                    <span key={sector} className="badge badge--sector">
                      {sector}
                    </span>
                  ))}
                </div>
              </div>
              <div className="row" style={{ gap: 8 }}>
                {persona ? (
                  <a className="btn btn--primary btn--sm" href={`#/intro/${data.investor.id}`}>
                    Find a warm intro
                  </a>
                ) : (
                  <a className="btn btn--sm" href="#/">
                    Pick a persona to find an intro
                  </a>
                )}
                <a className="btn btn--sm" href={`#/explore/${data.investor.id}`}>
                  Explore graph
                </a>
              </div>
            </div>
          </div>

          <div className="grid grid--4">
            <div className="stat">
              <div className="stat__value">{data.stats.companies}</div>
              <div className="stat__label">Portfolio</div>
            </div>
            <div className="stat">
              <div className="stat__value">{data.stats.rounds}</div>
              <div className="stat__label">Rounds</div>
            </div>
            <div className="stat">
              <div className="stat__value">{data.stats.leadRounds}</div>
              <div className="stat__label">Led</div>
            </div>
            <div className="stat">
              <div className="stat__value">{usd(data.stats.medianCheckUsd)}</div>
              <div className="stat__label">Median cheque</div>
            </div>
          </div>

          <div className="section-head">
            <h2>Partners</h2>
            <span>The people you would actually be meeting</span>
          </div>
          {data.partners.length === 0 ? (
            <p className="muted">No partners are recorded for this firm.</p>
          ) : (
            <div className="grid grid--3">
              {data.partners.map((partner) => (
                <a key={partner.id} className="card card--link" href={`#/person/${partner.id}`}>
                  <div className="stack">
                    <strong>{partner.name}</strong>
                    <span className="muted" style={{ fontSize: 12.5 }}>
                      {partner.headline}
                    </span>
                    <span className="faint" style={{ fontSize: 12 }}>
                      {partner.city}
                    </span>
                  </div>
                </a>
              ))}
            </div>
          )}

          <div className="section-head">
            <h2>Portfolio</h2>
            <span>Capital deployed by this firm, not the whole round</span>
          </div>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Company</th>
                    <th>Sectors</th>
                    <th>Rounds</th>
                    <th className="num">Deployed</th>
                  </tr>
                </thead>
                <tbody>
                  {data.portfolio.map((entry) => (
                    <tr key={entry.company.id} onClick={() => (window.location.hash = `#/company/${entry.company.id}`)} style={{ cursor: 'pointer' }}>
                      <td>
                        <div className="stack">
                          <strong style={{ fontWeight: 500 }}>{entry.company.name}</strong>
                          <span className="faint" style={{ fontSize: 12 }}>
                            {entry.company.stage} · {entry.company.city}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className="row row--wrap" style={{ gap: 5 }}>
                          {entry.company.sectors.map((sector) => (
                            <span key={sector} className="badge badge--sector">
                              {sector}
                            </span>
                          ))}
                        </span>
                      </td>
                      <td>
                        <span className="row row--wrap" style={{ gap: 5 }}>
                          {entry.rounds.map((round) => (
                            <span key={round.id} className={round.lead ? 'badge badge--lead' : 'badge'} title={monthYear(round.announcedOn)}>
                              {round.stage}
                              {round.lead ? ' · led' : ''}
                            </span>
                          ))}
                        </span>
                      </td>
                      <td className="num mono">{usd(entry.totalInvestedSignalUsd)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="section-head">
            <h2>Who they invest alongside</h2>
            <span>Two hops through shared rounds</span>
          </div>
          {data.coInvestors.length === 0 ? (
            <p className="muted">This firm has not shared a round with anyone else in the graph.</p>
          ) : (
            <div className="grid grid--2">
              {data.coInvestors.map((entry) => (
                <a key={entry.investor.id} className="card card--link" href={`#/investor/${entry.investor.id}`}>
                  <div className="row row--between" style={{ alignItems: 'flex-start' }}>
                    <div className="stack">
                      <strong>{entry.investor.name}</strong>
                      <span className="muted" style={{ fontSize: 12.5 }}>
                        {entry.investor.type} · {entry.investor.hq}
                      </span>
                    </div>
                    <span className="badge badge--lead nowrap">{entry.sharedRounds} shared</span>
                  </div>
                  <div className="row row--wrap" style={{ marginTop: 10, gap: 6 }}>
                    {entry.sharedCompanies.map((company) => (
                      <span key={company} className="badge badge--company">
                        {company}
                      </span>
                    ))}
                  </div>
                </a>
              ))}
            </div>
          )}
        </>
      )}
    </AsyncBoundary>
  );
}
