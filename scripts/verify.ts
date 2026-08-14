/**
 * End-to-end check: runs every API endpoint against the live CognoDB instance
 * and prints a readable summary of what came back.
 *
 *   npm run verify
 *
 * This is the script to run after seeding — and the one to run if the hosted
 * demo ever looks wrong, because it exercises the exact same service layer the
 * web app uses, with no browser in the way.
 */

import { closeDriver } from '../server/db.ts';
import { handleApiRequest } from '../server/routes.ts';
import type {
  ApiResponse,
  ConflictReport,
  EcosystemStats,
  HealthReport,
  IntroResult,
  InvestorListItem,
  Persona,
  Recommendation,
  Subgraph,
} from '../shared/types.ts';

const GREEN = '[32m';
const RED = '[31m';
const DIM = '[2m';
const RESET = '[0m';

let passed = 0;
let failed = 0;

async function call<T>(path: string, query: Record<string, string> = {}): Promise<T | null> {
  const params = new URLSearchParams(query);
  const startedAt = Date.now();
  const { status, body } = await handleApiRequest({ path, query: params });
  const took = Date.now() - startedAt;
  const label = `/api/${path}${params.toString() ? `?${params}` : ''}`;

  if (status === 200 && (body as ApiResponse<T>).ok) {
    passed += 1;
    const response = body as { ok: true; data: T; traces: Array<{ name: string; tookMs: number; rows: number }> };
    const queries = response.traces.map((trace) => `${trace.name}:${trace.rows}r/${trace.tookMs}ms`).join(' ');
    console.log(`${GREEN}PASS${RESET} ${label} ${DIM}(${took} ms) ${queries}${RESET}`);
    return response.data;
  }

  failed += 1;
  const error = (body as { error?: { code: string; message: string } }).error;
  console.log(`${RED}FAIL${RESET} ${label} — ${error?.code}: ${error?.message}`);
  return null;
}

function heading(text: string): void {
  console.log(`\n${text}\n${'─'.repeat(text.length)}`);
}

async function main(): Promise<void> {
  heading('Connectivity');
  const health = await call<HealthReport>('health');
  if (!health?.reachable) {
    console.error(`\n${RED}Cannot reach CognoDB.${RESET} ${health?.message ?? ''}`);
    console.error('Fix the connection (see .env.example) and try again.\n');
    process.exitCode = 1;
    return;
  }
  console.log(`     ${DIM}${health.message}${RESET}`);
  if (!health.seeded) {
    console.error(`\n${RED}The graph is empty.${RESET} Run \`npm run seed\` first.\n`);
    process.exitCode = 1;
    return;
  }

  heading('Dashboard');
  const stats = await call<EcosystemStats>('stats');
  if (stats) {
    const { people, companies, investors, rounds, relationships } = stats.counts;
    console.log(
      `     ${DIM}${people} people · ${companies} companies · ${investors} investors · ${rounds} rounds · ${relationships} relationships${RESET}`,
    );
    console.log(`     ${DIM}top sector: ${stats.topSectors[0]?.sector} (${stats.topSectors[0]?.companies} companies)${RESET}`);
  }

  heading('Directory');
  await call('filters');
  await call('search', { q: 'ca' });
  const personas = await call<Persona[]>('personas');
  const investorList = await call<InvestorListItem[]>('investors', { limit: '5' });
  await call('companies', { limit: '5' });

  const persona = personas?.[0];
  const investor = investorList?.[0];

  heading('Profiles');
  if (persona) {
    await call('person', { id: persona.id });
    console.log(`     ${DIM}persona: ${persona.name} — ${persona.headline}${RESET}`);
  }
  if (investor) await call('investor', { id: investor.id });
  const companies = await call<Array<{ id: string; name: string }>>('companies', { limit: '1' });
  if (companies?.[0]) await call('company', { id: companies[0].id });

  heading('Multi-hop traversals');
  if (persona && investor) {
    const intro = await call<IntroResult>('intro', { from: persona.id, investor: investor.id, maxHops: '4' });
    if (intro) {
      const best = intro.routes[0]?.paths[0];
      if (best) {
        console.log(`     ${DIM}best route to ${intro.investor.name}: ${best.length} hops, score ${best.score}${RESET}`);
        for (const hop of best.hops) console.log(`       ${DIM}· ${hop.narrative}${RESET}`);
      } else {
        console.log(`     ${DIM}no route found within ${intro.hopsSearched} hops${RESET}`);
      }
    }

    const recommended = await call<{ recommendations: Recommendation[]; raisingStage: string }>('recommend', {
      from: persona.id,
    });
    if (recommended) {
      console.log(`     ${DIM}raising ${recommended.raisingStage}; top pick: ${recommended.recommendations[0]?.investor.name ?? '—'}${RESET}`);
    }
  }

  heading('The query SQL would hate');
  const conflicts = await call<ConflictReport>('conflicts', { limit: '10' });
  if (conflicts?.conflicts.length) {
    const worst = conflicts.conflicts[0];
    console.log(
      `     ${DIM}${conflicts.totals.rivalries} declared rivalries and ${conflicts.totals.overlaps - conflicts.totals.rivalries} sector overlaps in total${RESET}`,
    );
    console.log(
      `     ${DIM}${worst.investor.name} backs ${worst.companies[0].company.name} and ${worst.companies[1].company.name} in ${worst.sector}${worst.declaredRivals ? ' (declared rivals)' : ''}${RESET}`,
    );
  }
  await call<ConflictReport>('conflicts', { limit: '5', rivalsOnly: 'true' });

  heading('Graph explorer');
  if (investor) {
    const subgraph = await call<Subgraph>('graph', { id: investor.id, depth: '2' });
    if (subgraph) {
      console.log(`     ${DIM}${subgraph.nodes.length} nodes, ${subgraph.edges.length} edges around ${subgraph.center?.label}${RESET}`);
    }
  }

  heading('Error handling');
  const missing = await handleApiRequest({ path: 'investor', query: new URLSearchParams({ id: 'inv-does-not-exist' }) });
  if (missing.status === 404) {
    passed += 1;
    console.log(`${GREEN}PASS${RESET} unknown investor id returns 404, not a crash`);
  } else {
    failed += 1;
    console.log(`${RED}FAIL${RESET} expected 404 for unknown investor, got ${missing.status}`);
  }

  const badParam = await handleApiRequest({ path: 'intro', query: new URLSearchParams({ from: 'p-1' }) });
  if (badParam.status === 400) {
    passed += 1;
    console.log(`${GREEN}PASS${RESET} missing parameter returns 400`);
  } else {
    failed += 1;
    console.log(`${RED}FAIL${RESET} expected 400 for missing parameter, got ${badParam.status}`);
  }

  console.log(`\n${failed === 0 ? GREEN : RED}${passed} passed, ${failed} failed${RESET}\n`);
  if (failed > 0) process.exitCode = 1;
}

main()
  .catch((err) => {
    console.error('\nVerification crashed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDriver();
  });
