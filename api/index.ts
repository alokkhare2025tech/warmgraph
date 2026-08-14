import type { IncomingMessage, ServerResponse } from 'node:http';
import { handleApiRequest } from '../server/routes.js';

/**
 * Vercel serverless entry point.
 *
 * `vercel.json` rewrites every /api/* request here, so this file is the single
 * production adapter. All the logic lives in server/, which the local dev
 * server (server/dev.ts) mounts the same way — one implementation, two hosts.
 */
export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  const path = url.pathname.replace(/^\/api\/?/, '');

  const { status, body } = await handleApiRequest({ path, query: url.searchParams });

  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  // Read-only data over a small dataset: a short shared cache keeps the free
  // c0 instance from being hammered by every page view, while staying fresh
  // enough that a re-seed shows up almost immediately.
  res.setHeader('Cache-Control', status === 200 ? 'public, max-age=0, s-maxage=30, stale-while-revalidate=120' : 'no-store');
  res.end(JSON.stringify(body));
}
