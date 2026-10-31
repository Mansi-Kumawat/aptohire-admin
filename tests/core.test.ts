import { describe, expect, it } from 'vitest';
import { levelFor, isBorderline, isVerified } from '../frontend/src/lib/levels';
import { addWorkingDays, isDueSoon, isOverdue } from '../frontend/src/lib/sla';
import { reviewConsequence } from '../frontend/src/lib/consequence';
import { borderlineSchema, dailyCapSchema, durationSchema, matchesTypedConfirm, passMarkSchema, videoLimitSchema } from '../frontend/src/lib/configRules';
import { agrees, isFalsePass, isSmallSample } from '../frontend/src/lib/agreement';
import { eligibleReviewers } from '../frontend/src/lib/reviewer';
import { mfaState } from '../frontend/src/lib/mfa';
import { guardCsvCell, toCsv } from '../frontend/src/lib/csvExport';

describe('score levels and config-driven flags', () => {
  it.each([[0,'Emerging'],[40,'Emerging'],[50,'Emerging'],[51,'Competent'],[60,'Competent'],[61,'Competent'],[69,'Competent'],[70,'Proficient'],[84,'Proficient'],[85,'Advanced'],[100,'Advanced']] as const)('maps %i to %s', (score, level) => expect(levelFor(score)).toBe(level));
  it('verifies only scores above the configured pass mark', () => { expect(isVerified(50,50)).toBe(false); expect(isVerified(51,50)).toBe(true); });
  it('uses the supplied borderline endpoints', () => { expect(isBorderline(40,[40,60])).toBe(true); expect(isBorderline(60,[40,60])).toBe(true); expect(isBorderline(61,[40,60])).toBe(false); });
  it('explains verified and held consequences', () => { expect(reviewConsequence(58,50,[40,60]).message).toContain('Verified'); expect(reviewConsequence(58,50,[40,60]).held).toBe(true); });
});

describe('working-day service targets', () => {
  it('adds three working days across the weekend', () => { expect(addWorkingDays('2026-10-16T12:00:00',3).getDay()).toBe(3); });
  it('identifies overdue and due-soon items', () => { const now = new Date('2026-10-15T12:00:00'); expect(isOverdue('2026-10-14T12:00:00',now)).toBe(true); expect(isDueSoon('2026-10-16T08:00:00',now)).toBe(true); });
});

describe('configuration validation', () => {
  it('accepts safe boundary values and rejects out of range values', () => { expect(passMarkSchema.safeParse(99).success).toBe(true); expect(passMarkSchema.safeParse(100).success).toBe(false); expect(borderlineSchema.safeParse([40,60]).success).toBe(true); expect(borderlineSchema.safeParse([60,40]).success).toBe(false); expect(videoLimitSchema.safeParse(50).success).toBe(true); expect(durationSchema.safeParse(190).success).toBe(true); expect(dailyCapSchema.safeParse(0).success).toBe(false); expect(dailyCapSchema.safeParse(1).success).toBe(true); });
  it('requires exact typed confirmation', () => { expect(matchesTypedConfirm('PAUSE','PAUSE')).toBe(true); expect(matchesTypedConfirm('PAUSE','pause')).toBe(false); });
});

describe('reviewer, MFA, agreement and export helpers', () => {
  it('excludes the reviewer who made the original decision', () => { expect(eligibleReviewers([{id:'a',name:'A'},{id:'b',name:'B'}],'a').map((person) => person.id)).toEqual(['b']); });
  it('enforces the gate state order', () => { expect(mfaState({hasSession:false})).toBe('no-session'); expect(mfaState({hasSession:true,role:'student'})).toBe('wrong-role'); expect(mfaState({hasSession:true,role:'admin'})).toBe('needs-enroll'); expect(mfaState({hasSession:true,role:'admin',hasVerifiedTotp:true,assurance:'aal1'})).toBe('needs-challenge'); expect(mfaState({hasSession:true,role:'admin',hasVerifiedTotp:true,assurance:'aal2'})).toBe('ready'); });
  it('calculates agreement and false passes', () => { expect(agrees({aiScore:52,humanScore:52,outcome:'confirmed'})).toBe(true); expect(agrees({aiScore:52,humanScore:57,outcome:'adjusted'})).toBe(true); expect(isFalsePass({aiScore:54,humanScore:49,outcome:'adjusted'},50)).toBe(true); expect(isSmallSample(29)).toBe(true); });
  it('guards spreadsheet formulas and emits a UTF-8 BOM', () => { expect(guardCsvCell('=1+1')).toBe("'=1+1"); expect(guardCsvCell('  =1+1')).toBe("'  =1+1"); expect(guardCsvCell('\t=1+1')).toBe("'\t=1+1"); expect(toCsv([['name'],['safe']]).charCodeAt(0)).toBe(0xfeff); });
});
