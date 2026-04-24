import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { planMonths } from "@/lib/clean-dates";

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export async function GET() {
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [customersRes, bookingsRes, workersRes, availRes] = await Promise.all([
    supabase.from("customers").select("id, plan, subscribed_at, status").eq("status", "active"),
    supabase.from("bookings").select("customer_id, scheduled_at, status, due_month").neq("status", "cancelled"),
    supabase.from("workers").select("id").eq("status", "active"),
    supabase.from("worker_availability").select("worker_id, is_active, start_time, end_time"),
  ]);

  const customers = customersRes.data || [];
  const bookings = bookingsRes.data || [];

  // Build 12 month buckets starting current month
  const months: { month: string; overdue: number; unscheduled: number; scheduled: number; completed: number; projected: number; total: number }[] = [];
  for (let i = 0; i < 12; i++) {
    const d = addMonths(currentMonthStart, i);
    months.push({ month: monthKey(d), overdue: 0, unscheduled: 0, scheduled: 0, completed: 0, projected: 0, total: 0 });
  }
  const byKey: Record<string, typeof months[0]> = {};
  months.forEach(m => { byKey[m.month] = m; });

  // Track which months each customer already has a real booking in — so projections don't double count
  const customerMonthsWithBooking: Record<string, Set<string>> = {};

  bookings.forEach((b: any) => {
    const customer = customers.find((c: any) => c.id === b.customer_id);
    if (!customer) return; // skip bookings for cancelled/inactive customers

    // Determine which month this booking belongs to
    let key: string | null = null;
    if (b.status === "completed" && b.scheduled_at) key = monthKey(new Date(b.scheduled_at));
    else if ((b.status === "confirmed" || b.status === "in_progress") && b.scheduled_at) key = monthKey(new Date(b.scheduled_at));
    else if (b.status === "pending" && b.due_month) key = monthKey(new Date(b.due_month + "T00:00:00"));

    if (!key) return;
    if (!customerMonthsWithBooking[customer.id]) customerMonthsWithBooking[customer.id] = new Set();
    customerMonthsWithBooking[customer.id].add(key);

    // Handle overdue bucket: any pending/scheduled booking before current month goes into current month's "overdue"
    if (key < months[0].month && b.status !== "completed") {
      months[0].overdue++;
      return;
    }

    const bucket = byKey[key];
    if (!bucket) return; // beyond 12-month window

    if (b.status === "completed") bucket.completed++;
    else if (b.status === "pending") bucket.unscheduled++;
    else if (b.status === "confirmed" || b.status === "in_progress") bucket.scheduled++;
  });

  // Projected future cleans per customer
  customers.forEach((c: any) => {
    // Find latest booking date (any non-cancelled)
    const customerBookings = bookings.filter((b: any) => b.customer_id === c.id);
    let latest: Date | null = null;
    customerBookings.forEach((b: any) => {
      const d = b.scheduled_at ? new Date(b.scheduled_at) : (b.due_month ? new Date(b.due_month + "T00:00:00") : null);
      if (d && (!latest || d > latest)) latest = d;
    });
    const startFrom: Date = latest || new Date(c.subscribed_at);

    const interval = planMonths(c.plan);
    let cursor = addMonths(startFrom, interval);
    for (let i = 0; i < 4; i++) {
      const key = monthKey(cursor);
      const existing = customerMonthsWithBooking[c.id];
      if (byKey[key] && !(existing && existing.has(key))) {
        byKey[key].projected++;
        if (!existing) customerMonthsWithBooking[c.id] = new Set();
        customerMonthsWithBooking[c.id].add(key);
      }
      cursor = addMonths(cursor, interval);
    }
  });

  // Compute totals
  months.forEach(m => { m.total = m.overdue + m.unscheduled + m.scheduled + m.completed + m.projected; });

  // Capacity calculation (hours per week × 4.3 ÷ 45min average)
  const workers = workersRes.data || [];
  const avail = availRes.data || [];
  let totalHoursPerWeek = 0;
  workers.forEach((w: any) => {
    const dayRows = avail.filter((a: any) => a.worker_id === w.id && a.is_active);
    dayRows.forEach((a: any) => {
      const [sh, sm] = a.start_time.split(":").map(Number);
      const [eh, em] = a.end_time.split(":").map(Number);
      totalHoursPerWeek += ((eh * 60 + em) - (sh * 60 + sm)) / 60;
    });
  });
  const jobsPerMonthCapacity = Math.round((totalHoursPerWeek * 4.3) / 0.75); // 45min = 0.75h

  return NextResponse.json({
    months,
    capacity: jobsPerMonthCapacity,
    worker_count: workers.length,
  });
}
