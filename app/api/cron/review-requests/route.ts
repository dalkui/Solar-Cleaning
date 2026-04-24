import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { Resend } from "resend";
import { sendSMS } from "@/lib/sms";
import { renderEmail } from "@/lib/email-template";

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function GET() {
  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

  // Find bookings completed 24-48h ago where customer hasn't been asked for a review yet
  const { data: recentComplete } = await supabase
    .from("bookings")
    .select("id, customer_id, scheduled_at, customers(id, name, email, phone, google_review_sent, sms_opt_out)")
    .eq("status", "completed")
    .gte("scheduled_at", fortyEightHoursAgo.toISOString())
    .lte("scheduled_at", twentyFourHoursAgo.toISOString());

  if (!recentComplete || recentComplete.length === 0) {
    return NextResponse.json({ ok: true, processed: 0 });
  }

  const reviewUrl = process.env.GOOGLE_REVIEW_URL || "https://google.com";
  let count = 0;

  for (const b of recentComplete) {
    const c = b.customers as any;
    if (!c || c.google_review_sent) continue;

    // Only ask after their second completed clean (avoid new-customer review spam)
    const { count: completedCount } = await supabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq("customer_id", c.id)
      .eq("status", "completed");
    if ((completedCount || 0) < 2) continue;

    if (c.email) {
      await resend.emails.send({
        from: "FluroSolar <noreply@flurosolar.com>",
        to: c.email,
        subject: "How did we do?",
        html: renderEmail({
          preheader: "30 seconds to leave a Google review?",
          heading: "How did we do? ⭐",
          intro: `Hi ${c.name || "there"} — thanks again for being a FluroSolar customer.`,
          body: `
            <p style="margin:0 0 14px;">If you've got 30 seconds, a quick Google review genuinely makes our day — and helps local customers find us.</p>
          `,
          cta: { label: "Leave a review ★", href: reviewUrl },
          footer: "Anything we could have done better? Reply and let us know — we read every message.",
        }),
      }).catch(() => {});
      await supabase.from("customer_messages").insert({
        customer_id: c.id, direction: "outbound", channel: "email",
        subject: "How did we do?", body: "Review request", purpose: "review",
      });
    }

    if (c.phone && !c.sms_opt_out) {
      await sendSMS(
        c.phone,
        `Your panels are sparkling clean ✨ If you've got 30 seconds, we'd love a Google review: ${reviewUrl}`,
        { customerId: c.id, purpose: "review" }
      );
    }

    await supabase.from("customers").update({ google_review_sent: true, review_prompted_at: now.toISOString() }).eq("id", c.id);
    count++;
  }

  return NextResponse.json({ ok: true, processed: count });
}
