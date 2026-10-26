import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('a non-admin account is refused before an MFA prompt', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('tpo@unia.edu.test');
  await page.getByRole('textbox', { name: 'Password' }).fill('fictional-password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { name: "This account can't use the admin site." })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Set up two-step verification' })).toHaveCount(0);
  const scan = await new AxeBuilder({ page }).analyze();
  expect(scan.violations.filter((item) => item.impact === 'serious' || item.impact === 'critical')).toEqual([]);
});
