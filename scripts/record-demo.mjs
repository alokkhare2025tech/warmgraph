/**
 * Records a silent screen-walkthrough video of the live WarmGraph demo,
 * following the sequence suggested in docs/README.md § Screen recording.
 *
 *   npx playwright install chromium   # one-off, if not already installed
 *   node scripts/record-demo.mjs
 *
 * Playwright is deliberately NOT a dependency of this project (see
 * scripts/screenshots.mjs) — this script exists purely to produce the
 * mandatory recording for submission, not as part of the app.
 */

import { chromium } from 'playwright';
import { mkdir, rename } from 'node:fs/promises';

const BASE = process.env.RECORD_BASE ?? 'https://warmgraph.vercel.app';
const OUT = 'recordings';
const SIZE = { width: 1440, height: 900 };

const pause = (page, ms) => page.waitForTimeout(ms);

async function main() {
  await mkdir(OUT, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: SIZE,
    recordVideo: { dir: OUT, size: SIZE },
    colorScheme: 'dark',
  });
  const page = await context.newPage();

  /* 1 — Overview --------------------------------------------------------- */
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await pause(page, 1500);
  await page.evaluate(() => window.scrollTo({ top: 260, behavior: 'smooth' }));
  await pause(page, 1200);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  await pause(page, 800);

  // Pick the first founder persona from the picker grid, same card a real
  // visitor would click — this also navigates to #/intro. The persona cards
  // are <button> elements; the "Super-connectors" cards higher on the page
  // share the same .card.card--link class but are <a> elements, so scope to
  // the button variant specifically.
  const firstCard = page.locator('button.card.card--link').first();
  await firstCard.waitFor({ timeout: 15_000 });
  await firstCard.hover();
  await pause(page, 500);
  await firstCard.click();
  await pause(page, 1200);

  /* 2 — Warm intro --------------------------------------------------------*/
  await page.waitForSelector('select.select', { timeout: 15_000 });
  await pause(page, 800);

  const personaId = await page.evaluate(() => {
    const raw = localStorage.getItem('warmgraph.persona');
    return raw ? JSON.parse(raw).id : null;
  });

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
  }, personaId);

  await page.selectOption('select.select', target.id);
  await page.waitForSelector('.route', { timeout: 20_000 });
  await pause(page, 2200);

  const draftButton = page.locator('button', { hasText: 'Draft the ask' }).first();
  await draftButton.hover();
  await draftButton.click();
  await pause(page, 2500);

  /* 3 — Cypher drawer ------------------------------------------------------*/
  const cypherButton = page.locator('button', { hasText: 'Cypher' }).first();
  await cypherButton.hover();
  await cypherButton.click();
  await page.waitForSelector('.drawer', { timeout: 10_000 });
  await pause(page, 3000);
  await page.keyboard.press('Escape');
  await pause(page, 500);

  /* 4 — Conflicts --------------------------------------------------------- */
  await page.goto(`${BASE}/#/conflicts`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.card', { timeout: 20_000 });
  await pause(page, 2500);

  /* 5 — Graph explorer ------------------------------------------------------*/
  await page.goto(`${BASE}/#/explore/${target.id}`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.canvas-wrap svg circle', { timeout: 20_000 });
  await pause(page, 1000);
  const twoHops = page.locator('.segmented button', { hasText: '2 hops' }).first();
  await twoHops.click();
  await pause(page, 1800);

  const someNode = page.locator('.canvas-wrap svg circle').nth(3);
  await someNode.hover();
  await pause(page, 400);
  await someNode.click();
  await pause(page, 2200);

  /* 6 — Data model, closing shot -------------------------------------------*/
  await page.goto(`${BASE}/#/model`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('svg[aria-label="WarmGraph data model"]', { timeout: 15_000 });
  await pause(page, 3500);

  const video = page.video();
  await context.close();
  await browser.close();

  if (video) {
    const finalPath = `${OUT}/warmgraph-demo.webm`;
    await rename(await video.path(), finalPath);
    console.log(`\nDone — recording saved to ${finalPath}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
