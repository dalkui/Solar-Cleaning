import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { Resend } from "resend";
import { formatAuPhone } from "@/lib/sms";

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const from = (form.get("From") as string) || "";
  const body = ((form.get("Body") as string) || "").trim();

  const { data: customers } = await supabase
    .from("customers")
    .select("id, name, email, phone")
    .not("phone", "is", null);

  const matched = (customers || []).find((c: any) => formatAuPhone(c.phone) === from);

  if (matched) {
    await supabase.from("customer_messages").insert({
      customer_id: matched.id,
      direction: "inbound",
      channel: "sms",
      body,
      purpose: "general",
    });

    const upper = body.toUpperCase();

    if (upper === "STOP" || upper === "UNSUBSCRIBE") {
      await supabase.from("customers").update({ sms_opt_out: true }).eq("id", matched.id);
      return new NextResponse(
        `<?xml version="1.0" encoding="UTF-8"?><Response><Message>You've been unsubscribed from SMS. Reply START to resubscribe.</Message></Response>`,
        { headers: { "Content-Type": "text/xml" } }
      );
    }

    if (upper === "START" || upper === "UNSTOP") {
      await supabase.from("customers").update({ sms_opt_out: false }).eq("id", matched.id);
      return new NextResponse(
        `<?xml version="1.0" encoding="UTF-8"?><Response><Message>You're back on SMS — welcome back!</Message></Response>`,
        { headers: { "Content-Type": "text/xml" } }
      );
    }

    if (upper === "R" || upper.includes("RESCHEDULE")) {
      await resend.emails.send({
        from: "FluroSolar <noreply@flurosolar.com>",
        to: process.env.ADMIN_EMAIL || "fluroservices@gmail.com",
        subject: `SMS reschedule request — ${matched.name}`,
        html: `<p><strong>${matched.name}</strong> (${from}) replied "R" to reschedule their upcoming clean.</p><p>Phone: ${matched.phone}<br/>Email: ${matched.email}</p>`,
      }).catch(() => {});
      return new NextResponse(
        `<?xml version="1.0" encoding="UTF-8"?><Response><Message>Got it — we'll call you shortly to find a new time. Or log in at flurosolar.com/portal to pick yourself.</Message></Response>`,
        { headers: { "Content-Type": "text/xml" } }
      );
    }

    // Forward unrecognised messages to admin
    await resend.emails.send({
      from: "FluroSolar <noreply@flurosolar.com>",
      to: process.env.ADMIN_EMAIL || "fluroservices@gmail.com",
      subject: `SMS from ${matched.name}`,
      html: `<p><strong>${matched.name}</strong> (${from}) said:</p><blockquote>${body}</blockquote>`,
    }).catch(() => {});
  }

  return new NextResponse(
    `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`,
    { headers: { "Content-Type": "text/xml" } }
  );
}
