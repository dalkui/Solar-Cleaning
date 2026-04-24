import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

function planMonths(plan: string): number {
  if (plan === "elite") return 3;
  if (plan === "basic") return 12;
  return 6;
}

function firstOfMonth(date: Date): string {
  return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().slice(0, 10);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const [workersRes, availRes, unavailRes, bookingsRes, pendingRes, customersRes] = await Promise.all([
    supabase.from("workers").select("*").eq("status", "active").order("name"),
    supabase.from("worker_availability").select("*"),
    supabase.from("worker_unavailable_dates").select("*"),
    (() => {
      let q = supabase
        .from("bookings")
        .select("*, customers(id, name, phone, email, street, suburb, state, postcode, plan, stories, panels, notes), workers(id, name, color)")
        .not("scheduled_at", "is", null)
        .order("scheduled_at");
      if (from) q = q.gte("scheduled_at", from);
      if (to) q = q.lte("scheduled_at", to);
      return q;
    })(),
    supabase
      .from("bookings")
      .select("id, customer_id, due_month, status, customers(id, name, suburb, plan, panels, stories, subscribed_at)")
      .eq("status", "pending")
      .is("scheduled_at", null)
      .order("due_month"),
    supabase.from("customers").select("id, name, suburb, plan, panels, stories, subscribed_at").eq("status", "active"),
  ]);

  // Build unscheduled list from pending bookings + customers without pending rows (fallback)
  const pendingByCustomer: Record<string, any> = {};
  (pendingRes.data || []).forEach((p: any) => { pendingByCustomer[p.customer_id] = p; });

  // Customers with no pending booking: calculate due_month from plan + subscribed_at as fallback
  const allCustomers = customersRes.data || [];
  const bookedNow = new Set((bookingsRes.data || []).filter((b: any) => b.status !== "cancelled" && b.status !== "completed").map((b: any) => b.customer_id));

  const unscheduled = allCustomers
    .filter((c: any) => !bookedNow.has(c.id))
    .map((c: any) => {
      const pending = pendingByCustomer[c.id];
      let dueMonth: string;
      let pendingId: string | null = null;
      if (pending?.due_month) {
        dueMonth = pending.due_month;
        pendingId = pending.id;
      } else if (pending) {
        pendingId = pending.id;
        const d = new Date(c.subscribed_at);
        d.setMonth(d.getMonth() + planMonths(c.plan));
        dueMonth = firstOfMonth(d);
      } else {
        const d = new Date(c.subscribed_at);
        d.setMonth(d.getMonth() + planMonths(c.plan));
        dueMonth = firstOfMonth(d);
      }
      return {
        customer_id: c.id,
        pending_id: pendingId,
        name: c.name,
        suburb: c.suburb,
        plan: c.plan,
        panels: c.panels,
        stories: c.stories,
        due_month: dueMonth,
      };
    })
    .sort((a: any, b: any) => a.due_month.localeCompare(b.due_month));

  return NextResponse.json({
    workers: workersRes.data || [],
    availability: availRes.data || [],
    unavailable_dates: unavailRes.data || [],
    bookings: bookingsRes.data || [],
    unscheduled,
  });
}
