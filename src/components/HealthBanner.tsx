import { useEffect, useState } from 'react';
import type { HealthReport } from '../../shared/types';
import { apiGet } from '../lib/api';

/**
 * Graceful degradation when the database is unreachable.
 *
 * /api/health always answers 200 with a diagnosis, so this component can tell
 * the three failure modes apart and say something useful for each:
 *   · not configured  → the operator forgot the environment variables
 *   · unreachable     → the instance is paused, or the URI is wrong
 *   · empty           → connected, but nobody ran the seed script
 */
export function HealthBanner() {
  const [health, setHealth] = useState<HealthReport | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const check = () => {
      apiGet<HealthReport>('health')
        .then(({ data }) => {
          if (!cancelled) setHealth(data);
        })
        .catch(() => {
          if (!cancelled) {
            setHealth({
              configured: true,
              reachable: false,
              seeded: false,
              latencyMs: null,
              serverVersion: null,
              nodeCount: null,
              message: 'The WarmGraph API is not responding.',
            });
          }
        });
    };

    check();
    // Re-check periodically so the banner clears itself once the instance
    // comes back, without the user having to reload.
    const timer = setInterval(check, 30_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  if (!health || dismissed) return null;
  if (health.reachable && health.seeded) return null;

  const isEmpty = health.reachable && !health.seeded;

  return (
    <div className={`banner${isEmpty ? ' banner--warning' : ''}`} role="status">
      <span aria-hidden style={{ fontSize: 16, lineHeight: 1.3 }}>
        {isEmpty ? '◐' : '⚠'}
      </span>
      <div className="stack" style={{ flex: 1 }}>
        <span className="banner__title">
          {!health.configured
            ? 'No database configured'
            : isEmpty
              ? 'Connected, but the graph is empty'
              : 'Cannot reach CognoDB'}
        </span>
        <span className="banner__body">{health.message}</span>
      </div>
      <button type="button" className="btn btn--ghost btn--sm" onClick={() => setDismissed(true)}>
        Dismiss
      </button>
    </div>
  );
}

/** Compact connection indicator for the top bar. */
export function HealthDot() {
  const [health, setHealth] = useState<HealthReport | null>(null);

  useEffect(() => {
    let cancelled = false;
    const check = () =>
      apiGet<HealthReport>('health')
        .then(({ data }) => !cancelled && setHealth(data))
        .catch(() => !cancelled && setHealth(null));
    check();
    const timer = setInterval(check, 30_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  const ok = health?.reachable && health.seeded;
  const color = ok ? 'var(--ok)' : health?.reachable ? 'var(--warning)' : 'var(--danger)';
  const label = health
    ? ok
      ? `CognoDB · ${health.latencyMs} ms`
      : health.reachable
        ? 'CognoDB · empty'
        : 'CognoDB · offline'
    : 'checking…';

  return (
    <span className="badge nowrap" title={health?.message ?? 'Checking the database connection'}>
      <span className="dot" style={{ background: color }} aria-hidden />
      {label}
    </span>
  );
}
