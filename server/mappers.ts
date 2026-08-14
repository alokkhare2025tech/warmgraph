import type {
  CompanySummary,
  InvestorSummary,
  InvestorType,
  NodeKind,
  PersonSummary,
  SearchHit,
  Stage,
} from '../shared/types.js';

type Row = Record<string, any>;

/** Cypher `collect()` on an OPTIONAL MATCH that missed yields `[{id: null, ...}]`. */
export function compact<T extends { id?: unknown; name?: unknown }>(list: T[] | null | undefined): T[] {
  if (!Array.isArray(list)) return [];
  return list.filter((item) => item && (item.id != null || item.name != null));
}

export function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (value && typeof value === 'object' && 'toNumber' in (value as any)) {
    return (value as { toNumber(): number }).toNumber();
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function toStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0);
}

/** Picks the meaningful label when a node carries the shared :Entity label too. */
export function kindOf(labels: unknown): NodeKind {
  const list = toStringList(labels);
  const primary = list.find((label) => label !== 'Entity');
  const known: NodeKind[] = ['Person', 'Company', 'Investor', 'Round', 'Sector', 'School'];
  return (known.find((k) => k === primary) ?? 'Person') as NodeKind;
}

export function personFrom(row: Row, prefix = ''): PersonSummary {
  const key = (field: string) => (prefix ? `${prefix}${field[0].toUpperCase()}${field.slice(1)}` : field);
  return {
    id: String(row[key('id')] ?? ''),
    name: String(row[key('name')] ?? 'Unknown'),
    headline: String(row[key('headline')] ?? ''),
    city: String(row[key('city')] ?? ''),
  };
}

export function companyFrom(row: Row, prefix = ''): CompanySummary {
  const key = (field: string) => (prefix ? `${prefix}${field[0].toUpperCase()}${field.slice(1)}` : field);
  return {
    id: String(row[key('id')] ?? ''),
    name: String(row[key('name')] ?? 'Unknown'),
    stage: (row[key('stage')] ?? 'Seed') as Stage,
    city: String(row[key('city')] ?? ''),
    sectors: toStringList(row[key('sectors')] ?? row.sectors),
  };
}

export function investorFrom(row: Row, prefix = ''): InvestorSummary {
  const key = (field: string) => (prefix ? `${prefix}${field[0].toUpperCase()}${field.slice(1)}` : field);
  return {
    id: String(row[key('id')] ?? ''),
    name: String(row[key('name')] ?? 'Unknown'),
    type: (row[key('type')] ?? 'VC') as InvestorType,
    hq: String(row[key('hq')] ?? ''),
    thesis: String(row[key('thesis')] ?? ''),
    sectors: toStringList(row[key('sectors')] ?? row.investorSectors ?? row.sectors),
    checkSizeUsd: toNumber(row[key('checkSizeUsd')] ?? row.checkSizeUsd),
  };
}

export function searchHitFrom(row: Row): SearchHit {
  return {
    id: String(row.id ?? ''),
    kind: kindOf(row.labels),
    label: String(row.name ?? ''),
    sublabel: String(row.sublabel ?? ''),
  };
}

/** Node properties as returned by `properties(n)`, plus its labels. */
export interface RawNode {
  labels: string[];
  props: Record<string, any>;
}

export function displayNameOf(node: RawNode): string {
  const kind = kindOf(node.labels);
  if (kind === 'Round') {
    return `${node.props.stage ?? 'Round'} · ${formatUsdShort(toNumber(node.props.amountUsd))}`;
  }
  return String(node.props.name ?? node.props.id ?? 'Unknown');
}

export function formatUsdShort(amount: number): string {
  if (!Number.isFinite(amount) || amount === 0) return '$0';
  if (amount >= 1_000_000_000) return `$${(amount / 1_000_000_000).toFixed(1)}B`;
  if (amount >= 1_000_000) return `$${Math.round(amount / 1_000_000)}M`;
  if (amount >= 1_000) return `$${Math.round(amount / 1_000)}K`;
  return `$${amount}`;
}
