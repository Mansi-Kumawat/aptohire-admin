import { z } from 'zod';
import { env } from '../../../frontend/src/config/env';
import { configChangeSchema, decisionSchema, type AgentRun, type AppConfig, type Application, type AuditEvent, type Backend, type DecisionInput, type NotificationItem, type QueueCounts, type ReviewItem, type Staff, type Ticket } from '../domain/types';

const ago = (hours: number): string => new Date(Date.now() - hours * 3_600_000).toISOString();
const dueForAge = (hours: number): string => {
  const date = new Date(Date.now() - hours * 3_600_000); let workdays = 3;
  while (workdays > 0) { date.setDate(date.getDate() + 1); if (date.getDay() !== 0 && date.getDay() !== 6) workdays -= 1; }
  return date.toISOString();
};
const wait = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 360));

const initialApplications: Application[] = [
  { id: 'uni-c', reference: 'AH-7K2Q9F', name: 'Uni C', type: 'university', details: 'Tier 3 · Jaipur, Rajasthan', contactName: 'Mira Shah', contactRole: 'Registrar', contactEmail: 'mira@unic.example', contactPhone: '+91 141 555 0101', submittedAt: ago(16), status: 'pending', rosterCount: 6, emailDomains: ['unic.example'], payload: { campus_city: 'Jaipur, Rajasthan · Sample', accreditation: 'Sample regional accreditation', institution_type: 'Public · Sample', roster_waiting: 6 } },
  { id: 'orbit', reference: 'AH-4M8Z2D', name: 'Orbit Analytics', type: 'organization', details: 'Analytics · 51–200 people', contactName: 'Dev Mehta', contactRole: 'People lead', contactEmail: 'dev@orbit.example', contactPhone: '+91 22 555 0110', submittedAt: ago(28), status: 'pending', website: 'https://orbit.example', subscription: 'inactive', payload: { industry: 'Analytics · Sample', employee_count: '51–200 · Sample', hiring_domains: ['orbit.example'], requested_access: 'Verified organization badge' } },
  { id: 'riverbend', reference: 'AH-9P3L1C', name: 'Riverbend College', type: 'university', details: 'Tier 2 · Ajmer, Rajasthan', contactName: 'Asha Rao', contactRole: 'Placement director', contactEmail: 'asha@riverbend.example', contactPhone: '+91 145 555 0132', submittedAt: ago(44), status: 'pending', rosterCount: 0, emailDomains: ['gmail.com'], payload: { campus_city: 'Ajmer, Rajasthan · Sample', accreditation: 'Sample accreditation record pending', institution_type: 'Private · Sample', roster_waiting: 0 } },
  { id: 'quickhire', reference: 'AH-6T2Q5A', name: 'Quick Hire Co', type: 'organization', details: 'Staffing · 11–50 people', contactName: 'Sam Dev', contactRole: 'Founder', contactEmail: 'sam.quickhire@gmail.com', contactPhone: '+91 80 555 0104', submittedAt: ago(73), status: 'pending', website: 'https://quickhire.co', subscription: 'inactive', payload: { industry: 'Staffing · Sample', employee_count: '11–50 · Sample', hiring_domains: ['quickhire.co'], requested_access: 'Organization account' } },
  { id: 'unia', reference: 'AH-1B2A3C', name: 'Uni A', type: 'university', details: 'Tier 1 · Jaipur, Rajasthan', contactName: 'R. Kapoor', contactRole: 'Registrar', contactEmail: 'registrar@unia.example', contactPhone: '+91 141 555 0102', submittedAt: ago(300), status: 'approved', rosterCount: 0 },
  { id: 'northwind', reference: 'AH-2C3D4E', name: 'Northwind Labs', type: 'organization', details: 'Software · 201–500 people', contactName: 'N. Kapoor', contactRole: 'Talent lead', contactEmail: 'talent@northwind.example', contactPhone: '+91 22 555 0191', submittedAt: ago(460), status: 'approved', website: 'https://northwind.example', subscription: 'active' },
  { id: 'rejected', reference: 'AH-8R1N4D', name: 'Sample rejected application', type: 'university', details: 'Tier 2 · Sample location', contactName: 'Sample contact', contactRole: 'Coordinator', contactEmail: 'contact@sample.example', contactPhone: '—', submittedAt: ago(700), status: 'rejected', note: 'Please provide a verified institutional email domain.' },
];

