import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { Resend } from "resend";
import { formatDateTime } from "@/lib/slots";

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function POST(req: NextRequest) {
  const { token, scheduledAt } = await req.json();

  const { data: tokenRow, error: tokenErr } = await supabase
    .from("booking_tokens")
    .select("*, customers(*)")
    .eq("token", token)
    .single();

  if (tokenErr || !tokenRow) return NextResponse.json({ error: "Invalid link" }, { status: 404 });
  if (tokenRow.used) return NextResponse.json({ error: "Already used" }, { status: 410 });
  if (new Date(tokenRow.expires_at) < new Date()) return NextResponse.json({ error: "Expired" }, { status: 410 });

  const c = tokenRow.customers;
  const formattedTime = formatDateTime(scheduledAt);

  const { error: bookingErr } = await supabase.from("bookings").insert({
    customer_id: tokenRow.customer_id,
    scheduled_at: scheduledAt,
    status: "confirmed",
  });

  if (bookingErr) return NextResponse.json({ error: bookingErr.message }, { status: 500 });

  await supabase.from("booking_tokens").update({ used: true }).eq("token", token);

  await resend.emails.send({
    from: "FluroSolar <noreply@flurosolar.com>",
    to: c.email,
    subject: `Booking confirmed — ${formattedTime}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#08101C;color:#EFF4FF;padding:40px;border-radius:12px;">
        <h2 style="color:#F5C518;">Booking Confirmed ✓</h2>
        <p>Hi ${c.name || "there"},</p>
        <p>Your solar panel clean is booked for <strong>${formattedTime}</strong>.</p>
        <p style="color:#7A95B0;">We'll be at ${c.street}, ${c.suburb} ${c.postcode}.<br/>You don't need to be home — we'll send a reminder the day before.</p>
        <p style="color:#3A5268;font-size:13px;margin-top:24px;">Questions? Contact us at fluroservices@gmail.com</p>
      </div>
    `,
  });

  await resend.emails.send({
    from: "FluroSolar <noreply@flurosolar.com>",
    to: process.env.ADMIN_EMAIL!,
    subject: `New booking — ${c.name} — ${formattedTime}`,
    html: `
      <h2>New Booking</h2>
      <p><strong>Customer:</strong> ${c.name}</p>
      <p><strong>Time:</strong> ${formattedTime}</p>
      <p><strong>Address:</strong> ${c.street}, ${c.suburb} ${c.postcode}, ${c.state}</p>
      <p><strong>Plan:</strong> ${c.plan}</p>
      <p><strong>Panels:</strong> ${c.panels}</p>
      <p><strong>Storey:</strong> ${c.stories}</p>
      <p><strong>Phone:</strong> ${c.phone}</p>
      <p><strong>Email:</strong> ${c.email}</p>
    `,
  });

  return NextResponse.json({ ok: true });
}
