/**
 * Deterministic dataset generator.
 *
 * The ecosystem below is *synthetic but realistic*: plausible firms, plausible
 * cheque sizes, plausible career histories. It is deliberately not scraped from
 * real people, because the app makes claims about who knows whom and it would
 * be wrong to attach those to real individuals.
 *
 * Everything is generated from a fixed seed, so `npm run seed` produces
 * byte-identical data on any machine. That matters for a take-home: the
 * screenshots in the README show the same graph a reviewer will get.
 */

/* -------------------------------------------------------------------------- */
/* Deterministic randomness                                                    */
/* -------------------------------------------------------------------------- */

/** mulberry32 — small, fast, and reproducible across engines. */
function makeRng(seed: number) {
  let state = seed >>> 0;
  return function next(): number {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = makeRng(20260813);

const pick = <T>(items: readonly T[]): T => items[Math.floor(rng() * items.length)];
const int = (min: number, max: number): number => min + Math.floor(rng() * (max - min + 1));
const chance = (probability: number): boolean => rng() < probability;

function sample<T>(items: readonly T[], count: number): T[] {
  const pool = [...items];
  const chosen: T[] = [];
  for (let i = 0; i < count && pool.length > 0; i += 1) {
    chosen.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
  }
  return chosen;
}

/* -------------------------------------------------------------------------- */
/* Vocabulary                                                                  */
/* -------------------------------------------------------------------------- */

const FIRST_NAMES = [
  'Aarav', 'Ananya', 'Rohan', 'Priya', 'Kabir', 'Meera', 'Vikram', 'Ishita', 'Arjun', 'Nandini',
  'Siddharth', 'Tara', 'Devansh', 'Kavya', 'Raghav', 'Sanya', 'Nikhil', 'Aditi', 'Varun', 'Riya',
  'Karthik', 'Shreya', 'Manav', 'Divya', 'Aryan', 'Neha', 'Rahul', 'Pooja', 'Gautam', 'Anjali',
  'Imran', 'Zoya', 'Farhan', 'Sara', 'Yusuf', 'Amara', 'Daniel', 'Elena', 'Marcus', 'Sophie',
  'Wei', 'Mei', 'Hiroshi', 'Yuki', 'Omar', 'Layla', 'Thomas', 'Clara', 'Julian', 'Nadia',
];

const LAST_NAMES = [
  'Menon', 'Iyer', 'Sharma', 'Reddy', 'Kapoor', 'Nair', 'Bose', 'Chatterjee', 'Deshpande', 'Gill',
  'Rao', 'Sethi', 'Malhotra', 'Bhatt', 'Joshi', 'Kulkarni', 'Pillai', 'Saxena', 'Trivedi', 'Verma',
  'Khan', 'Ahmed', 'Rahman', 'Qureshi', 'Aziz', 'Lindqvist', 'Moreau', 'Okafor', 'Silva', 'Novak',
  'Tan', 'Lim', 'Nakamura', 'Park', 'Haddad', 'Whitfield', 'Ferreira', 'Kowalski', 'Andersen', 'Rossi',
];

const CITIES = [
  'Bengaluru', 'Mumbai', 'Delhi NCR', 'Pune', 'Hyderabad', 'Chennai',
  'Singapore', 'San Francisco', 'London', 'Dubai', 'Berlin', 'New York',
];

const SECTORS = [
  'Fintech', 'Climate Tech', 'Health Tech', 'Logistics', 'AI Infrastructure', 'Consumer Commerce',
  'Developer Tools', 'EdTech', 'AgriTech', 'Cybersecurity', 'Space & Defence', 'Gaming',
];

const SCHOOLS = [
  'IIT Bombay', 'IIT Delhi', 'IIT Madras', 'BITS Pilani', 'IIM Ahmedabad', 'IIM Bangalore',
  'NIT Trichy', 'ISB Hyderabad', 'Delhi University', 'Stanford University', 'MIT',
  'INSEAD', 'National University of Singapore', 'London Business School',
];

const DEGREES = [
  'Computer Science', 'Electrical Engineering', 'Mechanical Engineering', 'Economics',
  'an MBA', 'Design', 'Mathematics', 'Physics', 'Operations Research',
];

const COMPANY_PREFIXES = [
  'Zeta', 'Arka', 'Nimbus', 'Orbit', 'Kaya', 'Vega', 'Lumen', 'Terra', 'Aster', 'Kavach',
  'Rivet', 'Halo', 'Bolt', 'Prism', 'Quanta', 'Saral', 'Nexa', 'Ferro', 'Cobalt', 'Anvil',
  'Solstice', 'Meridian', 'Tessell', 'Kindle', 'Vanta', 'Drift', 'Ochre', 'Pallas', 'Ridge', 'Cinder',
  'Basalt', 'Cirrus', 'Dune', 'Ember', 'Fathom', 'Glyph', 'Hearth', 'Indigo', 'Junction', 'Krait',
];

const COMPANY_SUFFIXES = [
  'Labs', 'Systems', 'Works', 'Technologies', 'Health', 'Ledger', 'Grid', 'Networks', 'Robotics',
  'Analytics', 'Cloud', 'Logistics', 'Bio', 'Energy', 'Studio', 'Protocol', 'Foundry', 'Collective',
];

const FIRM_PREFIXES = [
  'Kalpataru', 'Aster', 'Meridian', 'Blue Ridge', 'Silverline', 'Peregrine', 'Northwind', 'Anchor',
  'Cardamom', 'Highfield', 'Tundra', 'Lighthouse', 'Banyan', 'Sable', 'Vermilion', 'Kestrel',
  'Foundry', 'Marigold', 'Quarry', 'Steepwater', 'Tamarind', 'Ivory Gate', 'Redshift', 'Nine Yards',
];

const FIRM_SUFFIXES = ['Capital', 'Ventures', 'Partners', 'Growth', 'Fund', 'Collective'];

const PARTNER_ROLES = ['Managing Partner', 'General Partner', 'Principal', 'Investment Partner'];

const OPERATOR_TITLES = [
  'CTO', 'VP Engineering', 'Head of Product', 'Chief of Staff', 'VP Growth', 'Head of Design',
  'Director of Data', 'VP Sales', 'Head of Operations', 'Principal Engineer', 'Head of Finance',
];

const FOUNDER_ROLES = ['CEO & Co-founder', 'CTO & Co-founder', 'COO & Co-founder', 'Founder'];

const KNOWS_CONTEXTS = [
  'worked together on a launch',
  'met at an early-stage founder dinner',
  'YC batch acquaintances',
  'introduced by a mutual investor',
  'served on the same industry panel',
  'former manager and report',
  'neighbours in the same co-working floor',
  'ran a hackathon together',
  'college flatmates',
  'met through an alumni chapter',
];

const PRODUCTS: Record<string, string[]> = {
  Fintech: ['a cross-border settlement rail', 'an underwriting engine', 'a treasury automation layer'],
  'Climate Tech': ['a grid-scale battery controller', 'carbon accounting infrastructure', 'a methane-detection network'],
  'Health Tech': ['a clinical triage assistant', 'a diagnostics marketplace', 'remote patient monitoring'],
  Logistics: ['a fleet-routing engine', 'a warehouse robotics stack', 'a customs clearance API'],
  'AI Infrastructure': ['a low-latency inference runtime', 'a vector retrieval layer', 'a model evaluation harness'],
  'Consumer Commerce': ['a live-shopping platform', 'a resale marketplace', 'a loyalty ledger'],
  'Developer Tools': ['a build cache', 'an incident triage copilot', 'a schema migration service'],
  EdTech: ['an adaptive assessment engine', 'a vocational placement network', 'a cohort learning platform'],
  AgriTech: ['a soil analytics network', 'a farm credit marketplace', 'a cold-chain tracker'],
  Cybersecurity: ['a runtime threat monitor', 'an identity graph', 'a supply-chain attestation service'],
  'Space & Defence': ['a satellite tasking platform', 'an earth-observation pipeline', 'a launch logistics service'],
  Gaming: ['a live-ops backend', 'a creator monetisation layer', 'a real-time matchmaking service'],
};

const AUDIENCES: Record<string, string[]> = {
  Fintech: ['mid-market lenders', 'neobanks', 'export businesses'],
  'Climate Tech': ['utilities', 'industrial manufacturers', 'city governments'],
  'Health Tech': ['multi-speciality hospitals', 'insurers', 'primary care networks'],
  Logistics: ['3PL operators', 'quick-commerce fleets', 'freight forwarders'],
  'AI Infrastructure': ['platform engineering teams', 'AI product companies', 'research labs'],
  'Consumer Commerce': ['D2C brands', 'regional retailers', 'creator storefronts'],
  'Developer Tools': ['engineering orgs of 50+', 'platform teams', 'open-source maintainers'],
  EdTech: ['universities', 'skilling institutes', 'enterprise L&D teams'],
  AgriTech: ['farmer producer organisations', 'agri lenders', 'food processors'],
  Cybersecurity: ['regulated enterprises', 'fintech compliance teams', 'cloud-native startups'],
  'Space & Defence': ['defence primes', 'insurance underwriters', 'mapping agencies'],
  Gaming: ['mid-size studios', 'mobile publishers', 'esports platforms'],
};

const THESES = [
  'Backs technical founders at first cheque and stays through Series B.',
  'Concentrated portfolio; three to five new investments a year.',
  'Sector specialist — will not invest outside its focus areas.',
  'Follows strong seed syndicates into breakout Series A rounds.',
  'Operator-led fund; every partner has founded and exited a company.',
  'Writes the first institutional cheque after real revenue, not before.',
  'Thematic fund with a ten-year horizon and no pressure to mark up early.',
  'Prefers capital-efficient businesses in unglamorous markets.',
];

/* -------------------------------------------------------------------------- */
/* Shapes                                                                      */
/* -------------------------------------------------------------------------- */

export type Stage = 'Pre-Seed' | 'Seed' | 'Series A' | 'Series B' | 'Series C';
const STAGE_ORDER: Stage[] = ['Pre-Seed', 'Seed', 'Series A', 'Series B', 'Series C'];

const STAGE_AMOUNTS: Record<Stage, [number, number]> = {
  'Pre-Seed': [250_000, 900_000],
  Seed: [1_000_000, 4_000_000],
  'Series A': [6_000_000, 18_000_000],
  'Series B': [20_000_000, 55_000_000],
  'Series C': [60_000_000, 140_000_000],
};

const INVESTOR_TYPES = ['VC', 'VC', 'VC', 'Angel', 'Accelerator', 'Corporate VC', 'Family Office'] as const;

export interface Dataset {
  sectors: Array<{ id: string; name: string }>;
  schools: Array<{ id: string; name: string }>;
  people: Array<{ id: string; name: string; headline: string; city: string; isPersona: boolean }>;
  companies: Array<{
    id: string; name: string; city: string; stage: Stage; foundedYear: number;
    description: string; website: string; headcount: number; sectors: string[];
  }>;
  investors: Array<{
    id: string; name: string; type: string; hq: string; thesis: string;
    checkSizeUsd: number; sectors: string[];
  }>;
  rounds: Array<{ id: string; companyId: string; stage: Stage; amountUsd: number; announcedOn: string; valuationUsd: number }>;
  participations: Array<{ investorId: string; roundId: string; lead: boolean; amountUsd: number }>;
  founded: Array<{ personId: string; companyId: string; role: string; year: number }>;
  workedAt: Array<{ personId: string; companyId: string; role: string; fromYear: number; toYear: number | null }>;
  studiedAt: Array<{ personId: string; schoolId: string; degree: string; gradYear: number }>;
  knows: Array<{ aId: string; bId: string; strength: string; context: string; since: number }>;
  partnerAt: Array<{ personId: string; investorId: string; role: string; since: number }>;
  advises: Array<{ personId: string; companyId: string; since: number }>;
  competes: Array<{ aId: string; bId: string }>;
}

/* -------------------------------------------------------------------------- */
/* Generation                                                                  */
/* -------------------------------------------------------------------------- */

const COMPANY_COUNT = 130;
const INVESTOR_COUNT = 48;
const OPERATOR_COUNT = 190;
const PERSONA_COUNT = 6;

export function buildDataset(): Dataset {
  const usedNames = new Set<string>();

  function uniquePersonName(): string {
    for (let attempt = 0; attempt < 200; attempt += 1) {
      const name = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
      if (!usedNames.has(name)) {
        usedNames.add(name);
        return name;
      }
    }
    const fallback = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)} ${usedNames.size}`;
    usedNames.add(fallback);
    return fallback;
  }

  const sectors = SECTORS.map((name, index) => ({ id: `sec-${index + 1}`, name }));
  const schools = SCHOOLS.map((name, index) => ({ id: `sch-${index + 1}`, name }));

  /* ---- Companies -------------------------------------------------------- */

  const usedCompanyNames = new Set<string>();
  const companies: Dataset['companies'] = [];

  for (let i = 0; i < COMPANY_COUNT; i += 1) {
    let name = `${pick(COMPANY_PREFIXES)} ${pick(COMPANY_SUFFIXES)}`;
    let guard = 0;
    while (usedCompanyNames.has(name) && guard < 100) {
      name = `${pick(COMPANY_PREFIXES)} ${pick(COMPANY_SUFFIXES)}`;
      guard += 1;
    }
    usedCompanyNames.add(name);

    const primarySector = pick(sectors).name;
    const extraSectors = chance(0.3) ? [pick(sectors).name] : [];
    const companySectors = [...new Set([primarySector, ...extraSectors])];

    // Older companies are further along; the correlation makes the stage
    // filter behave the way a user expects.
    const foundedYear = int(2013, 2023);
    const maxStageIndex = Math.min(4, Math.max(0, Math.floor((2025 - foundedYear) / 2)));
    const stage = STAGE_ORDER[int(0, maxStageIndex)];

    companies.push({
      id: `co-${i + 1}`,
      name,
      city: pick(CITIES),
      stage,
      foundedYear,
      description: `${name} builds ${pick(PRODUCTS[primarySector] ?? ['software'])} for ${pick(AUDIENCES[primarySector] ?? ['growing businesses'])}.`,
      website: `https://${name.toLowerCase().replace(/[^a-z]+/g, '')}.example`,
      headcount: int(6, 320),
      sectors: companySectors,
    });
  }

  /* ---- Investors -------------------------------------------------------- */

  const usedFirmNames = new Set<string>();
  const investors: Dataset['investors'] = [];

  for (let i = 0; i < INVESTOR_COUNT; i += 1) {
    let name = `${pick(FIRM_PREFIXES)} ${pick(FIRM_SUFFIXES)}`;
    let guard = 0;
    while (usedFirmNames.has(name) && guard < 100) {
      name = `${pick(FIRM_PREFIXES)} ${pick(FIRM_SUFFIXES)}`;
      guard += 1;
    }
    usedFirmNames.add(name);

    const type = pick(INVESTOR_TYPES);
    const checkSizeUsd =
      type === 'Angel' ? int(25, 150) * 1_000
        : type === 'Accelerator' ? int(100, 500) * 1_000
          : type === 'Family Office' ? int(500, 3_000) * 1_000
            : int(500, 12_000) * 1_000;

    investors.push({
      id: `inv-${i + 1}`,
      name,
      type,
      hq: pick(CITIES),
      thesis: pick(THESES),
      checkSizeUsd,
      sectors: sample(sectors, int(2, 4)).map((sector) => sector.name),
    });
  }

  /* ---- People ----------------------------------------------------------- */

  const people: Dataset['people'] = [];
  const founded: Dataset['founded'] = [];
  const partnerAt: Dataset['partnerAt'] = [];
  let personSeq = 0;

  const newPerson = (headline: string, city: string): Dataset['people'][number] => {
    personSeq += 1;
    const person = { id: `p-${personSeq}`, name: uniquePersonName(), headline, city, isPersona: false };
    people.push(person);
    return person;
  };

  // Founders: two or three per company.
  for (const company of companies) {
    const founderCount = chance(0.25) ? 3 : 2;
    for (let i = 0; i < founderCount; i += 1) {
      const role = i === 0 ? 'CEO & Co-founder' : pick(FOUNDER_ROLES);
      const person = newPerson(`${role}, ${company.name}`, chance(0.8) ? company.city : pick(CITIES));
      founded.push({
        personId: person.id,
        companyId: company.id,
        role,
        year: company.foundedYear,
      });
    }
  }

  // Investing partners: two to four per firm.
  for (const investor of investors) {
    const partnerCount = investor.type === 'Angel' ? 1 : int(2, 4);
    for (let i = 0; i < partnerCount; i += 1) {
      const role = i === 0 ? 'Managing Partner' : pick(PARTNER_ROLES);
      const person = newPerson(`${role}, ${investor.name}`, chance(0.75) ? investor.hq : pick(CITIES));
      partnerAt.push({
        personId: person.id,
        investorId: investor.id,
        role,
        since: int(2012, 2024),
      });
    }
  }

  // Operators: senior people who are not founders or partners. They are the
  // connective tissue that makes most warm-intro paths interesting.
  for (let i = 0; i < OPERATOR_COUNT; i += 1) {
    const company = pick(companies);
    newPerson(`${pick(OPERATOR_TITLES)} at ${company.name}`, chance(0.7) ? company.city : pick(CITIES));
  }

  /* ---- Employment history ---------------------------------------------- */

  const workedAt: Dataset['workedAt'] = [];
  const employmentKeys = new Set<string>();

  const addEmployment = (personId: string, companyId: string, role: string, fromYear: number, toYear: number | null) => {
    const key = `${personId}|${companyId}`;
    if (employmentKeys.has(key)) return;
    employmentKeys.add(key);
    workedAt.push({ personId, companyId, role, fromYear, toYear });
  };

  const foundedByPerson = new Map<string, string[]>();
  for (const entry of founded) {
    foundedByPerson.set(entry.personId, [...(foundedByPerson.get(entry.personId) ?? []), entry.companyId]);
  }

  for (const person of people) {
    // One current job (or the company they founded), plus one or two past ones.
    const ownCompanies = foundedByPerson.get(person.id) ?? [];
    if (ownCompanies.length > 0) {
      const company = companies.find((c) => c.id === ownCompanies[0])!;
      addEmployment(person.id, company.id, 'Founder', company.foundedYear, null);
    } else if (chance(0.85)) {
      const company = pick(companies);
      addEmployment(person.id, company.id, pick(OPERATOR_TITLES), Math.max(company.foundedYear, int(2018, 2024)), null);
    }

    const pastJobs = int(1, 2);
    for (let i = 0; i < pastJobs; i += 1) {
      const company = pick(companies);
      const fromYear = int(2012, 2020);
      addEmployment(person.id, company.id, pick(OPERATOR_TITLES), fromYear, fromYear + int(1, 4));
    }
  }

  /* ---- Education -------------------------------------------------------- */

  const studiedAt: Dataset['studiedAt'] = [];
  for (const person of people) {
    if (!chance(0.75)) continue;
    const school = pick(schools);
    studiedAt.push({
      personId: person.id,
      schoolId: school.id,
      degree: pick(DEGREES),
      gradYear: int(2004, 2019),
    });
    if (chance(0.18)) {
      const second = pick(schools);
      if (second.id !== school.id) {
        studiedAt.push({ personId: person.id, schoolId: second.id, degree: 'an MBA', gradYear: int(2012, 2021) });
      }
    }
  }

  /* ---- The personal network (KNOWS) ------------------------------------- */

  // A small-world graph: a ring lattice guarantees the network is connected —
  // so a warm path always exists in principle — and the random long-range
  // edges keep the average path length short, exactly like a real professional
  // network. Without the ring, some founders would be unreachable islands and
  // the product's core promise would quietly fail for them.
  const knows: Dataset['knows'] = [];
  const knowsKeys = new Set<string>();

  const addKnows = (aId: string, bId: string) => {
    if (aId === bId) return;
    const key = aId < bId ? `${aId}|${bId}` : `${bId}|${aId}`;
    if (knowsKeys.has(key)) return;
    knowsKeys.add(key);
    const roll = rng();
    knows.push({
      aId,
      bId,
      strength: roll > 0.78 ? 'strong' : roll > 0.4 ? 'medium' : 'weak',
      context: pick(KNOWS_CONTEXTS),
      since: int(2011, 2025),
    });
  };

  for (let i = 0; i < people.length; i += 1) {
    addKnows(people[i].id, people[(i + 1) % people.length].id);
    addKnows(people[i].id, people[(i + 2) % people.length].id);
    for (let k = 0; k < 2; k += 1) {
      addKnows(people[i].id, pick(people).id);
    }
  }

  // Co-founders and colleagues always know each other — otherwise the graph
  // would claim two people built a company together without ever meeting.
  const byCompanyFounders = new Map<string, string[]>();
  for (const entry of founded) {
    byCompanyFounders.set(entry.companyId, [...(byCompanyFounders.get(entry.companyId) ?? []), entry.personId]);
  }
  for (const founders of byCompanyFounders.values()) {
    for (let i = 0; i < founders.length; i += 1) {
      for (let j = i + 1; j < founders.length; j += 1) {
        addKnows(founders[i], founders[j]);
      }
    }
  }

  /* ---- Funding rounds --------------------------------------------------- */

  const rounds: Dataset['rounds'] = [];
  const participations: Dataset['participations'] = [];
  let roundSeq = 0;

  for (const company of companies) {
    const reached = STAGE_ORDER.indexOf(company.stage);
    let year = company.foundedYear;

    for (let stageIndex = 0; stageIndex <= reached; stageIndex += 1) {
      const stage = STAGE_ORDER[stageIndex];
      const [low, high] = STAGE_AMOUNTS[stage];
      const amountUsd = Math.round(int(low, high) / 50_000) * 50_000;
      year = Math.min(2025, year + (stageIndex === 0 ? 0 : int(1, 2)));

      roundSeq += 1;
      const round = {
        id: `rd-${roundSeq}`,
        companyId: company.id,
        stage,
        amountUsd,
        announcedOn: `${year}-${String(int(1, 12)).padStart(2, '0')}-${String(int(1, 28)).padStart(2, '0')}`,
        valuationUsd: amountUsd * int(4, 9),
      };
      rounds.push(round);

      // Investors are drawn from the firms whose thesis covers a sector this
      // company operates in — so the "who backs this space" queries return
      // something coherent rather than noise.
      const aligned = investors.filter((investor) =>
        investor.sectors.some((sector) => company.sectors.includes(sector)),
      );
      const pool = aligned.length >= 4 ? aligned : investors;
      const participants = sample(pool, int(2, 4));

      participants.forEach((investor, index) => {
        participations.push({
          investorId: investor.id,
          roundId: round.id,
          lead: index === 0,
          amountUsd: Math.round((index === 0 ? amountUsd * 0.5 : amountUsd * 0.2) / 10_000) * 10_000,
        });
      });
    }
  }

  /* ---- Advisors and rivalries ------------------------------------------- */

  const advises: Dataset['advises'] = [];
  const adviseKeys = new Set<string>();
  for (let i = 0; i < 160; i += 1) {
    const person = pick(people);
    const company = pick(companies);
    const key = `${person.id}|${company.id}`;
    if (adviseKeys.has(key)) continue;
    adviseKeys.add(key);
    advises.push({ personId: person.id, companyId: company.id, since: int(2016, 2025) });
  }

  const competes: Dataset['competes'] = [];
  const competeKeys = new Set<string>();
  for (const sector of sectors) {
    const inSector = companies.filter((company) => company.sectors.includes(sector.name));
    for (let i = 0; i < inSector.length; i += 1) {
      for (let j = i + 1; j < inSector.length; j += 1) {
        // Only companies at a similar scale are treated as direct rivals.
        if (inSector[i].stage !== inSector[j].stage) continue;
        if (!chance(0.35)) continue;
        const key = `${inSector[i].id}|${inSector[j].id}`;
        if (competeKeys.has(key)) continue;
        competeKeys.add(key);
        competes.push({ aId: inSector[i].id, bId: inSector[j].id });
      }
    }
  }

  /* ---- Personas --------------------------------------------------------- */

  // The people a visitor can explore the app as. We pick founders of
  // early-stage companies with an above-average number of contacts, so the
  // warm-intro demo has something to show on the very first click.
  const contactCounts = new Map<string, number>();
  for (const edge of knows) {
    contactCounts.set(edge.aId, (contactCounts.get(edge.aId) ?? 0) + 1);
    contactCounts.set(edge.bId, (contactCounts.get(edge.bId) ?? 0) + 1);
  }

  const founderIds = new Set(founded.map((entry) => entry.personId));
  const personaCandidates = people
    .filter((person) => founderIds.has(person.id))
    .sort((a, b) => (contactCounts.get(b.id) ?? 0) - (contactCounts.get(a.id) ?? 0))
    .slice(0, 40);

  for (const person of sample(personaCandidates, PERSONA_COUNT)) {
    person.isPersona = true;
  }

  return {
    sectors,
    schools,
    people,
    companies,
    investors,
    rounds,
    participations,
    founded,
    workedAt,
    studiedAt,
    knows,
    partnerAt,
    advises,
    competes,
  };
}

