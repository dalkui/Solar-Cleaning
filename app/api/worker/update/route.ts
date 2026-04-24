import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { verifyWorkerToken } from "@/lib/auth";
import { Resend } from "resend";
import { sendSMS } from "@/lib/sms";

const resend = new Resend(process.env.RESEND_API_KEY!);

function planMonths(plan: string): number {
  if (plan === "elite") return 3;
  if (plan === "basic") return 12;
  return 6;
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function firstOfMonth(date: Date): string {
  return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().slice(0, 10);
}

function getNextCleanDateLabel(plan: string): string {
  const months = planMonths(plan);
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric", timeZone: "Australia/Sydney" });
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get("worker_token")?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const session = await verifyWorkerToken(token);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { booking_id, type, note } = await req.json();

  const { data: booking } = await supabase
    .from("bookings")
    .select("*, customers(id, name, email, phone, plan, sms_opt_out)")
    .eq("id", booking_id)
    .eq("worker_id", session.workerId)
    .single();

  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

  await supabase.from("job_updates").insert({
    booking_id,
    worker_id: session.workerId,
    type,
    note: note || null,
  });

  if (type === "arrived") {
    await supabase.from("bookings").update({ status: "in_progress" }).eq("id", booking_id);
    const customer = booking.customers as any;
    if (customer?.phone && !customer.sms_opt_out) {
      await sendSMS(
        customer.phone,
        `${session.name} has arrived at your place for your FluroSolar clean. We'll be done soon ☀️`,
        { customerId: customer.id, purpose: "confirmation" }
      );
    }
  } else if (type === "completed") {
    await supabase.from("bookings").update({ status: "completed" }).eq("id", booking_id);

    const customer = booking.customers as any;

    // Auto-create next pending booking
    if (customer) {
      const now = new Date();
      const dueDate = addMonths(now, planMonths(customer.plan));

      const { data: existingPending } = await supabase
        .from("bookings")
        .select("id")
        .eq("customer_id", customer.id)
        .eq("status", "pending")
        .maybeSingle();

      if (!existingPending) {
        await supabase.from("bookings").insert({
          customer_id: customer.id,
          status: "pending",
          due_month: firstOfMonth(dueDate),
          scheduled_at: null,
        });
      }
    }

    if (customer?.email) {
      const nextClean = getNextCleanDateLabel(customer.plan);
      await resend.emails.send({
        from: "FluroSolar <noreply@flurosolar.com>",
        to: customer.email,
        subject: "Your solar panels have been cleaned – FluroSolar",
        html: `
          <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#08101C;color:#EFF4FF;padding:40px;border-radius:12px;">
            <h2 style="color:#F5C518;margin-bottom:8px;">Your panels are sparkling clean ☀️</h2>
            <p style="color:#7A95B0;margin-bottom:24px;">Hi ${customer.name || "there"},</p>
            <p style="margin-bottom:16px;">Your solar panels were cleaned today by ${session.name}. They're now running at peak efficiency.</p>
            <p style="margin-bottom:24px;color:#7A95B0;">Your next scheduled clean is <strong style="color:#EFF4FF;">${nextClean}</strong>.</p>
            <p style="margin-bottom:8px;">If you have any questions or concerns about today's service, simply reply to this email or contact us at fluroservices@gmail.com</p>
            <p style="color:#3A5268;font-size:13px;margin-top:24px;">Thank you for being a FluroSolar customer.</p>
          </div>
        `,
      }).catch(() => {});
    }

    await resend.emails.send({
      from: "FluroSolar <noreply@flurosolar.com>",
      to: "fluroservices@gmail.com",
      subject: `Job completed – ${customer?.name}`,
      html: `<p>${session.name} marked the job for <strong>${customer?.name}</strong> as completed.</p>`,
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
