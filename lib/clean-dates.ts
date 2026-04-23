const planIntervalMonths: Record<string, number> = {
  basic: 12,
  standard: 6,
  elite: 3,
};

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

export function getNextCleanDates(startDate: Date, plan: string, count = 4): Date[] {
  const interval = planIntervalMonths[plan] ?? 12;
  const dates: Date[] = [];
  const now = new Date();

  let cursor = new Date(startDate);
  while (cursor <= now) {
    cursor = addMonths(cursor, interval);
  }

  for (let i = 0; i < count; i++) {
    dates.push(new Date(cursor));
    cursor = addMonths(cursor, interval);
  }

  return dates;
}

export function getAllCleanDates(startDate: Date, plan: string): Date[] {
  const interval = planIntervalMonths[plan] ?? 12;
  const dates: Date[] = [];
  const now = new Date();

  let cursor = new Date(startDate);
  while (cursor <= now) {
    dates.push(new Date(cursor));
    cursor = addMonths(cursor, interval);
  }

  return dates;
}
