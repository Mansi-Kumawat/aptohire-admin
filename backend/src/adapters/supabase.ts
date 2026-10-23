import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import { env } from '../../../frontend/src/config/env';
import { decisionSchema, type AgentRun, type AppConfig, type Application, type AuditEvent, type Backend, type DecisionInput, type NotificationItem, type QueueCounts, type ReviewItem, type Staff, type Ticket } from '../domain/types';

const objectRows = z.array(z.record(z.string(), z.unknown()));
const errorText = (error: { code?: string; message?: string; status?: number } | null): string => {
  if (!error) return 'NETWORK_ERROR';
  const code = error.code?.toUpperCase();
  if (code === '23505' || code === '409' || error.status === 409) return 'CONFLICT';
  if (code === '42501' || code === '403' || error.status === 403) return 'FORBIDDEN';
  if (code === 'PGRST116' || error.status === 404) return 'NOT_FOUND';
  if (code === '23514' || code === '22P02' || code === 'VALIDATION_FAILED' || error.status === 422) return 'VALIDATION_FAILED';
  if (code === 'INVALID_CREDENTIALS' || code === 'invalid_credentials' || error.status === 400) return 'INVALID_CREDENTIALS';
  return 'NETWORK_ERROR';
};
const configSchema = z.object({
  AGENT_MODE: z.enum(['mock', 'direct', 'n8n']), PASS_MARK: z.number().int().min(1).max(99),
  BORDERLINE: z.tuple([z.number().int().min(0).max(100), z.number().int().min(0).max(100)]).refine(([low, high]) => low < high),
  REQUIRE_VIDEO: z.boolean(), VIDEO_MAX_MB: z.number().int().min(1).max(500), VIDEO_MAX_SECONDS: z.number().int().min(30).max(600),
  AI_DAILY_CAP_PER_USER: z.number().int().min(0).max(50), AI_KILL_SWITCH: z.boolean(),
});
const configKeySchema = z.enum(['AGENT_MODE', 'PASS_MARK', 'BORDERLINE', 'REQUIRE_VIDEO', 'VIDEO_MAX_MB', 'VIDEO_MAX_SECONDS', 'AI_DAILY_CAP_PER_USER', 'AI_KILL_SWITCH']);
const configValueSchemas = {
  AGENT_MODE: z.enum(['mock', 'direct', 'n8n']), PASS_MARK: z.number().int().min(1).max(99),
  BORDERLINE: z.tuple([z.number().int().min(0).max(100), z.number().int().min(0).max(100)]).refine(([low, high]) => low < high),
  REQUIRE_VIDEO: z.boolean(), VIDEO_MAX_MB: z.number().int().min(1).max(500), VIDEO_MAX_SECONDS: z.number().int().min(30).max(600),
  AI_DAILY_CAP_PER_USER: z.number().int().min(0).max(50), AI_KILL_SWITCH: z.boolean(),
};
const payloadRecord = (value: unknown): Record<string, unknown> | undefined => {
  const parsed = z.record(z.string(), z.unknown()).safeParse(value);
  return parsed.success ? parsed.data : undefined;
};
const valueString = (value: unknown, fallback = ''): string => typeof value === 'string' ? value : fallback;
const valueNum = (value: unknown, fallback = 0): number => typeof value === 'number' ? value : fallback;

export class SupabaseBackend implements Backend {
  constructor(private readonly client: SupabaseClient) {}

