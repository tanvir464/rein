/**
 * F72 — Private spend Playwright spec.
 *
 * Real-data only: hits `wrangler dev` (devnet) + live Umbra devnet relayer.
 * Skipped until frontend lands (F72b–F72d). The frontend agent flips `.skip` once
 * the "Send privately" toggle is wired.
 *
 * Run:
 *   cd apps/web && pnpm playwright test private-spend
 */
import { test, expect } from '@playwright/test';

// Funded devnet keypair used across the hackathon stack.
// Owner: 2eXVwmqhWd8cC5tDydrtHL41z4qPv2jseXi53FXKSVUf
// Vault: 9eeCj662e4QZPbg848BH25ywShj7qvxybCk2cJWR5quc
// USDC mint (devnet test): 5KdxeDZXVupi7FN7ipox7SV2P4Hqjn4HVUUcGS7f4xB6
const FUNDED_VAULT = '9eeCj662e4QZPbg848BH25ywShj7qvxybCk2cJWR5quc';

test.describe('F72 — private spend', () => {
  // Vault detail requires the user to be the owner; rendering it relies on
  // wallet-adapter detection. Toggle markup is verified in unit/RTL tests instead.
  test.fixme('vault detail spend form exposes a "Send privately" toggle, off by default', async ({ page }) => {
    await page.goto(`/app/vaults/${FUNDED_VAULT}`);
    const toggle = page.getByTestId('send-privately-toggle');
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute('aria-checked', 'false');
  });

  test.fixme('toggling on shows a one-time Umbra registration prompt', async ({ page }) => {
    await page.goto(`/app/vaults/${FUNDED_VAULT}`);
    await page.getByTestId('send-privately-toggle').click();
    // Browser-side `register({ confidential: true, anonymous: true })` runs once;
    // surface shows a "registering with Umbra…" affordance with a wallet-signature prompt count.
    await expect(page.getByTestId('umbra-registration-status')).toContainText(/registering|already registered/i);
  });

  // Requires Phantom wallet-adapter automation (signMessage + signTransaction),
  // which is not reliable to drive headless on Windows. Run manually against a
  // signed-in dashboard.
  test.fixme('end-to-end: private spend → receipt in Private tab → owner decrypts memo', async ({ page }) => {
    // Step 1: spend
    await page.goto(`/app/vaults/${FUNDED_VAULT}`);
    await page.getByTestId('send-privately-toggle').click();
    await page.getByTestId('spend-recipient-input').fill('6k3qsRu2zNkd1oUxWwMsAbEMCbDHzqgafFhpCzmcS6cB');
    await page.getByTestId('spend-amount-input').fill('1');
    await page.getByTestId('spend-submit').click();

    // Real on-chain settle: allow up to 45s for Umbra + record_private_spend round-trip.
    await expect(page.getByTestId('spend-success-toast')).toBeVisible({ timeout: 45_000 });

    // Step 2: surface receipt in Private tab
    await page.goto('/app/activity');
    await page.getByRole('tab', { name: /private/i }).click();
    const firstRow = page.getByTestId('private-receipt-row').first();
    await expect(firstRow).toBeVisible();

    // Public-observer view (logged out): commitment hash only, no recipient pubkey
    await expect(firstRow).toContainText(/^[A-Fa-f0-9]{16}/); // commitment prefix
    await expect(firstRow).not.toContainText('6k3qsRu2zNkd1oUxWwMsAbEMCbDHzqgafFhpCzmcS6cB');

    // Step 3: owner decrypt
    await firstRow.click();
    await page.getByTestId('decrypt-with-view-key').click();
    await expect(page.getByTestId('decrypted-recipient')).toContainText(
      '6k3qsRu2zNkd1oUxWwMsAbEMCbDHzqgafFhpCzmcS6cB',
    );
    await expect(page.getByTestId('decrypted-amount-usd')).toBeVisible();

    // Step 4: Solscan link on the Umbra tx exists and points at the Umbra signature
    const solscan = page.getByTestId('umbra-solscan-link');
    await expect(solscan).toHaveAttribute('href', /explorer\.solana\.com|solscan\.io.*cluster=devnet/);
  });

  // Requires at least one confidential receipt to exist on-chain; the sidecar
  // hasn't run a `/v1/spend/private` end-to-end yet. Unskip after the first
  // real private spend lands.
  test.fixme('non-owner viewer sees commitment only, decrypt CTA is absent', async ({ browser }) => {
    const incognito = await browser.newContext();
    const page = await incognito.newPage();
    await page.goto('/app/activity?vault=' + FUNDED_VAULT);
    await page.getByRole('tab', { name: /private/i }).click();
    await page.getByTestId('private-receipt-row').first().click();
    await expect(page.getByTestId('decrypted-recipient')).not.toBeVisible();
    await expect(page.getByText(/viewing as public observer/i)).toBeVisible();
  });

  // The View key tab is owner-only (renders after sign-in). Without
  // wallet-adapter automation we can't reach the panel headless.
  test.fixme('settings exposes view-key copy + rotate affordances', async ({ page }) => {
    await page.goto('/app/settings');
    await page.getByRole('tab', { name: /view key/i }).click();
    await expect(page.getByTestId('view-key-copy')).toBeVisible();
    await expect(page.getByTestId('view-key-rotate')).toBeVisible();
  });
});
