import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MockBackend } from '../backend/src/adapters/mock';

async function call<T>(operation: () => Promise<T>): Promise<T> {
  const promise = operation();
  await vi.advanceTimersByTimeAsync(400);
  return promise;
}
async function rejects(operation: () => Promise<unknown>, code: string): Promise<void> {
  const assertion = expect(operation()).rejects.toThrow(code);
  await vi.advanceTimersByTimeAsync(400);
  await assertion;
}

beforeEach(() => {
  vi.useFakeTimers();
  sessionStorage.clear();
});
afterEach(() => { vi.useRealTimers(); });

describe('mock authentication boundaries', () => {
  it('accepts only named fictional accounts and preserves the signed-in identity for a new backend instance', async () => {
    const backend = new MockBackend();
    await rejects(() => backend.auth.signIn('anyone@example.com', 'password'), 'INVALID_CREDENTIALS');
    const signedIn = await call(() => backend.auth.signIn('reviewer2@demo.aptohire.test', 'demo-password'));
    expect((await call(() => backend.auth.profile(signedIn.id))).name).toBe('Reviewer 2');
    const reloaded = new MockBackend();
    expect((await call(() => reloaded.auth.profile(signedIn.id))).role).toBe('admin');
  });

  it('does not let unauthenticated callers verify MFA or mutate admin data', async () => {
    const backend = new MockBackend();
    await rejects(() => backend.auth.verifyMfa('123456'), 'FORBIDDEN');
    await rejects(() => backend.updateConfig({ key: 'PASS_MARK', value: 60, reason: 'A sufficiently detailed reason.' }), 'FORBIDDEN');
    const user = await call(() => backend.auth.signIn('aarav@unia.edu.test', 'demo-password'));
    expect((await call(() => backend.auth.profile(user.id))).role).toBe('student');
    await rejects(() => backend.auth.verifyMfa('123456'), 'FORBIDDEN');
  });

  it('keeps MFA enrollment separate for each admin account', async () => {
    const backend = new MockBackend();
    await call(() => backend.auth.signIn('admin@demo.aptohire.test', 'demo-password'));
    await rejects(() => backend.counts(), 'FORBIDDEN');
    await rejects(() => backend.auth.verifyMfa('123456'), 'MFA_REQUIRED');
    await call(() => backend.auth.beginMfaEnrollment());
    await call(() => backend.auth.verifyMfa('123456'));
    await call(() => backend.auth.signOut());
    await call(() => backend.auth.signIn('reviewer2@demo.aptohire.test', 'demo-password'));
    expect(await call(() => backend.auth.mfaStatus())).toBe('needs-enroll');
  });
});

describe('mock review and appeal invariants', () => {
  async function adminAccount(email: string): Promise<MockBackend> {
    const backend = new MockBackend();
    await call(() => backend.auth.signIn(email, 'demo-password'));
    await call(() => backend.auth.beginMfaEnrollment());
    await call(() => backend.auth.verifyMfa('123456'));
    return backend;
  }

  it('permits only the assigned, non-original reviewer to decide an appeal', async () => {
    const originalReviewer = await adminAccount('admin@demo.aptohire.test');
    await rejects(() => originalReviewer.updateTicket('tk-102', 'decide', undefined, 'upheld', 'A sufficiently detailed appeal decision reason.'), 'FORBIDDEN');

    await call(() => originalReviewer.auth.signOut());
    const unassignedReviewer = await adminAccount('reviewer3@demo.aptohire.test');
    await rejects(() => unassignedReviewer.updateTicket('tk-102', 'decide', undefined, 'upheld', 'A sufficiently detailed appeal decision reason.'), 'FORBIDDEN');

    await call(() => unassignedReviewer.auth.signOut());
    const assignedReviewer = await adminAccount('reviewer2@demo.aptohire.test');
    await call(() => assignedReviewer.updateTicket('tk-102', 'decide', undefined, 'upheld', 'A sufficiently detailed appeal decision reason.'));
    expect((await call(() => assignedReviewer.tickets())).find((ticket) => ticket.id === 'tk-102')?.status).toBe('decided');
  });

  it('validates configuration values and requires a reason for policy changes', async () => {
    const backend = await adminAccount('admin@demo.aptohire.test');
    await rejects(() => backend.updateConfig({ key: 'PASS_MARK', value: 51.5, reason: 'A sufficiently detailed reason.' }), 'VALIDATION_FAILED');
    await rejects(() => backend.updateConfig({ key: 'PASS_MARK', value: 60, reason: 'short' }), 'VALIDATION_FAILED');
    await call(() => backend.updateConfig({ key: 'PASS_MARK', value: 60, reason: 'A sufficiently detailed reason.' }));
    expect((await call(() => backend.config())).PASS_MARK).toBe(60);
  });

  it('persists audit events and notification read state across mock reloads', async () => {
    const backend = await adminAccount('admin@demo.aptohire.test');
    await call(() => backend.markNotificationsRead());
    await call(() => backend.updateConfig({ key: 'PASS_MARK', value: 54, reason: 'Sample policy reason with enough detail.' }));
    const reloaded = new MockBackend();
    await call(() => reloaded.auth.verifyMfa('123456'));
    expect((await call(() => reloaded.notifications())).every((item) => Boolean(item.readAt))).toBe(true);
    expect((await call(() => reloaded.auditLog()))[0]?.action).toBe('Configuration change');
  });
});
