import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import { env } from '../../../frontend/src/config/env';
import { reviewDueAt } from '../../../frontend/src/lib/sla';
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
  AGENT_MODE: z.enum(['mock', 'direct', 'n8n']), PASS_MARK: z.number().int().min(0).max(100),
  BORDERLINE: z.tuple([z.number().int().min(0).max(100), z.number().int().min(0).max(100)]).refine(([low, high]) => low < high),
  REQUIRE_VIDEO: z.boolean(), VIDEO_MAX_MB: z.number().int().min(1).max(500), VIDEO_MAX_SECONDS: z.number().int().min(1).max(3600),
  AI_DAILY_CAP_PER_USER: z.number().int().min(1).max(100), AI_KILL_SWITCH: z.boolean(),
});
const configKeySchema = z.enum(['AGENT_MODE', 'PASS_MARK', 'BORDERLINE', 'REQUIRE_VIDEO', 'VIDEO_MAX_MB', 'VIDEO_MAX_SECONDS', 'AI_DAILY_CAP_PER_USER', 'AI_KILL_SWITCH']);
const configValueSchemas = {
  AGENT_MODE: z.enum(['mock', 'direct', 'n8n']), PASS_MARK: z.number().int().min(1).max(99),
  BORDERLINE: z.tuple([z.number().int().min(0).max(100), z.number().int().min(0).max(100)]).refine(([low, high]) => low < high),
  REQUIRE_VIDEO: z.boolean(), VIDEO_MAX_MB: z.number().int().min(1).max(500), VIDEO_MAX_SECONDS: z.number().int().min(30).max(600),
  AI_DAILY_CAP_PER_USER: z.number().int().min(1).max(100), AI_KILL_SWITCH: z.boolean(),
};
const payloadRecord = (value: unknown): Record<string, unknown> | undefined => {
  const parsed = z.record(z.string(), z.unknown()).safeParse(value);
  return parsed.success ? parsed.data : undefined;
};
const valueString = (value: unknown, fallback = ''): string => typeof value === 'string' ? value : fallback;
const valueNum = (value: unknown, fallback = 0): number => typeof value === 'number' ? value : fallback;
const evidenceText = (value: unknown): string => Array.isArray(value) ? value.map((item) => {
  const row = payloadRecord(item);
  if (!row) return '';
  const label = valueString(row.label, valueString(row.kind, 'Evidence'));
  const excerpt = valueString(row.excerpt);
  return excerpt ? `${label}\n${excerpt}` : label;
}).filter(Boolean).join('\n\n') : '';
const rubricRationale = (value: unknown): string => Array.isArray(value) ? value.map((item) => payloadRecord(item)).find((row) => typeof row?.rationale === 'string')?.rationale as string ?? '' : '';
const confidenceLabel = (value: unknown): ReviewItem['confidence'] => {
  const confidence = valueNum(value);
  return confidence >= 0.75 ? 'High' : confidence >= 0.5 ? 'Medium' : 'Low';
};
type MfaEnrollment = { qrCode: string; secret: string };
let mfaEnrollmentPromise: Promise<MfaEnrollment> | null = null;
let cachedMfaEnrollment: MfaEnrollment | null = null;
function clearMfaEnrollmentCache(): void { mfaEnrollmentPromise = null; cachedMfaEnrollment = null; }

export class SupabaseBackend implements Backend {
  constructor(private readonly client: SupabaseClient) {}

