import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseBackend } from '../backend/src/adapters/supabase';

type DbResponse = { data: unknown; error: null };

function clientFixture(responses: Record<string, unknown>, calls: { table: string; columns: string }[] = [], invokes: { name: string; body: Record<string, unknown> }[] = []): SupabaseClient {
  const from = (table: string) => {
    let columns = '';
    const result = { data: responses[table] ?? [], error: null } as DbResponse;
    const builder = {
      select(value: string) { columns = value; calls.push({ table, columns }); return builder; },
      eq() { return builder; }, order() { return builder; }, limit() { return builder; }, in() { return builder; },
      maybeSingle: async () => ({ data: Array.isArray(result.data) ? result.data[0] ?? null : result.data, error: null }),
      then(resolve: (value: DbResponse) => unknown, reject?: (reason: unknown) => unknown) { return Promise.resolve(result).then(resolve, reject); },
    };
    return builder;
  };
  const client = {
    from,
    functions: { invoke: vi.fn(async (name: string, options: { body: Record<string, unknown> }) => { invokes.push({ name, body: options.body }); return { data: {}, error: null }; }) },
  };
  return client as unknown as SupabaseClient;
}

describe('Supabase Admin adapter contract mapping', () => {
  it('loads blind review details without requesting student identity and sends the frozen review payload', async () => {
    const calls: { table: string; columns: string }[] = [];
    const invokes: { name: string; body: Record<string, unknown> }[] = [];
    const backend = new SupabaseBackend(clientFixture({
      admin_borderline_v: [{ audit_id: 'audit-1', submission_id: 'submission-1', overall_score: 52, review_status: 'pending', created_at: '2026-10-29T10:00:00.000Z' }],
      admin_agreement_v: [],
      audits: [{ id: 'audit-1', summary: 'A short blind summary.', rubric: [{ key: 'skill_score', skill_id: 'skill-1', score: 52, rationale: 'The rubric evidence is limited.' }], evidence: [{ kind: 'repo', label: 'src/app.ts', excerpt: 'A plain-text excerpt.' }], confidence: 0.78, flags: ['possible_copied_work'], created_at: '2026-10-29T10:00:00.000Z' }],
      skill_scores: [{ audit_id: 'audit-1', skill_id: 'skill-1', score: 52 }],
      submissions: [{ id: 'submission-1', title: 'Fictional task' }], skills: [{ id: 'skill-1', name: 'Frontend development' }],
    }, calls, invokes));

    const [review] = await backend.reviews();
    expect(review).toMatchObject({ id: 'audit-1', title: 'Fictional task', skill: 'Frontend development', skillId: 'skill-1', score: 52, confidence: 'High', status: 'pending', summary: 'A short blind summary.', flags: ['possible_copied_work'] });
    expect(review?.evidence).toContain('A plain-text excerpt.');
    expect(calls.every((call) => !/student_id|full_name|primary_email|university/i.test(call.columns))).toBe(true);

    await backend.decideReview('audit-1', 52);
    expect(invokes).toEqual([{ name: 'admin-review-audit', body: { audit_id: 'audit-1', decision: 'confirm', note: 'Confirmed by admin reviewer.' } }]);
  });

  it('maps ticket details and keeps identity columns out of direct reads', async () => {
    const calls: { table: string; columns: string }[] = [];
    const backend = new SupabaseBackend(clientFixture({
      admin_tickets_v: [{ id: 'ticket-1', submission_id: 'submission-1', status: 'open', assigned_to: null, created_at: '2026-10-29T10:00:00.000Z', decision: null, original_reviewer_id: 'reviewer-1', assignee_name: null }],
      tickets: [{ id: 'ticket-1', reason: 'Please review the submitted evidence again.' }],
      audits: [{ id: 'audit-1', submission_id: 'submission-1', overall_score: 52, rubric: [], evidence: [{ kind: 'video', label: 'Video 00:12', excerpt: 'Sample evidence.' }], created_at: '2026-10-29T10:00:00.000Z' }],
      skill_scores: [{ audit_id: 'audit-1', skill_id: 'skill-1', score: 52 }], skills: [{ id: 'skill-1', name: 'Frontend development' }],
    }, calls));

    const [ticket] = await backend.tickets();
    expect(ticket).toMatchObject({ id: 'ticket-1', status: 'open', skill: 'Frontend development', skillId: 'skill-1', score: 52, reason: 'Please review the submitted evidence again.' });
    expect(ticket?.evidence).toContain('Sample evidence.');
    expect(calls.every((call) => !/student_id|full_name|primary_email|university/i.test(call.columns))).toBe(true);
  });
});
