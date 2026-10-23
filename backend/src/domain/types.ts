import { z } from 'zod';

export const roleSchema = z.enum(['admin', 'student', 'university', 'organization']);
export type Role = z.infer<typeof roleSchema>;
export type AppArea = 'approvals' | 'reviews' | 'tickets' | 'runs' | 'settings' | 'library' | 'audit-log' | 'users' | 'reports' | 'notifications' | 'account' | 'help';
export type AppConfig = {
  AGENT_MODE: 'mock' | 'direct' | 'n8n';
  PASS_MARK: number;
  BORDERLINE: [number, number];
  REQUIRE_VIDEO: boolean;
  VIDEO_MAX_MB: number;
  VIDEO_MAX_SECONDS: number;
  AI_DAILY_CAP_PER_USER: number;
  AI_KILL_SWITCH: boolean;
};
export type QueueCounts = { approvals: number; reviews: number; tickets: number; runs: number };
export type Application = {
  id: string; subjectId?: string; reference: string; name: string; type: 'university' | 'organization'; details: string;
  contactName: string; contactRole: string; contactEmail: string; contactPhone: string;
  submittedAt: string; status: 'pending' | 'approved' | 'rejected'; note?: string;
  rosterCount?: number; subscription?: 'active' | 'inactive'; website?: string; emailDomains?: string[]; payload?: Record<string, unknown>;
};
export type ReviewItem = {
  id: string; reference: string; title: string; skill: string; skillId?: string; score: number; humanScore?: number; confidence: 'High' | 'Medium' | 'Low';
  flags: string[]; submittedAt: string; dueAt: string; status: 'pending' | 'confirmed' | 'adjusted';
  summary: string; rationale: string; evidence: string; originalReviewer?: string;
};
export type Ticket = {
  id: string; reference: string; skill: string; skillId?: string; score: number; reason: string; status: 'open' | 'ack' | 'in_review' | 'decided';
  assignee?: string; assigneeId?: string; originalReviewer: string; originalReviewerId?: string;
  createdAt: string; decision?: 'upheld' | 'overturned' | 'adjusted';
};
export type AgentRun = {
  id: string; kind: string; mode: 'mock' | 'direct' | 'n8n'; status: 'succeeded' | 'failed' | 'timeout' | 'running' | 'queued';
  stage: string; attempt: number; latency: number; tokensIn: number; tokensOut: number; reference: string; createdAt: string; error?: string;
};
export type Staff = { id: string; name: string; role: string };
export type AuditEvent = { id: string; at: string; actor: string; role: string; action: string; target: string; detail: string; sensitive?: boolean };
export type NotificationItem = { id: string; title: string; body: string; at: string; readAt?: string; href?: string };

export const decisionSchema = z.object({ id: z.string().min(1), subjectId: z.string().min(1).optional(), type: z.enum(['university', 'organization']), action: z.enum(['approve', 'reject']), note: z.string().trim().max(600).optional() }).strict();
export const configChangeSchema = z.object({ key: z.enum(['AGENT_MODE', 'PASS_MARK', 'BORDERLINE', 'REQUIRE_VIDEO', 'VIDEO_MAX_MB', 'VIDEO_MAX_SECONDS', 'AI_DAILY_CAP_PER_USER', 'AI_KILL_SWITCH']), value: z.unknown(), reason: z.string().optional() });
export type DecisionInput = z.infer<typeof decisionSchema>;
export type ConfigChangeInput = z.infer<typeof configChangeSchema>;

export interface Backend {
  auth: {
    signIn(email: string, password: string): Promise<{ id: string; email: string }>;
    signOut(): Promise<void>;
    profile(id: string): Promise<{ role: Role; name: string }>;
    mfaStatus(): Promise<'needs-enroll' | 'needs-challenge' | 'ready'>;
    beginMfaEnrollment(): Promise<{ qrCode: string; secret: string }>;
    verifyMfa(code: string): Promise<void>;
    requestPasswordReset(email: string): Promise<void>;
    updatePassword(password: string): Promise<void>;
  };
  counts(): Promise<QueueCounts>;
  approvals(): Promise<Application[]>;
  decideApplication(input: DecisionInput): Promise<void>;
  setSubscription(id: string, status: 'active' | 'inactive'): Promise<void>;
  reviews(): Promise<ReviewItem[]>;
  decideReview(id: string, score: number, reason?: string, skillId?: string): Promise<void>;
  tickets(): Promise<Ticket[]>;
  updateTicket(id: string, action: 'ack' | 'assign' | 'decide', assignee?: string, decision?: Ticket['decision'], reason?: string, adjustedScores?: Array<{ skillId: string; score: number }>): Promise<void>;
  runs(): Promise<AgentRun[]>;
  retryRun(id: string): Promise<void>;
  config(): Promise<AppConfig>;
  updateConfig(input: ConfigChangeInput): Promise<void>;
  staff(): Promise<Staff[]>;
  auditLog(): Promise<AuditEvent[]>;
  notifications(): Promise<NotificationItem[]>;
  markNotificationsRead(): Promise<void>;
  resetDemo(): Promise<void>;
}
