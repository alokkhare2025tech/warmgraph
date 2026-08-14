import { createServer } from 'node:http';
import { handleApiRequest } from './routes.js';

/**
 * Local development API server.
 *
 * Vite proxies /api to this process (see vite.config.ts), so the browser makes
 * exactly the same relative requests locally as it does on Vercel. This file
 * is the only thing that is not deployed.
 */
const port = Number.parseInt(process.env.PORT ?? '3001', 10);

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${port}`);

  if (!url.pathname.startsWith('/api')) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: false, error: { code: 'NOT_FOUND', message: 'This server only serves /api.' } }));
    return;
  }

  const path = url.pathname.replace(/^\/api\/?/, '');
  const startedAt = Date.now();

  try {
    const { status, body } = await handleApiRequest({ path, query: url.searchParams });
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(body));
    console.log(`${status} ${url.pathname}${url.search} (${Date.now() - startedAt} ms)`);
  } catch (err) {
    // handleApiRequest is total, so reaching here means the adapter itself
    // broke. Report it rather than leaving the socket hanging.
    console.error('[dev] unhandled', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: false, error: { code: 'INTERNAL', message: 'Unhandled server error.' } }));
  }
});

server.listen(port, () => {
  console.log(`WarmGraph API listening on http://localhost:${port}/api`);
  console.log('Try:  http://localhost:%d/api/health', port);
});
