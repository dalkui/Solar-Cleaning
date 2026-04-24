const planIntervalMonths: Record<string, number> = {
  basic: 12,
  standard: 6,
  elite: 3,
};

export function planMonths(plan: string): number {
  return planIntervalMonths[plan] ?? 12;
}

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

interface ProjectionBooking {
  scheduled_at?: string | null;
  due_month?: string | null;
  status?: string | null;
}

export interface UpcomingClean {
  date: Date;
  source: "scheduled" | "pending" | "projected";
}

export function getUpcomingProjections(
  customer: { plan: string; subscribed_at: string },
  bookings: ProjectionBooking[],
  count = 3,
): UpcomingClean[] {
  const interval = planMonths(customer.plan);
  const now = new Date();
  const out: UpcomingClean[] = [];
  const takenMonthKeys = new Set<string>();
  const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

  // Start with real bookings (confirmed/in_progress with scheduled_at in future, or pending with due_month)
  bookings.forEach(b => {
    if (b.status === "cancelled" || b.status === "completed") return;
    if (b.scheduled_at) {
      const d = new Date(b.scheduled_at);
      if (d > now) {
        out.push({ date: d, source: "scheduled" });
        takenMonthKeys.add(monthKey(d));
      }
    } else if (b.status === "pending" && b.due_month) {
      const d = new Date(b.due_month + "T00:00:00");
      if (d >= new Date(now.getFullYear(), now.getMonth(), 1)) {
        out.push({ date: d, source: "pending" });
        takenMonthKeys.add(monthKey(d));
      }
    }
  });

  // Find latest booking to project from
  const allDates = bookings
    .map(b => b.scheduled_at ? new Date(b.scheduled_at) : (b.due_month ? new Date(b.due_month + "T00:00:00") : null))
    .filter((d): d is Date => d !== null);
  const latest = allDates.length > 0 ? allDates.reduce((max, d) => d > max ? d : max, allDates[0]) : new Date(customer.subscribed_at);

  let cursor = addMonths(latest, interval);
  while (out.length < count) {
    const key = monthKey(cursor);
    if (!takenMonthKeys.has(key)) {
      out.push({ date: new Date(cursor), source: "projected" });
      takenMonthKeys.add(key);
    }
    cursor = addMonths(cursor, interval);
    if (out.length > 100) break;
  }

  return out
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, count);
}
