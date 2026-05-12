import { test, expect } from '@playwright/test';

test('landing renders REIN wordmark with no console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    // Ignore Next dev HMR socket noise — irrelevant to landing render.
    if (text.includes('webpack-hmr') || text.includes('_next/webpack-hmr')) return;
    errors.push(text);
  });

  await page.goto('/');
  // Landing wordmark moved into a styled SVG without the original testid; check
  // for the brand string in the nav instead, which is stable across rebuilds.
  await expect(page.locator('nav, header').filter({ hasText: /REIN/ }).first()).toBeVisible();
  expect(errors, `console errors: ${errors.join(' | ')}`).toEqual([]);
});
