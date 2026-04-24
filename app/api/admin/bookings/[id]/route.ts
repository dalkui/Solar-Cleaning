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
    from: "FluroSolar <noreply@flurosolar.com>",
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
        <a href="https://flurosolar.com/worker" style="display:inline-block;margin-top:20px;background:#F5C518;color:#08101C;font-weight:700;padding:12px 24px;border-radius:8px;text-decoration:none;">Open Worker Portal →</a>
      </div>
    `,
  }).catch(() => {});
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [bookingRes, updatesRes, photosRes] = await Promise.all([
    supabase
      .from("bookings")
      .select("*, customers(*), workers(id, name, color, phone)")
      .eq("id", id)
      .single(),
    supabase.from("job_updates").select("*").eq("booking_id", id).order("created_at"),
    supabase.from("job_photos").select("*").eq("booking_id", id).order("created_at"),
  ]);

  return NextResponse.json({
    booking: bookingRes.data,
    job_updates: updatesRes.data || [],
    job_photos: photosRes.data || [],
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();

  // Look up existing worker for reassignment detection
  let previousWorkerId: string | null = null;
  if (body.worker_id !== undefined) {
    const { data: prev } = await supabase.from("bookings").select("worker_id").eq("id", id).single();
    previousWorkerId = prev?.worker_id || null;
  }

  const update: Record<string, any> = {};
  if (body.status !== undefined) update.status = body.status;
  if (body.scheduled_at !== undefined) update.scheduled_at = body.scheduled_at;
  if (body.worker_id !== undefined) update.worker_id = body.worker_id || null;

  const { error } = await supabase.from("bookings").update(update).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (body.worker_id && body.worker_id !== previousWorkerId) {
    notifyWorkerAssignment(body.worker_id, id, !!previousWorkerId);
  }

  return NextResponse.json({ ok: true });
}