const initialReviews: ReviewItem[] = [
  { id: 'rv-react-52', reference: 'SUB-A1B2', title: 'Interactive product catalogue', skill: 'React', score: 52, confidence: 'Medium', flags: [], submittedAt: ago(104), dueAt: dueForAge(104), status: 'pending', summary: 'A compact storefront with a clear product browsing flow and responsive layout.', rationale: 'The interface covers the primary path. Component boundaries and loading states need a closer human review.', evidence: 'src/cart.tsx · lines 14–38\n\nconst addItem = (item) => {\n  setItems((current) => [...current, item]);\n};' },
  { id: 'rv-data-48', reference: 'SUB-C3D4', title: 'Retail demand forecast', skill: 'Data analysis', score: 48, confidence: 'Low', flags: ['Check this: evidence is incomplete'], submittedAt: ago(18), dueAt: dueForAge(18), status: 'pending', summary: 'A small forecasting notebook with a documented data source.', rationale: 'The dataset and chart are present, but validation steps are limited.', evidence: 'forecast.ipynb · cells 4–7\n\ntrain, test = split(data)\nmodel.fit(train)' },
  { id: 'rv-api-59', reference: 'SUB-E5F6', title: 'Appointment booking API', skill: 'Backend', score: 59, confidence: 'High', flags: ['Check this: verify originality evidence'], submittedAt: ago(47), dueAt: dueForAge(47), status: 'pending', summary: 'REST endpoints support scheduling and cancellation.', rationale: 'Core endpoints are clear. Add resilience checks around concurrent bookings.', evidence: 'api/bookings.ts · lines 21–43\n\nawait repository.create(booking);' },
  { id: 'rv-web-43', reference: 'SUB-G7H8', title: 'Community events board', skill: 'Frontend', score: 43, confidence: 'Medium', flags: [], submittedAt: ago(2), dueAt: dueForAge(2), status: 'pending', summary: 'A working event list with category filters.', rationale: 'Filtering works in the demo. Keyboard behavior and empty states are not shown.', evidence: 'src/filters.tsx · lines 10–29' },
  { id: 'rv-pm-56', reference: 'SUB-J9K0', title: 'Inventory workflow redesign', skill: 'Product management', score: 56, confidence: 'Medium', flags: ['Check this: claims need a second look'], submittedAt: ago(225), dueAt: dueForAge(225), status: 'pending', summary: 'A process map and prototype describe a stock-alert flow.', rationale: 'The decision rationale references evidence that may need a human comparison.', evidence: 'prototype-notes.md · lines 7–19' },
];

const initialTickets: Ticket[] = [
  { id: 'tk-104', reference: 'TKT-104', skill: 'React', skillId: 'skill-react', score: 52, reason: 'The state update was evaluated without considering the accessible keyboard flow.', status: 'open', originalReviewer: 'Reviewer 3', originalReviewerId: 'reviewer-3', createdAt: ago(5) },
  { id: 'tk-103', reference: 'TKT-103', skill: 'Backend', skillId: 'skill-backend', score: 61, reason: 'The API has additional tests and a clearer failure response.', status: 'ack', originalReviewer: 'Reviewer 2', originalReviewerId: 'reviewer-2', createdAt: ago(30) },
  { id: 'tk-102', reference: 'TKT-102', skill: 'Data analysis', skillId: 'skill-data', score: 48, reason: 'The submitted notebook includes validation not mentioned in the summary.', status: 'in_review', assignee: 'Reviewer 2', assigneeId: 'reviewer-2', originalReviewer: 'Admin 1', originalReviewerId: 'admin-1', createdAt: ago(72) },
  { id: 'tk-101', reference: 'TKT-101', skill: 'Frontend', score: 54, reason: 'The evidence link was unavailable when the score was issued.', status: 'decided', originalReviewer: 'Reviewer 3', originalReviewerId: 'reviewer-3', createdAt: ago(170), decision: 'upheld' },
];

