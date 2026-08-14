import type { CoInvestor, InvestorDetail, PortfolioEntry, Stage } from '../../shared/types.js';
import { INVESTOR_CO_INVESTORS, INVESTOR_CORE, INVESTOR_PORTFOLIO } from '../cypher.js';
import { notFound } from '../errors.js';
import type { Tracer } from '../execute.js';
import { compact, investorFrom, toNumber, toStringList } from '../mappers.js';

export async function getInvestor(tracer: Tracer, id: string): Promise<InvestorDetail> {
  const [core, portfolioRows, coInvestorRows] = await Promise.all([
    tracer.row(INVESTOR_CORE, { id }),
    tracer.rows(INVESTOR_PORTFOLIO, { id }),
    tracer.rows(INVESTOR_CO_INVESTORS, { id, limit: 10 }),
  ]);

  if (!core?.id) {
    throw notFound(`No investor with id "${id}".`, 'Try searching for the firm by name instead.');
  }

  const cheques: number[] = [];

  const portfolio: PortfolioEntry[] = portfolioRows.map((row) => {
    const rounds = compact(row.rounds as Array<Record<string, any>>).map((round) => ({
      id: String(round.id),
      stage: round.stage as Stage,
      amountUsd: toNumber(round.amountUsd),
      announcedOn: String(round.announcedOn),
      lead: Boolean(round.lead),
      cheque: toNumber(round.cheque),
    }));

    for (const round of rounds) cheques.push(round.cheque);

    return {
      company: {
        id: String(row.companyId),
        name: String(row.companyName),
        stage: row.companyStage as Stage,
        city: String(row.companyCity),
        sectors: toStringList(row.sectors),
      },
      rounds: rounds.map(({ cheque: _cheque, ...rest }) => rest),
      // `cheque` is this firm's own participation, so summing it gives a
      // defensible "capital deployed" signal — summing the whole round would
      // credit one investor with everybody else's money.
      totalInvestedSignalUsd: rounds.reduce((sum, round) => sum + round.cheque, 0),
    };
  });

  const coInvestors: CoInvestor[] = coInvestorRows.map((row) => ({
    investor: investorFrom(row),
    sharedRounds: toNumber(row.sharedRounds),
    sharedCompanies: toStringList(row.sharedCompanies),
  }));

  const allRounds = portfolio.flatMap((entry) => entry.rounds);
  const leadRounds = allRounds.filter((round) => round.lead).length;

  return {
    investor: {
      ...investorFrom(core),
      sectors: toStringList(core.sectors),
    },
    partners: compact(core.partners as Array<Record<string, any>>).map((partner) => ({
      id: String(partner.id),
      name: String(partner.name),
      headline: String(partner.headline ?? ''),
      city: String(partner.city ?? ''),
    })),
    portfolio: portfolio.sort((a, b) => b.totalInvestedSignalUsd - a.totalInvestedSignalUsd),
    coInvestors,
    stats: {
      companies: portfolio.length,
      rounds: allRounds.length,
      leadRounds,
      medianCheckUsd: median(cheques),
    },
  };
}

/** Median is computed here rather than in Cypher: `percentileCont` is not
 *  part of the portable openCypher surface we committed to. */
function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? Math.round((sorted[mid - 1] + sorted[mid]) / 2) : sorted[mid];
}

export { median };
