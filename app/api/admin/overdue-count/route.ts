import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const currentMonthStartStr = currentMonthStart.toISOString().slice(0, 10);

  const [activeCustomersRes, pendingRes] = await Promise.all([
    supabase.from("customers").select("id").eq("status", "active"),
    supabase
      .from("bookings")
      .select("id, customer_id, due_month")
      .eq("status", "pending")
      .is("scheduled_at", null),
  ]);

  const activeIds = new Set((activeCustomersRes.data || []).map((c: any) => c.id));
  const pending = (pendingRes.data || []).filter((b: any) => activeIds.has(b.customer_id));

  let overdue = 0;
  let dueSoon = 0;

  // "Due soon" = due this month AND > 2 weeks into the month
  const dayOfMonth = now.getDate();
  const pastHalfway = dayOfMonth > 14;
  const currentMonthKey = currentMonthStartStr.slice(0, 7);

  pending.forEach((b: any) => {
    if (!b.due_month) return;
    if (b.due_month < currentMonthStartStr) {
      overdue++;
    } else if (pastHalfway && b.due_month.slice(0, 7) === currentMonthKey) {
      dueSoon++;
    }
  });

  return NextResponse.json({ overdue, due_soon: dueSoon });
}
