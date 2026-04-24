import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { verifyWorkerToken } from "@/lib/auth";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY!);

function getNextCleanDate(plan: string): string {
  const months = plan === "elite" ? 3 : plan === "standard" ? 6 : 12;
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

  // Verify booking belongs to this worker
  const { data: booking } = await supabase
    .from("bookings")
    .select("*, customers(name, email, plan)")
    .eq("id", booking_id)
    .eq("worker_id", session.workerId)
    .single();

  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

  // Insert job update log
  await supabase.from("job_updates").insert({
    booking_id,
    worker_id: session.workerId,
    type,
    note: note || null,
  });

  // Update booking status
  if (type === "arrived") {
    await supabase.from("bookings").update({ status: "in_progress" }).eq("id", booking_id);
  } else if (type === "completed") {
    await supabase.from("bookings").update({ status: "completed" }).eq("id", booking_id);

    // Send completion email to customer
    const customer = booking.customers as any;
    if (customer?.email) {
      const nextClean = getNextCleanDate(customer.plan);
      await resend.emails.send({
        from: "FluroSolar <noreply@flurosolar.com.au>",
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
      });
    }

    // Send notification to admin
    await resend.emails.send({
      from: "FluroSolar <noreply@flurosolar.com.au>",
      to: "fluroservices@gmail.com",
      subject: `Job completed – ${(booking.customers as any)?.name}`,
      html: `<p>${session.name} marked the job for <strong>${(booking.customers as any)?.name}</strong> as completed.</p>`,
    });
  }

  return NextResponse.json({ ok: true });
}
