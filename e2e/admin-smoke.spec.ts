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
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 10_000 });
  const dashboardScan = await new AxeBuilder({ page }).analyze();
  expect(dashboardScan.violations.filter((item) => item.impact === 'serious' || item.impact === 'critical'), 'a11y issues on Dashboard').toEqual([]);
  await expect(page.getByText('Aggregate counts only · no student identities shown.')).toBeVisible();
  await page.getByRole('link', { name: /Approvals/ }).first().click();
  await expect(page.getByRole('heading', { name: 'Approvals' })).toBeVisible();
  await expect(page.locator('.topbar .brand-logo-image')).toBeVisible();
  await expect(page.locator('.rail .brand-logo-image')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Back to applications' })).toHaveCount(0);
  const approvalScan = await new AxeBuilder({ page }).analyze();
  expect(approvalScan.violations.filter((item) => item.impact === 'serious' || item.impact === 'critical'), 'a11y issues on Approvals').toEqual([]);
  const widths = [360, 375, 390, 768, 1024, 1440];
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    const documentWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(documentWidth, `horizontal overflow at ${width}px`).toBeLessThanOrEqual(width);
    if (width < 1024) expect(await page.locator('.rail').evaluate((element) => getComputedStyle(element).display)).toBe('none');
    if (width < 768) expect(await page.locator('.bottom-tabs .bottom-tab').count(), 'mobile should show one compact navigation row').toBe(5);
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
      const railGradient = await page.locator('.rail').evaluate((element) => getComputedStyle(element).backgroundImage);
      expect(railGradient).toContain('231, 239, 228');
      expect(await page.locator('.rail .brand-logo-image').evaluate((image) => getComputedStyle(image).filter)).toBe('none');
    }
  }
  const routes = [
    { link: 'Dashboard', heading: 'Dashboard' }, { link: 'Approvals', heading: 'Approvals' }, { link: 'Reviews', heading: 'Reviews' }, { link: 'Tickets', heading: 'Tickets' }, { link: 'Agent runs', heading: 'Agent runs' },
    { link: 'Settings', heading: 'Settings' }, { link: 'Library', heading: 'Library' }, { link: 'Audit log', heading: 'Audit log' },
    { link: 'Staff directory', heading: 'Staff directory' }, { link: 'Reports', heading: 'Reports' }, { link: 'Notifications', heading: 'Notifications' },
    { link: 'Account & security', heading: 'Account & security' }, { link: 'Help', heading: 'Help' },
  ];
  for (const route of routes) {
    await page.getByRole('link', { name: new RegExp(route.link) }).first().click();
    await expect(page.getByRole('heading', { name: route.heading, exact: true })).toBeVisible();
    if (route.heading === 'Reviews' || route.heading === 'Tickets') {
      await expect(page.getByRole('button', { name: /Back to review queue|Back to tickets/ })).toHaveCount(0);
    }
    if (route.heading === 'Tickets') {
      const ticketRing = page.locator('.detail-section .review-scoreline .proof-ring');
      await expect(ticketRing).toBeVisible();
      expect(await ticketRing.evaluate((element) => getComputedStyle(element).position)).toBe('relative');
      const ringGap = await page.evaluate(() => {
        const ring = document.querySelector('.detail-section .review-scoreline .proof-ring')!.getBoundingClientRect();
        const heading = document.querySelector('.split-detail h2')!.getBoundingClientRect();
        return ring.top - heading.bottom;
      });
      expect(ringGap, 'ticket score ring stays below the appeal title').toBeGreaterThan(0);
    }
    if (route.heading === 'Agent runs') {
      await page.getByRole('table', { name: 'Agent runs' }).getByRole('row').nth(1).click();
      const runDialog = page.getByRole('dialog');
      await expect(runDialog.getByRole('button', { name: 'Back to runs' })).toBeVisible();
      await runDialog.getByRole('button', { name: 'Back to runs' }).click();
      await expect(runDialog).not.toBeVisible();
    }
    if (route.heading === 'Library') {
      await page.getByRole('tab', { name: 'Resume format' }).click();
      await expect(page.getByRole('heading', { name: 'A resume that’s easy to scan.' })).toBeVisible();
      const resumeDownload = page.waitForEvent('download');
      await page.getByRole('link', { name: /Download sample resume/ }).click();
      expect((await resumeDownload).suggestedFilename()).toBe('AptoHire-Sample-Resume.docx');
    }
    if (route.heading === 'Reviews') {
      const scoreCaption = page.locator('.review-score-caption');
      const scoreRing = page.locator('.review-scoreline .proof-ring');
      await expect(scoreCaption).toBeVisible();
      await expect(scoreRing).toBeVisible();
      const captionOutsideRing = await scoreCaption.evaluate((element) => !element.closest('.proof-ring'));
      expect(captionOutsideRing, 'AI score tag remains outside the ring').toBe(true);
      const captionClearance = await page.evaluate(() => {
        const caption = document.querySelector('.review-score-caption')!.getBoundingClientRect();
        const ring = document.querySelector('.review-scoreline .proof-ring')!.getBoundingClientRect();
        return ring.top - caption.bottom;
      });
      expect(captionClearance, 'AI score tag does not overlap the ring').toBeGreaterThanOrEqual(0);
      for (const width of [390, 360]) {
        await page.setViewportSize({ width, height: 900 });
        const narrowClearance = await page.evaluate(() => {
          const caption = document.querySelector('.review-score-caption')!.getBoundingClientRect();
          const ring = document.querySelector('.review-scoreline .proof-ring')!.getBoundingClientRect();
          return ring.top - caption.bottom;
        });
        expect(narrowClearance, `AI score tag stays clear at ${width}px`).toBeGreaterThanOrEqual(0);
        expect(await page.evaluate(() => document.documentElement.scrollWidth), `no horizontal overflow at ${width}px`).toBeLessThanOrEqual(width);
      }
      await page.setViewportSize({ width: 1440, height: 900 });
      const filter = page.getByRole('combobox', { name: 'Filter reviews' });
      await filter.focus(); await page.keyboard.press('Enter');
      await expect(page.getByRole('option', { name: 'Overdue only' })).toBeVisible();
      await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter');
      await expect(filter).toContainText('Overdue only');
      await filter.focus(); await page.keyboard.press('Escape');
    }
    if (route.heading === 'Account & security' || route.heading === 'Users') {
      await expect(page.getByRole('link', { name: 'Back to dashboard' })).toHaveCount(0);
      await page.getByRole('link', { name: 'Dashboard', exact: true }).first().click();
      await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
      await page.getByRole('link', { name: new RegExp(route.link) }).first().click();
      await expect(page.getByRole('heading', { name: route.heading, exact: true })).toBeVisible();
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
  const drawerGradient = await page.locator('.mobile-drawer').evaluate((element) => getComputedStyle(element).backgroundImage);
  expect(drawerGradient).toContain('231, 239, 228');
  expect(await page.locator('.mobile-drawer .brand-logo-image').evaluate((image) => getComputedStyle(image).filter)).toBe('none');
  await expect(page.locator('.bottom-tabs')).toBeHidden();
  await page.keyboard.press('Shift+Tab');
  await expect(navigationDialog.getByRole('link', { name: 'Help' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(navigationDialog.getByRole('button', { name: 'Close navigation menu' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(navigationDialog).not.toBeVisible();
  await expect(menuButton).toBeFocused();
});
