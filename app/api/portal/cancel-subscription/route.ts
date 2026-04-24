import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabase } from "@/lib/supabase";
import { verifyCustomerToken } from "@/lib/auth";
import { Resend } from "resend";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const resend = new Resend(process.env.RESEND_API_KEY!);

export async function POST(req: NextRequest) {
  const token = req.cookies.get("customer_token")?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const session = await verifyCustomerToken(token);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { reason } = await req.json();

  const { data: customer } = await supabase
    .from("customers")
    .select("stripe_subscription_id, name, email")
    .eq("id", session.customerId)
    .single();

  if (!customer?.stripe_subscription_id) return NextResponse.json({ error: "No active subscription" }, { status: 404 });

  const sub = await stripe.subscriptions.update(customer.stripe_subscription_id, {
    cancel_at_period_end: true,
    cancellation_details: reason ? { comment: reason } : undefined,
  });

  await supabase.from("customer_messages").insert({
    customer_id: session.customerId,
    direction: "inbound",
    channel: "email",
    subject: "Subscription cancellation requested",
    body: `Customer cancelled via portal. Reason: ${reason || "(none)"}`,
    purpose: "cancellation",
  });

  await resend.emails.send({
    from: "FluroSolar Admin <noreply@flurosolar.com>",
    to: process.env.ADMIN_EMAIL || "fluroservices@gmail.com",
    subject: `Cancellation requested – ${customer.name}`,
    html: `<p><strong>${customer.name}</strong> (${customer.email}) cancelled via the portal. Cancels at end of billing period.</p><p>Reason: ${reason || "(not provided)"}</p>`,
  }).catch(() => {});

  return NextResponse.json({ ok: true, cancel_at_period_end: sub.cancel_at_period_end });
}
