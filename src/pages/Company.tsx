import type { CompanyDetail } from '../../shared/types';
import { useReportTraces } from '../App';
import { AsyncBoundary, SkeletonRows } from '../components/states';
import { monthYear, usd } from '../lib/format';
import { useApi } from '../lib/useApi';

export function CompanyPage({ id }: { id: string }) {
  const state = useApi<CompanyDetail>('company', { id });
  useReportTraces(state.traces);

  return (
    <AsyncBoundary state={state} skeleton={<SkeletonRows count={8} />}>
      {(data) => (
        <>
          <div className="page-head">
            <div className="row row--between row--wrap" style={{ gap: 12, alignItems: 'flex-start' }}>
              <div className="stack">
                <h1>{data.company.name}</h1>
                <p style={{ marginTop: 4 }}>{data.company.description}</p>
                <div className="row row--wrap" style={{ gap: 6, marginTop: 8 }}>
                  <span className="badge badge--company">{data.company.stage}</span>
                  <span className="badge">{data.company.city}</span>
                  <span className="badge">Founded {data.company.foundedYear}</span>
                  <span className="badge">{data.company.headcount} people</span>
                  {data.company.sectors.map((sector) => (
                    <span key={sector} className="badge badge--sector">
                      {sector}
                    </span>
                  ))}
                </div>
              </div>
              <a className="btn btn--sm" href={`#/explore/${data.company.id}`}>
                Explore graph
              </a>
            </div>
          </div>

          <div className="grid grid--4">
            <div className="stat">
              <div className="stat__value">{usd(data.totalRaisedUsd)}</div>
              <div className="stat__label">Total raised</div>
            </div>
            <div className="stat">
              <div className="stat__value">{data.rounds.length}</div>
              <div className="stat__label">Rounds</div>
            </div>
            <div className="stat">
              <div className="stat__value">{new Set(data.rounds.flatMap((round) => round.investors.map((i) => i.id))).size}</div>
              <div className="stat__label">Investors</div>
            </div>
            <div className="stat">
              <div className="stat__value">{data.competitors.length}</div>
              <div className="stat__label">Declared rivals</div>
            </div>
          </div>

          <div className="section-head">
            <h2>Founders</h2>
            <span>{data.founders.length} people</span>
          </div>
          <div className="grid grid--3">
            {data.founders.map((founder) => (
              <a key={founder.id} className="card card--link" href={`#/person/${founder.id}`}>
                <div className="stack">
                  <strong>{founder.name}</strong>
                  <span className="muted" style={{ fontSize: 12.5 }}>
                    {founder.role}
                  </span>
                  <span className="faint" style={{ fontSize: 12 }}>
                    {founder.city}
                  </span>
                </div>
              </a>
            ))}
          </div>

          <div className="section-head">
            <h2>Financing history</h2>
            <span>Every round and who was on it</span>
          </div>
          {data.rounds.length === 0 ? (
            <p className="muted">No funding rounds are recorded for this company.</p>
          ) : (
            <div className="stack" style={{ gap: 10 }}>
              {data.rounds.map((round) => (
                <div key={round.id} className="card">
                  <div className="row row--between row--wrap" style={{ gap: 10 }}>
                    <div className="row" style={{ gap: 10 }}>
                      <span className="badge badge--round">{round.stage}</span>
                      <strong className="mono">{usd(round.amountUsd)}</strong>
                      <span className="faint">{monthYear(round.announcedOn)}</span>
                    </div>
                    <span className="faint" style={{ fontSize: 12.5 }}>
                      {round.investors.length} investor{round.investors.length === 1 ? '' : 's'}
                    </span>
                  </div>
                  <div className="row row--wrap" style={{ gap: 6, marginTop: 10 }}>
                    {round.investors.map((investor) => (
                      <a
                        key={investor.id}
                        href={`#/investor/${investor.id}`}
                        className={investor.lead ? 'badge badge--lead' : 'badge'}
                      >
                        {investor.name}
                        {investor.lead ? ' · lead' : ''}
                      </a>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {data.competitors.length > 0 ? (
            <>
              <div className="section-head">
                <h2>Declared rivals</h2>
                <span>Same sector, same stage</span>
              </div>
              <div className="grid grid--3">
                {data.competitors.map((rival) => (
                  <a key={rival.id} className="card card--link" href={`#/company/${rival.id}`}>
                    <div className="stack">
                      <strong>{rival.name}</strong>
                      <span className="faint" style={{ fontSize: 12 }}>
                        {rival.stage} · {rival.city}
                      </span>
                    </div>
                  </a>
                ))}
              </div>
            </>
          ) : null}

          {data.team.length > 0 ? (
            <>
              <div className="section-head">
                <h2>Team</h2>
                <span>People currently at {data.company.name}</span>
              </div>
              <div className="grid grid--3">
                {data.team.map((member) => (
                  <a key={member.id} className="card card--link" href={`#/person/${member.id}`}>
                    <div className="stack">
                      <strong>{member.name}</strong>
                      <span className="muted" style={{ fontSize: 12.5 }}>
                        {member.headline}
                      </span>
                    </div>
                  </a>
                ))}
              </div>
            </>
          ) : null}
        </>
      )}
    </AsyncBoundary>
  );
}
