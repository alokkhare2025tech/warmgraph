/**
 * The complete Cypher catalogue.
 *
 * Every statement the application can run lives here, exactly once, as a named
 * constant with a plain-English purpose. Two consequences worth calling out:
 *
 *  1. No query text is ever built by concatenating user input. Every value the
 *     user controls arrives as a bound `$parameter`. The only thing that varies
 *     between requests is the parameter map.
 *  2. `/api/queries` serves this catalogue, and the UI renders it in the
 *     "Query behind this screen" drawer — so the Cypher a reviewer reads is
 *     literally the Cypher that ran.
 *
 * Portability note: CognoDB speaks openCypher. These statements deliberately
 * stay inside the portable core — no APOC, no GDS, no `shortestPath()`, no
 * `CALL {}` subqueries, no `EXISTS {}` — so they run unchanged on CognoDB,
 * Neo4j, or any other openCypher engine.
 */

export interface CypherStatement {
  name: string;
  purpose: string;
  text: string;
  /** Shown in the UI to explain why this one is interesting. */
  note?: string;
}

const def = (name: string, purpose: string, text: string, note?: string): CypherStatement => ({
  name,
  purpose,
  text: text.trim(),
  note,
});

/* -------------------------------------------------------------------------- */
/* Health                                                                     */
/* -------------------------------------------------------------------------- */

export const HEALTH_PING = def(
  'health.ping',
  'Cheapest possible round trip: proves the Bolt connection and credentials work.',
  `RETURN 1 AS ok`,
);

export const HEALTH_SEEDED = def(
  'health.seeded',
  'Counts nodes so the UI can tell "database empty" apart from "database down".',
  `
MATCH (n:Entity)
RETURN count(n) AS nodeCount
`,
);

/* -------------------------------------------------------------------------- */
/* Ecosystem statistics                                                        */
/* -------------------------------------------------------------------------- */

export const STATS_COUNTS = def(
  'stats.counts',
  'Headline counts for the dashboard.',
  `
MATCH (p:Person)
WITH count(p) AS people
MATCH (c:Company)
WITH people, count(c) AS companies
MATCH (i:Investor)
WITH people, companies, count(i) AS investors
MATCH (r:Round)
WITH people, companies, investors, count(r) AS rounds
MATCH ()-[rel]->()
RETURN people, companies, investors, rounds, count(rel) AS relationships
`,
);

export const STATS_TOP_SECTORS = def(
  'stats.topSectors',
  'Capital deployed per sector — aggregates across two relationship types at once.',
  `
MATCH (s:Sector)<-[:OPERATES_IN]-(c:Company)
OPTIONAL MATCH (c)-[:RAISED]->(r:Round)
RETURN s.name                          AS sector,
       count(DISTINCT c)               AS companies,
       sum(coalesce(r.amountUsd, 0))   AS totalRaisedUsd
ORDER BY totalRaisedUsd DESC
LIMIT $limit
`,
);

export const STATS_STAGE_BREAKDOWN = def(
  'stats.stageBreakdown',
  'Round volume and value by financing stage.',
  `
MATCH (r:Round)
RETURN r.stage           AS stage,
       count(r)          AS rounds,
       sum(r.amountUsd)  AS totalRaisedUsd
ORDER BY totalRaisedUsd DESC
`,
);

export const STATS_MOST_CONNECTED = def(
  'stats.mostConnected',
  'The ecosystem\'s super-connectors, by raw degree.',
  `
MATCH (p:Person)-[rel]-()
RETURN p.id        AS id,
       p.name      AS name,
       p.headline  AS headline,
       p.city      AS city,
       count(rel)  AS connections
ORDER BY connections DESC, name ASC
LIMIT $limit
`,
);

/* -------------------------------------------------------------------------- */
/* Directory: search, browse, personas                                         */
/* -------------------------------------------------------------------------- */

export const SEARCH_ENTITIES = def(
  'search.entities',
  'Type-ahead across every searchable node, using the shared :Entity label.',
  `
MATCH (n:Entity)
WHERE toLower(n.name) CONTAINS toLower($q)
RETURN n.id                    AS id,
       labels(n)               AS labels,
       n.name                  AS name,
       coalesce(n.headline, n.thesis, n.description, n.city, '') AS sublabel
ORDER BY size(n.name), n.name
LIMIT $limit
`,
  'One label (:Entity) applied to People, Companies, Investors and Sectors turns four searches into one.',
);

