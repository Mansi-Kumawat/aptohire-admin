const DAY = 86_400_000;
export function addWorkingDays(value: Date | string, workdays: number): Date {
  const date = new Date(value);
  let remaining = workdays;
  while (remaining > 0) {
    date.setDate(date.getDate() + 1);
    if (date.getDay() !== 0 && date.getDay() !== 6) remaining -= 1;
  }
  return date;
}
export function reviewDueAt(submittedAt: Date | string): Date { return addWorkingDays(submittedAt, 3); }
export function isOverdue(dueAt: Date | string, now = new Date()): boolean { return new Date(dueAt).getTime() < now.getTime(); }
export function isDueSoon(dueAt: Date | string, now = new Date()): boolean {
  const due = new Date(dueAt).getTime();
  return due >= now.getTime() && due - now.getTime() <= DAY;
}
