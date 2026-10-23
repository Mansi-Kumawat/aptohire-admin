export type MfaState = 'no-session' | 'wrong-role' | 'needs-enroll' | 'needs-challenge' | 'ready';
export function mfaState(input: { hasSession: boolean; role?: string; hasVerifiedTotp?: boolean; assurance?: 'aal1' | 'aal2' }): MfaState {
  if (!input.hasSession) return 'no-session';
  if (input.role !== 'admin') return 'wrong-role';
  if (!input.hasVerifiedTotp) return 'needs-enroll';
  return input.assurance === 'aal2' ? 'ready' : 'needs-challenge';
}
