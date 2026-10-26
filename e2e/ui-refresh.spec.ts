import { expect, test } from '@playwright/test';

async function enrollSampleAdmin(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/login');
  for (const width of [360, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    await expectNoOverflow(page, width);
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  const signInLayout = await page.evaluate(() => {
    const main = document.querySelector('.login-main')!.getBoundingClientRect();
    const card = document.querySelector('.login-form')!.getBoundingClientRect();
    return { asidePadding: getComputedStyle(document.querySelector('.login-aside')!).paddingLeft, mainAlignment: getComputedStyle(document.querySelector('.login-main')!).justifyItems, cardCenter: card.left + card.width / 2, mainCenter: main.left + main.width / 2 };
  });
  expect(parseFloat(signInLayout.asidePadding)).toBeGreaterThan(36);
  expect(signInLayout.mainAlignment).toBe('center');
  expect(Math.abs(signInLayout.cardCenter - signInLayout.mainCenter)).toBeLessThan(1);
  const password = page.getByRole('textbox', { name: 'Password' });
  await password.fill('temporary-display-check');
  await expect(password).toHaveAttribute('type', 'password');
  await page.getByRole('button', { name: 'Show password' }).click();
  await expect(password).toHaveAttribute('type', 'text');
  await page.getByRole('button', { name: 'Hide password' }).click();
  await expect(password).toHaveAttribute('type', 'password');
  await password.fill('');
  await page.getByRole('button', { name: 'Continue with demo account' }).click();
  await page.getByLabel('Six-digit code').waitFor();
  await page.getByLabel('Six-digit code').fill('123456');
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 10_000 });
}

async function expectNoOverflow(page: import('@playwright/test').Page, width: number): Promise<void> {
  expect(await page.evaluate(() => document.documentElement.scrollWidth), `horizontal overflow at ${width}px`).toBeLessThanOrEqual(width);
}

test('dashboard, staff directory, account and mobile navigation stay interactive and responsive', async ({ page }) => {
  await enrollSampleAdmin(page);
  for (const width of [360, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expectNoOverflow(page, width);
  }
  const rail = await page.locator('.rail nav').evaluate((node) => ({ scrollHeight: node.scrollHeight, clientHeight: node.clientHeight, overflowY: getComputedStyle(node).overflowY }));
  expect(rail.scrollHeight).toBeLessThanOrEqual(rail.clientHeight);
  expect(rail.overflowY).toBe('visible');
  await expect(page.getByRole('link', { name: 'Help & guidance' })).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 720 });
  const shortRail = await page.locator('.rail nav').evaluate((node) => ({ scrollHeight: node.scrollHeight, clientHeight: node.clientHeight, overflowY: getComputedStyle(node).overflowY, scrollbarWidth: getComputedStyle(node).scrollbarWidth }));
  expect(shortRail.scrollHeight).toBeGreaterThan(shortRail.clientHeight);
  expect(shortRail.overflowY).toBe('auto');
  expect(shortRail.scrollbarWidth).toBe('none');
  await page.getByRole('link', { name: 'Help & guidance' }).scrollIntoViewIfNeeded();
  await expect(page.getByRole('link', { name: 'Help & guidance' })).toBeInViewport();
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(page.getByRole('button', { name: 'Collapse sidebar' })).toBeVisible();
  expect(await page.locator('.rail .nav-link').first().evaluate((node) => getComputedStyle(node).fontSize)).toBe('15px');
  await page.getByRole('button', { name: 'Collapse sidebar' }).click();
  await expect(page.getByRole('button', { name: 'Expand sidebar' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.rail')).toHaveCSS('width', '88px');
  await expect(page.locator('.main-area')).toHaveCSS('margin-left', '88px');
  await page.getByRole('button', { name: 'Expand sidebar' }).click();
  await expect(page.getByRole('button', { name: 'Collapse sidebar' })).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('.rail')).toHaveCSS('width', '256px');

  await page.getByRole('link', { name: /Staff directory/ }).first().click();
  await expect(page.getByRole('heading', { name: 'Staff directory' })).toBeVisible();
  await expect(page.locator('.staff-card')).toHaveCount(5);
  const search = page.getByRole('textbox', { name: 'Search staff or role' });
  await search.fill('Reviewer');
  await expect(page.locator('.staff-card')).toHaveCount(2);
  await search.fill('');
  const roleFilter = page.getByRole('combobox', { name: 'Filter staff by role' });
  await roleFilter.click();
  await page.getByRole('option', { name: 'University' }).click();
  await expect(page.locator('.staff-card')).toHaveCount(1);
  await page.getByRole('button', { name: /View University staff/ }).click();
  const profile = page.getByRole('dialog', { name: 'Staff access profile' });
  await expect(profile).toContainText('Sample account');
  await expect(profile).toContainText('read-only');
  await expect(profile.getByRole('button', { name: /Edit|Invite|Impersonate/ })).toHaveCount(0);
  await profile.getByRole('button', { name: 'Close profile' }).click();
  await page.getByRole('combobox', { name: 'Filter staff by role' }).click();
  await page.getByRole('option', { name: 'All roles' }).click();
  await expect(page.locator('.staff-card')).toHaveCount(5);

  for (const width of [390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expectNoOverflow(page, width);
  }
  await page.getByRole('link', { name: /Reviews/ }).first().click();
  await expect(page.getByRole('heading', { name: 'Reviews' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Back to review queue' })).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await expectNoOverflow(page, 390);
  await expect(page.getByRole('link', { name: 'Back to dashboard' })).toHaveCount(0);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByRole('link', { name: /Account & security/ }).first().click();
  await expect(page.getByRole('heading', { name: 'Account & security' })).toBeVisible();
  await expect(page.getByText('Admin · MFA verified')).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expectNoOverflow(page, 390);
  await expect(page.locator('.rail')).toBeHidden();
  await expect(page.locator('.bottom-tabs .bottom-tab')).toHaveCount(5);
  const more = page.getByRole('button', { name: 'More navigation options' });
  await more.click();
  const drawer = page.getByRole('dialog', { name: 'Navigation menu' });
  await expect(drawer).toBeVisible();
  await expect(page.locator('.bottom-tabs')).toBeHidden();
  await expect(drawer.getByRole('link', { name: 'Dashboard' })).toHaveCount(1);
  await page.keyboard.press('Escape');
  await expect(drawer).toBeHidden();
  await expect(more).toBeFocused();
});