  auth = {
    signIn: async (email: string, password: string): Promise<{ id: string; email: string }> => {
      const { data, error } = await this.client.auth.signInWithPassword({ email, password });
      if (error || !data.user) throw new Error(errorText(error));
      return { id: data.user.id, email: data.user.email ?? email };
    },
    signOut: async (): Promise<void> => {
      const { error } = await this.client.auth.signOut({ scope: 'global' });
      if (error) { await this.client.auth.signOut({ scope: 'local' }); throw new Error(errorText(error)); }
    },
    profile: async (id: string): Promise<{ role: 'admin' | 'student' | 'university' | 'organization'; name: string }> => {
      const { data, error } = await this.client.from('profiles').select('role, display_name').eq('id', id).maybeSingle();
      if (error || !data) throw new Error(errorText(error));
      const role = z.enum(['admin', 'student', 'university', 'organization']).parse(data.role);
      return { role, name: valueString(data.display_name, 'Admin') };
    },
    mfaStatus: async (): Promise<'needs-enroll' | 'needs-challenge' | 'ready'> => {
      const [factors, assurance] = await Promise.all([this.client.auth.mfa.listFactors(), this.client.auth.mfa.getAuthenticatorAssuranceLevel()]);
      if (factors.error || assurance.error) throw new Error('NETWORK_ERROR');
      const verified = factors.data.totp.some((factor) => factor.status === 'verified');
      if (!verified) return 'needs-enroll';
      return assurance.data.currentLevel === 'aal2' ? 'ready' : 'needs-challenge';
    },
    beginMfaEnrollment: async (): Promise<{ qrCode: string; secret: string }> => {
      const existing = await this.client.auth.mfa.listFactors();
      if (existing.error) throw new Error(errorText(existing.error));
      for (const factor of existing.data.totp.filter((item) => item.status !== 'verified')) {
        const removed = await this.client.auth.mfa.unenroll({ factorId: factor.id });
        if (removed.error) throw new Error(errorText(removed.error));
      }
      const { data, error } = await this.client.auth.mfa.enroll({ factorType: 'totp', issuer: 'AptoHire Admin' });
      if (error) throw new Error(errorText(error));
      return { qrCode: data.totp.qr_code, secret: data.totp.secret };
    },
    verifyMfa: async (code: string): Promise<void> => {
      const factors = await this.client.auth.mfa.listFactors();
      if (factors.error) throw new Error(errorText(factors.error));
      const factor = factors.data.totp.find((item) => item.status !== 'verified') ?? factors.data.totp[0];
      if (!factor) throw new Error('MFA_REQUIRED');
      const challenge = await this.client.auth.mfa.challenge({ factorId: factor.id });
      if (challenge.error) throw new Error(errorText(challenge.error));
      const verified = await this.client.auth.mfa.verify({ factorId: factor.id, challengeId: challenge.data.id, code });
      if (verified.error) throw new Error(errorText(verified.error));
    },
    requestPasswordReset: async (email: string): Promise<void> => {
      const normalizedEmail = z.string().email().parse(email.trim());
      const redirectTo = new URL('/reset-password', env.VITE_SITE_URL).toString();
      const { error } = await this.client.auth.resetPasswordForEmail(normalizedEmail, { redirectTo });
      if (error) throw new Error(errorText(error));
    },
    updatePassword: async (password: string): Promise<void> => {
      if (password.length < 10 || password.length > 256) throw new Error('VALIDATION_FAILED');
      const { error } = await this.client.auth.updateUser({ password });
      if (error) throw new Error(errorText(error));
    },
  };

