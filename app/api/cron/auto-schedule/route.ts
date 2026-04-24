import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { Resend } from "resend";
import { sendSMS } from "@/lib/sms";
import { renderEmail } from "@/lib/email-template";
import { isWorkerUnavailableOnDate } from "@/lib/availability";

const resend = new Resend(process.env.RESEND_API_KEY!);

function timeStrToMins(t: string) { const [h, m] = t.split(":").map(Number); return h * 60 + m; }

function minsToISO(date: Date, mins: number): string {
  const d = new Date(date);
  d.setHours(Math.floor(mins / 60), mins % 60, 0, 0);
  return d.toISOString();
}

function formatTimeLabel(iso: string) {
  return new Date(iso).toLocaleString("en-AU", { weekday: "long", day: "numeric", month: "long", hour: "numeric", minute: "2-digit", timeZone: "Australia/Sydney" });
}

export async function GET() {
  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() + 14);

  // 1. Fetch candidates — pending bookings due within 14 days
  const { data: pending } = await supabase
    .from("bookings")
    .select("*, customers(id, name, email, phone, suburb, postcode, plan, auto_schedule, preferred_time_of_day, last_worker_id, sms_opt_out)")
    .eq("status", "pending")
    .is("scheduled_at", null)
    .not("due_month", "is", null)
    .lte("due_month", cutoff.toISOString().slice(0, 10));

  if (!pending || pending.length === 0) {
    return NextResponse.json({ ok: true, processed: 0 });
  }

  const [workersRes, availRes, unavailRes, existingBookingsRes] = await Promise.all([
    supabase.from("workers").select("*").eq("status", "active"),
    supabase.from("worker_availability").select("*"),
    supabase.from("worker_unavailable_dates").select("*"),
    supabase.from("bookings").select("*, customers(suburb, postcode)").not("scheduled_at", "is", null).gte("scheduled_at", now.toISOString()),
  ]);

  const workers = workersRes.data || [];
  const availability = availRes.data || [];
  const unavailable = unavailRes.data || [];
  const existingBookings = existingBookingsRes.data || [];

  const scheduled: any[] = [];

  for (const b of pending) {
    const c = b.customers as any;
    if (!c?.auto_schedule) continue;

    // Try each day from tomorrow up to 28 days out
    let slotFound = false;
    for (let dayOffset = 1; dayOffset <= 28 && !slotFound; dayOffset++) {
      const tryDate = new Date(now);
      tryDate.setHours(0, 0, 0, 0);
      tryDate.setDate(tryDate.getDate() + dayOffset);
      const dateStr = tryDate.toLocaleDateString("en-CA");
      const dow = tryDate.getDay();

      // Rank workers: last worker first, then by (jobs in same suburb ASC but non-zero, then total jobs ASC)
      const workerOptions = workers
        .filter((w: any) => !isWorkerUnavailableOnDate(w.id, dateStr, unavailable as any))
        .filter((w: any) => {
          const a = availability.find((av: any) => av.worker_id === w.id && av.day_of_week === dow);
          return a && a.is_active;
        })
        .map((w: any) => {
          const workerJobsToday = existingBookings.filter((eb: any) => eb.worker_id === w.id && eb.scheduled_at?.startsWith(dateStr));
          const sameSuburb = workerJobsToday.filter((eb: any) => eb.customers?.suburb === c.suburb || eb.customers?.postcode?.slice(0, 3) === c.postcode?.slice(0, 3)).length;
          return { worker: w, workerJobsToday: workerJobsToday.length, sameSuburb, isLast: c.last_worker_id === w.id };
        });

      workerOptions.sort((a: any, b: any) => {
        if (a.isLast !== b.isLast) return a.isLast ? -1 : 1;
        if (b.sameSuburb !== a.sameSuburb) return b.sameSuburb - a.sameSuburb;
        return a.workerJobsToday - b.workerJobsToday;
      });

      for (const opt of workerOptions) {
        const a = availability.find((av: any) => av.worker_id === opt.worker.id && av.day_of_week === dow);
        if (!a) continue;

        const startMins = timeStrToMins(a.start_time);
        const endMins = timeStrToMins(a.end_time);

        // Apply time-of-day preference
        let prefStart = startMins, prefEnd = endMins;
        if (c.preferred_time_of_day === "morning") prefEnd = Math.min(endMins, 12 * 60);
        else if (c.preferred_time_of_day === "afternoon") prefStart = Math.max(startMins, 12 * 60);

        if (prefStart >= prefEnd) continue;

        // Find 30-min slot not already taken
        const workerSlotsTaken = existingBookings
          .filter((eb: any) => eb.worker_id === opt.worker.id && eb.scheduled_at?.startsWith(dateStr))
          .map((eb: any) => {
            const t = new Date(eb.scheduled_at!);
            return t.getHours() * 60 + t.getMinutes();
          });

        for (let m = prefStart; m + 60 <= prefEnd; m += 30) {
          const conflicts = workerSlotsTaken.some(taken => Math.abs(taken - m) < 60);
          if (conflicts) continue;

          const scheduledAt = minsToISO(tryDate, m);
          await supabase
            .from("bookings")
            .update({ scheduled_at: scheduledAt, worker_id: opt.worker.id, status: "confirmed" })
            .eq("id", b.id);
          await supabase.from("customers").update({ last_worker_id: opt.worker.id }).eq("id", c.id);
          existingBookings.push({ ...b, scheduled_at: scheduledAt, worker_id: opt.worker.id, customers: c });

          scheduled.push({ booking: b, customer: c, worker: opt.worker, scheduledAt });
          slotFound = true;
          break;
        }
        if (slotFound) break;
      }
    }
  }

  // Send notifications
  for (const item of scheduled) {
    const label = formatTimeLabel(item.scheduledAt);
    if (item.customer.email) {
      await resend.emails.send({
        from: "FluroSolar <noreply@flurosolar.com>",
        to: item.customer.email,
        subject: `Your clean is booked — ${label}`,
        html: renderEmail({
          preheader: `${label} with ${item.worker.name}`,
          heading: "Your clean is scheduled",
          intro: `Hi ${item.customer.name || "there"} — we've picked a time for your next clean.`,
          body: `
            <div style="background:rgba(245,197,24,0.08);border:1px solid rgba(245,197,24,0.2);border-radius:10px;padding:16px;margin:0 0 16px;">
              <p style="margin:0 0 4px;font-size:13px;color:#7A95B0;">Booking</p>
              <p style="margin:0 0 8px;font-size:18px;font-weight:700;color:#F5C518;">${label}</p>
              <p style="margin:0;font-size:13px;color:#EFF4FF;">Your worker: <strong>${item.worker.name}</strong></p>
            </div>
            <p style="margin:0;color:#7A95B0;">Need to change this time? Log in to your portal and reschedule with one tap.</p>
          `,
          cta: { label: "Manage booking →", href: "https://flurosolar.com/portal" },
        }),
      }).catch(() => {});
      await supabase.from("customer_messages").insert({
        customer_id: item.customer.id,
        direction: "outbound",
        channel: "email",
        subject: `Your clean is booked — ${label}`,
        body: `Scheduled with ${item.worker.name}`,
        purpose: "confirmation",
      });
    }

    if (item.customer.phone && !item.customer.sms_opt_out) {
      await sendSMS(
        item.customer.phone,
        `Hi ${item.customer.name?.split(" ")[0] || "there"}, your FluroSolar clean is booked for ${label} with ${item.worker.name}. Reply STOP to cancel or visit flurosolar.com/portal to manage.`,
        { customerId: item.customer.id, purpose: "confirmation" }
      );
    }
  }

  // Admin summary email
  if (scheduled.length > 0) {
    await resend.emails.send({
      from: "FluroSolar Admin <noreply@flurosolar.com>",
      to: process.env.ADMIN_EMAIL || "fluroservices@gmail.com",
      subject: `Auto-scheduled ${scheduled.length} clean${scheduled.length === 1 ? "" : "s"} today`,
      html: `
        <h2>Auto-scheduled cleans</h2>
        <ul>
          ${scheduled.map(s => `<li><strong>${s.customer.name}</strong> — ${formatTimeLabel(s.scheduledAt)} with ${s.worker.name}</li>`).join("")}
        </ul>
      `,
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true, processed: scheduled.length });
}
