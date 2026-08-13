import type { ApiErrorCode } from '../shared/types.ts';

/**
 * A failure the API knows how to describe. Anything thrown that is *not* an
 * ApiError is treated as a bug and reported as INTERNAL without leaking a
 * stack trace to the browser.
 */
export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly hint?: string;

  constructor(code: ApiErrorCode, message: string, hint?: string) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.hint = hint;
  }

  get status(): number {
    switch (this.code) {
      case 'BAD_REQUEST':
        return 400;
      case 'NOT_FOUND':
        return 404;
      case 'TIMEOUT':
        return 504;
      case 'NOT_CONFIGURED':
      case 'DB_UNREACHABLE':
      case 'DB_AUTH_FAILED':
        return 503;
      default:
        return 500;
    }
  }
}

export function badRequest(message: string, hint?: string): ApiError {
  return new ApiError('BAD_REQUEST', message, hint);
}

export function notFound(message: string, hint?: string): ApiError {
  return new ApiError('NOT_FOUND', message, hint);
}