export function summarise(dataset: Dataset): { nodes: number; relationships: number; breakdown: Record<string, number> } {
  const breakdown: Record<string, number> = {
    Sector: dataset.sectors.length,
    School: dataset.schools.length,
    Person: dataset.people.length,
    Company: dataset.companies.length,
    Investor: dataset.investors.length,
    Round: dataset.rounds.length,
    FOUNDED: dataset.founded.length,
    WORKED_AT: dataset.workedAt.length,
    STUDIED_AT: dataset.studiedAt.length,
    KNOWS: dataset.knows.length,
    PARTNER_AT: dataset.partnerAt.length,
    PARTICIPATED_IN: dataset.participations.length,
    RAISED: dataset.rounds.length,
    OPERATES_IN: dataset.companies.reduce((sum, company) => sum + company.sectors.length, 0),
    FOCUSES_ON: dataset.investors.reduce((sum, investor) => sum + investor.sectors.length, 0),
    ADVISES: dataset.advises.length,
    COMPETES_WITH: dataset.competes.length,
  };

  const nodes =
    dataset.sectors.length + dataset.schools.length + dataset.people.length +
    dataset.companies.length + dataset.investors.length + dataset.rounds.length;

  const relationships = Object.entries(breakdown)
    .filter(([key]) => key === key.toUpperCase())
    .reduce((sum, [, value]) => sum + value, 0);

  return { nodes, relationships, breakdown };
}
