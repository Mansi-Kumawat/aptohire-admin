import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('mock admin enrols MFA, reaches queues, and stays within narrow screens', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('img', { name: 'AptoHire' })).toBeVisible();
  const favicon = await page.request.get('/favicon.png');
  expect(favicon.ok()).toBe(true);
  expect(favicon.headers()['content-type']).toContain('image/png');
  const loginScan = await new AxeBuilder({ page }).analyze();
  expect(loginScan.violations.filter((item) => item.impact === 'serious' || item.impact === 'critical'), 'a11y issues on login').toEqual([]);
  await page.getByRole('button', { name: 'Continue with demo account' }).click();
  await expect(page.getByRole('heading', { name: 'Set up two-step verification' })).toBeVisible();
  const mfaScan = await new AxeBuilder({ page }).analyze();
  expect(mfaScan.violations.filter((item) => item.impact === 'serious' || item.impact === 'critical'), 'a11y issues on MFA setup').toEqual([]);
  await page.getByLabel('Six-digit code').fill('123456');
  await expect(page.getByRole('heading', { name: 'Approvals' })).toBeVisible({ timeout: 10_000 });
  await expect(page.locator('.topbar .brand-logo-image')).toBeVisible();
  await expect(page.locator('.rail .brand-logo-image')).toBeVisible();
  const approvalsBack = page.getByRole('button', { name: 'Back to applications' });
  await expect(approvalsBack).toBeVisible();
  await approvalsBack.click();
  await expect(page.locator('#approval-queue')).toBeFocused();
  const approvalScan = await new AxeBuilder({ page }).analyze();
  expect(approvalScan.violations.filter((item) => item.impact === 'serious' || item.impact === 'critical'), 'a11y issues on Approvals').toEqual([]);
  const widths = [360, 375, 390, 768, 1024, 1440];
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    const documentWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(documentWidth, `horizontal overflow at ${width}px`).toBeLessThanOrEqual(width);
    if (width < 1024) expect(await page.locator('.rail').evaluate((element) => getComputedStyle(element).display)).toBe('none');
    if (width === 768) {
      const menuTrigger = page.getByRole('button', { name: 'Open navigation menu' });
      await expect(menuTrigger).toBeVisible();
      await menuTrigger.click();
      const tabletDrawer = page.getByRole('dialog', { name: 'Navigation menu' });
      await expect(tabletDrawer).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(tabletDrawer).not.toBeVisible();
      await expect(menuTrigger).toBeFocused();
    }
    if (width === 1024) {
      await expect.poll(async () => page.locator('.rail .brand-logo-image').evaluate((img) => (img as HTMLImageElement).currentSrc)).toContain('/aptohire-mark.png');
    }
    if (width === 1440) {
      const rail = await page.locator('.rail').boundingBox();
      expect(rail?.y).toBe(56);
      expect(rail?.width).toBe(256);
    }
  }
  const routes = [
    { link: 'Reviews', heading: 'Reviews' }, { link: 'Tickets', heading: 'Tickets' }, { link: 'Agent runs', heading: 'Agent runs' },
    { link: 'Settings', heading: 'Settings' }, { link: 'Library', heading: 'Library' }, { link: 'Audit log', heading: 'Audit log' },
    { link: 'Users', heading: 'Users' }, { link: 'Reports', heading: 'Reports' }, { link: 'Notifications', heading: 'Notifications' },
    { link: 'Account & security', heading: 'Account & security' }, { link: 'Help', heading: 'Help' },
  ];
  for (const route of routes) {
    await page.getByRole('link', { name: new RegExp(route.link) }).first().click();
    await expect(page.getByRole('heading', { name: route.heading, exact: true })).toBeVisible();
    if (route.heading === 'Reviews' || route.heading === 'Tickets') {
      const backLabel = route.heading === 'Reviews' ? 'Back to review queue' : 'Back to tickets';
      const queueId = route.heading === 'Reviews' ? '#review-queue' : '#ticket-queue';
      const back = page.getByRole('button', { name: backLabel });
      await expect(back).toBeVisible();
      await back.click();
      await expect(page.locator(queueId)).toBeFocused();
    }
    if (route.heading === 'Agent runs') {
      await page.getByRole('table', { name: 'Agent runs' }).getByRole('row').nth(1).click();
      const runDialog = page.getByRole('dialog');
      await expect(runDialog.getByRole('button', { name: 'Back to runs' })).toBeVisible();
      await runDialog.getByRole('button', { name: 'Back to runs' }).click();
      await expect(runDialog).not.toBeVisible();
    }
    const scan = await new AxeBuilder({ page }).analyze();
    expect(scan.violations.filter((item) => item.impact === 'serious' || item.impact === 'critical'), `a11y issues on ${route.heading}`).toEqual([]);
  }
  const text = (await page.locator('body').innerText()).toLowerCase();
  expect(text).not.toContain('student email');
  expect(text).not.toContain('student name');

  await page.setViewportSize({ width: 375, height: 900 });
  const menuButton = page.getByRole('button', { name: 'More navigation options' });
  await menuButton.click();
  const navigationDialog = page.getByRole('dialog', { name: 'Navigation menu' });
  await expect(navigationDialog).toBeVisible();
  await page.keyboard.press('Shift+Tab');
  await expect(navigationDialog.getByRole('link', { name: 'Help' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(navigationDialog.getByRole('button', { name: 'Close navigation menu' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(navigationDialog).not.toBeVisible();
  await expect(menuButton).toBeFocused();
});
