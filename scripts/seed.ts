/**
 * Loads the WarmGraph dataset into CognoDB.
 *
 *   npm run seed             # create/update everything (idempotent)
 *   npm run seed:reset       # wipe the graph first
 *   npm run seed -- --dry-run  # generate and summarise without connecting
 *
 * Every write is a parameterised UNWIND over a batch of rows — one round trip
 * per batch instead of one per node, which matters a lot on a burstable
 * free-tier instance.
 */

import { closeDriver, run, toApiError } from '../server/db.ts';
import { buildDataset, summarise, type Dataset } from './dataset.ts';

const BATCH_SIZE = 400;

const args = new Set(process.argv.slice(2));
const shouldReset = args.has('--reset');
const dryRun = args.has('--dry-run');

/* -------------------------------------------------------------------------- */
/* Schema                                                                      */
/* -------------------------------------------------------------------------- */

const CONSTRAINTS = [
  'CREATE CONSTRAINT person_id IF NOT EXISTS FOR (p:Person) REQUIRE p.id IS UNIQUE',
  'CREATE CONSTRAINT company_id IF NOT EXISTS FOR (c:Company) REQUIRE c.id IS UNIQUE',
  'CREATE CONSTRAINT investor_id IF NOT EXISTS FOR (i:Investor) REQUIRE i.id IS UNIQUE',
  'CREATE CONSTRAINT round_id IF NOT EXISTS FOR (r:Round) REQUIRE r.id IS UNIQUE',
  'CREATE CONSTRAINT sector_id IF NOT EXISTS FOR (s:Sector) REQUIRE s.id IS UNIQUE',
  'CREATE CONSTRAINT school_id IF NOT EXISTS FOR (s:School) REQUIRE s.id IS UNIQUE',
];

const INDEXES = [
  'CREATE INDEX entity_name IF NOT EXISTS FOR (n:Entity) ON (n.name)',
  'CREATE INDEX company_stage IF NOT EXISTS FOR (c:Company) ON (c.stage)',
  'CREATE INDEX round_stage IF NOT EXISTS FOR (r:Round) ON (r.stage)',
];

/* -------------------------------------------------------------------------- */
/* Write statements                                                            */
/* -------------------------------------------------------------------------- */

const WRITES = {
  sectors: `
UNWIND $rows AS row
MERGE (s:Sector:Entity {id: row.id})
SET s.name = row.name`,

  schools: `
UNWIND $rows AS row
MERGE (s:School:Entity {id: row.id})
SET s.name = row.name`,

  people: `
UNWIND $rows AS row
MERGE (p:Person:Entity {id: row.id})
SET p.name      = row.name,
    p.headline  = row.headline,
    p.city      = row.city,
    p.isPersona = row.isPersona`,

  companies: `
UNWIND $rows AS row
MERGE (c:Company:Entity {id: row.id})
SET c.name        = row.name,
    c.city        = row.city,
    c.stage       = row.stage,
    c.foundedYear = row.foundedYear,
    c.description = row.description,
    c.website     = row.website,
    c.headcount   = row.headcount`,

  investors: `
UNWIND $rows AS row
MERGE (i:Investor:Entity {id: row.id})
SET i.name         = row.name,
    i.type         = row.type,
    i.hq           = row.hq,
    i.thesis       = row.thesis,
    i.checkSizeUsd = row.checkSizeUsd`,

  rounds: `
UNWIND $rows AS row
MERGE (r:Round:Entity {id: row.id})
SET r.name        = row.name,
    r.stage       = row.stage,
    r.amountUsd   = row.amountUsd,
    r.announcedOn = row.announcedOn,
    r.valuationUsd = row.valuationUsd
WITH r, row
MATCH (c:Company {id: row.companyId})
MERGE (c)-[:RAISED]->(r)`,

  operatesIn: `
UNWIND $rows AS row
MATCH (c:Company {id: row.companyId})
MATCH (s:Sector {name: row.sector})
MERGE (c)-[:OPERATES_IN]->(s)`,

  focusesOn: `
UNWIND $rows AS row
MATCH (i:Investor {id: row.investorId})
MATCH (s:Sector {name: row.sector})
MERGE (i)-[:FOCUSES_ON]->(s)`,

  founded: `
UNWIND $rows AS row
MATCH (p:Person {id: row.personId})
MATCH (c:Company {id: row.companyId})
MERGE (p)-[f:FOUNDED]->(c)
SET f.role = row.role, f.year = row.year`,

  workedAt: `
UNWIND $rows AS row
MATCH (p:Person {id: row.personId})
MATCH (c:Company {id: row.companyId})
MERGE (p)-[w:WORKED_AT]->(c)
SET w.role = row.role, w.fromYear = row.fromYear, w.toYear = row.toYear`,

  studiedAt: `
UNWIND $rows AS row
MATCH (p:Person {id: row.personId})
MATCH (s:School {id: row.schoolId})
MERGE (p)-[e:STUDIED_AT]->(s)
SET e.degree = row.degree, e.gradYear = row.gradYear`,

  knows: `
UNWIND $rows AS row
MATCH (a:Person {id: row.aId})
MATCH (b:Person {id: row.bId})
MERGE (a)-[k:KNOWS]->(b)
SET k.strength = row.strength, k.context = row.context, k.since = row.since`,

  partnerAt: `
UNWIND $rows AS row
MATCH (p:Person {id: row.personId})
MATCH (i:Investor {id: row.investorId})
MERGE (p)-[pa:PARTNER_AT]->(i)
SET pa.role = row.role, pa.since = row.since`,

  participations: `
UNWIND $rows AS row
MATCH (i:Investor {id: row.investorId})
MATCH (r:Round {id: row.roundId})
MERGE (i)-[p:PARTICIPATED_IN]->(r)
SET p.lead = row.lead, p.amountUsd = row.amountUsd`,

  advises: `
UNWIND $rows AS row
MATCH (p:Person {id: row.personId})
MATCH (c:Company {id: row.companyId})
MERGE (p)-[a:ADVISES]->(c)
SET a.since = row.since`,

  competes: `
UNWIND $rows AS row
MATCH (a:Company {id: row.aId})
MATCH (b:Company {id: row.bId})
MERGE (a)-[:COMPETES_WITH]->(b)`,
} as const;

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

