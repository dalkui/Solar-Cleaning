import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { verifyCustomerToken } from "@/lib/auth";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function POST(req: NextRequest) {
  const token = req.cookies.get("customer_token")?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const session = await verifyCustomerToken(token);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { booking_id, preferred_date, note } = await req.json();

  const { data: booking } = await supabase
    .from("bookings")
    .select("*, customers(name, email, phone)")
    .eq("id", booking_id)
    .eq("customer_id", session.customerId)
    .single();

  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

  const c = booking.customers as any;
  const currentTime = booking.scheduled_at ? new Date(booking.scheduled_at).toLocaleString("en-AU", { timeZone: "Australia/Sydney", dateStyle: "long", timeStyle: "short" }) : "—";

  // Log a message + email admin
  await supabase.from("customer_messages").insert({
    customer_id: session.customerId,
    direction: "inbound",
    channel: "email",
    subject: "Reschedule request",
    body: `Customer requested reschedule for booking ${booking_id}. Preferred: ${preferred_date || "—"}. Note: ${note || "none"}`,
    purpose: "reschedule_request",
  });

  await resend.emails.send({
    from: "FluroSolar <noreply@flurosolar.com>",
    to: process.env.ADMIN_EMAIL || "fluroservices@gmail.com",
    subject: `Reschedule request – ${c.name}`,
    html: `
      <h2>Reschedule Request</h2>
      <p><strong>${c.name}</strong> has asked to reschedule their clean.</p>
      <p>Current time: ${currentTime}</p>
      <p>Preferred: ${preferred_date || "not specified"}</p>
      ${note ? `<p>Note: ${note}</p>` : ""}
      <p>Phone: ${c.phone}</p>
      <p>Email: ${c.email}</p>
    `,
  }).catch(() => {});

  return NextResponse.json({ ok: true });
}
