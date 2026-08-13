import type { ReactNode } from 'react';
import type { ApiClientError } from '../lib/api';

/* -------------------------------------------------------------------------- */
/* Loading                                                                     */
/* -------------------------------------------------------------------------- */

export function Skeleton({ height = 16, width = '100%', radius }: { height?: number; width?: string | number; radius?: number }) {
  return <div className="skeleton" style={{ height, width, borderRadius: radius }} aria-hidden />;
}

/** A card-shaped placeholder, so the layout does not jump when data lands. */
export function SkeletonCards({ count = 6, height = 96 }: { count?: number; height?: number }) {
  return (
    <div className="grid grid--2" aria-busy="true" aria-label="Loading">
      {Array.from({ length: count }, (_, index) => (
        <Skeleton key={index} height={height} radius={12} />
      ))}
    </div>
  );
}

export function SkeletonStats({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid--4" aria-busy="true" aria-label="Loading">
      {Array.from({ length: count }, (_, index) => (
        <Skeleton key={index} height={78} radius={12} />
      ))}
    </div>
  );
}

export function SkeletonRows({ count = 6 }: { count?: number }) {
  return (
    <div className="stack" style={{ gap: 8 }} aria-busy="true" aria-label="Loading">
      {Array.from({ length: count }, (_, index) => (
        <Skeleton key={index} height={44} radius={8} />
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Empty                                                                       */
/* -------------------------------------------------------------------------- */

export function EmptyState({
  title,
  body,
  icon = '◌',
  action,
}: {
  title: string;
  body: ReactNode;
  icon?: string;
  action?: ReactNode;
}) {
  return (
    <div className="state">
      <div style={{ fontSize: 26, color: 'var(--text-faint)' }} aria-hidden>
        {icon}
      </div>
      <h3>{title}</h3>
      <p>{body}</p>
      {action ? <div className="state__actions">{action}</div> : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Error                                                                       */
/* -------------------------------------------------------------------------- */

const FRIENDLY: Record<string, string> = {
  DB_UNREACHABLE: 'The graph database is not responding',
  DB_AUTH_FAILED: 'The database rejected our credentials',
  NOT_CONFIGURED: 'No database is configured',
  NOT_FOUND: 'We could not find that',
  BAD_REQUEST: 'That request was incomplete',
  TIMEOUT: 'The database took too long',
  INTERNAL: 'Something went wrong',
};

export function ErrorState({ error, onRetry }: { error: ApiClientError; onRetry?: () => void }) {
  return (
    <div className="state state--error" role="alert">
      <div style={{ fontSize: 24 }} aria-hidden>
        ⚠
      </div>
      <h3>{FRIENDLY[error.code] ?? 'Something went wrong'}</h3>
      <p>{error.message}</p>
      {error.hint ? (
        <p className="faint" style={{ marginTop: 8, fontSize: 12.5 }}>
          {error.hint}
        </p>
      ) : null}
      {onRetry ? (
        <div className="state__actions">
          <button type="button" className="btn btn--sm" onClick={onRetry}>
            Try again
          </button>
        </div>
      ) : null}
    </div>
  );
}

/**
 * The one place that decides between loading / error / empty / content.
 * Every screen routes through it, which is why the states are consistent.
 */
export function AsyncBoundary<T>({
  state,
  skeleton,
  isEmpty,
  empty,
  children,
}: {
  state: { data: T | null; loading: boolean; error: ApiClientError | null; reload: () => void };
  skeleton: ReactNode;
  isEmpty?: (data: T) => boolean;
  empty?: ReactNode;
  children: (data: T) => ReactNode;
}) {
  if (state.loading && !state.data) return <>{skeleton}</>;
  if (state.error) return <ErrorState error={state.error} onRetry={state.reload} />;
  if (!state.data) return <>{skeleton}</>;
  if (isEmpty?.(state.data)) return <>{empty ?? <EmptyState title="Nothing here yet" body="No records matched." />}</>;
  return <>{children(state.data)}</>;
}