function chunk<T>(items: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += size) batches.push(items.slice(i, i + size));
  return batches;
}

async function writeBatched(label: string, cypher: string, rows: unknown[]): Promise<void> {
  if (rows.length === 0) {
    console.log(`  ${label.padEnd(16)} 0`);
    return;
  }
  const batches = chunk(rows, BATCH_SIZE);
  for (const batch of batches) {
    await run(cypher, { rows: batch }, { write: true });
  }
  console.log(`  ${label.padEnd(16)} ${rows.length.toLocaleString()} (${batches.length} batch${batches.length === 1 ? '' : 'es'})`);
}

/** Constraints and indexes are best-effort: a graph engine that rejects the
 *  syntax should not stop us from loading data that works fine without it. */
async function applySchema(): Promise<void> {
  let applied = 0;
  let skipped = 0;
  for (const statement of [...CONSTRAINTS, ...INDEXES]) {
    try {
      await run(statement, {}, { write: true });
      applied += 1;
    } catch (err) {
      skipped += 1;
      console.warn(`  ! skipped: ${statement.split(' ').slice(0, 3).join(' ')} — ${(err as Error).message.split('\n')[0]}`);
    }
  }
  console.log(`  ${applied} constraint/index statements applied, ${skipped} skipped.`);
}

async function wipe(): Promise<void> {
  let total = 0;
  // Deleting in bounded batches keeps the transaction small enough for a
  // 256 MB instance; one big DETACH DELETE would run it out of heap.
  for (;;) {
    const result = await run(
      'MATCH (n) WITH n LIMIT 2000 DETACH DELETE n RETURN count(n) AS deleted',
      {},
      { write: true },
    );
    const deleted = Number(result.records[0]?.get('deleted') ?? 0);
    total += deleted;
    if (deleted === 0) break;
    process.stdout.write(`\r  deleted ${total.toLocaleString()} nodes…`);
  }
  console.log(`\r  deleted ${total.toLocaleString()} nodes.        `);
}

async function load(dataset: Dataset): Promise<void> {
  await writeBatched('Sector', WRITES.sectors, dataset.sectors);
  await writeBatched('School', WRITES.schools, dataset.schools);
  await writeBatched('Person', WRITES.people, dataset.people);
  await writeBatched('Company', WRITES.companies, dataset.companies);
  await writeBatched('Investor', WRITES.investors, dataset.investors);

  await writeBatched(
    'Round',
    WRITES.rounds,
    dataset.rounds.map((round) => ({ ...round, name: `${round.stage} — ${round.id}` })),
  );

  await writeBatched(
    'OPERATES_IN',
    WRITES.operatesIn,
    dataset.companies.flatMap((company) => company.sectors.map((sector) => ({ companyId: company.id, sector }))),
  );
  await writeBatched(
    'FOCUSES_ON',
    WRITES.focusesOn,
    dataset.investors.flatMap((investor) => investor.sectors.map((sector) => ({ investorId: investor.id, sector }))),
  );

  await writeBatched('FOUNDED', WRITES.founded, dataset.founded);
  await writeBatched('WORKED_AT', WRITES.workedAt, dataset.workedAt);
  await writeBatched('STUDIED_AT', WRITES.studiedAt, dataset.studiedAt);
  await writeBatched('KNOWS', WRITES.knows, dataset.knows);
  await writeBatched('PARTNER_AT', WRITES.partnerAt, dataset.partnerAt);
  await writeBatched('PARTICIPATED_IN', WRITES.participations, dataset.participations);
  await writeBatched('ADVISES', WRITES.advises, dataset.advises);
  await writeBatched('COMPETES_WITH', WRITES.competes, dataset.competes);
}

/* -------------------------------------------------------------------------- */
/* Entry point                                                                 */
/* -------------------------------------------------------------------------- */

async function main(): Promise<void> {
  console.log('\nWarmGraph — seeding CognoDB\n');

  const startedAt = Date.now();
  const dataset = buildDataset();
  const { nodes, relationships, breakdown } = summarise(dataset);

  console.log(`Generated ${nodes.toLocaleString()} nodes and ${relationships.toLocaleString()} relationships.`);
  console.log(
    Object.entries(breakdown)
      .map(([key, value]) => `  ${key.padEnd(16)} ${value.toLocaleString()}`)
      .join('\n'),
  );

  if (dryRun) {
    console.log('\n--dry-run: nothing was written. Remove the flag to load into CognoDB.\n');
    return;
  }

  console.log('\nApplying schema…');
  await applySchema();

  if (shouldReset) {
    console.log('\nWiping existing graph…');
    await wipe();
  }

  console.log('\nLoading…');
  await load(dataset);

  const seconds = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log(`\nDone in ${seconds}s. Run \`npm run verify\` to exercise every query.\n`);
}

main()
  .catch((err) => {
    const apiError = toApiError(err);
    console.error(`\nSeed failed: ${apiError.message}`);
    if (apiError.hint) console.error(`Hint: ${apiError.hint}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDriver();
  });