const initialRuns: AgentRun[] = Array.from({ length: 22 }, (_, index) => {
  const state: AgentRun['status'] = index % 9 === 2 ? 'failed' : index % 11 === 3 ? 'timeout' : index % 13 === 7 ? 'running' : 'succeeded';
  return {
    id: `run-${String(8310 + index)}`, kind: ['audit', 'assign', 'match', 'jd_extract', 'profile'][index % 5] ?? 'audit',
    mode: (['mock', 'direct', 'n8n'][index % 3] ?? 'mock') as AgentRun['mode'], status: state,
    stage: state === 'failed' ? 'scoring' : state === 'running' ? 'reading evidence' : 'complete', attempt: state === 'failed' ? 2 : 1,
    latency: 850 + ((index * 527) % 8100), tokensIn: 1200 + index * 17, tokensOut: 310 + index * 9,
    reference: `SUB-${String.fromCharCode(65 + (index % 26))}${index + 10}K`, createdAt: ago(index * 2.7),
    ...(state === 'failed' ? { error: 'The review could not complete. The source response timed out.' } : {}),
  };
});

const defaultConfig: AppConfig = { AGENT_MODE: 'mock', PASS_MARK: 50, BORDERLINE: [40, 60], REQUIRE_VIDEO: true, VIDEO_MAX_MB: 50, VIDEO_MAX_SECONDS: 190, AI_DAILY_CAP_PER_USER: 5, AI_KILL_SWITCH: false };

const initialAuditEvents: AuditEvent[] = [
  { id: 'audit-sample-1', at: ago(3), actor: 'Admin 1', role: 'admin', action: 'Review decision', target: 'audit · SUB-HIST-01', detail: 'Sample event · score confirmed' },
  { id: 'audit-sample-2', at: ago(16), actor: 'Reviewer 2', role: 'admin', action: 'Ticket decision', target: 'ticket · TKT-101', detail: 'Sample event · appeal upheld' },
  { id: 'audit-sample-3', at: ago(30), actor: 'Admin 1', role: 'admin', action: 'Configuration change', target: 'app_config · PASS_MARK', detail: 'Sample event · policy updated' },
  { id: 'audit-sample-4', at: ago(48), actor: 'Admin 1', role: 'admin', action: 'Approval', target: 'university · AH-1B2A3C', detail: 'Sample event · approved' },
];
const initialNotifications: NotificationItem[] = [
  { id: 'notice-sample-1', title: 'Borderline review due soon', body: 'Sample submission SUB-C3D4 is approaching its review target.', at: ago(2), href: '/reviews' },
  { id: 'notice-sample-2', title: 'Appeal awaiting a reviewer', body: 'Sample ticket TKT-104 needs acknowledgement.', at: ago(6), href: '/tickets' },
  { id: 'notice-sample-3', title: 'Organization application received', body: 'Sample application AH-4M8Z2D is waiting for review.', at: ago(18), href: '/approvals' },
];
const staffData: Staff[] = [
  { id: 'admin-1', name: 'Admin 1', role: 'Admin' }, { id: 'reviewer-2', name: 'Reviewer 2', role: 'Admin' }, { id: 'reviewer-3', name: 'Reviewer 3', role: 'Admin' },
  { id: 'uni-staff-1', name: 'University staff · Sample', role: 'University' }, { id: 'org-staff-1', name: 'Organization staff · Sample', role: 'Organization' },
];

const mockSnapshotSchema = z.object({
  applications: z.array(z.object({ id: z.string(), status: z.enum(['pending', 'approved', 'rejected']), note: z.string().optional(), subscription: z.enum(['active', 'inactive']).optional() })),
  reviews: z.array(z.object({ id: z.string(), status: z.enum(['pending', 'confirmed', 'adjusted']), score: z.number().int().min(0).max(100), humanScore: z.number().int().min(0).max(100).optional(), originalReviewer: z.string().optional() })),
  tickets: z.array(z.object({ id: z.string(), status: z.enum(['open', 'ack', 'in_review', 'decided']), assignee: z.string().optional(), assigneeId: z.string().optional(), score: z.number().int().min(0).max(100), decision: z.enum(['upheld', 'overturned', 'adjusted']).optional() })),
  runs: z.array(z.object({ id: z.string(), status: z.enum(['succeeded', 'failed', 'timeout', 'running', 'queued']), stage: z.string(), attempt: z.number().int().min(1) })),
  auditEvents: z.array(z.object({ id: z.string(), at: z.string(), actor: z.string(), role: z.string(), action: z.string(), target: z.string(), detail: z.string(), sensitive: z.boolean().optional() })),
  notifications: z.array(z.object({ id: z.string(), title: z.string(), body: z.string(), at: z.string(), readAt: z.string().optional(), href: z.string().optional() })),
  config: z.object({
    AGENT_MODE: z.enum(['mock', 'direct', 'n8n']), PASS_MARK: z.number().int().min(1).max(99),
    BORDERLINE: z.tuple([z.number().int().min(0).max(100), z.number().int().min(0).max(100)]),
    REQUIRE_VIDEO: z.boolean(), VIDEO_MAX_MB: z.number().int().min(1).max(500), VIDEO_MAX_SECONDS: z.number().int().min(30).max(600),
    AI_DAILY_CAP_PER_USER: z.number().int().min(0).max(50), AI_KILL_SWITCH: z.boolean(),
  }),
});

