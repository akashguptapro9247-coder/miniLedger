import { describe, it, expect } from 'vitest';
import { normalizeToMidnight, isLoanOverdue } from '../../src/utils/date';

describe('Date Normalization and Overdue Calculations', () => {
  const referenceDate = new Date('2026-10-22T14:30:00.000Z');

  it('normalizes dates to midnight UTC', () => {
    const normalized = normalizeToMidnight('2026-10-22');
    expect(normalized.toISOString()).toBe('2026-10-22T00:00:00.000Z');
  });

  // Requirement 12: A loan due today is not overdue
  it('considers a loan due today as NOT overdue', () => {
    const dueToday = '2026-10-22';
    const overdue = isLoanOverdue(dueToday, false, referenceDate);
    expect(overdue).toBe(false);
  });

  // Requirement 11: Overdue calculation excludes repaid loans and future-due loans
  it('excludes future-due unpaid loans from being overdue', () => {
    const dueTomorrow = '2026-10-23';
    const dueNextMonth = '2026-11-15';
    expect(isLoanOverdue(dueTomorrow, false, referenceDate)).toBe(false);
    expect(isLoanOverdue(dueNextMonth, false, referenceDate)).toBe(false);
  });

  it('excludes fully repaid past loans from being overdue', () => {
    const pastDate = '2026-10-15';
    expect(isLoanOverdue(pastDate, true, referenceDate)).toBe(false);
  });

  it('correctly marks an unpaid loan whose due date is in the past as overdue', () => {
    const pastDate = '2026-10-21';
    expect(isLoanOverdue(pastDate, false, referenceDate)).toBe(true);
  });
});
