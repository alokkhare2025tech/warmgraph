import type {
  IntroPath,
  IntroResult,
  IntroRoute,
  Partner,
  PathHop,
  PersonSummary,
  Recommendation,
  Stage,
} from '../../shared/types.js';
import {
  INTRO_PATH_QUERIES,
  INTRO_TARGET_PARTNERS,
  INVESTOR_CORE,
  PERSON_CORE,
  RECOMMEND_INVESTORS,
} from '../cypher.js';
import { badRequest, notFound } from '../errors.js';
import type { Tracer } from '../execute.js';
import { compact, investorFrom, kindOf, personFrom, toNumber, toStringList } from '../mappers.js';

const CURRENT_YEAR = 2025;

/** Stop widening the search once we have this many usable routes. */
const ENOUGH_PATHS = 8;

/** Rows requested per hop budget. Keeps the free-tier instance comfortable. */
const PATHS_PER_HOP = 14;

export const DEFAULT_MAX_HOPS = 4;
export const HOP_CEILING = 5;

interface RawPathNode {
  labels: string[];
  props: Record<string, any>;
}

interface RawPathRel {
  type: string;
  props: Record<string, any>;
  fromId: string;
  toId: string;
}

/* -------------------------------------------------------------------------- */
/* Scoring                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * How likely is this hop to survive a real introduction request?
 *
 * These weights are the product judgement in this app. A shared employer is
 * only worth something if the two people were actually there at the same time,
 * and an alumni connection is close to noise unless the years line up — so the
 * base numbers below get adjusted by `refineSharedNodeHops` once we can see the
 * hop's neighbours in the path.
 */
const BASE_CONFIDENCE: Record<string, number> = {
  KNOWS: 0.7,
  FOUNDED: 0.85,
  WORKED_AT: 0.55,
  STUDIED_AT: 0.35,
  ADVISES: 0.65,
  PARTNER_AT: 0.8,
};

const KNOWS_CONFIDENCE: Record<string, number> = {
  strong: 0.92,
  medium: 0.72,
  weak: 0.48,
};

function yearsOverlap(aFrom: number, aTo: number | null, bFrom: number, bTo: number | null): boolean {
  const aEnd = aTo ?? CURRENT_YEAR;
  const bEnd = bTo ?? CURRENT_YEAR;
  return aFrom <= bEnd && bFrom <= aEnd;
}

/**
 * Adjusts confidence for the pairs of hops that meet at a shared Company or
 * School — the two-hop shapes that actually mean "these people know each
 * other" rather than "these people appear in the same database row".
 */
function refineSharedNodeHops(hops: PathHop[], nodes: RawPathNode[], rels: RawPathRel[]): void {
  for (let i = 0; i + 1 < rels.length; i += 1) {
    const first = rels[i];
    const second = rels[i + 1];
    const shared = nodes[i + 1];
    const sharedKind = kindOf(shared.labels);

    if (first.type === 'WORKED_AT' && second.type === 'WORKED_AT' && sharedKind === 'Company') {
      const overlapped = yearsOverlap(
        toNumber(first.props.fromYear, 0),
        first.props.toYear == null ? null : toNumber(first.props.toYear),
        toNumber(second.props.fromYear, 0),
        second.props.toYear == null ? null : toNumber(second.props.toYear),
      );
      const value = overlapped ? 0.78 : 0.32;
      hops[i].confidence = value;
      hops[i + 1].confidence = value;
      if (overlapped) {
        hops[i].narrative += ' — they overlapped there';
      } else {
        hops[i].narrative += ' — but they never overlapped';
      }
    }

    if (first.type === 'STUDIED_AT' && second.type === 'STUDIED_AT' && sharedKind === 'School') {
      const gap = Math.abs(toNumber(first.props.gradYear) - toNumber(second.props.gradYear));
      const value = gap <= 1 ? 0.6 : 0.25;
      hops[i].confidence = value;
      hops[i + 1].confidence = value;
      hops[i].narrative += gap <= 1 ? ' — same graduating cohort' : ` — ${gap} years apart`;
    }

    if (first.type === 'FOUNDED' && second.type === 'FOUNDED' && sharedKind === 'Company') {
      hops[i].confidence = 0.95;
      hops[i + 1].confidence = 0.95;
      hops[i].narrative += ' — co-founders';
    }
  }
}

