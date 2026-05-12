/**
 * Captures the side-track demo screenshots used by the landing page + deck.
 *
 * Run:
 *   pnpm --filter @rein/web dev          # in another terminal
 *   pnpm --filter @rein/web exec tsx scripts/capture-screenshots.ts
 *
 * Surfaces requiring an owner-signed wallet (private spend toggle on the
 * vault detail page, decrypted private receipt, view-key panel) are NOT
 * captured here — they need manual sign-in via Phantom. Run the dashboard
 * and capture those by hand at 1200×800.
 */
import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = process.env.BASE_URL ?? 'http://localhost:3000';
const FUNDED_VAULT = '9eeCj662e4QZPbg848BH25ywShj7qvxybCk2cJWR5quc';
const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, '../public/screenshots/sidetracks');

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 800 } });
  const page = await ctx.newPage();

  // landing-insights-usd.png — full insights page against the seeded vault
  await page.goto(`${BASE}/app/insights?vault=${FUNDED_VAULT}`, { waitUntil: 'networkidle' });
  await page.waitForSelector('[data-testid="insights-total-usd"]', { timeout: 10_000 });
  await page.screenshot({ path: `${OUT_DIR}/landing-insights-usd.png`, fullPage: false });

  // landing-insights-anomalies.png — same page, but cropped to anomalies panel
  const panel = page.getByTestId('insights-anomalies-panel');
  if (await panel.isVisible()) {
    await panel.scrollIntoViewIfNeeded();
    await panel.screenshot({ path: `${OUT_DIR}/landing-insights-anomalies.png` });
  }

  // landing-private-receipt-public-observer.png — public observer view
  await page.goto(`${BASE}/app/activity?vault=${FUNDED_VAULT}`, { waitUntil: 'networkidle' });
  // Click Private tab (best-effort; if no private receipts yet the empty
  // state still demonstrates the surface).
  const privateTab = page.getByRole('tab', { name: /private/i });
  if (await privateTab.isVisible({ timeout: 1000 }).catch(() => false)) {
    await privateTab.click();
    await page.waitForTimeout(800);
  }
  await page.screenshot({ path: `${OUT_DIR}/landing-private-tab-observer.png`, fullPage: false });

  // landing-reputation-card-* — these need policy editor (signed in) so we
  // can't capture them here. The reputation card markup is identical to what
  // renders in the policy editor; capture manually after sign-in.

  await browser.close();
  // eslint-disable-next-line no-console
  console.log(`✓ Wrote screenshots to ${OUT_DIR}`);
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
