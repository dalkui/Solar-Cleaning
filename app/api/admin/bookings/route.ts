import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY!);

async function notifyWorkerAssignment(workerId: string, bookingId: string, reassignment = false) {
  const [{ data: worker }, { data: booking }] = await Promise.all([
    supabase.from("workers").select("name, email").eq("id", workerId).single(),
    supabase
      .from("bookings")
      .select("scheduled_at, customers(name, street, suburb, state, postcode, plan, stories, panels, notes, phone)")
      .eq("id", bookingId)
      .single(),
  ]);
  if (!worker?.email || !booking) return;
  const c = booking.customers as any;
  const dateLabel = new Date(booking.scheduled_at).toLocaleString("en-AU", {
    weekday: "long", day: "numeric", month: "long", hour: "numeric", minute: "2-digit",
    timeZone: "Australia/Sydney",
  });
  const subject = reassignment
    ? `Job reassigned to you – ${dateLabel}`
    : `New job assigned – ${dateLabel}`;

  await resend.emails.send({
    from: "FluroSolar <noreply@flurosolar.com.au>",
    to: worker.email,
    subject,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#08101C;color:#EFF4FF;padding:40px;border-radius:12px;">
        <h2 style="color:#F5C518;margin-bottom:8px;">${reassignment ? "Job reassigned to you" : "New job assigned"}</h2>
        <p style="margin-bottom:20px;color:#7A95B0;">${dateLabel}</p>
        <p><strong>${c?.name}</strong><br/>${c?.street}, ${c?.suburb} ${c?.postcode} ${c?.state}</p>
        <p style="margin-top:12px;">Phone: ${c?.phone || "—"}</p>
        <p style="margin-top:12px;">${c?.panels || "—"} panels · ${c?.stories || "—"} storey · ${c?.plan || "—"} plan</p>
        ${c?.notes ? `<p style="margin-top:12px;color:#7A95B0;">Notes: ${c.notes}</p>` : ""}
        <a href="https://flurosolar.com.au/worker" style="display:inline-block;margin-top:20px;background:#F5C518;color:#08101C;font-weight:700;padding:12px 24px;border-radius:8px;text-decoration:none;">Open Worker Portal →</a>
      </div>
    `,
  }).catch(() => {});
}

export async function POST(req: NextRequest) {
  const { customer_id, scheduled_at, worker_id, pending_booking_id } = await req.json();

  let data: any;
  let error: any;

  if (pending_booking_id) {
    // Promote existing pending booking instead of creating a new one
    const result = await supabase
      .from("bookings")
      .update({ scheduled_at, worker_id: worker_id || null, status: "confirmed" })
      .eq("id", pending_booking_id)
      .select()
      .single();
    data = result.data; error = result.error;
  } else {
    const result = await supabase
      .from("bookings")
      .insert({ customer_id, scheduled_at, status: "confirmed", worker_id: worker_id || null })
      .select()
      .single();
    data = result.data; error = result.error;
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (worker_id) notifyWorkerAssignment(worker_id, data.id);

  return NextResponse.json(data);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  let query = supabase
    .from("bookings")
    .select("*, customers(name, street, suburb, postcode, plan, stories, panels, email, phone), workers(id, name, color)")
    .order("scheduled_at");

  if (from) query = query.gte("scheduled_at", from);
  if (to) query = query.lte("scheduled_at", to);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