const accountByEmail = {
  'admin@demo.aptohire.test': { id: 'admin-1', actor: 'Admin 1', role: 'admin' },
  'reviewer2@demo.aptohire.test': { id: 'reviewer-2', actor: 'Reviewer 2', role: 'admin' },
  'reviewer3@demo.aptohire.test': { id: 'reviewer-3', actor: 'Reviewer 3', role: 'admin' },
  'aarav@unia.edu.test': { id: 'student-1', actor: 'Student · Sample', role: 'student' },
  'tpo@unia.edu.test': { id: 'uni-staff-1', actor: 'University staff · Sample', role: 'university' },
  'recruiter@orga.demo.test': { id: 'org-staff-1', actor: 'Organization staff · Sample', role: 'organization' },
} as const;
type MockAccount = (typeof accountByEmail)[keyof typeof accountByEmail];

export class MockBackend implements Backend {
  private applications = structuredClone(initialApplications);
  private reviewItems = structuredClone(initialReviews);
  private ticketItems = structuredClone(initialTickets);
  private runItems = structuredClone(initialRuns);
  private currentConfig = structuredClone(defaultConfig);
  private actor = 'Admin 1';
  private identityId = 'admin-1';
  private signedIn = false;
  private actorRole: 'admin' | 'student' | 'university' | 'organization' = 'admin';
  private mfaComplete = false;
  private mfaSetupStarted = false;
  private auditEvents: AuditEvent[] = structuredClone(initialAuditEvents);
  private notificationItems: NotificationItem[] = structuredClone(initialNotifications);
  private readonly stateKey = 'aptohire-admin-mock-state';

  constructor() {
    this.restoreIdentity();
    this.restoreState();
  }

  auth = {
    signIn: (email: string, password: string) => this.signIn(email, password),
    signOut: () => this.signOut(),
    profile: (id: string) => this.profile(id),
    mfaStatus: () => this.mfaStatus(),
    beginMfaEnrollment: () => this.beginMfaEnrollment(),
    verifyMfa: (code: string) => this.verifyMfa(code),
    requestPasswordReset: (email: string) => this.requestPasswordReset(email),
    updatePassword: (password: string) => this.updatePassword(password),
  };

  private applyAccount(account: MockAccount): void {
    this.identityId = account.id;
    this.signedIn = true;
    this.actor = account.actor;
    this.actorRole = account.role;
  }

  private restoreIdentity(): void {
    try {
      const savedEmail = sessionStorage.getItem('aptohire-admin-mock-account')?.toLowerCase();
      if (savedEmail && savedEmail in accountByEmail) this.applyAccount(accountByEmail[savedEmail as keyof typeof accountByEmail]);
    } catch { /* Storage may be unavailable in restricted browsers. */ }
  }

  private mfaKey(): string { return `aptohire-admin-demo-mfa:${this.identityId}`; }
  private requireAdmin(): void { if (!this.signedIn || this.actorRole !== 'admin' || !this.mfaComplete) throw new Error('FORBIDDEN'); }

