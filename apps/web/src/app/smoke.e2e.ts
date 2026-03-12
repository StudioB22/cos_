import { expect, test } from '@playwright/test';

test('landing and auth shell render', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /COS/i })).toBeVisible();
  await page.getByRole('link', { name: /Entrer dans COS_/i }).click();
  await expect(page.getByText('Connexion demo')).toBeVisible();
});
