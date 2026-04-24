import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { Resend } from "resend";
import { randomBytes } from "crypto";

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
  const link = `${origin}/portal/verify?token=${token}`;

  await resend.emails.send({
    from: "FluroSolar <noreply@flurosolar.com>",
    to: customer.email,
    subject: "Your FluroSolar login link",
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#08101C;color:#EFF4FF;padding:40px;border-radius:12px;">
        <h2 style="color:#F5C518;">Log in to your account</h2>
        <p>Hi ${customer.name || "there"},</p>
        <p>Tap the button below to log in to your FluroSolar account. This link expires in 1 hour.</p>
        <a href="${link}" style="display:inline-block;background:#F5C518;color:#08101C;font-weight:700;padding:14px 28px;border-radius:8px;text-decoration:none;margin:16px 0;">Log in →</a>
        <p style="color:#3A5268;font-size:13px;">Didn't request this? You can ignore this email.</p>
      </div>
    `,
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
