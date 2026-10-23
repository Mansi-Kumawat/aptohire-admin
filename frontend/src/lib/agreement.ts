export type HumanDecision = { aiScore: number; humanScore: number; outcome: 'confirmed' | 'adjusted' | 'overturned' };
export const AGREEMENT_TOLERANCE = 5; // TODO(decision): confirm the agreement tolerance with the rubric owners.
export function agrees(decision: HumanDecision): boolean { return decision.outcome === 'confirmed' || Math.abs(decision.aiScore - decision.humanScore) <= AGREEMENT_TOLERANCE; }
export function isFalsePass(decision: HumanDecision, passMark: number): boolean { return decision.aiScore > passMark && decision.humanScore <= passMark; }
export function isSmallSample(count: number): boolean { return count < 30; }
