import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function expectAccessible(page: import('@playwright/test').Page, state: string): Promise<void> {
  const result = await new AxeBuilder({ page }).analyze();
  expect(result.violations.filter((item) => item.impact === 'serious' || item.impact === 'critical'), `serious/critical accessibility issues in ${state}`).toEqual([]);
}

async function enterAdmin(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Continue with demo account' }).click();
  await page.getByLabel('Six-digit code').fill('123456');
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 10_000 });
  await page.getByRole('link', { name: /Approvals/ }).first().click();
  await expect(page.getByRole('heading', { name: 'Approvals' })).toBeVisible({ timeout: 10_000 });
}

test('mock admin workflows enforce reviewer separation and step-up for exports, settings, and reset', async ({ page }) => {
  await enterAdmin(page);
  await page.getByRole('button', { name: /Uni C/ }).click();
  await page.getByRole('button', { name: 'Approve', exact: true }).click();
  const approvalDialog = page.getByRole('dialog');
  await expect(approvalDialog).toContainText('6 rostered students');
  await expectAccessible(page, 'approval confirmation dialog');
  await approvalDialog.getByRole('button', { name: 'Approve' }).click();
  const approvalStepUp = page.getByRole('dialog');
  await expectAccessible(page, 'approval step-up dialog');
  await approvalStepUp.getByLabel('Authenticator code (step-up)').fill('123456');
  await approvalStepUp.getByRole('button', { name: 'Verify and continue' }).click();
  await expect(page.getByRole('status')).toContainText('University approved.');

  await page.getByRole('link', { name: /Reviews/ }).click();
  await expect(page.getByText("Reviews are blind to the student's identity to reduce bias.")).toBeVisible();
  await page.getByRole('button', { name: 'Confirm score' }).click();
  const reviewConfirmation = page.getByRole('dialog');
  await expectAccessible(page, 'review confirmation dialog');
  await reviewConfirmation.getByRole('button', { name: 'Confirm score' }).click();
  const reviewStepUp = page.getByRole('dialog');
  await expectAccessible(page, 'review step-up dialog');
  await reviewStepUp.getByLabel('Authenticator code (step-up)').fill('123456');
  await reviewStepUp.getByRole('button', { name: 'Verify and continue' }).click();
  await expect(page.getByRole('status')).toContainText('Review confirmed.');
  await page.getByRole('link', { name: /Reports/ }).click();
  await expect(page.getByText(/1 decision/)).toBeVisible();
  await expect(page.getByRole('table', { name: 'Recent review decisions' })).toContainText('52');
  await page.getByRole('button', { name: 'Export CSV' }).click();
  const reportConfirmation = page.getByRole('dialog');
  await expectAccessible(page, 'report export confirmation dialog');
  await reportConfirmation.getByRole('button', { name: 'Export CSV' }).click();
  const reportDownload = page.waitForEvent('download');
  const reportStepUp = page.getByRole('dialog');
  await expectAccessible(page, 'report export step-up dialog');
  await reportStepUp.getByLabel('Authenticator code (step-up)').fill('123456');
  await reportStepUp.getByRole('button', { name: 'Verify and continue' }).click();
  await expect(await reportDownload).toBeTruthy();

  await page.getByRole('link', { name: /Tickets/ }).click();
  await page.getByRole('button', { name: /TKT-102/ }).click();
  await expect(page.getByText('You confirmed the original review, so a different reviewer must decide this appeal.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Decide appeal' })).toBeDisabled();

  await page.getByRole('link', { name: /Settings/ }).click();
  const videoLimitRow = page.locator('.setting-row').filter({ hasText: 'Video size limit' });
  await videoLimitRow.getByLabel('Video size limit in megabytes').fill('60');
  await videoLimitRow.getByRole('button', { name: 'Save' }).click();
  const settingStepUp = page.getByRole('dialog');
  await expect(settingStepUp).toContainText('Confirm with your authenticator');
  await expectAccessible(page, 'configuration step-up dialog');
  await settingStepUp.getByLabel('Authenticator code').fill('123456');
  await settingStepUp.getByRole('button', { name: 'Verify and save' }).click();
  await expect(page.getByRole('status')).toContainText('Setting saved.');

  await page.getByRole('link', { name: /Audit log/ }).click();
  await page.getByRole('button', { name: 'Export CSV' }).click();
  const auditConfirmation = page.getByRole('dialog');
  await expectAccessible(page, 'audit export confirmation dialog');
  await auditConfirmation.getByRole('button', { name: 'Export CSV' }).click();
  const auditDownload = page.waitForEvent('download');
  const auditStepUp = page.getByRole('dialog');
  await expectAccessible(page, 'audit export step-up dialog');
  await auditStepUp.getByLabel('Authenticator code (step-up)').fill('123456');
  await auditStepUp.getByRole('button', { name: 'Verify and continue' }).click();
  await expect(await auditDownload).toBeTruthy();

  await page.getByRole('link', { name: /Settings/ }).click();
  const killSwitchRow = page.locator('.setting-row').filter({ hasText: 'AI kill switch' });
  await killSwitchRow.getByRole('button', { name: 'On' }).click();
  await killSwitchRow.getByRole('button', { name: 'Save' }).click();
  const pauseDialog = page.getByRole('dialog');
  await expect(pauseDialog).toContainText('Pause all AI reviews and project assignments');
  await expectAccessible(page, 'kill-switch typed confirmation dialog');
  await pauseDialog.getByLabel(/Type PAUSE/).fill('PAUSE');
  await pauseDialog.getByRole('button', { name: 'Pause AI' }).click();
  const pauseStepUp = page.getByRole('dialog');
  await expectAccessible(page, 'kill-switch step-up dialog');
  await pauseStepUp.getByLabel('Authenticator code').fill('123456');
  await page.getByRole('button', { name: 'Verify and save' }).click();
  await expect(page.getByText('AI is paused. New projects and reviews are blocked.')).toBeVisible();

  await page.getByRole('tab', { name: 'Demo data' }).click();
  const resetDialog = page.getByRole('dialog');
  await expect(resetDialog).toContainText('Reset demo data?');
  await expectAccessible(page, 'demo reset typed confirmation dialog');
  await expect(resetDialog.getByRole('button', { name: 'Reset' })).toBeDisabled();
  await resetDialog.getByLabel(/Type RESET/).fill('RESET');
  await resetDialog.getByRole('button', { name: 'Reset' }).click();
  const resetStepUp = page.getByRole('dialog');
  await expect(resetStepUp).toContainText('Confirm with your authenticator');
  await expectAccessible(page, 'demo reset step-up dialog');
  await resetStepUp.getByLabel('Authenticator code').fill('123456');
  await resetStepUp.getByRole('button', { name: 'Verify and save' }).click();
  await expect(page.locator('.toast')).toContainText('Demo data reset.');
});
