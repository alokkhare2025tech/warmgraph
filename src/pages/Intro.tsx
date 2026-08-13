import { useEffect, useState } from 'react';
import type { InvestorListItem, IntroResult, Recommendation } from '../../shared/types';
import { useReportTraces } from '../App';
import { RouteCard } from '../components/RouteCard';
import { AsyncBoundary, EmptyState, ErrorState, SkeletonCards, SkeletonRows } from '../components/states';
import { usd } from '../lib/format';
import { usePersona } from '../lib/persona';
import { navigate } from '../lib/router';
import { useApi } from '../lib/useApi';

/**
 * The centre of the product: pick a firm, get ranked introduction routes.
 */
export function IntroPage({ targetId }: { targetId: string | null }) {
  const { persona } = usePersona();
  const [investorId, setInvestorId] = useState<string | null>(targetId);
  const [maxHops, setMaxHops] = useState(4);

  useEffect(() => {
    if (targetId) setInvestorId(targetId);
  }, [targetId]);

  const investors = useApi<InvestorListItem[]>('investors', { limit: 200 });
  const recommendations = useApi<{ recommendations: Recommendation[]; raisingStage: string }>(
    'recommend',
    { from: persona?.id },
    { enabled: Boolean(persona) },
  );
  const intro = useApi<IntroResult>(
    'intro',
    { from: persona?.id, investor: investorId ?? undefined, maxHops },
    { enabled: Boolean(persona && investorId) },
  );

  useReportTraces(intro.traces, recommendations.traces);

  if (!persona) {
    return (
      <>
        <div className="page-head">
          <h1>Warm intro</h1>
          <p>Find the shortest credible path from you to a partner at any firm in the graph.</p>
        </div>
        <EmptyState
          title="Pick who you are first"
          body="Every path is computed from a starting person. Choose one of the founder personas and come back."
          icon="◑"
          action={
            <a className="btn btn--primary btn--sm" href="#/">
              Choose a founder
            </a>
          }
        />
      </>
    );
  }

  const selected = investors.data?.find((investor) => investor.id === investorId) ?? null;

  return (
    <>
      <div className="page-head">
        <h1>Warm intro</h1>
        <p>
          Routes from <strong>{persona.name}</strong> to a partner at the firm you choose. Every hop is a real
          relationship in the graph, scored by how likely it is to survive a real introduction request.
        </p>
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <div className="row row--wrap" style={{ gap: 12, alignItems: 'flex-end' }}>
          <label className="stack" style={{ flex: '1 1 280px', gap: 6 }}>
            <span className="faint" style={{ fontSize: 12 }}>
              Target firm
            </span>
            <select
              className="select"
              value={investorId ?? ''}
              onChange={(event) => setInvestorId(event.target.value || null)}
              disabled={investors.loading}
            >
              <option value="">{investors.loading ? 'Loading firms…' : 'Choose a firm…'}</option>
              {(investors.data ?? []).map((investor) => (
                <option key={investor.id} value={investor.id}>
                  {investor.name} — {investor.type}
                </option>
              ))}
            </select>
          </label>

          <label className="stack" style={{ gap: 6 }}>
            <span className="faint" style={{ fontSize: 12 }}>
              Search depth
            </span>
            <div className="segmented">
              {[2, 3, 4, 5].map((hops) => (
                <button key={hops} type="button" aria-pressed={maxHops === hops} onClick={() => setMaxHops(hops)}>
                  {hops} hops
                </button>
              ))}
            </div>
          </label>

          {selected ? (
            <a className="btn btn--sm" href={`#/investor/${selected.id}`}>
              Open {selected.name}
            </a>
          ) : null}
        </div>
      </div>

      {!investorId ? (
        <>
          <EmptyState
            title="Choose a firm to reach"
            body="Or start from the suggestions below — firms whose thesis matches what you are building."
            icon="⇢"
          />

          <div className="section-head">
            <h2>Firms worth your time</h2>
            <span>
              {recommendations.data ? `Matched to your sector, raising ${recommendations.data.raisingStage}` : 'Thesis fit'}
            </span>
          </div>

          {recommendations.error ? (
            <ErrorState error={recommendations.error} onRetry={recommendations.reload} />
          ) : (
            <AsyncBoundary
              state={recommendations}
              skeleton={<SkeletonCards count={4} height={110} />}
              isEmpty={(data) => data.recommendations.length === 0}
              empty={
                <EmptyState
                  title="No thesis matches"
                  body="No firm in the graph focuses on this founder's sector. Try picking a target firm manually."
                />
              }
            >
              {(data) => (
                <div className="grid grid--2">
                  {data.recommendations.map((recommendation) => (
                    <button
                      key={recommendation.investor.id}
                      type="button"
                      className="card card--link"
                      onClick={() => setInvestorId(recommendation.investor.id)}
                    >
                      <div className="row row--between" style={{ alignItems: 'flex-start' }}>
                        <div className="stack">
                          <strong>{recommendation.investor.name}</strong>
                          <span className="muted" style={{ fontSize: 12.5 }}>
                            {recommendation.investor.type} · {recommendation.investor.hq}
                          </span>
                        </div>
                        <span className="badge badge--investor">{usd(recommendation.investor.checkSizeUsd)} cheque</span>
                      </div>
                      <p className="muted" style={{ fontSize: 12.5, margin: '10px 0 0' }}>
                        {recommendation.investor.thesis}
                      </p>
                      <div className="row row--wrap" style={{ marginTop: 10, gap: 6 }}>
                        {recommendation.matchedSectors.map((sector) => (
                          <span key={sector} className="badge badge--sector">
                            {sector}
                          </span>
                        ))}
                        <span className="badge">{recommendation.sectorBets} bets in your sector</span>
                        {recommendation.stageBets > 0 ? (
                          <span className="badge badge--ok">{recommendation.stageBets} at {data.raisingStage}</span>
                        ) : null}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </AsyncBoundary>
          )}
        </>
      ) : (
        <AsyncBoundary
          state={intro}
          skeleton={<SkeletonRows count={4} />}
          isEmpty={(data) => data.routes.length === 0}
          empty={
            <EmptyState
              title="No warm path found"
              body={
                <>
                  We searched every route up to {maxHops} hops and found nothing connecting {persona.name} to this
                  firm's partners. Try widening the search, or pick a firm you are closer to.
                </>
              }
              icon="⌀"
              action={
                maxHops < 5 ? (
                  <button type="button" className="btn btn--primary btn--sm" onClick={() => setMaxHops(maxHops + 1)}>
                    Search {maxHops + 1} hops
                  </button>
                ) : (
                  <button type="button" className="btn btn--sm" onClick={() => setInvestorId(null)}>
                    Choose another firm
                  </button>
                )
              }
            />
          }
        >
          {(data) => (
            <>
              <div className="row row--between row--wrap" style={{ marginBottom: 14, gap: 10 }}>
                <div className="stack">
                  <strong style={{ fontSize: 16 }}>
                    {data.routes.length} way{data.routes.length === 1 ? '' : 's'} into {data.investor.name}
                  </strong>
                  <span className="faint" style={{ fontSize: 12.5 }}>
                    Searched up to {data.hopsSearched} hops across {data.partners.length} partner
                    {data.partners.length === 1 ? '' : 's'} · {data.investor.thesis}
                  </span>
                </div>
                <button type="button" className="btn btn--sm" onClick={() => navigate(`#/explore/${data.investor.id}`)}>
                  See it in the graph
                </button>
              </div>

              <div className="stack" style={{ gap: 14 }}>
                {data.routes.map((route, index) => (
                  <RouteCard
                    key={route.partner.id}
                    route={route}
                    from={data.from}
                    investor={data.investor}
                    best={index === 0}
                  />
                ))}
              </div>

              {data.partners.length > data.routes.length ? (
                <p className="faint" style={{ marginTop: 16, fontSize: 12.5 }}>
                  {data.partners.length - data.routes.length} other partner
                  {data.partners.length - data.routes.length === 1 ? ' is' : 's are'} unreachable within {data.hopsSearched} hops.
                </p>
              ) : null}
            </>
          )}
        </AsyncBoundary>
      )}
    </>
  );
}
