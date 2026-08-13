import type { EcosystemStats, Persona } from '../../shared/types';
import { useReportTraces } from '../App';
import { AsyncBoundary, EmptyState, SkeletonCards, SkeletonStats } from '../components/states';
import { count, usd } from '../lib/format';
import { usePersona } from '../lib/persona';
import { navigate } from '../lib/router';
import { useApi } from '../lib/useApi';

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="stat">
      <div className="stat__value">{value}</div>
      <div className="stat__label">{label}</div>
      {hint ? (
        <div className="faint" style={{ fontSize: 12, marginTop: 6 }}>
          {hint}
        </div>
      ) : null}
    </div>
  );
}

function PersonaPicker() {
  const state = useApi<Persona[]>('personas');
  const { persona, setPersona } = usePersona();

  return (
    <AsyncBoundary
      state={state}
      skeleton={<SkeletonCards count={6} height={104} />}
      isEmpty={(data) => data.length === 0}
      empty={
        <EmptyState
          title="No founders loaded"
          body="The graph has no persona-flagged people yet. Run npm run seed to load the dataset."
        />
      }
    >
      {(personas) => (
        <div className="grid grid--2">
          {personas.map((candidate) => {
            const active = persona?.id === candidate.id;
            return (
              <button
                key={candidate.id}
                type="button"
                className="card card--link"
                style={active ? { borderColor: 'var(--warm-line)', background: 'var(--warm-soft)' } : undefined}
                onClick={() => {
                  setPersona(candidate);
                  navigate('#/intro');
                }}
              >
                <div className="row row--between" style={{ alignItems: 'flex-start' }}>
                  <div className="stack">
                    <strong>{candidate.name}</strong>
                    <span className="muted" style={{ fontSize: 13 }}>
                      {candidate.headline}
                    </span>
                  </div>
                  {active ? <span className="badge badge--lead">Selected</span> : null}
                </div>
                <div className="row row--wrap" style={{ marginTop: 12, gap: 6 }}>
                  <span className="badge">{candidate.city}</span>
                  <span className="badge">{candidate.directContacts} direct contacts</span>
                  {candidate.companies.slice(0, 1).map((company) => (
                    <span key={company} className="badge badge--company">
                      {company}
                    </span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </AsyncBoundary>
  );
}

export function HomePage() {
  const stats = useApi<EcosystemStats>('stats');
  const { persona } = usePersona();
  useReportTraces(stats.traces);

  const maxSector = stats.data?.topSectors[0]?.totalRaisedUsd ?? 1;

  return (
    <>
      <div className="page-head">
        <h1>Who can introduce you to the money?</h1>
        <p>
          Cold outreach to investors converts badly. WarmGraph models the funding ecosystem as a graph — founders,
          operators, firms, partners, rounds and rivalries — and finds the shortest <em>warm</em> path from you to the
          partner you actually want to meet, with the reason for every hop spelled out.
        </p>
      </div>

      <AsyncBoundary state={stats} skeleton={<SkeletonStats />}>
        {(data) => (
          <>
            <div className="grid grid--4">
              <Stat label="People" value={count(data.counts.people)} hint="Founders, operators and partners" />
              <Stat label="Companies" value={count(data.counts.companies)} />
              <Stat label="Investors" value={count(data.counts.investors)} hint="Funds, angels and accelerators" />
              <Stat label="Rounds" value={count(data.counts.rounds)} />
              <Stat label="Relationships" value={count(data.counts.relationships)} hint="Every edge in the graph" />
            </div>

            <div className="section-head">
              <h2>Where the capital went</h2>
              <span>Total raised by sector</span>
            </div>
            <div className="card">
              <div className="stack" style={{ gap: 12 }}>
                {data.topSectors.map((sector) => (
                  <div key={sector.sector} className="stack" style={{ gap: 5 }}>
                    <div className="row row--between">
                      <span>{sector.sector}</span>
                      <span className="faint mono">
                        {usd(sector.totalRaisedUsd)} · {sector.companies} companies
                      </span>
                    </div>
                    <div className="bar">
                      <div className="bar__fill" style={{ width: `${(sector.totalRaisedUsd / maxSector) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="section-head">
              <h2>Super-connectors</h2>
              <span>Most relationships in the graph</span>
            </div>
            <div className="grid grid--3">
              {data.mostConnected.map((person) => (
                <a key={person.id} className="card card--link" href={`#/person/${person.id}`}>
                  <div className="stack">
                    <strong>{person.name}</strong>
                    <span className="muted" style={{ fontSize: 12.5 }}>
                      {person.headline}
                    </span>
                    <span className="faint" style={{ fontSize: 12, marginTop: 4 }}>
                      {person.connections} connections · {person.city}
                    </span>
                  </div>
                </a>
              ))}
            </div>
          </>
        )}
      </AsyncBoundary>

      <div className="section-head">
        <h2>{persona ? 'Change who you are exploring as' : 'Start by picking who you are'}</h2>
        <span>Every warm path is computed from one person</span>
      </div>
      <PersonaPicker />
    </>
  );
}
