/**
 * Types shared by the API (server/) and the React app (src/).
 *
 * Keeping one copy of the wire contract means a change to a query's shape is a
 * compile error on both sides rather than a runtime surprise in the browser.
 */

export type InvestorType = 'VC' | 'Angel' | 'Accelerator' | 'Corporate VC' | 'Family Office';
export type Stage = 'Pre-Seed' | 'Seed' | 'Series A' | 'Series B' | 'Series C';
export type TieStrength = 'strong' | 'medium' | 'weak';

export interface PersonSummary {
  id: string;
  name: string;
  headline: string;
  city: string;
}

export interface CompanySummary {
  id: string;
  name: string;
  stage: Stage;
  city: string;
  sectors: string[];
}

export interface InvestorSummary {
  id: string;
  name: string;
  type: InvestorType;
  hq: string;
  thesis: string;
  sectors: string[];
  checkSizeUsd: number;
}

/** One edge in a rendered introduction path, already turned into prose. */
export interface PathHop {
  fromName: string;
  fromKind: NodeKind;
  toName: string;
  toKind: NodeKind;
  relType: string;
  /** Human sentence, e.g. "Ananya worked with Rohan at Zeta Ledger (2019–2022)". */
  narrative: string;
  /** 0..1 — how reliable this hop is as an introduction request. */
  confidence: number;
}

export interface IntroPath {
  hops: PathHop[];
  /** Number of relationships traversed. */
  length: number;
  /** Product of hop confidences, 0..1. Higher is a warmer path. */
  score: number;
  /** The person who actually makes the ask, i.e. the first intermediary. */
  broker: PersonSummary | null;
}

export type Partner = PersonSummary & { role: string };

/** All the ways to reach one partner, warmest first. */
export interface IntroRoute {
  partner: Partner;
  paths: IntroPath[];
}

export interface IntroResult {
  from: PersonSummary;
  investor: InvestorSummary;
  partners: Partner[];
  routes: IntroRoute[];
  /** Highest hop budget actually searched — shows the user how hard we looked. */
  hopsSearched: number;
  bestScore: number | null;
}

export interface Recommendation {
  investor: InvestorSummary;
  matchedSectors: string[];
  /** Portfolio companies the firm already backs in your sector. */
  sectorBets: number;
  /** How many of those were at the stage you are raising. */
  stageBets: number;
  forCompany: string;
}

export interface PersonDetail {
  person: PersonSummary;
  founded: Array<{ id: string; name: string; role: string; year: number; stage: Stage }>;
  employment: Array<{ id: string; name: string; role: string; fromYear: number; toYear: number | null }>;
  education: Array<{ name: string; degree: string; gradYear: number }>;
  firms: Array<{ id: string; name: string }>;
  contacts: Array<PersonSummary & { strength: TieStrength; context: string; since: number }>;
}

export type NodeKind = 'Person' | 'Company' | 'Investor' | 'Round' | 'Sector' | 'School';

export interface GraphNode {
  id: string;
  kind: NodeKind;
  label: string;
  sublabel: string;
  /** Degree within the returned subgraph — drives node size in the explorer. */
  degree: number;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: string;
}

export interface Subgraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  center: GraphNode | null;
}

export interface CoInvestor {
  investor: InvestorSummary;
  sharedRounds: number;
  sharedCompanies: string[];
}

export interface PortfolioEntry {
  company: CompanySummary;
  rounds: Array<{
    id: string;
    stage: Stage;
    amountUsd: number;
    announcedOn: string;
    lead: boolean;
  }>;
  totalInvestedSignalUsd: number;
}

export interface Conflict {
  investor: InvestorSummary;
  sector: string;
  companies: Array<{ company: CompanySummary; stage: Stage; announcedOn: string }>;
  /** True when the two companies are explicitly modelled as competitors. */
  declaredRivals: boolean;
  severity: 'high' | 'medium';
}

export interface ConflictReport {
  conflicts: Conflict[];
  /** Totals across the whole graph, not just the page being shown. */
  totals: { overlaps: number; rivalries: number };
  rivalsOnly: boolean;
}

export interface InvestorDetail {
  investor: InvestorSummary;
  partners: PersonSummary[];
  portfolio: PortfolioEntry[];
  coInvestors: CoInvestor[];
  stats: {
    companies: number;
    rounds: number;
    leadRounds: number;
    medianCheckUsd: number;
  };
}

export interface CompanyDetail {
  company: CompanySummary & {
    foundedYear: number;
    description: string;
    website: string;
    headcount: number;
  };
  founders: Array<PersonSummary & { role: string }>;
  team: PersonSummary[];
  rounds: Array<{
    id: string;
    stage: Stage;
    amountUsd: number;
    announcedOn: string;
    investors: Array<InvestorSummary & { lead: boolean }>;
  }>;
  competitors: CompanySummary[];
  totalRaisedUsd: number;
}

export interface EcosystemStats {
  counts: { people: number; companies: number; investors: number; rounds: number; relationships: number };
  topSectors: Array<{ sector: string; companies: number; totalRaisedUsd: number }>;
  stageBreakdown: Array<{ stage: Stage; rounds: number; totalRaisedUsd: number }>;
  mostConnected: Array<PersonSummary & { connections: number }>;
}

export interface SearchHit {
  id: string;
  kind: NodeKind;
  label: string;
  sublabel: string;
}

export interface Persona extends PersonSummary {
  companies: string[];
  directContacts: number;
}

export interface InvestorListItem extends InvestorSummary {
  portfolioSize: number;
}

export interface CompanyListItem extends CompanySummary {
  totalRaisedUsd: number;
}

export interface DirectoryFilters {
  sectors: string[];
  stages: Stage[];
  investorTypes: InvestorType[];
}

/**
 * Every API response carries the exact Cypher that produced it, so the UI can
 * show "the query behind this screen". `params` are the bound parameters —
 * never interpolated into `cypher`.
 */
export interface QueryTrace {
  name: string;
  purpose: string;
  cypher: string;
  params: Record<string, unknown>;
  tookMs: number;
  rows: number;
}

export interface ApiSuccess<T> {
  ok: true;
  data: T;
  traces: QueryTrace[];
}

export type ApiErrorCode =
  | 'DB_UNREACHABLE'
  | 'DB_AUTH_FAILED'
  | 'NOT_CONFIGURED'
  | 'NOT_FOUND'
  | 'BAD_REQUEST'
  | 'TIMEOUT'
  | 'INTERNAL';

export interface ApiFailure {
  ok: false;
  error: {
    code: ApiErrorCode;
    message: string;
    /** Operator-facing hint, e.g. "check COGNODB_URI". Safe to show in the UI. */
    hint?: string;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export interface HealthReport {
  configured: boolean;
  reachable: boolean;
  seeded: boolean;
  latencyMs: number | null;
  serverVersion: string | null;
  nodeCount: number | null;
  message: string;
}