/* -------------------------------------------------------------------------- */
/* Narrative                                                                   */
/* -------------------------------------------------------------------------- */

function nameOf(node: RawPathNode): string {
  return String(node.props.name ?? node.props.id ?? 'Unknown');
}

function describeHop(from: RawPathNode, to: RawPathNode, rel: RawPathRel, forward: boolean): string {
  const a = nameOf(from);
  const b = nameOf(to);
  const p = rel.props;

  switch (rel.type) {
    case 'KNOWS': {
      const context = p.context ? ` — ${p.context}` : '';
      const since = p.since ? `, since ${toNumber(p.since)}` : '';
      return `${a} and ${b} know each other${context}${since}`;
    }
    case 'FOUNDED': {
      const year = p.year ? ` in ${toNumber(p.year)}` : '';
      return forward ? `${a} founded ${b}${year}` : `${b} founded ${a}${year}`;
    }
    case 'WORKED_AT': {
      const person = forward ? a : b;
      const company = forward ? b : a;
      const role = p.role ? `${p.role}` : 'worked';
      const from_ = toNumber(p.fromYear);
      const to_ = p.toYear == null ? 'present' : toNumber(p.toYear);
      return `${person} was ${role} at ${company} (${from_}–${to_})`;
    }
    case 'STUDIED_AT': {
      const person = forward ? a : b;
      const school = forward ? b : a;
      const degree = p.degree ? `${p.degree}` : 'studied';
      return `${person} read ${degree} at ${school}, class of ${toNumber(p.gradYear)}`;
    }
    case 'ADVISES': {
      const person = forward ? a : b;
      const company = forward ? b : a;
      return `${person} advises ${company}`;
    }
    case 'PARTNER_AT': {
      const person = forward ? a : b;
      const firm = forward ? b : a;
      return `${person} is ${p.role ?? 'a partner'} at ${firm}`;
    }
    default:
      return `${a} → ${b}`;
  }
}

function baseConfidence(rel: RawPathRel): number {
  if (rel.type === 'KNOWS') {
    return KNOWS_CONFIDENCE[String(rel.props.strength ?? 'weak')] ?? 0.5;
  }
  return BASE_CONFIDENCE[rel.type] ?? 0.4;
}

function buildPath(nodes: RawPathNode[], rels: RawPathRel[]): IntroPath {
  const hops: PathHop[] = rels.map((rel, index) => {
    const from = nodes[index];
    const to = nodes[index + 1];
    const forward = String(rel.fromId) === String(from.props.id);
    return {
      fromName: nameOf(from),
      fromKind: kindOf(from.labels),
      toName: nameOf(to),
      toKind: kindOf(to.labels),
      relType: rel.type,
      narrative: describeHop(from, to, rel, forward),
      confidence: baseConfidence(rel),
    };
  });

  refineSharedNodeHops(hops, nodes, rels);

  const score = hops.reduce((product, hop) => product * hop.confidence, 1);
  const brokerNode = nodes.slice(1, -1).find((node) => kindOf(node.labels) === 'Person');

  return {
    hops,
    length: hops.length,
    score: Number(score.toFixed(4)),
    broker: brokerNode
      ? {
          id: String(brokerNode.props.id),
          name: nameOf(brokerNode),
          headline: String(brokerNode.props.headline ?? ''),
          city: String(brokerNode.props.city ?? ''),
        }
      : null,
  };
}

/* -------------------------------------------------------------------------- */
/* The search                                                                  */
/* -------------------------------------------------------------------------- */

export interface IntroRequest {
  fromId: string;
  investorId: string;
  maxHops?: number;
}

