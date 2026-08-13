import type { NodeKind } from '../../shared/types';

export function usd(amount: number): string {
  if (!Number.isFinite(amount) || amount === 0) return '—';
  if (amount >= 1_000_000_000) return `$${(amount / 1_000_000_000).toFixed(amount >= 10_000_000_000 ? 0 : 1)}B`;
  if (amount >= 1_000_000) return `$${Math.round(amount / 1_000_000)}M`;
  if (amount >= 1_000) return `$${Math.round(amount / 1_000)}K`;
  return `$${amount}`;
}

export function count(value: number): string {
  return Number.isFinite(value) ? value.toLocaleString() : '—';
}

export function monthYear(iso: string): string {
  if (!iso || iso.length < 7) return '—';
  const [year, month] = iso.split('-');
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${names[Number(month) - 1] ?? ''} ${year}`.trim();
}

export function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export const KIND_COLOR: Record<NodeKind, string> = {
  Person: 'var(--person)',
  Company: 'var(--company)',
  Investor: 'var(--investor)',
  Round: 'var(--round)',
  Sector: 'var(--sector)',
  School: 'var(--school)',
};

export const KIND_CLASS: Record<NodeKind, string> = {
  Person: 'badge badge--person',
  Company: 'badge badge--company',
  Investor: 'badge badge--investor',
  Round: 'badge badge--round',
  Sector: 'badge badge--sector',
  School: 'badge badge--school',
};

/** Where a search hit or a graph node should navigate to. */
export function routeFor(kind: NodeKind, id: string): string {
  switch (kind) {
    case 'Person':
      return `#/person/${id}`;
    case 'Company':
      return `#/company/${id}`;
    case 'Investor':
      return `#/investor/${id}`;
    default:
      return `#/explore/${id}`;
  }
}

/** "0.62" → a colour from cold blue to warm orange. */
export function warmthColor(score: number): string {
  if (score >= 0.6) return 'var(--ok)';
  if (score >= 0.3) return 'var(--warm)';
  return 'var(--person)';
}

export function warmthLabel(score: number): string {
  if (score >= 0.6) return 'Warm';
  if (score >= 0.3) return 'Lukewarm';
  return 'Cool';
}