  private restoreState(): void {
    try {
      const raw = sessionStorage.getItem(this.stateKey);
      if (!raw) return;
      const parsed = mockSnapshotSchema.safeParse(JSON.parse(raw) as unknown);
      if (!parsed.success) { sessionStorage.removeItem(this.stateKey); return; }
      const saved = parsed.data;
      for (const row of this.applications) {
        const state = saved.applications.find((item) => item.id === row.id);
        if (state) { row.status = state.status; row.note = state.note; row.subscription = state.subscription ?? row.subscription; }
      }
      for (const row of this.reviewItems) {
        const state = saved.reviews.find((item) => item.id === row.id);
        if (state) { row.status = state.status; row.score = state.score; row.humanScore = state.humanScore; row.originalReviewer = state.originalReviewer; }
      }
      for (const row of this.ticketItems) {
        const state = saved.tickets.find((item) => item.id === row.id);
        if (state) { row.status = state.status; row.assignee = state.assignee; row.assigneeId = state.assigneeId; row.score = state.score; row.decision = state.decision; }
      }
      for (const row of this.runItems) {
        const state = saved.runs.find((item) => item.id === row.id);
        if (state) { row.status = state.status; row.stage = state.stage; row.attempt = state.attempt; }
      }
      this.auditEvents = saved.auditEvents;
      this.notificationItems = saved.notifications;
      this.currentConfig = saved.config;
    } catch { /* Corrupt or blocked storage falls back to fresh fictional data. */ }
  }

  private persistState(): void {
    try {
      const snapshot = {
        applications: this.applications.map(({ id, status, note, subscription }) => ({ id, status, note, subscription })),
        reviews: this.reviewItems.map(({ id, status, score, humanScore, originalReviewer }) => ({ id, status, score, humanScore, originalReviewer })),
        tickets: this.ticketItems.map(({ id, status, assignee, assigneeId, score, decision }) => ({ id, status, assignee, assigneeId, score, decision })),
        runs: this.runItems.map(({ id, status, stage, attempt }) => ({ id, status, stage, attempt })),
        auditEvents: this.auditEvents, notifications: this.notificationItems,
        config: this.currentConfig,
      };
      const checked = mockSnapshotSchema.parse(snapshot);
      sessionStorage.setItem(this.stateKey, JSON.stringify(checked));
    } catch { /* The in-memory demo remains usable when storage is unavailable. */ }
  }

  async signIn(email: string, password: string): Promise<{ id: string; email: string }> {
    await wait();
    const lower = email.trim().toLowerCase();
    const account = accountByEmail[lower as keyof typeof accountByEmail];
    if (!account || !password.trim()) throw new Error('INVALID_CREDENTIALS');
    this.applyAccount(account);
    this.mfaComplete = false; this.mfaSetupStarted = false;
    try { sessionStorage.setItem('aptohire-admin-mock-account', lower); } catch { /* Auth still works for the current page. */ }
    return { id: account.id, email: lower };
  }

  async signOut(): Promise<void> {
    await wait();
    this.mfaComplete = false; this.mfaSetupStarted = false;
    this.actor = 'Admin 1'; this.identityId = 'admin-1'; this.actorRole = 'admin'; this.signedIn = false;
    try { sessionStorage.removeItem('aptohire-admin-mock-account'); } catch { /* Ignore unavailable storage. */ }
  }

  async profile(id: string): Promise<{ role: 'admin' | 'student' | 'university' | 'organization'; name: string }> {
    await wait();
    if (!this.signedIn || id !== this.identityId) throw new Error('SESSION_EXPIRED');
    return { role: this.actorRole, name: this.actor };
  }

  async mfaStatus(): Promise<'needs-enroll' | 'needs-challenge' | 'ready'> {
    await wait();
    if (!this.signedIn) throw new Error('SESSION_EXPIRED');
    if (this.actorRole !== 'admin') return 'needs-enroll';
    if (this.mfaComplete) return 'ready';
    try { return sessionStorage.getItem(this.mfaKey()) === 'enrolled' ? 'needs-challenge' : 'needs-enroll'; }
    catch { return 'needs-enroll'; }
  }

  async beginMfaEnrollment(): Promise<{ qrCode: string; secret: string }> {
    await wait();
    if (!this.signedIn || this.actorRole !== 'admin') throw new Error('FORBIDDEN');
    this.mfaSetupStarted = true;
    const secret = `DEMO-${this.identityId.toUpperCase()}-SECRET-ONLY`;
    const qrCode = '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160"><rect width="160" height="160" fill="white"/><path d="M15 15h45v45H15zM100 15h45v45h-45zM15 100h45v45H15zM75 20h10v10H75zM75 40h10v20H75zM70 80h15v10H70zM95 80h15v10H95zM120 75h20v10h-20zM70 105h10v30H70zM95 105h35v10H95zM120 125h20v15h-20z" fill="black"/></svg>';
    return { qrCode: `data:image/svg+xml,${encodeURIComponent(qrCode)}`, secret };
  }

