/**
 * Captures the six README screenshots against a running dev server.
 *
 *   npm run dev                       # in one terminal (with a seeded instance)
 *   npx playwright install chromium   # one-off, ~110 MB
 *   node scripts/screenshots.mjs
 *
 * Playwright is deliberately NOT a dependency of this project — a reviewer
 * cloning the repo should not have to download a browser to run the app. This
 * script exists so the screenshots in docs/ can be regenerated exactly.
 */

import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const BASE = process.env.SCREENSHOT_BASE ?? 'http://localhost:5173';
const OUT = 'docs';

const settle = (page, ms = 900) => page.waitForTimeout(ms);

/**
 * Navigates to a hash route with a real page load.
 *
 * `page.goto()` between two URLs that differ only in their hash does not
 * reload the document, so `waitUntil: 'networkidle'` has no navigation to
 * wait on and hangs. Adding a cache-busting query string forces a genuine
 * navigation every time.
 */
let visit = 0;
async function go(page, hash) {
  visit += 1;
  await page.goto(`${BASE}/?shot=${visit}#/${hash}`, { waitUntil: 'domcontentloaded' });
}

async function main() {
  await mkdir(OUT, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    colorScheme: 'dark',
  });
  const page = await context.newPage();

  // Pick the first persona through the API and prime localStorage, so the
  // warm-intro screen has someone to compute paths from.
  await page.goto(BASE, { waitUntil: 'networkidle' });
  const personas = await page.evaluate(async () => {
    const response = await fetch('/api/personas');
    return (await response.json()).data;
  });
  const persona = personas[0];
  await page.evaluate((value) => localStorage.setItem('warmgraph.persona', JSON.stringify(value)), persona);
  // A full reload, not a hash change: navigating between #/ routes does not
  // remount the app, so the sidebar would keep the pre-write "nobody yet" state.
  await page.reload({ waitUntil: 'networkidle' });
  console.log(`Exploring as ${persona.name}`);

  /* 1 — Overview -------------------------------------------------------- */
  await go(page, '');
  await settle(page, 1400);
  await page.screenshot({ path: `${OUT}/01-overview.png` });
  console.log('01-overview.png');

  /* 2 — Warm intro ------------------------------------------------------ */
  await go(page, 'intro');
  await page.waitForSelector('select.select', { timeout: 15_000 });
  await settle(page, 1200);

  // Choose the firm this founder has the warmest route into, so the shot
  // shows a real ranked result rather than an arbitrary one.
  const target = await page.evaluate(async (id) => {
    const list = await (await fetch('/api/investors?limit=40')).json();
    let best = null;
    for (const investor of list.data.slice(0, 14)) {
      const result = await (await fetch(`/api/intro?from=${id}&investor=${investor.id}&maxHops=4`)).json();
      if (!result.ok) continue;
      const score = result.data.bestScore ?? 0;
      if (!best || score > best.score) best = { id: investor.id, score };
    }
    return best;
  }, persona.id);

  await page.selectOption('select.select', target.id);
  await page.waitForSelector('.route', { timeout: 20_000 });
  await settle(page, 900);
  await page.locator('button', { hasText: 'Draft the ask' }).first().click();
  await settle(page, 600);
  await page.screenshot({ path: `${OUT}/02-warm-intro.png` });
  console.log('02-warm-intro.png');

  /* 5 — Cypher drawer (taken here, while a rich screen is loaded) ------- */
  await page.locator('button', { hasText: 'Cypher' }).first().click();
  await page.waitForSelector('.drawer', { timeout: 10_000 });
  await settle(page, 700);
  await page.screenshot({ path: `${OUT}/05-cypher-drawer.png` });
  await page.keyboard.press('Escape');
  console.log('05-cypher-drawer.png');

  /* 3 — Graph explorer -------------------------------------------------- */
  await go(page, `explore/${target.id}`);
  await page.waitForSelector('.canvas-wrap svg circle', { timeout: 20_000 });
  await page.locator('.segmented button', { hasText: '2 hops' }).first().click();
  await settle(page, 2200);
  await page.screenshot({ path: `${OUT}/03-explorer.png` });
  console.log('03-explorer.png');

  /* 4 — Conflicts ------------------------------------------------------- */
  await go(page, 'conflicts');
  await page.waitForSelector('.card', { timeout: 20_000 });
  await settle(page, 1000);
  await page.screenshot({ path: `${OUT}/04-conflicts.png` });
  console.log('04-conflicts.png');

  /* 6 — Data model ------------------------------------------------------ */
  await go(page, 'model');
  await page.waitForSelector('svg[aria-label="WarmGraph data model"]', { timeout: 15_000 });
  await settle(page, 900);
  await page.screenshot({ path: `${OUT}/06-data-model.png` });
  console.log('06-data-model.png');

  await browser.close();
  console.log(`\nDone — six PNGs in ${OUT}/`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