export async function findIntroductions(tracer: Tracer, request: IntroRequest): Promise<IntroResult> {
  const maxHops = Math.min(Math.max(request.maxHops ?? DEFAULT_MAX_HOPS, 1), HOP_CEILING);

  const [personRow, investorRow, partnerRows] = await Promise.all([
    tracer.row(PERSON_CORE, { id: request.fromId }),
    tracer.row(INVESTOR_CORE, { id: request.investorId }),
    tracer.rows(INTRO_TARGET_PARTNERS, { investorId: request.investorId }),
  ]);

  if (!personRow?.id) throw notFound(`No person with id "${request.fromId}".`);
  if (!investorRow?.id) throw notFound(`No investor with id "${request.investorId}".`);

  const from: PersonSummary = personFrom(personRow);
  const partners: Partner[] = partnerRows.map((row) => ({
    ...personFrom(row),
    role: String(row.role ?? 'Partner'),
  }));

  const byPartner = new Map<string, IntroPath[]>();
  const seen = new Set<string>();
  let hopsSearched = 0;
  let found = 0;

  // Widen the search one hop at a time. Shorter paths are warmer, so the first
  // budget that produces results is also the best answer — and we never pay for
  // a five-hop expansion when a two-hop introduction exists.
  for (let hops = 1; hops <= maxHops; hops += 1) {
    hopsSearched = hops;
    const statement = INTRO_PATH_QUERIES[hops];
    if (!statement) break;

    const rows = await tracer.rows(statement, {
      fromId: request.fromId,
      investorId: request.investorId,
      limit: PATHS_PER_HOP,
    });

    for (const row of rows) {
      const nodes = (row.nodeChain ?? []) as RawPathNode[];
      const rels = (row.relChain ?? []) as RawPathRel[];
      if (nodes.length < 2 || rels.length === 0) continue;

      const signature = nodes.map((node) => String(node.props.id)).join('>');
      if (seen.has(signature)) continue;
      seen.add(signature);

      const path = buildPath(nodes, rels);
      const targetId = String(row.targetId ?? nodes[nodes.length - 1].props.id);
      const existing = byPartner.get(targetId) ?? [];
      existing.push(path);
      byPartner.set(targetId, existing);
      found += 1;
    }

    if (found >= ENOUGH_PATHS) break;
  }

  const routes: IntroRoute[] = partners
    .map((partner) => ({
      partner,
      paths: (byPartner.get(partner.id) ?? [])
        .sort((a, b) => b.score - a.score || a.length - b.length)
        .slice(0, 5),
    }))
    .filter((route) => route.paths.length > 0)
    .sort((a, b) => (b.paths[0]?.score ?? 0) - (a.paths[0]?.score ?? 0));

  return {
    from,
    investor: { ...investorFrom(investorRow), sectors: toStringList(investorRow.sectors) },
    partners,
    routes,
    hopsSearched,
    bestScore: routes[0]?.paths[0]?.score ?? null,
  };
}

/* -------------------------------------------------------------------------- */
/* Recommendations                                                             */
/* -------------------------------------------------------------------------- */

const NEXT_STAGE: Record<string, Stage> = {
  'Pre-Seed': 'Seed',
  Seed: 'Series A',
  'Series A': 'Series B',
  'Series B': 'Series C',
  'Series C': 'Series C',
};

export async function recommendInvestors(
  tracer: Tracer,
  fromId: string,
  limit = 8,
): Promise<{ recommendations: Recommendation[]; raisingStage: Stage }> {
  const personRow = await tracer.row(PERSON_CORE, { id: fromId });
  if (!personRow?.id) throw notFound(`No person with id "${fromId}".`);

  const founded = compact(personRow.founded as Array<Record<string, any>>);
  if (founded.length === 0) {
    throw badRequest(
      `${personRow.name} has not founded a company, so there is nothing to raise for.`,
      'Pick one of the founder personas on the home screen.',
    );
  }

  // We model the ask as the round *after* the company's current stage.
  const currentStage = String(founded[0]?.stage ?? 'Seed');
  const raisingStage = NEXT_STAGE[currentStage] ?? 'Seed';

  const rows = await tracer.rows(RECOMMEND_INVESTORS, { fromId, stage: raisingStage, limit });

  return {
    raisingStage,
    recommendations: rows.map((row) => ({
      investor: { ...investorFrom(row), sectors: toStringList(row.sectors) },
      matchedSectors: toStringList(row.matchedSectors),
      sectorBets: toNumber(row.sectorBets),
      stageBets: toNumber(row.stageBets),
      forCompany: String(row.forCompany ?? founded[0]?.name ?? ''),
    })),
  };
}