  async verifyMfa(code: string): Promise<void> {
    await wait();
    if (!this.signedIn || this.actorRole !== 'admin') throw new Error('FORBIDDEN');
    let enrolled = false;
    try { enrolled = sessionStorage.getItem(this.mfaKey()) === 'enrolled'; } catch { /* Treat unavailable storage as no existing enrollment. */ }
    if (!enrolled && !this.mfaSetupStarted) throw new Error('MFA_REQUIRED');
    if (code !== '123456') throw new Error('INVALID_CODE');
    this.mfaComplete = true;
    try { sessionStorage.setItem(this.mfaKey(), 'enrolled'); } catch { /* Current page can continue, but enrollment will not persist. */ }
  }

  async requestPasswordReset(email: string): Promise<void> { await wait(); if (!z.string().email().safeParse(email.trim()).success) throw new Error('VALIDATION_FAILED'); }
  async updatePassword(password: string): Promise<void> { await wait(); if (password.length < 10 || password.length > 256) throw new Error('VALIDATION_FAILED'); }

  async counts(): Promise<QueueCounts> {
    await wait(); this.requireAdmin();
    return { approvals: this.applications.filter((item) => item.status === 'pending').length, reviews: this.reviewItems.filter((item) => item.status === 'pending').length, tickets: this.ticketItems.filter((item) => item.status !== 'decided').length, runs: this.runItems.filter((item) => item.status === 'failed' || item.status === 'timeout').length };
  }

  async approvals(): Promise<Application[]> { await wait(); this.requireAdmin(); return structuredClone(this.applications); }

  async decideApplication(input: DecisionInput): Promise<void> {
    const parsed = decisionSchema.parse(input); await wait();
    if (!this.signedIn || this.actorRole !== 'admin' || !this.mfaComplete) throw new Error('FORBIDDEN');
    const row = this.applications.find((item) => item.id === parsed.id);
    if (!row || (row.status !== 'pending' && !(row.status === 'rejected' && parsed.action === 'approve'))) throw new Error('CONFLICT');
    if (parsed.type && parsed.type !== row.type) throw new Error('VALIDATION_FAILED');
    if (parsed.action === 'reject' && (parsed.note?.trim().length ?? 0) < 10) throw new Error('VALIDATION_FAILED');
    row.status = parsed.action === 'approve' ? 'approved' : 'rejected';
    if (parsed.action === 'approve') row.note = undefined;
    else row.note = parsed.note?.trim();
    this.recordAudit(parsed.action === 'approve' ? 'Approval' : 'Rejection', `${row.type} · ${row.reference}`, parsed.action === 'approve' ? 'Application decision recorded' : 'Application rejected with a review note'); this.persistState();
  }

  async setSubscription(id: string, status: 'active' | 'inactive'): Promise<void> {
    await wait();
    if (!this.signedIn || this.actorRole !== 'admin' || !this.mfaComplete) throw new Error('FORBIDDEN');
    const row = this.applications.find((item) => item.id === id);
    if (!row) throw new Error('NOT_FOUND');
    if (row.type !== 'organization' || row.status !== 'approved') throw new Error('CONFLICT');
    row.subscription = status; this.recordAudit('Subscription change', `organization · ${row.reference}`, `Subscription set to ${status}`); this.persistState();
  }

  async reviews(): Promise<ReviewItem[]> { await wait(); this.requireAdmin(); return structuredClone(this.reviewItems); }

