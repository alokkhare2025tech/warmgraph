import type { ApiResponse } from '../shared/types.ts';
import { CATALOGUE } from './cypher.ts';
import { ApiError, badRequest, notFound } from './errors.ts';
import { Tracer } from './execute.ts';
import { toApiError } from './db.ts';
import { getCompany } from './services/company.ts';
import { getConflicts } from './services/conflicts.ts';
import { getFilters, listCompanies, listInvestors, listPersonas, search } from './services/directory.ts';
import { getNeighbourhood } from './services/graph.ts';
import { checkHealth } from './services/health.ts';
import { findIntroductions, recommendInvestors } from './services/intro.ts';
import { getInvestor } from './services/investor.ts';
import { getPerson } from './services/person.ts';
import { getStats } from './services/stats.ts';

export interface ApiRequest {
  /** Path with the /api prefix already stripped, e.g. "investor". */
  path: string;
  query: URLSearchParams;
}

export interface ApiHttpResponse {
  status: number;
  body: ApiResponse<unknown>;
}

function required(query: URLSearchParams, name: string): string {
  const value = query.get(name)?.trim();
  if (!value) {
    throw badRequest(`Missing required parameter "${name}".`);
  }
  return value;
}

function intParam(query: URLSearchParams, name: string, fallback: number): number {
  const raw = query.get(name);
  if (raw == null || raw === '') return fallback;
  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value)) {
    throw badRequest(`Parameter "${name}" must be an integer.`);
  }
  return value;
}

type Handler = (tracer: Tracer, query: URLSearchParams) => Promise<unknown>;

/**
 * The complete API surface. Everything is a GET with query parameters, which
 * keeps the whole thing inspectable from a browser address bar — handy when
 * someone else is reviewing the submission.
 */
const HANDLERS: Record<string, Handler> = {
  stats: (tracer) => getStats(tracer),

  search: (tracer, query) => search(tracer, query.get('q') ?? '', intParam(query, 'limit', 12)),

  personas: (tracer) => listPersonas(tracer),

  filters: (tracer) => getFilters(tracer),

  investors: (tracer, query) =>
    listInvestors(tracer, {
      q: query.get('q') ?? '',
      type: query.get('type') ?? '',
      sector: query.get('sector') ?? '',
      limit: intParam(query, 'limit', 60),
    }),

  companies: (tracer, query) =>
    listCompanies(tracer, {
      q: query.get('q') ?? '',
      stage: query.get('stage') ?? '',
      sector: query.get('sector') ?? '',
      limit: intParam(query, 'limit', 60),
    }),

  investor: (tracer, query) => getInvestor(tracer, required(query, 'id')),

  company: (tracer, query) => getCompany(tracer, required(query, 'id')),

  person: (tracer, query) => getPerson(tracer, required(query, 'id')),

  intro: (tracer, query) =>
    findIntroductions(tracer, {
      fromId: required(query, 'from'),
      investorId: required(query, 'investor'),
      maxHops: intParam(query, 'maxHops', 4),
    }),

  recommend: (tracer, query) => recommendInvestors(tracer, required(query, 'from'), intParam(query, 'limit', 8)),

  conflicts: (tracer, query) =>
    getConflicts(tracer, intParam(query, 'limit', 40), query.get('rivalsOnly') === 'true'),

  graph: (tracer, query) => getNeighbourhood(tracer, required(query, 'id'), intParam(query, 'depth', 1)),

  queries: async () => CATALOGUE,
};

export async function handleApiRequest(request: ApiRequest): Promise<ApiHttpResponse> {
  const route = request.path.replace(/^\/+|\/+$/g, '');

  // Health is special: it must answer 200 with a diagnosis even when the
  // database is down, because that is exactly when the UI needs it most.
  if (route === 'health') {
    const report = await checkHealth();
    return { status: 200, body: { ok: true, data: report, traces: [] } };
  }

  const handler = HANDLERS[route];
  if (!handler) {
    const error = notFound(
      `Unknown endpoint "/api/${route}".`,
      `Available: ${['health', ...Object.keys(HANDLERS)].join(', ')}`,
    );
    return { status: error.status, body: { ok: false, error: { code: error.code, message: error.message, hint: error.hint } } };
  }

  const tracer = new Tracer();
  try {
    const data = await handler(tracer, request.query);
    return { status: 200, body: { ok: true, data, traces: tracer.traces } };
  } catch (err) {
    const error = err instanceof ApiError ? err : toApiError(err);
    if (error.code === 'INTERNAL') {
      // Unexpected failures are logged in full server-side; the client only
      // ever sees the sanitised message.
      console.error(`[api] /${route} failed`, err);
    }
    return {
      status: error.status,
      body: { ok: false, error: { code: error.code, message: error.message, hint: error.hint } },
    };
  }
}
