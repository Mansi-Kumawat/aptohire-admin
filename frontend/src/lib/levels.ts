export type SkillLevel = 'Emerging' | 'Competent' | 'Proficient' | 'Advanced';
// Mirror of app_config. Keep in sync.
export const FALLBACK_PASS_MARK = 50;
// Mirror of app_config. Keep in sync.
export const FALLBACK_BORDERLINE: readonly [number, number] = [40, 60];
export function levelFor(score: number): SkillLevel {
  if (score <= 50) return 'Emerging';
  if (score <= 69) return 'Competent';
  if (score <= 84) return 'Proficient';
  return 'Advanced';
}
export function isVerified(score: number, passMark: number): boolean { return score > passMark; }
export function isBorderline(score: number, range: readonly [number, number]): boolean { return score >= range[0] && score <= range[1]; }