  async decideReview(id: string, score: number, reason?: string, _skillId?: string): Promise<void> {
    await wait();
    if (!this.signedIn || this.actorRole !== 'admin' || !this.mfaComplete) throw new Error('FORBIDDEN');
    const row = this.reviewItems.find((item) => item.id === id);
    if (!row || row.status !== 'pending') throw new Error('CONFLICT');
    if (!Number.isSafeInteger(score) || score < 0 || score > 100) throw new Error('VALIDATION_FAILED');
    if (score !== row.score && (reason?.trim().length ?? 0) < 20) throw new Error('VALIDATION_FAILED');
    row.status = score === row.score ? 'confirmed' : 'adjusted'; row.humanScore = score; row.originalReviewer = this.actor;
    this.recordAudit('Review decision', `audit · ${row.reference}`, `${row.status} · AI score ${row.score}, human score ${score}`); this.persistState();
  }

  async tickets(): Promise<Ticket[]> { await wait(); this.requireAdmin(); return structuredClone(this.ticketItems); }

  async updateTicket(id: string, action: 'ack' | 'assign' | 'decide', assignee?: string, decision?: Ticket['decision'], reason?: string, adjustedScores?: Array<{ skillId: string; score: number }>): Promise<void> {
    await wait();
    if (!this.signedIn || this.actorRole !== 'admin' || !this.mfaComplete) throw new Error('FORBIDDEN');
    const row = this.ticketItems.find((item) => item.id === id);
    if (!row) throw new Error('NOT_FOUND');
    if (action === 'ack') {
      if (row.status !== 'open') throw new Error('CONFLICT');
      row.status = 'ack';
    }
    if (action === 'assign') {
      if (row.status !== 'ack') throw new Error('CONFLICT');
      const reviewer = staffData.find((person) => person.id === assignee && person.role === 'Admin');
      if (!reviewer || reviewer.id === row.originalReviewerId) throw new Error('FORBIDDEN');
      row.assigneeId = reviewer.id; row.assignee = reviewer.name; row.status = 'in_review';
    }
    if (action === 'decide') {
      if (row.status !== 'in_review') throw new Error('CONFLICT');
      if (this.identityId === row.originalReviewerId) throw new Error('FORBIDDEN');
      if (row.assigneeId !== this.identityId) throw new Error('FORBIDDEN');
      if ((reason?.trim().length ?? 0) < 20 || !decision) throw new Error('VALIDATION_FAILED');
      if (decision === 'adjusted') {
        const score = adjustedScores?.find((item) => item.skillId === row.skillId)?.score;
        if (!Number.isSafeInteger(score) || (score as number) < 0 || (score as number) > 100) throw new Error('VALIDATION_FAILED');
        row.score = score as number;
      }
      row.status = 'decided'; row.decision = decision;
    }
    this.recordAudit(action === 'decide' ? 'Ticket decision' : action === 'assign' ? 'Ticket assignment' : 'Ticket acknowledgement', `ticket · ${row.reference}`, action === 'decide' ? `Decision recorded: ${decision}` : action === 'assign' ? `Assigned to ${row.assignee ?? 'reviewer'}` : 'Appeal acknowledged'); this.persistState();
  }

  async runs(): Promise<AgentRun[]> { await wait(); this.requireAdmin(); return structuredClone(this.runItems); }

  async retryRun(id: string): Promise<void> {
    await wait();
    if (!this.signedIn || this.actorRole !== 'admin' || !this.mfaComplete) throw new Error('FORBIDDEN');
    const row = this.runItems.find((item) => item.id === id);
    if (!row || !['failed', 'timeout'].includes(row.status)) throw new Error('CONFLICT');
    if (this.currentConfig.AI_KILL_SWITCH) throw new Error('FORBIDDEN');
    row.status = 'queued'; row.stage = 'queued for retry'; row.error = undefined; row.attempt += 1;
    const attempt = row.attempt; this.recordAudit('Agent retry', `run · ${row.id}`, `Retry attempt ${attempt} queued`); this.persistState();
    setTimeout(() => {
      const current = this.runItems.find((item) => item.id === id);
      if (!current || current.attempt !== attempt || current.status !== 'queued') return;
      current.status = 'running'; current.stage = 'reading evidence'; this.persistState();
    }, 700);
    setTimeout(() => {
      const current = this.runItems.find((item) => item.id === id);
      if (!current || current.attempt !== attempt || !['queued', 'running'].includes(current.status)) return;
      if (this.currentConfig.AI_KILL_SWITCH) {
        current.status = 'failed'; current.stage = 'blocked by kill switch'; current.error = 'The retry stopped because the AI kill switch was enabled.';
      } else {
        current.status = 'succeeded'; current.stage = 'complete'; current.error = undefined;
      }
      this.persistState();
    }, 2200);
  }

