import { isBorderline, isVerified, levelFor } from './levels';
export type Consequence = { score: number; level: string; verified: boolean; held: boolean; message: string };
export function reviewConsequence(score: number, passMark: number, borderline: readonly [number, number]): Consequence {
  const verified = isVerified(score, passMark);
  const held = isBorderline(score, borderline);
  const level = levelFor(score);
  const message = `New score ${score} → ${level} · ${verified ? 'Verified' : 'Not verified'}.${verified ? ' It will become visible to organizations.' : ''}${held ? ' It will be final after this human decision and will not be held again.' : ''}`;
  return { score, level, verified, held, message };
}