  async counts(): Promise<QueueCounts> {
    // TODO(backend): use admin_counts_v when the contract supplies it.
    const [approvals, reviews, tickets, runs] = await Promise.all([
      this.client.from('applications').select('id', { count: 'exact', head: true }).eq('status', 'received'),
      this.client.from('admin_borderline_v').select('audit_id', { count: 'exact', head: true }).eq('review_status', 'pending'),
      this.client.from('tickets').select('id', { count: 'exact', head: true }).neq('status', 'decided'),
      this.client.from('agent_runs').select('id', { count: 'exact', head: true }).in('status', ['failed', 'timeout']),
    ]);
    for (const item of [approvals, reviews, tickets, runs]) if (item.error) throw new Error(errorText(item.error));
    return { approvals: approvals.count ?? 0, reviews: reviews.count ?? 0, tickets: tickets.count ?? 0, runs: runs.count ?? 0 };
  }
  async approvals(): Promise<Application[]> {
    const { data, error } = await this.client.from('applications').select('*').order('created_at', { ascending: false }).limit(250);
    if (error) throw new Error(errorText(error));
    const rows = objectRows.parse(data ?? []);
    return rows.map((row) => ({
      id: valueString(row.id), subjectId: valueString(row.subject_id) || undefined, reference: valueString(row.reference), name: valueString(row.subject_name), type: z.enum(['organization', 'university']).parse(row.type),
      details: valueString(row.kind), contactName: valueString(row.contact_name), contactRole: valueString(row.contact_role), contactEmail: valueString(row.contact_email), contactPhone: valueString(row.contact_phone, '—'),
      submittedAt: valueString(row.created_at), status: row.status === 'approved' || row.status === 'rejected' ? row.status : 'pending', note: valueString(row.status_note),
      rosterCount: valueNum(row.locked_roster_count), subscription: row.subscription_status === 'active' ? 'active' : 'inactive', website: valueString(row.website),
      emailDomains: Array.isArray(row.email_domains) ? row.email_domains.filter((value): value is string => typeof value === 'string') : [], payload: payloadRecord(row.payload),
    }));
  }
  async decideApplication(input: DecisionInput): Promise<void> {
    const parsed = decisionSchema.parse(input);
    if (parsed.action === 'reject' && (parsed.note?.trim().length ?? 0) < 10) throw new Error('VALIDATION_FAILED');
    const target = parsed.subjectId ?? parsed.id;
    if (parsed.type === 'organization') await this.invoke('admin-approve-org', { organization_id: target, decision: parsed.action, note: parsed.note });
    else await this.invoke('admin-approve-university', { university_id: target, decision: parsed.action, note: parsed.note });
  }
  async setSubscription(id: string, status: 'active' | 'inactive'): Promise<void> { await this.invoke('admin-set-subscription', { organization_id: id, status }); }
  async reviews(): Promise<ReviewItem[]> {
    const { data, error } = await this.client.from('admin_borderline_v').select('*').order('created_at', { ascending: true }).limit(100);
    if (error) throw new Error(errorText(error));
    return objectRows.parse(data ?? []).map((row) => ({
      id: valueString(row.audit_id), reference: valueString(row.submission_ref), title: valueString(row.title), skill: valueString(row.skill_name), skillId: valueString(row.skill_id), score: valueNum(row.overall), humanScore: typeof (row.human_overall ?? row.adjusted_overall) === 'number' ? Number(row.human_overall ?? row.adjusted_overall) : undefined,
      confidence: row.confidence === 'High' || row.confidence === 'Low' ? row.confidence : 'Medium', flags: Array.isArray(row.flags) ? row.flags.filter((v): v is string => typeof v === 'string') : [],
      submittedAt: valueString(row.created_at), dueAt: valueString(row.due_at), status: row.review_status === 'confirmed' || row.review_status === 'adjusted' ? row.review_status : 'pending',
      summary: valueString(row.summary), rationale: valueString(row.rationale), evidence: valueString(row.evidence_excerpt), originalReviewer: valueString(row.reviewed_by),
    }));
  }
  async decideReview(id: string, score: number, reason?: string, skillId?: string): Promise<void> {
    if (!id.trim() || !Number.isSafeInteger(score) || score < 0 || score > 100) throw new Error('VALIDATION_FAILED');
    if (reason && (reason.trim().length < 20 || reason.trim().length > 600 || !skillId?.trim())) throw new Error('VALIDATION_FAILED');
    await this.invoke('admin-review-audit', { audit_id: id, decision: reason ? 'adjust' : 'confirm', adjusted_scores: reason ? [{ skill_id: skillId, score }] : undefined, note: reason?.trim() ?? 'Confirmed by admin reviewer.' });
  }
  async tickets(): Promise<Ticket[]> {
    const { data, error } = await this.client.from('admin_tickets_v').select('*').order('created_at', { ascending: false }).limit(100);
    if (error) throw new Error(errorText(error));
    return objectRows.parse(data ?? []).map((row) => ({
      id: valueString(row.id), reference: valueString(row.ref), skill: valueString(row.skill_name), skillId: valueString(row.skill_id), score: valueNum(row.original_score), reason: valueString(row.reason),
      status: row.status === 'acknowledged' ? 'ack' : row.status === 'ack' || row.status === 'in_review' || row.status === 'decided' ? row.status : 'open',
      assignee: valueString(row.assignee_name), assigneeId: valueString(row.assignee_id ?? row.assigned_to) || undefined,
      originalReviewer: valueString(row.original_reviewer_name, 'Reviewing admin'), originalReviewerId: valueString(row.original_reviewer_id) || undefined,
      createdAt: valueString(row.created_at), decision: row.decision === 'upheld' || row.decision === 'overturned' || row.decision === 'adjusted' ? row.decision : undefined,
    }));
  }
  async updateTicket(id: string, action: 'ack' | 'assign' | 'decide', assignee?: string, decision?: Ticket['decision'], reason?: string, adjustedScores?: Array<{ skillId: string; score: number }>): Promise<void> {
    if (!id.trim()) throw new Error('VALIDATION_FAILED');
    if (action === 'assign' && !assignee?.trim()) throw new Error('VALIDATION_FAILED');
    if (action === 'decide') {
      if (!decision || !reason || reason.trim().length < 20 || reason.trim().length > 600) throw new Error('VALIDATION_FAILED');
      if (decision === 'adjusted' && (!adjustedScores?.length || adjustedScores.some((item) => !item.skillId.trim() || !Number.isSafeInteger(item.score) || item.score < 0 || item.score > 100))) throw new Error('VALIDATION_FAILED');
      if (decision !== 'adjusted' && adjustedScores?.length) throw new Error('VALIDATION_FAILED');
    }
    await this.invoke('admin-decide-ticket', { ticket_id: id, action, assigned_to: assignee, decision, note: reason?.trim(), adjusted_scores: adjustedScores?.map((item) => ({ skill_id: item.skillId, score: item.score })) });
  }
  async runs(): Promise<AgentRun[]> {
    const { data, error } = await this.client.from('admin_agent_runs_v').select('*').order('created_at', { ascending: false }).limit(500);
    if (error) throw new Error(errorText(error));
    return objectRows.parse(data ?? []).map((row) => ({ id: valueString(row.id), kind: valueString(row.kind), mode: row.mode === 'direct' || row.mode === 'n8n' ? row.mode : 'mock', status: row.status === 'failed' || row.status === 'timeout' || row.status === 'running' || row.status === 'queued' ? row.status : 'succeeded', stage: valueString(row.stage), attempt: valueNum(row.attempt, 1), latency: valueNum(row.latency_ms), tokensIn: valueNum(row.tokens_in), tokensOut: valueNum(row.tokens_out), reference: valueString(row.submission_ref), createdAt: valueString(row.created_at), error: valueString(row.error) }));
  }
  async retryRun(id: string): Promise<void> { await this.invoke('admin-retry-run', { run_id: id }); }
  async config(): Promise<AppConfig> {
    const { data, error } = await this.client.from('app_config').select('key, value');
    if (error) throw new Error(errorText(error));
    const rows = objectRows.parse(data ?? []);
    const config: Record<string, unknown> = { AGENT_MODE: 'mock', PASS_MARK: 50, BORDERLINE: [40, 60], REQUIRE_VIDEO: true, VIDEO_MAX_MB: 50, VIDEO_MAX_SECONDS: 190, AI_DAILY_CAP_PER_USER: 5, AI_KILL_SWITCH: false };
    for (const row of rows) {
      const parsedKey = configKeySchema.safeParse(row.key);
      if (parsedKey.success) config[parsedKey.data] = row.value;
    }
    const parsed = configSchema.safeParse(config);
    if (!parsed.success) throw new Error('INVALID_CONFIG');
    return parsed.data;
  }
  async updateConfig(input: import('../domain/types').ConfigChangeInput): Promise<void> {
    const parsed = z.object({ key: configKeySchema, value: z.unknown(), reason: z.string().trim().max(600).optional() }).strict().parse(input);
    configValueSchemas[parsed.key].parse(parsed.value);
    if (['AGENT_MODE', 'PASS_MARK', 'BORDERLINE'].includes(parsed.key) && (parsed.reason?.length ?? 0) < 20) throw new Error('VALIDATION_FAILED');
    await this.invoke('admin-update-config', { key: parsed.key, value: parsed.value, reason: parsed.reason });
  }
  async staff(): Promise<Staff[]> {
    const { data, error } = await this.client.from('admin_users_v').select('user_id, display_name, role').limit(200);
    if (error) throw new Error(errorText(error));
    return objectRows.parse(data ?? []).map((row) => { const role = valueString(row.role); return { id: valueString(row.user_id), name: valueString(row.display_name), role: role ? `${role[0]?.toUpperCase()}${role.slice(1).toLowerCase()}` : 'Unknown' }; });
  }
  async auditLog(): Promise<AuditEvent[]> {
    // TODO(backend): confirm the sanitized admin_audit_log_v view and field names against the shared contract.
    const { data, error } = await this.client.from('admin_audit_log_v').select('*').order('created_at', { ascending: false }).limit(500);
    if (error) throw new Error(errorText(error));
    return objectRows.parse(data ?? []).map((row) => ({
      id: valueString(row.id), at: valueString(row.created_at), actor: valueString(row.actor_label, 'Admin'), role: valueString(row.actor_role, 'admin'),
      action: valueString(row.action), target: valueString(row.target_label, 'Administrative action'), detail: valueString(row.summary, 'Recorded event'), sensitive: row.sensitive === true,
    }));
  }
  async notifications(): Promise<NotificationItem[]> {
    const { data, error } = await this.client.from('notifications').select('id, title, body, created_at, read_at, href').order('created_at', { ascending: false }).limit(200);
    if (error) throw new Error(errorText(error));
    return objectRows.parse(data ?? []).map((row) => {
      const href = valueString(row.href);
      return { id: valueString(row.id), title: valueString(row.title), body: valueString(row.body), at: valueString(row.created_at), readAt: valueString(row.read_at) || undefined, href: href.startsWith('/') && !href.startsWith('//') ? href : undefined };
    });
  }
  async markNotificationsRead(): Promise<void> {
    const { error } = await this.client.from('notifications').update({ read_at: new Date().toISOString() }).is('read_at', null);
    if (error) throw new Error(errorText(error));
  }
  async resetDemo(): Promise<void> { await this.invoke('admin-seed-reset', {}); }
  private async invoke(name: string, body: Record<string, unknown>): Promise<void> {
    const { error } = await this.client.functions.invoke(name, { body });
    if (error) throw new Error(errorText(error));
  }
}
