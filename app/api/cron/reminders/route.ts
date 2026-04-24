import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { Resend } from "resend";
import { sendSMS } from "@/lib/sms";

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function GET() {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  const dayAfter = new Date(tomorrow);
  dayAfter.setDate(dayAfter.getDate() + 1);

  const { data: bookings } = await supabase
    .from("bookings")
    .select("*, customers(id, name, email, phone, sms_opt_out), workers(name)")
    .eq("status", "confirmed")
    .gte("scheduled_at", tomorrow.toISOString())
    .lt("scheduled_at", dayAfter.toISOString());

  if (!bookings || bookings.length === 0) {
    return NextResponse.json({ ok: true, processed: 0 });
  }

  let count = 0;
  for (const b of bookings) {
    const c = b.customers as any;
    const w = b.workers as any;
    const timeLabel = new Date(b.scheduled_at).toLocaleString("en-AU", { weekday: "long", hour: "numeric", minute: "2-digit", timeZone: "Australia/Sydney" });

    if (c.email) {
      await resend.emails.send({
        from: "FluroSolar <noreply@flurosolar.com>",
        to: c.email,
        subject: `Reminder: your clean is tomorrow`,
        html: `
          <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#08101C;color:#EFF4FF;padding:40px;border-radius:12px;">
            <h2 style="color:#F5C518;">See you tomorrow ☀️</h2>
            <p>Hi ${c.name || "there"},</p>
            <p>Just a reminder — your FluroSolar clean is booked for <strong>${timeLabel}</strong>${w ? ` with ${w.name}` : ""}.</p>
            <p>You don't need to be home. If you need to reschedule, <a href="https://flurosolar.com/portal" style="color:#F5C518;">log in here</a>.</p>
          </div>
        `,
      }).catch(() => {});
      await supabase.from("customer_messages").insert({
        customer_id: c.id, direction: "outbound", channel: "email",
        subject: "Reminder: your clean is tomorrow", body: `Reminder for ${timeLabel}`, purpose: "reminder",
      });
    }

    if (c.phone && !c.sms_opt_out) {
      await sendSMS(
        c.phone,
        `Reminder: your FluroSolar clean is tomorrow at ${timeLabel}${w ? ` with ${w.name}` : ""}. Reply R to reschedule.`,
        { customerId: c.id, purpose: "reminder" }
      );
    }
    count++;
  }

  return NextResponse.json({ ok: true, processed: count });
}