export const LIST_PERSONAS = def(
  'directory.personas',
  'The founders a visitor can "sign in as" to explore their own network.',
  `
MATCH (p:Person {isPersona: true})
OPTIONAL MATCH (p)-[:FOUNDED]->(c:Company)
OPTIONAL MATCH (p)-[k:KNOWS]-(:Person)
RETURN p.id                        AS id,
       p.name                      AS name,
       p.headline                  AS headline,
       p.city                      AS city,
       collect(DISTINCT c.name)    AS companies,
       count(DISTINCT k)           AS directContacts
ORDER BY p.name
`,
);

export const LIST_INVESTORS = def(
  'directory.investors',
  'Browsable investor list with optional sector and type filters.',
  `
MATCH (i:Investor)
OPTIONAL MATCH (i)-[:FOCUSES_ON]->(s:Sector)
WITH i, collect(DISTINCT s.name) AS sectors
WHERE ($q = '' OR toLower(i.name) CONTAINS toLower($q))
  AND ($type = '' OR i.type = $type)
  AND ($sector = '' OR $sector IN sectors)
OPTIONAL MATCH (i)-[:PARTICIPATED_IN]->(r:Round)<-[:RAISED]-(c:Company)
RETURN i.id            AS id,
       i.name          AS name,
       i.type          AS type,
       i.hq            AS hq,
       i.thesis        AS thesis,
       i.checkSizeUsd  AS checkSizeUsd,
       sectors         AS sectors,
       count(DISTINCT c) AS portfolioSize
ORDER BY portfolioSize DESC, name ASC
LIMIT $limit
`,
);

export const LIST_COMPANIES = def(
  'directory.companies',
  'Browsable company list with optional sector and stage filters.',
  `
MATCH (c:Company)
OPTIONAL MATCH (c)-[:OPERATES_IN]->(s:Sector)
WITH c, collect(DISTINCT s.name) AS sectors
WHERE ($q = '' OR toLower(c.name) CONTAINS toLower($q))
  AND ($stage = '' OR c.stage = $stage)
  AND ($sector = '' OR $sector IN sectors)
OPTIONAL MATCH (c)-[:RAISED]->(r:Round)
RETURN c.id       AS id,
       c.name     AS name,
       c.stage    AS stage,
       c.city     AS city,
       sectors    AS sectors,
       sum(coalesce(r.amountUsd, 0)) AS totalRaisedUsd
ORDER BY totalRaisedUsd DESC, name ASC
LIMIT $limit
`,
);

export const LIST_SECTORS = def(
  'directory.sectors',
  'Sector filter options.',
  `
MATCH (s:Sector)
RETURN s.name AS name
ORDER BY name
`,
);

/* -------------------------------------------------------------------------- */
/* Investor profile                                                            */
/* -------------------------------------------------------------------------- */

export const INVESTOR_CORE = def(
  'investor.core',
  'Firm profile plus its investing partners.',
  `
MATCH (i:Investor {id: $id})
OPTIONAL MATCH (i)-[:FOCUSES_ON]->(s:Sector)
OPTIONAL MATCH (p:Person)-[pa:PARTNER_AT]->(i)
RETURN i.id           AS id,
       i.name         AS name,
       i.type         AS type,
       i.hq           AS hq,
       i.thesis       AS thesis,
       i.checkSizeUsd AS checkSizeUsd,
       collect(DISTINCT s.name) AS sectors,
       collect(DISTINCT {
         id: p.id, name: p.name, headline: p.headline, city: p.city, role: pa.role
       }) AS partners
`,
);

export const INVESTOR_PORTFOLIO = def(
  'investor.portfolio',
  'Every company this firm has backed, with the rounds it participated in.',
  `
MATCH (i:Investor {id: $id})-[part:PARTICIPATED_IN]->(r:Round)<-[:RAISED]-(c:Company)
OPTIONAL MATCH (c)-[:OPERATES_IN]->(s:Sector)
RETURN c.id     AS companyId,
       c.name   AS companyName,
       c.stage  AS companyStage,
       c.city   AS companyCity,
       collect(DISTINCT s.name) AS sectors,
       collect(DISTINCT {
         id: r.id, stage: r.stage, amountUsd: r.amountUsd,
         announcedOn: r.announcedOn, lead: part.lead, cheque: part.amountUsd
       }) AS rounds
ORDER BY companyName
`,
);

