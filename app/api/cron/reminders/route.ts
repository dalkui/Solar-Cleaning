import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { Resend } from "resend";
import { sendSMS } from "@/lib/sms";
import { renderEmail } from "@/lib/email-template";

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
        html: renderEmail({
          preheader: `Tomorrow at ${timeLabel}${w ? ` with ${w.name}` : ""}`,
          heading: "See you tomorrow ☀️",
          intro: `Hi ${c.name || "there"} — just a quick reminder.`,
          body: `
            <p style="margin:0 0 14px;">Your FluroSolar clean is booked for <strong>${timeLabel}</strong>${w ? ` with <strong>${w.name}</strong>` : ""}.</p>
            <p style="margin:0 0 14px;color:#7A95B0;">You don't need to be home. We'll send another message when ${w ? w.name.split(" ")[0] : "the worker"} arrives.</p>
            <p style="margin:0;">Need to reschedule? You can do that from your portal.</p>
          `,
          cta: { label: "Manage booking →", href: "https://flurosolar.com/portal" },
        }),
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
