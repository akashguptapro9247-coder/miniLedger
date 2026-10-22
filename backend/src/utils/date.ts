/**
 * Normalizes any valid Date or YYYY-MM-DD string to UTC midnight (00:00:00.000Z).
 * This eliminates timezone drift and makes calendar date comparisons exact.
 */
export function normalizeToMidnight(dateInput: Date | string): Date {
  if (typeof dateInput === 'string') {
    // If format is YYYY-MM-DD
    const ymdMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateInput);
    if (ymdMatch) {
      const year = parseInt(ymdMatch[1], 10);
      const month = parseInt(ymdMatch[2], 10) - 1;
      const day = parseInt(ymdMatch[3], 10);
      return new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
    }
  }

  const d = new Date(dateInput);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
}

/**
 * Checks if a loan is overdue based on current date.
 * - Repaid loans are NEVER overdue.
 * - Due date today is NOT overdue.
 * - Due date in future is NOT overdue.
 * - Only unpaid loans with due date strictly before today are overdue.
 */
export function isLoanOverdue(
  dueDate: Date | string,
  isRepaid: boolean,
  referenceDate: Date = new Date()
): boolean {
  if (isRepaid) return false;

  const normalizedDueDate = normalizeToMidnight(dueDate);
  const normalizedToday = normalizeToMidnight(referenceDate);

  return normalizedDueDate.getTime() < normalizedToday.getTime();
}
