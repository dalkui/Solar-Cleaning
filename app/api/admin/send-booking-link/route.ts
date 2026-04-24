import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { Resend } from "resend";
import { randomBytes } from "crypto";

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

  const origin = req.headers.get("origin") || "https://flurosolar.com.au";
  const bookingUrl = `${origin}/book/confirm?token=${token}`;

  await resend.emails.send({
    from: "FluroSolar <noreply@flurosolar.com.au>",
    to: customer.email,
    subject: "Book your solar panel clean — FluroSolar",
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#08101C;color:#EFF4FF;padding:40px;border-radius:12px;">
        <h2 style="color:#F5C518;margin-bottom:8px;">Time to book your clean</h2>
        <p style="color:#7A95B0;margin-bottom:24px;">Hi ${customer.name || "there"},</p>
        <p style="margin-bottom:24px;">Your next solar panel clean is due. Click the button below to choose a time that works for you.</p>
        <a href="${bookingUrl}" style="display:inline-block;background:#F5C518;color:#08101C;font-weight:700;padding:14px 28px;border-radius:8px;text-decoration:none;margin-bottom:24px;">Choose a time →</a>
        <p style="color:#3A5268;font-size:13px;">This link expires in 7 days. If you have any issues, reply to this email or contact us at fluroservices@gmail.com</p>
      </div>
    `,
  });

  return NextResponse.json({ ok: true });
}
