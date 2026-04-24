import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { Resend } from "resend";
import { randomBytes } from "crypto";
import { renderEmail } from "@/lib/email-template";

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

  const { data: customer } = await supabase
    .from("customers")
    .select("id, name, email")
    .ilike("email", email.trim())
    .maybeSingle();

  // Always return ok to avoid leaking which emails exist
  if (!customer) return NextResponse.json({ ok: true });

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await supabase.from("customer_login_tokens").insert({
    customer_id: customer.id,
    token,
    expires_at: expiresAt.toISOString(),
  });

  const origin = req.headers.get("origin") || "https://flurosolar.com";
  const link = `${origin}/api/portal/verify?token=${token}`;

  await resend.emails.send({
    from: "FluroSolar <noreply@flurosolar.com>",
    to: customer.email,
    subject: "Your FluroSolar login link",
    html: renderEmail({
      preheader: "Tap to log in. Expires in 1 hour.",
      heading: "Log in to your account",
      intro: `Hi ${customer.name || "there"} — here's your one-tap login link.`,
      body: `<p style="margin:0;color:#7A95B0;">This link will log you in instantly. No password needed.</p>`,
      cta: { label: "Log in →", href: link },
      footer: "This link expires in 1 hour. Didn't request this? Safe to ignore.",
    }),
  }).catch(() => {});

  await supabase.from("customer_messages").insert({
    customer_id: customer.id,
    direction: "outbound",
    channel: "email",
    subject: "Your FluroSolar login link",
    body: `Login link sent: ${link}`,
    purpose: "login",
  });

  return NextResponse.json({ ok: true });
}