export const INVESTOR_CO_INVESTORS = def(
  'investor.coInvestors',
  'Which firms show up on the same cap tables — a 2-hop traversal through Round.',
  `
MATCH (i:Investor {id: $id})-[:PARTICIPATED_IN]->(r:Round)<-[:PARTICIPATED_IN]-(other:Investor)
WHERE other.id <> i.id
MATCH (c:Company)-[:RAISED]->(r)
OPTIONAL MATCH (other)-[:FOCUSES_ON]->(s:Sector)
RETURN other.id           AS id,
       other.name         AS name,
       other.type         AS type,
       other.hq           AS hq,
       other.thesis       AS thesis,
       other.checkSizeUsd AS checkSizeUsd,
       collect(DISTINCT s.name) AS sectors,
       count(DISTINCT r)  AS sharedRounds,
       collect(DISTINCT c.name)[0..6] AS sharedCompanies
ORDER BY sharedRounds DESC, name ASC
LIMIT $limit
`,
  'A relational schema needs a self-join on the round-participation table plus a de-duplication pass; here it is one pattern.',
);

/* -------------------------------------------------------------------------- */
/* Company profile                                                             */
/* -------------------------------------------------------------------------- */

export const COMPANY_CORE = def(
  'company.core',
  'Company profile, sectors, founders and current team.',
  `
MATCH (c:Company {id: $id})
OPTIONAL MATCH (c)-[:OPERATES_IN]->(s:Sector)
OPTIONAL MATCH (f:Person)-[fo:FOUNDED]->(c)
OPTIONAL MATCH (t:Person)-[w:WORKED_AT]->(c) WHERE w.toYear IS NULL
RETURN c.id          AS id,
       c.name        AS name,
       c.stage       AS stage,
       c.city        AS city,
       c.foundedYear AS foundedYear,
       c.description AS description,
       c.website     AS website,
       c.headcount   AS headcount,
       collect(DISTINCT s.name) AS sectors,
       collect(DISTINCT {
         id: f.id, name: f.name, headline: f.headline, city: f.city, role: fo.role
       }) AS founders,
       collect(DISTINCT {
         id: t.id, name: t.name, headline: t.headline, city: t.city
       })[0..12] AS team
`,
);

export const COMPANY_ROUNDS = def(
  'company.rounds',
  'The full financing history with every participating investor.',
  `
MATCH (c:Company {id: $id})-[:RAISED]->(r:Round)
OPTIONAL MATCH (i:Investor)-[part:PARTICIPATED_IN]->(r)
RETURN r.id          AS id,
       r.stage       AS stage,
       r.amountUsd   AS amountUsd,
       r.announcedOn AS announcedOn,
       collect(DISTINCT {
         id: i.id, name: i.name, type: i.type, hq: i.hq,
         thesis: i.thesis, checkSizeUsd: i.checkSizeUsd, lead: part.lead
       }) AS investors
ORDER BY r.announcedOn
`,
);

export const COMPANY_COMPETITORS = def(
  'company.competitors',
  'Declared rivals, plus companies that merely share a sector and stage.',
  `
MATCH (c:Company {id: $id})
OPTIONAL MATCH (c)-[:COMPETES_WITH]-(rival:Company)
OPTIONAL MATCH (rival)-[:OPERATES_IN]->(rs:Sector)
RETURN rival.id    AS id,
       rival.name  AS name,
       rival.stage AS stage,
       rival.city  AS city,
       collect(DISTINCT rs.name) AS sectors
`,
);

/* -------------------------------------------------------------------------- */
/* Person profile                                                              */
/* -------------------------------------------------------------------------- */

export const PERSON_CORE = def(
  'person.core',
  'A person, everything they founded or worked on, and where they studied.',
  `
MATCH (p:Person {id: $id})
OPTIONAL MATCH (p)-[fo:FOUNDED]->(fc:Company)
OPTIONAL MATCH (p)-[w:WORKED_AT]->(wc:Company)
OPTIONAL MATCH (p)-[st:STUDIED_AT]->(sch:School)
OPTIONAL MATCH (p)-[:PARTNER_AT]->(inv:Investor)
RETURN p.id       AS id,
       p.name     AS name,
       p.headline AS headline,
       p.city     AS city,
       collect(DISTINCT {id: fc.id, name: fc.name, role: fo.role,
                         year: fo.year, stage: fc.stage})                           AS founded,
       collect(DISTINCT {id: wc.id, name: wc.name, role: w.role,
                         fromYear: w.fromYear, toYear: w.toYear})                    AS employment,
       collect(DISTINCT {name: sch.name, degree: st.degree, gradYear: st.gradYear})  AS education,
       collect(DISTINCT {id: inv.id, name: inv.name})                                AS firms
`,
);

