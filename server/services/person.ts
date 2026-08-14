import type { PersonDetail, Stage, TieStrength } from '../../shared/types.js';
import { PERSON_CONTACTS, PERSON_CORE } from '../cypher.js';
import { notFound } from '../errors.js';
import type { Tracer } from '../execute.js';
import { compact, personFrom, toNumber } from '../mappers.js';

export async function getPerson(tracer: Tracer, id: string): Promise<PersonDetail> {
  const [core, contactRows] = await Promise.all([
    tracer.row(PERSON_CORE, { id }),
    tracer.rows(PERSON_CONTACTS, { id, limit: 40 }),
  ]);

  if (!core?.id) {
    throw notFound(`No person with id "${id}".`);
  }

  return {
    person: personFrom(core),
    founded: compact(core.founded as Array<Record<string, any>>).map((entry) => ({
      id: String(entry.id),
      name: String(entry.name),
      role: String(entry.role ?? 'Co-founder'),
      year: toNumber(entry.year),
      stage: (entry.stage ?? 'Seed') as Stage,
    })),
    employment: compact(core.employment as Array<Record<string, any>>).map((entry) => ({
      id: String(entry.id),
      name: String(entry.name),
      role: String(entry.role ?? ''),
      fromYear: toNumber(entry.fromYear),
      toYear: entry.toYear == null ? null : toNumber(entry.toYear),
    })),
    education: compact(core.education as Array<Record<string, any>>).map((entry) => ({
      name: String(entry.name),
      degree: String(entry.degree ?? ''),
      gradYear: toNumber(entry.gradYear),
    })),
    firms: compact(core.firms as Array<Record<string, any>>).map((entry) => ({
      id: String(entry.id),
      name: String(entry.name),
    })),
    contacts: contactRows.map((row) => ({
      ...personFrom(row),
      strength: (row.strength ?? 'weak') as TieStrength,
      context: String(row.context ?? ''),
      since: toNumber(row.since),
    })),
  };
}
