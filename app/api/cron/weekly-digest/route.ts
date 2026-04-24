import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY!);

const planPriceMap: Record<string, number> = { basic: 24.99, standard: 49.99, elite: 110 };

export async function GET() {
  const now = new Date();
  const weekStart = new Date(now); weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 7);
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [custRes, bookingsRes, workersRes, availRes, unscheduledRes, pastDueRes] = await Promise.all([
    supabase.from("customers").select("id, plan, status"),
    supabase.from("bookings")
      .select("id, scheduled_at, status, worker_id, due_month, customers(name, suburb)")
      .gte("scheduled_at", weekStart.toISOString())
      .lt("scheduled_at", weekEnd.toISOString()),
    supabase.from("workers").select("id, name").eq("status", "active"),
    supabase.from("worker_availability").select("*"),
    supabase.from("bookings").select("customer_id, due_month").eq("status", "pending").is("scheduled_at", null).lte("due_month", currentMonthStart.toISOString().slice(0, 10)),
    supabase.from("customers").select("id, name").eq("payment_status", "past_due").eq("status", "active"),
  ]);

  const customers = custRes.data || [];
  const active = customers.filter(c => c.status === "active");
  const bookings = bookingsRes.data || [];
  const workers = workersRes.data || [];
  const availability = availRes.data || [];

  const expectedRevenue = active.reduce((sum, c: any) => sum + (planPriceMap[c.plan] || 0), 0);

  // Per-worker job counts this week
  const perWorker = workers.map((w: any) => {
    const jobs = bookings.filter((b: any) => b.worker_id === w.id && b.status !== "cancelled").length;
    return { name: w.name, jobs };
  });

  // Capacity calc
  let totalHoursPerWeek = 0;
  workers.forEach((w: any) => {
    const days = availability.filter((a: any) => a.worker_id === w.id && a.is_active);
    days.forEach((a: any) => {
      const [sh, sm] = a.start_time.split(":").map(Number);
      const [eh, em] = a.end_time.split(":").map(Number);
      totalHoursPerWeek += ((eh * 60 + em) - (sh * 60 + sm)) / 60;
    });
  });
  const weeklyCapacity = Math.round(totalHoursPerWeek / 0.75);
  const weeklyDemand = bookings.filter((b: any) => b.status !== "cancelled").length;
  const capacityPct = weeklyCapacity > 0 ? Math.round((weeklyDemand / weeklyCapacity) * 100) : 0;

  const overdueCount = (unscheduledRes.data || []).length;
  const pastDue = pastDueRes.data || [];

  const weekEndLabel = new Date(weekEnd); weekEndLabel.setDate(weekEndLabel.getDate() - 1);
  const dateRange = `${weekStart.toLocaleDateString("en-AU", { day: "numeric", month: "short" })} – ${weekEndLabel.toLocaleDateString("en-AU", { day: "numeric", month: "short" })}`;

  const actions: string[] = [];
  if (overdueCount > 0) actions.push(`${overdueCount} customer${overdueCount === 1 ? "" : "s"} overdue — book them this week`);
  if (pastDue.length > 0) actions.push(`${pastDue.length} payment issue${pastDue.length === 1 ? "" : "s"} — follow up`);
  if (capacityPct > 85) actions.push(`Capacity at ${capacityPct}% — consider hiring or reducing bookings`);
  if (actions.length === 0) actions.push("All looking good — no blockers this week");

  await resend.emails.send({
    from: "FluroSolar <noreply@flurosolar.com>",
    to: process.env.ADMIN_EMAIL || "fluroservices@gmail.com",
    subject: `Week ahead — ${dateRange}`,
    html: `
      <div style="font-family:sans-serif;max-width:620px;margin:0 auto;background:#08101C;color:#EFF4FF;padding:40px;border-radius:12px;">
        <h2 style="color:#F5C518;margin-bottom:4px;">Week Ahead</h2>
        <p style="color:#7A95B0;margin-bottom:24px;">${dateRange}</p>

        <h3 style="margin-top:20px;">Summary</h3>
        <ul style="line-height:1.8;">
          <li><strong>${bookings.filter(b => b.status !== "cancelled").length}</strong> cleans scheduled this week</li>
          <li><strong>${active.length}</strong> active subscribers</li>
          <li><strong>$${expectedRevenue.toFixed(2)}</strong>/mo expected revenue</li>
          <li><strong>Capacity:</strong> ${weeklyDemand}/${weeklyCapacity} jobs (${capacityPct}%)</li>
        </ul>

        ${perWorker.length > 0 ? `
          <h3 style="margin-top:20px;">Per worker</h3>
          <ul style="line-height:1.8;">
            ${perWorker.map(w => `<li>${w.name} — ${w.jobs} job${w.jobs === 1 ? "" : "s"}</li>`).join("")}
          </ul>
        ` : ""}

        <h3 style="margin-top:20px;color:#F5C518;">Action items</h3>
        <ul style="line-height:1.8;">
          ${actions.map(a => `<li>${a}</li>`).join("")}
        </ul>
      </div>
    `,
  }).catch(() => {});

  return NextResponse.json({ ok: true, processed: 1 });
}
