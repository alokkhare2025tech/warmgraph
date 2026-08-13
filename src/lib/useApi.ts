import { useCallback, useEffect, useRef, useState } from 'react';
import { apiGet, ApiClientError } from './api';
import type { QueryTrace } from '../../shared/types';

export interface AsyncState<T> {
  data: T | null;
  traces: QueryTrace[];
  loading: boolean;
  error: ApiClientError | null;
  reload: () => void;
}

/**
 * Loads an endpoint and exposes the four states every screen needs: loading,
 * error, empty and loaded.
 *
 * `enabled: false` is how screens express "we do not have enough input yet" —
 * the warm-intro page uses it so it does not fire a request until both a
 * persona and a target firm are chosen.
 */
export function useApi<T>(
  path: string,
  params: Record<string, string | number | undefined> = {},
  options: { enabled?: boolean } = {},
): AsyncState<T> {
  const enabled = options.enabled ?? true;
  const [data, setData] = useState<T | null>(null);
  const [traces, setTraces] = useState<QueryTrace[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<ApiClientError | null>(null);
  const [nonce, setNonce] = useState(0);

  // Serialising the params keeps the effect from re-firing on every render
  // just because the caller passed a fresh object literal.
  const key = JSON.stringify(params);
  const latest = useRef(0);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const requestId = ++latest.current;

    setLoading(true);
    setError(null);

    apiGet<T>(path, JSON.parse(key), controller.signal)
      .then((payload) => {
        // Ignore a slow response that has been overtaken by a newer one.
        if (requestId !== latest.current) return;
        setData(payload.data);
        setTraces(payload.traces);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if ((err as Error).name === 'AbortError' || requestId !== latest.current) return;
        setError(err instanceof ApiClientError ? err : new ApiClientError({ code: 'INTERNAL', message: String(err) }));
        setData(null);
        setLoading(false);
      });

    return () => controller.abort();
  }, [path, key, enabled, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  return { data, traces, loading, error, reload };
}

/** Debounces a fast-changing value — used by the type-ahead search. */
export function useDebounced<T>(value: T, delayMs = 220): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}
