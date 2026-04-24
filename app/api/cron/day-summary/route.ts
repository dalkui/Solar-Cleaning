import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function GET() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const [workersRes, bookingsRes] = await Promise.all([
    supabase.from("workers").select("*").eq("status", "active"),
    supabase
      .from("bookings")
      .select("*, customers(name, suburb)")
      .gte("scheduled_at", today.toISOString())
      .lt("scheduled_at", tomorrow.toISOString())
      .neq("status", "cancelled"),
  ]);

  const workers = workersRes.data || [];
  const bookings = bookingsRes.data || [];
  const bookingIds = bookings.map((b: any) => b.id);

  const { data: updates } = bookingIds.length > 0
    ? await supabase.from("job_updates").select("*").in("booking_id", bookingIds)
    : { data: [] };

  const updatesByBooking: Record<string, any[]> = {};
  (updates || []).forEach((u: any) => {
    if (!updatesByBooking[u.booking_id]) updatesByBooking[u.booking_id] = [];
    updatesByBooking[u.booking_id].push(u);
  });

  const totalScheduled = bookings.length;
  const totalCompleted = bookings.filter((b: any) => b.status === "completed").length;
  const totalIncomplete = totalScheduled - totalCompleted;
  const issues = (updates || []).filter((u: any) => u.type === "issue");

  const perWorker = workers.map((w: any) => {
    const wBookings = bookings.filter((b: any) => b.worker_id === w.id);
    const wUpdates = (updates || []).filter((u: any) => u.worker_id === w.id);
    const arrivedTimes = wUpdates.filter((u: any) => u.type === "arrived").map((u: any) => new Date(u.created_at).getTime()).sort();
    const completedTimes = wUpdates.filter((u: any) => u.type === "completed").map((u: any) => new Date(u.created_at).getTime()).sort();
    const hours = arrivedTimes.length && completedTimes.length
      ? (Math.max(...completedTimes) - Math.min(...arrivedTimes)) / 3600000
      : 0;
    return {
      name: w.name,
      scheduled: wBookings.length,
      completed: wBookings.filter((b: any) => b.status === "completed").length,
      hours: hours.toFixed(1),
    };
  }).filter(w => w.scheduled > 0);

  const dateStr = today.toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Australia/Sydney" });

  const issuesHtml = issues.length > 0
    ? `<h3 style="color:#f87171;margin-top:24px;">Issues flagged (${issues.length})</h3>` +
      issues.map((i: any) => `<p style="color:#7A95B0;border-left:3px solid #f87171;padding-left:12px;">${i.note || "(no note)"}</p>`).join("")
    : "";

  const workerHtml = perWorker.map(w =>
    `<tr><td style="padding:8px 12px;">${w.name}</td><td style="padding:8px 12px;">${w.completed}/${w.scheduled}</td><td style="padding:8px 12px;">${w.hours}h</td></tr>`
  ).join("");

  await resend.emails.send({
    from: "FluroSolar <noreply@flurosolar.com.au>",
    to: "fluroservices@gmail.com",
    subject: `Daily summary – ${dateStr}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#08101C;color:#EFF4FF;padding:40px;border-radius:12px;">
        <h2 style="color:#F5C518;margin-bottom:4px;">Daily Summary</h2>
        <p style="color:#7A95B0;margin-bottom:24px;">${dateStr}</p>
        <p><strong>${totalCompleted}/${totalScheduled}</strong> jobs completed${totalIncomplete > 0 ? ` — ${totalIncomplete} incomplete` : ""}</p>
        ${perWorker.length > 0 ? `
          <h3 style="margin-top:24px;">Per Worker</h3>
          <table style="width:100%;border-collapse:collapse;background:rgba(255,255,255,0.04);border-radius:8px;overflow:hidden;">
            <tr style="background:rgba(245,197,24,0.1);"><th style="padding:8px 12px;text-align:left;">Worker</th><th style="padding:8px 12px;text-align:left;">Done</th><th style="padding:8px 12px;text-align:left;">Hours</th></tr>
            ${workerHtml}
          </table>
        ` : ""}
        ${issuesHtml}
      </div>
    `,
  });

  return NextResponse.json({ ok: true, totalScheduled, totalCompleted, issues: issues.length });
}
