export type Reviewer = { id: string; name: string };
export function eligibleReviewers<T extends Reviewer>(reviewers: readonly T[], originalReviewerId: string | null | undefined): T[] {
  return reviewers.filter((reviewer) => reviewer.id !== originalReviewerId);
}
