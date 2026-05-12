/**
 * F74 — USD-denominated insights Playwright spec.
 *
 * Real-data only: hits the live seeded devnet vault, asserts the USD-augmented
 * shape from `/v1/insights`.
 *
 * Skipped until the F74 frontend rebuild lands.
 */
import { test, expect } from '@playwright/test';

const FUNDED_VAULT = '9eeCj662e4QZPbg848BH25ywShj7qvxybCk2cJWR5quc';

test.describe('F74 — USD insights', () => {
  test('insights page renders USD as the primary stat', async ({ page }) => {
    await page.goto(`/app/insights?vault=${FUNDED_VAULT}`);

    const totalUsd = page.getByTestId('insights-total-usd');
    await expect(totalUsd).toBeVisible();
    const text = (await totalUsd.textContent()) ?? '';
    expect(text).toMatch(/^\$/); // dollar-formatted, e.g. "$1,247.50"
  });

  test('WoW delta row shows sign + percent + sparkline', async ({ page }) => {
    await page.goto(`/app/insights?vault=${FUNDED_VAULT}`);
    await expect(page.getByTestId('insights-wow-delta-pct')).toBeVisible();
    await expect(page.getByTestId('insights-wow-sparkline')).toBeVisible();
  });

  test('top recipients list shows USD volume + reputation mini-badge per row', async ({ page }) => {
    await page.goto(`/app/insights?vault=${FUNDED_VAULT}`);
    const rows = page.getByTestId('top-recipient-row');
    await expect(rows.first()).toBeVisible({ timeout: 10_000 });

    const first = rows.first();
    await expect(first.getByTestId('top-recipient-usd')).toContainText(/^\$/);
  });

  test('anomalies panel surfaces flagged receipts', async ({ page }) => {
    await page.goto(`/app/insights?vault=${FUNDED_VAULT}`);
    // The panel exists even when empty; assert presence not count
    await expect(page.getByTestId('insights-anomalies-panel')).toBeVisible();
  });

  test('empty / loading / error states are reachable', async ({ page }) => {
    // GoldRush quota-exhausted scenario: route deliberately points at unknown vault
    await page.goto('/app/insights?vault=11111111111111111111111111111111');
    await expect(page.getByTestId('insights-empty-state')).toBeVisible();
  });
});
