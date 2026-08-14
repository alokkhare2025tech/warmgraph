import type { CompanyDetail, Stage } from '../../shared/types';
import { COMPANY_COMPETITORS, COMPANY_CORE, COMPANY_ROUNDS } from '../cypher';
import { notFound } from '../errors';
import type { Tracer } from '../execute';
import { compact, investorFrom, toNumber, toStringList } from '../mappers';

export async function getCompany(tracer: Tracer, id: string): Promise<CompanyDetail> {
  const [core, roundRows, competitorRows] = await Promise.all([
    tracer.row(COMPANY_CORE, { id }),
    tracer.rows(COMPANY_ROUNDS, { id }),
    tracer.rows(COMPANY_COMPETITORS, { id }),
  ]);

  if (!core?.id) {
    throw notFound(`No company with id "${id}".`, 'Use the search bar to find companies by name.');
  }

  const rounds = roundRows.map((row) => ({
    id: String(row.id),
    stage: row.stage as Stage,
    amountUsd: toNumber(row.amountUsd),
    announcedOn: String(row.announcedOn),
    investors: compact(row.investors as Array<Record<string, any>>).map((investor) => ({
      ...investorFrom(investor),
      sectors: [],
      lead: Boolean(investor.lead),
    })),
  }));

  return {
    company: {
      id: String(core.id),
      name: String(core.name),
      stage: core.stage as Stage,
      city: String(core.city),
      sectors: toStringList(core.sectors),
      foundedYear: toNumber(core.foundedYear),
      description: String(core.description ?? ''),
      website: String(core.website ?? ''),
      headcount: toNumber(core.headcount),
    },
    founders: compact(core.founders as Array<Record<string, any>>).map((founder) => ({
      id: String(founder.id),
      name: String(founder.name),
      headline: String(founder.headline ?? ''),
      city: String(founder.city ?? ''),
      role: String(founder.role ?? 'Co-founder'),
    })),
    team: compact(core.team as Array<Record<string, any>>).map((member) => ({
      id: String(member.id),
      name: String(member.name),
      headline: String(member.headline ?? ''),
      city: String(member.city ?? ''),
    })),
    rounds,
    competitors: compact(competitorRows).map((row) => ({
      id: String(row.id),
      name: String(row.name),
      stage: row.stage as Stage,
      city: String(row.city ?? ''),
      sectors: toStringList(row.sectors),
    })),
    totalRaisedUsd: rounds.reduce((sum, round) => sum + round.amountUsd, 0),
  };
}