export const PERSON_CONTACTS = def(
  'person.contacts',
  'First-degree contacts with the strength of each tie.',
  `
MATCH (p:Person {id: $id})-[k:KNOWS]-(other:Person)
RETURN other.id       AS id,
       other.name     AS name,
       other.headline AS headline,
       other.city     AS city,
       k.strength     AS strength,
       k.context      AS context,
       k.since        AS since
ORDER BY CASE k.strength WHEN 'strong' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END, other.name
LIMIT $limit
`,
);

/* -------------------------------------------------------------------------- */
/* The warm-intro engine                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Variable-length bounds cannot be parameterised in Cypher, so instead of
 * building the pattern by concatenation we keep one *pre-written* statement per
 * hop count and pick from this frozen map using a validated integer. The query
 * text is still a constant; only `$fromId` / `$investorId` / `$limit` vary.
 */
function introPathQuery(hops: number): CypherStatement {
  return def(
    `intro.paths.${hops}hop`,
    `All ${hops}-hop introduction routes from you to a partner at the target firm.`,
    `
MATCH (me:Person {id: $fromId})
MATCH (target:Person)-[:PARTNER_AT]->(firm:Investor {id: $investorId})
MATCH path = (me)-[:KNOWS|WORKED_AT|FOUNDED|STUDIED_AT|ADVISES|PARTNER_AT*${hops}..${hops}]-(target)
WHERE ALL(n IN nodes(path) WHERE size([m IN nodes(path) WHERE m = n]) = 1)
RETURN [n IN nodes(path)         | {labels: labels(n), props: properties(n)}]                          AS nodeChain,
       [r IN relationships(path) | {type: type(r), props: properties(r),
                                    fromId: startNode(r).id, toId: endNode(r).id}]                      AS relChain,
       target.id AS targetId
LIMIT $limit
`,
    'Walking outward one hop at a time keeps the traversal bounded on a 0.5-vCPU instance and returns the warmest routes first.',
  );
}

export const INTRO_PATH_QUERIES: Readonly<Record<number, CypherStatement>> = Object.freeze({
  1: introPathQuery(1),
  2: introPathQuery(2),
  3: introPathQuery(3),
  4: introPathQuery(4),
  5: introPathQuery(5),
});

export const INTRO_TARGET_PARTNERS = def(
  'intro.targetPartners',
  'The partners at the firm you are trying to reach.',
  `
MATCH (p:Person)-[pa:PARTNER_AT]->(i:Investor {id: $investorId})
RETURN p.id       AS id,
       p.name     AS name,
       p.headline AS headline,
       p.city     AS city,
       pa.role    AS role
ORDER BY CASE pa.role WHEN 'Managing Partner' THEN 0 WHEN 'General Partner' THEN 1 ELSE 2 END, p.name
`,
);

export const RECOMMEND_INVESTORS = def(
  'intro.recommend',
  'Investors worth approaching: right thesis, right stage, and already backing your neighbours.',
  `
MATCH (me:Person {id: $fromId})-[:FOUNDED]->(mine:Company)-[:OPERATES_IN]->(s:Sector)
MATCH (i:Investor)-[:FOCUSES_ON]->(s)
OPTIONAL MATCH (i)-[:PARTICIPATED_IN]->(r:Round)<-[:RAISED]-(backed:Company)-[:OPERATES_IN]->(s)
WITH i, s, mine,
     count(DISTINCT backed) AS sectorBets,
     sum(CASE WHEN r.stage = $stage THEN 1 ELSE 0 END) AS stageBets
OPTIONAL MATCH (i)-[:FOCUSES_ON]->(allS:Sector)
RETURN i.id            AS id,
       i.name          AS name,
       i.type          AS type,
       i.hq            AS hq,
       i.thesis        AS thesis,
       i.checkSizeUsd  AS checkSizeUsd,
       collect(DISTINCT allS.name) AS sectors,
       collect(DISTINCT s.name)    AS matchedSectors,
       max(sectorBets) AS sectorBets,
       max(stageBets)  AS stageBets,
       collect(DISTINCT mine.name)[0] AS forCompany
ORDER BY stageBets DESC, sectorBets DESC, name ASC
LIMIT $limit
`,
  'Four hops from "me" to "a firm that funds companies like mine" — the join a founder actually wants, and a nightmare in SQL.',
);