  async config(): Promise<AppConfig> { await wait(); this.requireAdmin(); return structuredClone(this.currentConfig); }

  async updateConfig(input: import('../domain/types').ConfigChangeInput): Promise<void> {
    const parsed = configChangeSchema.parse(input); await wait();
    if (!this.signedIn || this.actorRole !== 'admin' || !this.mfaComplete) throw new Error('FORBIDDEN');
    const { key, value } = parsed;
    const isInteger = (candidate: unknown, min: number, max: number): candidate is number => typeof candidate === 'number' && Number.isSafeInteger(candidate) && candidate >= min && candidate <= max;
    if (key === 'AGENT_MODE' && !['mock', 'direct', 'n8n'].includes(String(value))) throw new Error('VALIDATION_FAILED');
    if (key === 'PASS_MARK' && !isInteger(value, 1, 99)) throw new Error('VALIDATION_FAILED');
    if (key === 'BORDERLINE') {
      if (!Array.isArray(value) || value.length !== 2 || !value.every((part) => typeof part === 'number' && Number.isSafeInteger(part) && part >= 0 && part <= 100) || Number(value[0]) >= Number(value[1])) throw new Error('VALIDATION_FAILED');
    }
    if (key === 'REQUIRE_VIDEO' && typeof value !== 'boolean') throw new Error('VALIDATION_FAILED');
    if (key === 'VIDEO_MAX_MB' && !isInteger(value, 1, 500)) throw new Error('VALIDATION_FAILED');
    if (key === 'VIDEO_MAX_SECONDS' && !isInteger(value, 30, 600)) throw new Error('VALIDATION_FAILED');
    if (key === 'AI_DAILY_CAP_PER_USER' && !isInteger(value, 0, 50)) throw new Error('VALIDATION_FAILED');
    if (key === 'AI_KILL_SWITCH' && typeof value !== 'boolean') throw new Error('VALIDATION_FAILED');
    if (['AGENT_MODE', 'PASS_MARK', 'BORDERLINE'].includes(key) && (parsed.reason?.trim().length ?? 0) < 20) throw new Error('VALIDATION_FAILED');
    (this.currentConfig as unknown as Record<string, unknown>)[key] = structuredClone(value);
    this.recordAudit('Configuration change', `app_config · ${key}`, parsed.reason?.trim() || 'Setting updated'); this.persistState();
  }

  async staff(): Promise<Staff[]> { await wait(); this.requireAdmin(); return structuredClone(staffData); }

  async resetDemo(): Promise<void> {
    await wait();
    if (env.VITE_APP_ENV === 'production') throw new Error('FORBIDDEN');
    if (!this.signedIn || this.actorRole !== 'admin' || !this.mfaComplete) throw new Error('FORBIDDEN');
    this.applications = structuredClone(initialApplications); this.reviewItems = structuredClone(initialReviews);
    this.ticketItems = structuredClone(initialTickets); this.runItems = structuredClone(initialRuns);
    this.currentConfig = structuredClone(defaultConfig); this.auditEvents = []; this.notificationItems = structuredClone(initialNotifications); this.recordAudit('Demo reset', 'sample data', 'Fictional demo data restored'); this.persistState();
  }

  private recordAudit(action: string, target: string, detail: string): void {
    this.auditEvents.unshift({ id: `event-${Date.now()}-${this.auditEvents.length}`, at: new Date().toISOString(), actor: this.actor, role: this.actorRole, action, target, detail });
  }

  async auditLog(): Promise<AuditEvent[]> { await wait(); this.requireAdmin(); return structuredClone(this.auditEvents); }
  async notifications(): Promise<NotificationItem[]> { await wait(); this.requireAdmin(); return structuredClone(this.notificationItems); }
  async markNotificationsRead(): Promise<void> {
    await wait();
    if (!this.signedIn || this.actorRole !== 'admin' || !this.mfaComplete) throw new Error('FORBIDDEN');
    const at = new Date().toISOString();
    this.notificationItems = this.notificationItems.map((item) => item.readAt ? item : { ...item, readAt: at });
    this.persistState();
  }
  getAuditCount(): number { return this.auditEvents.length; }
}
