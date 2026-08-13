import type { ApiFailure, ApiResponse, QueryTrace } from '../../shared/types';

export interface ApiPayload<T> {
  data: T;
  traces: QueryTrace[];
}

export class ApiClientError extends Error {
  readonly code: string;
  readonly hint?: string;

  constructor(failure: ApiFailure['error']) {
    super(failure.message);
    this.name = 'ApiClientError';
    this.code = failure.code;
    this.hint = failure.hint;
  }
}

/**
 * Thin fetch wrapper.
 *
 * A network failure and a structured API failure are normalised into the same
 * ApiClientError, so every screen has exactly one error shape to render.
 */
export async function apiGet<T>(
  path: string,
  params: Record<string, string | number | undefined> = {},
  signal?: AbortSignal,
): Promise<ApiPayload<T>> {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value));
  }

  const url = `/api/${path}${search.toString() ? `?${search}` : ''}`;

  let response: Response;
  try {
    response = await fetch(url, { signal, headers: { Accept: 'application/json' } });
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err;
    throw new ApiClientError({
      code: 'DB_UNREACHABLE',
      message: 'Could not reach the WarmGraph API.',
      hint: 'Check your network connection and try again.',
    });
  }

  let body: ApiResponse<T>;
  try {
    body = (await response.json()) as ApiResponse<T>;
  } catch {
    throw new ApiClientError({
      code: 'INTERNAL',
      message: `The API returned an unreadable response (HTTP ${response.status}).`,
    });
  }

  if (!body.ok) throw new ApiClientError(body.error);

  return { data: body.data, traces: body.traces };
}