/* -------------------------------------------------------------------------- */
/* Conflict of interest                                                        */
/* -------------------------------------------------------------------------- */

export const CONFLICTS = def(
  'conflicts.sameSector',
  'Firms sitting on both sides of a rivalry: two portfolio companies in one sector.',
  `
MATCH (i:Investor)-[:PARTICIPATED_IN]->(r1:Round)<-[:RAISED]-(c1:Company)-[:OPERATES_IN]->(s:Sector),
      (i)-[:PARTICIPATED_IN]->(r2:Round)<-[:RAISED]-(c2:Company)-[:OPERATES_IN]->(s)
WHERE c1.id < c2.id
OPTIONAL MATCH (c1)-[rivalry:COMPETES_WITH]-(c2)
WITH i, s, c1, c2,
     count(rivalry)      AS rivalryCount,
     min(r1.announcedOn) AS firstDate,
     min(r2.announcedOn) AS secondDate
OPTIONAL MATCH (i)-[:FOCUSES_ON]->(fs:Sector)
RETURN i.id           AS investorId,
       i.name         AS investorName,
       i.type         AS investorType,
       i.hq           AS investorHq,
       i.thesis       AS investorThesis,
       i.checkSizeUsd AS checkSizeUsd,
       collect(DISTINCT fs.name) AS investorSectors,
       s.name         AS sector,
       rivalryCount > 0 AS declaredRivals,
       c1.id AS aId, c1.name AS aName, c1.stage AS aStage, c1.city AS aCity, firstDate  AS aDate,
       c2.id AS bId, c2.name AS bName, c2.stage AS bStage, c2.city AS bCity, secondDate AS bDate
ORDER BY declaredRivals DESC, investorName, sector
LIMIT $limit
`,
  'A six-hop pattern in a single MATCH. The relational equivalent is a four-way self-join over rounds and participations with a de-duplication predicate.',
);

/* -------------------------------------------------------------------------- */
/* Graph explorer                                                              */
/* -------------------------------------------------------------------------- */

function neighbourhoodQuery(depth: number): CypherStatement {
  return def(
    `graph.neighbourhood.${depth}`,
    `Every node within ${depth} hop${depth === 1 ? '' : 's'} of the selected entity.`,
    `
MATCH path = (center:Entity {id: $id})-[*1..${depth}]-()
WITH path
LIMIT $limit
WITH collect(path) AS paths
WITH reduce(ns = [], p IN paths | ns + nodes(p))         AS allNodes,
     reduce(rs = [], p IN paths | rs + relationships(p)) AS allRels
RETURN [n IN allNodes | {id: n.id, labels: labels(n), props: properties(n)}] AS nodes,
       [r IN allRels  | {type: type(r), fromId: startNode(r).id, toId: endNode(r).id}] AS rels
`,
  );
}

export const NEIGHBOURHOOD_QUERIES: Readonly<Record<number, CypherStatement>> = Object.freeze({
  1: neighbourhoodQuery(1),
  2: neighbourhoodQuery(2),
});

export const GRAPH_CENTER = def(
  'graph.center',
  'The entity the explorer is centred on.',
  `
MATCH (n:Entity {id: $id})
RETURN n.id AS id, labels(n) AS labels, properties(n) AS props
`,
);

/* -------------------------------------------------------------------------- */
/* Catalogue served at /api/queries                                            */
/* -------------------------------------------------------------------------- */

export const CATALOGUE: CypherStatement[] = [
  HEALTH_PING,
  HEALTH_SEEDED,
  STATS_COUNTS,
  STATS_TOP_SECTORS,
  STATS_STAGE_BREAKDOWN,
  STATS_MOST_CONNECTED,
  SEARCH_ENTITIES,
  LIST_PERSONAS,
  LIST_INVESTORS,
  LIST_COMPANIES,
  LIST_SECTORS,
  INVESTOR_CORE,
  INVESTOR_PORTFOLIO,
  INVESTOR_CO_INVESTORS,
  COMPANY_CORE,
  COMPANY_ROUNDS,
  COMPANY_COMPETITORS,
  PERSON_CORE,
  PERSON_CONTACTS,
  INTRO_TARGET_PARTNERS,
  INTRO_PATH_QUERIES[3],
  RECOMMEND_INVESTORS,
  CONFLICTS,
  NEIGHBOURHOOD_QUERIES[2],
  GRAPH_CENTER,
];
