import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { QueryTrace } from '../shared/types';
import { HealthBanner, HealthDot } from './components/HealthBanner';
import { QueryButton } from './components/QueryDrawer';
import { SearchBar } from './components/SearchBar';
import { usePersona } from './lib/persona';
import { navigate, useRoute } from './lib/router';
import { CompaniesPage } from './pages/Companies';
import { CompanyPage } from './pages/Company';
import { ConflictsPage } from './pages/Conflicts';
import { ExplorerPage } from './pages/Explorer';
import { HomePage } from './pages/Home';
import { IntroPage } from './pages/Intro';
import { InvestorPage } from './pages/Investor';
import { InvestorsPage } from './pages/Investors';
import { ModelPage } from './pages/Model';
import { PersonPage } from './pages/Person';
import { QueriesPage } from './pages/Queries';

/* -------------------------------------------------------------------------- */
/* Trace plumbing                                                              */
/* -------------------------------------------------------------------------- */

const TraceContext = createContext<(traces: QueryTrace[]) => void>(() => {});

/**
 * Lets a page publish the queries it just ran to the top bar's Cypher button.
 * Pages call this with whatever `useApi` handed back; the shell does the rest.
 */
export function useReportTraces(...groups: QueryTrace[][]): void {
  const report = useContext(TraceContext);
  const flat = groups.flat();
  const signature = flat.map((trace) => `${trace.name}:${trace.tookMs}:${trace.rows}`).join('|');

  useEffect(() => {
    report(flat);
    // `signature` captures everything that would change what we report.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);
}

/* -------------------------------------------------------------------------- */
/* Navigation                                                                  */
/* -------------------------------------------------------------------------- */

interface NavEntry {
  route: string;
  href: string;
  label: string;
  icon: string;
  group: string;
}

const NAV: NavEntry[] = [
  { route: 'home', href: '#/', label: 'Overview', icon: '◱', group: 'Explore' },
  { route: 'intro', href: '#/intro', label: 'Warm intro', icon: '⇢', group: 'Explore' },
  { route: 'explore', href: '#/explore', label: 'Graph explorer', icon: '⁂', group: 'Explore' },
  { route: 'investors', href: '#/investors', label: 'Investors', icon: '◈', group: 'Directory' },
  { route: 'companies', href: '#/companies', label: 'Companies', icon: '▢', group: 'Directory' },
  { route: 'conflicts', href: '#/conflicts', label: 'Conflicts', icon: '⚑', group: 'Directory' },
  { route: 'model', href: '#/model', label: 'Data model', icon: '◎', group: 'Under the hood' },
  { route: 'queries', href: '#/queries', label: 'Cypher library', icon: '{ }', group: 'Under the hood' },
];

function Sidebar({ activeRoute }: { activeRoute: string }) {
  const { persona } = usePersona();
  const groups = useMemo(() => {
    const map = new Map<string, NavEntry[]>();
    for (const entry of NAV) map.set(entry.group, [...(map.get(entry.group) ?? []), entry]);
    return [...map.entries()];
  }, []);

  return (
    <nav className="sidebar" aria-label="Main">
      <a className="brand" href="#/">
        <svg className="brand__mark" viewBox="0 0 32 32" aria-hidden>
          <line x1="8" y1="22" x2="16" y2="11" stroke="var(--border-strong)" strokeWidth="1.6" />
          <line x1="16" y1="11" x2="24" y2="20" stroke="var(--border-strong)" strokeWidth="1.6" />
          <circle cx="8" cy="22" r="3.4" fill="var(--person)" />
          <circle cx="16" cy="11" r="3" fill="var(--warm)" />
          <circle cx="24" cy="20" r="3.4" fill="var(--company)" />
        </svg>
        <span className="stack" style={{ gap: 0 }}>
          <span className="brand__name">WarmGraph</span>
          <span className="brand__tag">intro paths</span>
        </span>
      </a>

      <div className="nav">
        {groups.map(([group, entries]) => (
          <div key={group}>
            <div className="nav__group-label">{group}</div>
            {entries.map((entry) => (
              <a
                key={entry.route}
                href={entry.href}
                className={`nav__item${activeRoute === entry.route ? ' nav__item--active' : ''}`}
                aria-current={activeRoute === entry.route ? 'page' : undefined}
              >
                <span aria-hidden style={{ width: 16, textAlign: 'center', fontSize: 13 }}>
                  {entry.icon}
                </span>
                <span>{entry.label}</span>
              </a>
            ))}
          </div>
        ))}
      </div>

      <button type="button" className="persona-chip" onClick={() => navigate('#/')}>
        <div className="persona-chip__label">Exploring as</div>
        <div className="persona-chip__name">{persona ? persona.name : 'Nobody yet'}</div>
        <div className="persona-chip__meta">{persona ? persona.headline : 'Pick a founder to start →'}</div>
      </button>
    </nav>
  );
}

/* -------------------------------------------------------------------------- */
/* Routing                                                                     */
/* -------------------------------------------------------------------------- */

function NotFound({ route }: { route: string }) {
  return (
    <div className="state">
      <div style={{ fontSize: 26, color: 'var(--text-faint)' }} aria-hidden>
        ⌖
      </div>
      <h3>No such page</h3>
      <p>
        Nothing is routed at <span className="mono">#/{route}</span>.
      </p>
      <div className="state__actions">
        <a className="btn btn--sm" href="#/">
          Back to the overview
        </a>
      </div>
    </div>
  );
}

function Screen({ name, param }: { name: string; param: string | null }) {
  switch (name) {
    case 'home':
      return <HomePage />;
    case 'intro':
      return <IntroPage targetId={param} />;
    case 'explore':
      return <ExplorerPage id={param} />;
    case 'investors':
      return <InvestorsPage />;
    case 'investor':
      return param ? <InvestorPage id={param} /> : <NotFound route="investor" />;
    case 'companies':
      return <CompaniesPage />;
    case 'company':
      return param ? <CompanyPage id={param} /> : <NotFound route="company" />;
    case 'person':
      return param ? <PersonPage id={param} /> : <NotFound route="person" />;
    case 'conflicts':
      return <ConflictsPage />;
    case 'model':
      return <ModelPage />;
    case 'queries':
      return <QueriesPage />;
    default:
      return <NotFound route={name} />;
  }
}

export function App() {
  const route = useRoute();
  const [traces, setTraces] = useState<QueryTrace[]>([]);

  const report = useCallback((next: QueryTrace[]) => setTraces(next), []);

  // A route change should not leave the previous screen's queries in the drawer.
  useEffect(() => setTraces([]), [route.name, route.param]);

  return (
    <TraceContext.Provider value={report}>
      <div className="shell">
        <Sidebar activeRoute={route.name} />
        <div className="main">
          <header className="topbar">
            <SearchBar />
            <div className="row" style={{ marginLeft: 'auto', gap: 8 }}>
              <HealthDot />
              <QueryButton traces={traces} />
            </div>
          </header>
          <main className="content">
            <HealthBanner />
            <Screen name={route.name} param={route.param} />
          </main>
        </div>
      </div>
    </TraceContext.Provider>
  );
}