  auth = {
    signIn: async (email: string, password: string): Promise<{ id: string; email: string }> => {
      const { data, error } = await this.client.auth.signInWithPassword({ email, password });
      if (error || !data.user) throw new Error(errorText(error));
      return { id: data.user.id, email: data.user.email ?? email };
    },
    signOut: async (): Promise<void> => {
      clearMfaEnrollmentCache();
      const { error } = await this.client.auth.signOut({ scope: 'global' });
      if (error) { await this.client.auth.signOut({ scope: 'local' }); throw new Error(errorText(error)); }
    },
    profile: async (id: string): Promise<{ role: 'admin' | 'student' | 'university' | 'organization'; name: string }> => {
      const { data, error } = await this.client.from('profiles').select('role').eq('id', id).maybeSingle();
      if (error || !data) throw new Error(errorText(error));
      const role = z.enum(['admin', 'student', 'university', 'organization']).parse(data.role);
      const { data: authData } = await this.client.auth.getUser();
      const metadata = payloadRecord(authData.user?.user_metadata);
      const name = valueString(metadata?.full_name ?? metadata?.name, authData.user?.email?.split('@')[0] ?? 'Admin');
      return { role, name };
    },
    mfaStatus: async (): Promise<'needs-enroll' | 'needs-challenge' | 'ready'> => {
      const [factors, assurance] = await Promise.all([this.client.auth.mfa.listFactors(), this.client.auth.mfa.getAuthenticatorAssuranceLevel()]);
      if (factors.error || assurance.error) throw new Error('NETWORK_ERROR');
      const verified = factors.data.totp.some((factor) => factor.status === 'verified');
      if (!verified) return 'needs-enroll';
      return assurance.data.currentLevel === 'aal2' ? 'ready' : 'needs-challenge';
    },
    beginMfaEnrollment: async (): Promise<{ qrCode: string; secret: string }> => {
      if (cachedMfaEnrollment) return cachedMfaEnrollment;
      if (mfaEnrollmentPromise) return mfaEnrollmentPromise;
      const request = (async (): Promise<MfaEnrollment> => {
        const existing = await this.client.auth.mfa.listFactors();
        if (existing.error) throw new Error(errorText(existing.error));
        if (existing.data.totp.some((factor) => factor.status === 'verified')) throw new Error('MFA_ALREADY_ENROLLED');
        for (const factor of existing.data.totp.filter((item) => item.status !== 'verified')) {
          const removed = await this.client.auth.mfa.unenroll({ factorId: factor.id });
          if (removed.error) throw new Error(errorText(removed.error));
        }
        const friendlyName = `AptoHire Admin ${crypto.randomUUID().slice(0, 8)}`;
        const { data, error } = await this.client.auth.mfa.enroll({ factorType: 'totp', issuer: 'AptoHire Admin', friendlyName });
        if (error) throw new Error(errorText(error));
        return { qrCode: data.totp.qr_code, secret: data.totp.secret };
      })();
      mfaEnrollmentPromise = request;
      try {
        cachedMfaEnrollment = await request;
        return cachedMfaEnrollment;
      } finally {
        if (mfaEnrollmentPromise === request) mfaEnrollmentPromise = null;
      }
    },
    verifyMfa: async (code: string): Promise<void> => {
      const factors = await this.client.auth.mfa.listFactors();
      if (factors.error) throw new Error(errorText(factors.error));
      const factor = factors.data.totp.find((item) => item.status === 'verified') ?? factors.data.totp.find((item) => item.status !== 'verified');
      if (!factor) throw new Error('MFA_REQUIRED');
      const challenge = await this.client.auth.mfa.challenge({ factorId: factor.id });
      if (challenge.error) throw new Error(errorText(challenge.error));
      const verified = await this.client.auth.mfa.verify({ factorId: factor.id, challengeId: challenge.data.id, code });
      if (verified.error) throw new Error(errorText(verified.error));
      clearMfaEnrollmentCache();
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
    const { data, error } = await this.client.from('admin_counts_v').select('pending_approvals,pending_reviews,open_tickets,failed_runs_24h').maybeSingle();
    if (error || !data) throw new Error(errorText(error));
    return { approvals: valueNum(data.pending_approvals), reviews: valueNum(data.pending_reviews), tickets: valueNum(data.open_tickets), runs: valueNum(data.failed_runs_24h) };
  }
  async approvals(): Promise<Application[]> {
    const { data, error } = await this.client.from('applications').select('id,reference,type,subject_id,contact_name,contact_role,contact_email,contact_phone,payload,status,created_at').order('created_at', { ascending: false }).limit(250);
    if (error) throw new Error(errorText(error));
    const rows = objectRows.parse(data ?? []);
    const universityIds = rows.filter((row) => row.type === 'university').map((row) => valueString(row.subject_id)).filter(Boolean);
    const organizationIds = rows.filter((row) => row.type === 'organization').map((row) => valueString(row.subject_id)).filter(Boolean);
    const [universities, organizations] = await Promise.all([
      universityIds.length ? this.client.from('universities').select('id,name,kind,tier,city,state,email_domains,status,status_note').in('id', universityIds) : Promise.resolve({ data: [], error: null }),
      organizationIds.length ? this.client.from('organizations').select('id,name,kind,size,website,subscription_status,status,status_note').in('id', organizationIds) : Promise.resolve({ data: [], error: null }),
    ]);
    if (universities.error) throw new Error(errorText(universities.error));
    if (organizations.error) throw new Error(errorText(organizations.error));
    const universityById = new Map(objectRows.parse(universities.data ?? []).map((row) => [valueString(row.id), row]));
    const organizationById = new Map(objectRows.parse(organizations.data ?? []).map((row) => [valueString(row.id), row]));
    return rows.map((row) => {
      const type = z.enum(['organization', 'university']).parse(row.type);
      const subjectId = valueString(row.subject_id) || undefined;
      const subject = (type === 'university' ? universityById : organizationById).get(subjectId ?? '') ?? {};
      const payload = payloadRecord(row.payload);
      const tier = typeof subject.tier === 'number' ? `Tier ${subject.tier}` : '';
      const details = type === 'university' ? [valueString(subject.kind), tier, valueString(subject.city), valueString(subject.state)].filter(Boolean).join(' · ') : [valueString(subject.kind), valueString(subject.size)].filter(Boolean).join(' · ');
      return {
        id: valueString(row.id), subjectId, reference: valueString(row.reference), name: valueString(subject.name, valueString(payload?.institution_name ?? payload?.org_name, 'Unnamed applicant')), type,
        details, contactName: valueString(row.contact_name), contactRole: valueString(row.contact_role), contactEmail: valueString(row.contact_email), contactPhone: valueString(row.contact_phone, '—'),
        submittedAt: valueString(row.created_at), status: row.status === 'approved' || row.status === 'rejected' ? row.status : subject.status === 'approved' || subject.status === 'rejected' ? subject.status : 'pending', note: valueString(subject.status_note),
        subscription: subject.subscription_status === 'active' ? 'active' : 'inactive', website: valueString(subject.website),
        emailDomains: Array.isArray(subject.email_domains) ? subject.email_domains.filter((value): value is string => typeof value === 'string') : [], payload,
      };
    });
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
    const [pending, decided] = await Promise.all([
      this.client.from('admin_borderline_v').select('audit_id,submission_id,overall_score,review_status,created_at').order('created_at', { ascending: true }).limit(100),
      this.client.from('admin_agreement_v').select('audit_id,ai_score,human_score,outcome,created_at').order('created_at', { ascending: false }).limit(250),
    ]);
    if (pending.error) throw new Error(errorText(pending.error));
    if (decided.error) throw new Error(errorText(decided.error));
    const pendingViewRows = objectRows.parse(pending.data ?? []);
    const pendingIds = pendingViewRows.map((row) => valueString(row.audit_id)).filter(Boolean);
    const submissionIds = [...new Set(pendingViewRows.map((row) => valueString(row.submission_id)).filter(Boolean))];
    const [auditDetails, scoreDetails, submissions] = await Promise.all([
      pendingIds.length ? this.client.from('audits').select('id,summary,rubric,evidence,confidence,flags,created_at').in('id', pendingIds) : Promise.resolve({ data: [], error: null }),
      pendingIds.length ? this.client.from('skill_scores').select('audit_id,skill_id,score').in('audit_id', pendingIds) : Promise.resolve({ data: [], error: null }),
      submissionIds.length ? this.client.from('submissions').select('id,title').in('id', submissionIds) : Promise.resolve({ data: [], error: null }),
    ]);
    if (auditDetails.error) throw new Error(errorText(auditDetails.error));
    if (scoreDetails.error) throw new Error(errorText(scoreDetails.error));
    if (submissions.error) throw new Error(errorText(submissions.error));
    const auditById = new Map(objectRows.parse(auditDetails.data ?? []).map((row) => [valueString(row.id), row]));
    const scoresByAudit = new Map<string, Record<string, unknown>[]>();
    for (const row of objectRows.parse(scoreDetails.data ?? [])) {
      const auditId = valueString(row.audit_id);
      scoresByAudit.set(auditId, [...(scoresByAudit.get(auditId) ?? []), row]);
    }
    const scoreRows = objectRows.parse(scoreDetails.data ?? []);
    const skillIds = [...new Set(scoreRows.map((row) => valueString(row.skill_id)).filter(Boolean))];
    const skillResult = skillIds.length ? await this.client.from('skills').select('id,name').in('id', skillIds) : { data: [], error: null };
    if (skillResult.error) throw new Error(errorText(skillResult.error));
    const skillNames = new Map(objectRows.parse(skillResult.data ?? []).map((row) => [valueString(row.id), valueString(row.name, 'Skill review')]));
    const submissionTitles = new Map(objectRows.parse(submissions.data ?? []).map((row) => [valueString(row.id), valueString(row.title, 'Blind submission review')]));
    const pendingRows = pendingViewRows.map((row) => {
      const id = valueString(row.audit_id); const audit = auditById.get(id) ?? {};
      const skill = scoresByAudit.get(id)?.[0]; const createdAt = valueString(row.created_at);
      const flags = Array.isArray(audit.flags) ? audit.flags.filter((flag): flag is string => typeof flag === 'string') : [];
      return {
        id, reference: valueString(row.submission_id), title: submissionTitles.get(valueString(row.submission_id)) ?? 'Blind submission review',
        skill: skill ? skillNames.get(valueString(skill.skill_id)) ?? 'Skill review' : 'Overall assessment', skillId: skill ? valueString(skill.skill_id) : undefined,
        score: valueNum(row.overall_score), confidence: confidenceLabel(audit.confidence), flags, submittedAt: createdAt, dueAt: reviewDueAt(createdAt).toISOString(),
        status: 'pending' as const, summary: valueString(audit.summary, 'No assessment summary was returned by the backend.'),
        rationale: rubricRationale(audit.rubric), evidence: evidenceText(audit.evidence),
      };
    });
    const decidedRows = objectRows.parse(decided.data ?? []).map((row) => {
      const score = valueNum(row.ai_score); const humanScore = valueNum(row.human_score);
      return { id: valueString(row.audit_id), reference: valueString(row.audit_id), title: 'Completed blind review', skill: 'Overall assessment', score, humanScore, confidence: 'Medium' as const, flags: [], submittedAt: valueString(row.created_at), dueAt: valueString(row.created_at), status: row.outcome === 'adjust' || row.outcome === 'adjusted' ? 'adjusted' as const : 'confirmed' as const, summary: 'Completed review record from the admin agreement view.', rationale: 'Student identity and detailed evidence are not included in this report.', evidence: '' };
    });
    return [...pendingRows, ...decidedRows];
  }
  async decideReview(id: string, score: number, reason?: string, skillId?: string): Promise<void> {
    if (!id.trim() || !Number.isSafeInteger(score) || score < 0 || score > 100) throw new Error('VALIDATION_FAILED');
    if (reason && (reason.trim().length < 20 || reason.trim().length > 500 || !skillId?.trim())) throw new Error('VALIDATION_FAILED');
    const note = reason?.trim() ?? 'Confirmed by admin reviewer.';
    await this.invoke('admin-review-audit', reason ? { audit_id: id, decision: 'adjust', adjusted_scores: [{ skill_id: skillId, score }], note } : { audit_id: id, decision: 'confirm', note });
  }
  async tickets(): Promise<Ticket[]> {
    const { data, error } = await this.client.from('admin_tickets_v').select('id,submission_id,status,assigned_to,created_at,decision,original_reviewer_id,assignee_name').order('created_at', { ascending: false }).limit(100);
    if (error) throw new Error(errorText(error));
    const rows = objectRows.parse(data ?? []);
    const ticketIds = rows.map((row) => valueString(row.id)).filter(Boolean);
    const submissionIds = [...new Set(rows.map((row) => valueString(row.submission_id)).filter(Boolean))];
    const [details, audits] = await Promise.all([
      ticketIds.length ? this.client.from('tickets').select('id,reason').in('id', ticketIds) : Promise.resolve({ data: [], error: null }),
      submissionIds.length ? this.client.from('audits').select('id,submission_id,overall_score,rubric,evidence,created_at').in('submission_id', submissionIds).order('created_at', { ascending: false }) : Promise.resolve({ data: [], error: null }),
    ]);
    if (details.error) throw new Error(errorText(details.error));
    if (audits.error) throw new Error(errorText(audits.error));
    const reasonById = new Map(objectRows.parse(details.data ?? []).map((row) => [valueString(row.id), valueString(row.reason)]));
    const auditBySubmission = new Map<string, Record<string, unknown>>();
    for (const row of objectRows.parse(audits.data ?? [])) if (!auditBySubmission.has(valueString(row.submission_id))) auditBySubmission.set(valueString(row.submission_id), row);
    const auditIds = [...new Set([...auditBySubmission.values()].map((row) => valueString(row.id)).filter(Boolean))];
    const scoreDetails = auditIds.length ? await this.client.from('skill_scores').select('audit_id,skill_id,score').in('audit_id', auditIds) : { data: [], error: null };
    if (scoreDetails.error) throw new Error(errorText(scoreDetails.error));
    const scoresByAudit = new Map<string, Record<string, unknown>[]>();
    for (const row of objectRows.parse(scoreDetails.data ?? [])) {
      const auditId = valueString(row.audit_id);
      scoresByAudit.set(auditId, [...(scoresByAudit.get(auditId) ?? []), row]);
    }
    const skillIds = [...new Set(objectRows.parse(scoreDetails.data ?? []).map((row) => valueString(row.skill_id)).filter(Boolean))];
    const skillResult = skillIds.length ? await this.client.from('skills').select('id,name').in('id', skillIds) : { data: [], error: null };
    if (skillResult.error) throw new Error(errorText(skillResult.error));
    const skillNames = new Map(objectRows.parse(skillResult.data ?? []).map((row) => [valueString(row.id), valueString(row.name, 'Appeal review')]));
    return rows.map((row) => {
      const submissionId = valueString(row.submission_id); const audit = auditBySubmission.get(submissionId);
      const scoreRow = audit ? scoresByAudit.get(valueString(audit.id))?.[0] : undefined;
      const auditEvidence = audit ? [rubricRationale(audit.rubric), evidenceText(audit.evidence)].filter(Boolean).join('\n\n') : '';
      return {
        id: valueString(row.id), reference: submissionId, skill: scoreRow ? skillNames.get(valueString(scoreRow.skill_id)) ?? 'Appeal review' : 'Overall assessment',
        skillId: scoreRow ? valueString(scoreRow.skill_id) : undefined, score: scoreRow ? valueNum(scoreRow.score) : valueNum(audit?.overall_score),
        reason: reasonById.get(valueString(row.id)) ?? 'No appeal reason was provided.', evidence: auditEvidence,
        status: row.status === 'closed' ? 'decided' : row.status === 'assigned' ? 'in_review' : 'open',
        assignee: valueString(row.assignee_name), assigneeId: valueString(row.assigned_to) || undefined,
        originalReviewer: 'Original reviewer', originalReviewerId: valueString(row.original_reviewer_id) || undefined,
        createdAt: valueString(row.created_at), decision: row.decision === 'upheld' || row.decision === 'overturned' || row.decision === 'adjusted' ? row.decision : undefined,
      };
    });
  }
  async updateTicket(id: string, action: 'ack' | 'assign' | 'decide', assignee?: string, decision?: Ticket['decision'], reason?: string, adjustedScores?: Array<{ skillId: string; score: number }>): Promise<void> {
    if (!id.trim()) throw new Error('VALIDATION_FAILED');
    if (action === 'assign' && !assignee?.trim()) throw new Error('VALIDATION_FAILED');
    if (action === 'decide') {
      if (!decision || !reason || reason.trim().length < 20 || reason.trim().length > 500) throw new Error('VALIDATION_FAILED');
      if (decision === 'adjusted' && (!adjustedScores?.length || adjustedScores.some((item) => !item.skillId.trim() || !Number.isSafeInteger(item.score) || item.score < 0 || item.score > 100))) throw new Error('VALIDATION_FAILED');
      if (decision !== 'adjusted' && adjustedScores?.length) throw new Error('VALIDATION_FAILED');
    }
    await this.invoke('admin-decide-ticket', { ticket_id: id, action, assigned_to: assignee, decision, note: reason?.trim(), adjusted_scores: adjustedScores?.map((item) => ({ skill_id: item.skillId, score: item.score })) });
  }
  async runs(): Promise<AgentRun[]> {
    const { data, error } = await this.client.from('agent_runs').select('id,submission_id,stage,attempt,mode,status,latency_ms,token_estimate,error_code,created_at').order('created_at', { ascending: false }).limit(500);
    if (error) throw new Error(errorText(error));
    return objectRows.parse(data ?? []).map((row) => ({ id: valueString(row.id), kind: valueString(row.stage), mode: row.mode === 'direct' || row.mode === 'n8n' ? row.mode : 'mock', status: row.status === 'failed' || row.status === 'timeout' || row.status === 'running' || row.status === 'queued' ? row.status : 'succeeded', stage: valueString(row.stage), attempt: valueNum(row.attempt, 1), latency: valueNum(row.latency_ms), tokensIn: 0, tokensOut: 0, tokenEstimate: valueNum(row.token_estimate), reference: valueString(row.submission_id), createdAt: valueString(row.created_at), error: valueString(row.error_code) }));
  }
  async retryRun(id: string): Promise<void> { await this.invoke('admin-retry-run', { run_id: id }); }
  async config(): Promise<AppConfig> {
    const { data, error } = await this.client.from('admin_app_config_v').select('key, value, updated_by, updated_at');
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
    await this.invoke('admin-update-config', { key: parsed.key, value: parsed.value });
  }
  async staff(): Promise<Staff[]> {
    const { data, error } = await this.client.from('admin_users_v').select('user_id, display_name, role').limit(200);
    if (error) throw new Error(errorText(error));
    return objectRows.parse(data ?? []).map((row) => { const role = valueString(row.role); return { id: valueString(row.user_id), name: valueString(row.display_name), role: role ? `${role[0]?.toUpperCase()}${role.slice(1).toLowerCase()}` : 'Unknown' }; });
  }
  async auditLog(): Promise<AuditEvent[]> {
    const { data, error } = await this.client.from('admin_audit_log_v').select('id,actor_id,actor_label,action,target_type,target_id,metadata,created_at').order('created_at', { ascending: false }).limit(500);
    if (error) throw new Error(errorText(error));
    return objectRows.parse(data ?? []).map((row) => ({
      id: valueString(row.id), at: valueString(row.created_at), actor: valueString(row.actor_label, 'Admin'), role: 'admin',
      action: valueString(row.action), target: valueString(row.target_type, 'Administrative action'), detail: valueString(row.target_id, 'Recorded event'), sensitive: false,
    }));
  }
  async notifications(): Promise<NotificationItem[]> {
    const { data: auth, error: authError } = await this.client.auth.getUser();
    if (authError || !auth.user) throw new Error(errorText(authError));
    const { data, error } = await this.client.from('notifications').select('id,kind,created_at,read_at').eq('user_id', auth.user.id).order('created_at', { ascending: false }).limit(200);
    if (error) throw new Error(errorText(error));
    return objectRows.parse(data ?? []).map((row) => {
      return { id: valueString(row.id), title: valueString(row.kind, 'Update').replaceAll('_', ' '), body: 'An account update is available. Details stay in the relevant administrative queue.', at: valueString(row.created_at), readAt: valueString(row.read_at) || undefined };
    });
  }
  async markNotificationsRead(): Promise<void> { throw new Error('FEATURE_UNAVAILABLE'); }
  async resetDemo(): Promise<void> { throw new Error('FEATURE_UNAVAILABLE'); }
  private async invoke(name: string, body: Record<string, unknown>): Promise<void> {
    const { error } = await this.client.functions.invoke(name, { body });
    if (error) throw new Error(errorText(error));
  }
}
