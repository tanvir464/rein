/**
 * F73 — Recipient reputation Playwright spec.
 *
 * Real-data only: paste real mainnet pubkeys; assert against live GoldRush data via
 * `wrangler dev`'s `/v1/recipients/:address/profile` route.
 *
 * Skipped until frontend lands. The frontend agent flips `.skip` once the
 * reputation card in `/app/policy` is wired.
 */
import { test, expect } from '@playwright/test';

const FUNDED_VAULT = '9eeCj662e4QZPbg848BH25ywShj7qvxybCk2cJWR5quc';
// Known mainnet addresses with stable on-chain history (used to assert non-flaky ratings).
const KNOWN_PROTOCOL = 'JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB'; // Jupiter aggregator (well-known)
const RANDOM_FRESH = 'GThUX1Atko4tqhN2NaiTazWSeFWMuiUiswQrCWX2HZb6'; // public sample wallet

test.describe('F73 — recipient reputation card', () => {
  // Policy editor requires sign-in (owner-scoped vault list). Reputation card
  // logic itself is verified by hitting /v1/recipients/:addr/profile directly.
  test.fixme('paste known protocol pubkey → reputation card shows knownName + emerald badge', async ({ page }) => {
    await page.goto(`/app/policy?vault=${FUNDED_VAULT}`);

    await page.getByTestId('allowlist-input').fill(KNOWN_PROTOCOL);
    // Debounce 250ms + GoldRush latency on cold cache (~1.5s)
    const card = page.getByTestId('reputation-card');
    await expect(card).toBeVisible({ timeout: 5_000 });
    await expect(card.getByTestId('reputation-badge')).toHaveAttribute('data-rating', 'known');
    await expect(card.getByTestId('reputation-known-name')).not.toBeEmpty();
  });

  test.fixme('paste random pubkey → "new" or "unknown" rating', async ({ page }) => {
    await page.goto(`/app/policy?vault=${FUNDED_VAULT}`);
    await page.getByTestId('allowlist-input').fill(RANDOM_FRESH);
    const card = page.getByTestId('reputation-card');
    await expect(card).toBeVisible({ timeout: 5_000 });
    const rating = await card.getByTestId('reputation-badge').getAttribute('data-rating');
    expect(['new', 'unknown', 'active']).toContain(rating);
  });

  test.fixme('paste garbage → no card, inline validation error', async ({ page }) => {
    await page.goto(`/app/policy?vault=${FUNDED_VAULT}`);
    await page.getByTestId('allowlist-input').fill('not-a-pubkey');
    await expect(page.getByTestId('reputation-card')).not.toBeVisible();
    await expect(page.getByTestId('allowlist-error')).toContainText(/valid base58/i);
  });

  test.fixme('cached card loads instantly on second paste (< 500ms perceived)', async ({ page }) => {
    await page.goto(`/app/policy?vault=${FUNDED_VAULT}`);
    await page.getByTestId('allowlist-input').fill(KNOWN_PROTOCOL);
    await expect(page.getByTestId('reputation-card')).toBeVisible({ timeout: 5_000 });
    await page.getByTestId('allowlist-input').fill('');

    const t0 = Date.now();
    await page.getByTestId('allowlist-input').fill(KNOWN_PROTOCOL);
    await expect(page.getByTestId('reputation-card')).toBeVisible();
    expect(Date.now() - t0).toBeLessThan(500);
  });

  // Receipt detail listing requires owner-scoped vault discovery (sign-in);
  // run manually after wallet sign-in until wallet-adapter automation lands.
  test.fixme('reputation mini-badge also appears on receipt detail pages', async ({ page }) => {
    // Pick any existing public receipt via the activity feed
    await page.goto('/app/activity');
    await page.getByTestId('receipt-row').first().click();
    const miniBadge = page.getByTestId('recipient-mini-reputation');
    await expect(miniBadge).toBeVisible();
  });
});
