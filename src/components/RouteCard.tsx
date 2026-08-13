import { useState } from 'react';
import type { IntroPath, IntroRoute, InvestorSummary, PersonSummary } from '../../shared/types';
import { KIND_COLOR, percent, routeFor, warmthColor, warmthLabel } from '../lib/format';

/** The node chain, rendered as clickable pills with the relationship between. */
function Chain({ path }: { path: IntroPath }) {
  const nodes = [
    { name: path.hops[0].fromName, kind: path.hops[0].fromKind },
    ...path.hops.map((hop) => ({ name: hop.toName, kind: hop.toKind })),
  ];

  return (
    <div className="chain">
      {nodes.map((node, index) => (
        <span key={`${node.name}-${index}`} style={{ display: 'contents' }}>
          <span className="chain__node">
            <span className="dot" style={{ background: KIND_COLOR[node.kind] }} aria-hidden />
            {node.name}
          </span>
          {index < path.hops.length ? (
            <span className="chain__arrow mono" aria-hidden>
              ─ {path.hops[index].relType} →
            </span>
          ) : null}
        </span>
      ))}
    </div>
  );
}

function Warmth({ score }: { score: number }) {
  return (
    <span className="warmth" title={`Warmth score ${score} — the product of every hop's confidence`}>
      <span className="warmth__track">
        <span className="warmth__fill" style={{ width: `${Math.max(4, score * 100)}%`, background: warmthColor(score) }} />
      </span>
      <span style={{ color: warmthColor(score), fontWeight: 600, fontSize: 12.5 }}>
        {warmthLabel(score)} {percent(score)}
      </span>
    </span>
  );
}

/** A copy-pasteable ask, written for the person who has to send it. */
function introScript(from: PersonSummary, path: IntroPath, partner: PersonSummary, investor: InvestorSummary): string {
  const broker = path.broker?.name ?? partner.name;
  const via = path.hops.map((hop) => hop.narrative).join('; ');
  return `Hi ${broker.split(' ')[0]},\n\nI'm ${from.name}${from.headline ? ` — ${from.headline}` : ''}. I'm hoping to reach ${partner.name} at ${investor.name}.\n\nThe connection: ${via}.\n\nWould you be comfortable making that introduction? Happy to send a forwardable blurb.\n\nThanks,\n${from.name}`;
}

export function RouteCard({
  route,
  from,
  investor,
  best,
}: {
  route: IntroRoute;
  from: PersonSummary;
  investor: InvestorSummary;
  best: boolean;
}) {
  const [pathIndex, setPathIndex] = useState(0);
  const [showScript, setShowScript] = useState(false);
  const [copied, setCopied] = useState(false);
  const path = route.paths[pathIndex];

  async function copyScript() {
    try {
      await navigator.clipboard.writeText(introScript(from, path, route.partner, investor));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <article className={`route${best ? ' route--best' : ''}`}>
      <header className="route__head">
        <div className="stack">
          <div className="row" style={{ gap: 8 }}>
            <a href={routeFor('Person', route.partner.id)} style={{ fontWeight: 600 }}>
              {route.partner.name}
            </a>
            <span className="badge">{route.partner.role}</span>
            {best ? <span className="badge badge--lead">Warmest route</span> : null}
          </div>
          <span className="faint" style={{ fontSize: 12.5 }}>
            {path.length} hop{path.length === 1 ? '' : 's'} · {route.paths.length} route
            {route.paths.length === 1 ? '' : 's'} found
            {path.broker ? ` · ask ${path.broker.name}` : ''}
          </span>
        </div>
        <Warmth score={path.score} />
      </header>

      <div className="route__body">
        <Chain path={path} />

        <ol className="hops">
          {path.hops.map((hop, index) => (
            <li className="hop" key={index}>
              <span className="hop__marker">{index + 1}</span>
              <span className="hop__text">
                <div>{hop.narrative}</div>
                <div className="hop__rel">{hop.relType}</div>
              </span>
              <span className="hop__confidence">{percent(hop.confidence)}</span>
            </li>
          ))}
        </ol>

        <div className="row row--wrap" style={{ marginTop: 14, gap: 8 }}>
          {route.paths.length > 1 ? (
            <div className="segmented">
              {route.paths.map((alternative, index) => (
                <button
                  key={index}
                  type="button"
                  aria-pressed={index === pathIndex}
                  onClick={() => setPathIndex(index)}
                  title={`${alternative.length} hops, warmth ${percent(alternative.score)}`}
                >
                  Route {index + 1}
                </button>
              ))}
            </div>
          ) : null}

          <button type="button" className="btn btn--sm" onClick={() => setShowScript((open) => !open)}>
            {showScript ? 'Hide the ask' : 'Draft the ask'}
          </button>

          {showScript ? (
            <button type="button" className="btn btn--sm btn--primary" onClick={copyScript}>
              {copied ? 'Copied' : 'Copy'}
            </button>
          ) : null}
        </div>

        {showScript ? <div className="script">{introScript(from, path, route.partner, investor)}</div> : null}
      </div>
    </article>
  );
}
