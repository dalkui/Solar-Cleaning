import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { Resend } from "resend";
import { randomBytes } from "crypto";
import { renderEmail } from "@/lib/email-template";

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function POST(req: NextRequest) {
  const { customerId } = await req.json();

  const { data: customer, error: custErr } = await supabase
    .from("customers")
    .select("*")
    .eq("id", customerId)
    .single();

  if (custErr || !customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const { error: tokenErr } = await supabase.from("booking_tokens").insert({
    customer_id: customerId,
    token,
    used: false,
    expires_at: expiresAt.toISOString(),
  });

  if (tokenErr) return NextResponse.json({ error: tokenErr.message }, { status: 500 });

  const origin = req.headers.get("origin") || "https://flurosolar.com";
  const bookingUrl = `${origin}/book/confirm?token=${token}`;

  await resend.emails.send({
    from: "FluroSolar <noreply@flurosolar.com>",
    to: customer.email,
    subject: "Time to book your clean — FluroSolar",
    html: renderEmail({
      preheader: "Your next solar panel clean is due — pick a time.",
      heading: "Time to book your clean",
      intro: `Hi ${customer.name || "there"} — your next solar panel clean is due.`,
      body: `<p style="margin:0;color:#7A95B0;">Tap below to pick a time that suits you.</p>`,
      cta: { label: "Choose a time →", href: bookingUrl },
      footer: "This link expires in 7 days. Any issues, just reply.",
    }),
  });

  return NextResponse.json({ ok: true });
}
