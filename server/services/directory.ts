import type {
  CompanyListItem,
  DirectoryFilters,
  InvestorListItem,
  InvestorType,
  Persona,
  SearchHit,
  Stage,
} from '../../shared/types.js';
import { LIST_COMPANIES, LIST_INVESTORS, LIST_PERSONAS, LIST_SECTORS, SEARCH_ENTITIES } from '../cypher.js';
import type { Tracer } from '../execute.js';
import { companyFrom, investorFrom, personFrom, searchHitFrom, toNumber, toStringList } from '../mappers.js';

export const STAGES: Stage[] = ['Pre-Seed', 'Seed', 'Series A', 'Series B', 'Series C'];
export const INVESTOR_TYPES: InvestorType[] = ['VC', 'Angel', 'Accelerator', 'Corporate VC', 'Family Office'];

export async function search(tracer: Tracer, q: string, limit = 12): Promise<SearchHit[]> {
  const term = q.trim();
  if (term.length < 2) return [];
  return (await tracer.rows(SEARCH_ENTITIES, { q: term, limit })).map(searchHitFrom);
}

export async function listPersonas(tracer: Tracer): Promise<Persona[]> {
  return (await tracer.rows(LIST_PERSONAS)).map((row) => ({
    ...personFrom(row),
    companies: toStringList(row.companies),
    directContacts: toNumber(row.directContacts),
  }));
}

export interface InvestorFilter {
  q?: string;
  type?: string;
  sector?: string;
  limit?: number;
}

export async function listInvestors(tracer: Tracer, filter: InvestorFilter): Promise<InvestorListItem[]> {
  const rows = await tracer.rows(LIST_INVESTORS, {
    // Cypher has no "skip this predicate" syntax, so the empty string is the
    // agreed sentinel for "no filter" and every branch stays parameterised.
    q: filter.q?.trim() ?? '',
    type: filter.type?.trim() ?? '',
    sector: filter.sector?.trim() ?? '',
    limit: filter.limit ?? 60,
  });

  return rows.map((row) => ({
    ...investorFrom(row),
    portfolioSize: toNumber(row.portfolioSize),
  }));
}

export interface CompanyFilter {
  q?: string;
  stage?: string;
  sector?: string;
  limit?: number;
}

export async function listCompanies(tracer: Tracer, filter: CompanyFilter): Promise<CompanyListItem[]> {
  const rows = await tracer.rows(LIST_COMPANIES, {
    q: filter.q?.trim() ?? '',
    stage: filter.stage?.trim() ?? '',
    sector: filter.sector?.trim() ?? '',
    limit: filter.limit ?? 60,
  });

  return rows.map((row) => ({
    ...companyFrom(row),
    totalRaisedUsd: toNumber(row.totalRaisedUsd),
  }));
}

export async function getFilters(tracer: Tracer): Promise<DirectoryFilters> {
  const rows = await tracer.rows(LIST_SECTORS);
  return {
    sectors: rows.map((row) => String(row.name)),
    stages: STAGES,
    investorTypes: INVESTOR_TYPES,
  };
}
