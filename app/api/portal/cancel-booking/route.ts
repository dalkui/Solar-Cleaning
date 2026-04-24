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

  const { booking_id } = await req.json();

  const { data: booking } = await supabase
    .from("bookings")
    .select("*, customers(name, email)")
    .eq("id", booking_id)
    .eq("customer_id", session.customerId)
    .single();
  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

  await supabase
    .from("bookings")
    .update({ scheduled_at: null, worker_id: null, status: "pending" })
    .eq("id", booking_id);

  const c = booking.customers as any;
  await resend.emails.send({
    from: "FluroSolar <noreply@flurosolar.com>",
    to: process.env.ADMIN_EMAIL || "fluroservices@gmail.com",
    subject: `Customer cancelled booking – ${c.name}`,
    html: `<p>${c.name} cancelled their upcoming clean. It's been returned to the unscheduled list — rebook them at another time.</p>`,
  }).catch(() => {});

  return NextResponse.json({ ok: true });
}
