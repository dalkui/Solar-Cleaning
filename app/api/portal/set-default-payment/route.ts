import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabase } from "@/lib/supabase";
import { verifyCustomerToken } from "@/lib/auth";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  const token = req.cookies.get("customer_token")?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const session = await verifyCustomerToken(token);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { payment_method_id } = await req.json();
  if (!payment_method_id) return NextResponse.json({ error: "Missing payment_method_id" }, { status: 400 });

  const { data: customer } = await supabase
    .from("customers")
    .select("stripe_customer_id, stripe_subscription_id, payment_status")
    .eq("id", session.customerId)
    .single();

  if (!customer?.stripe_customer_id) return NextResponse.json({ error: "No Stripe customer" }, { status: 404 });

  // Attach and set as default
  await stripe.customers.update(customer.stripe_customer_id, {
    invoice_settings: { default_payment_method: payment_method_id },
  });

  if (customer.stripe_subscription_id) {
    await stripe.subscriptions.update(customer.stripe_subscription_id, {
      default_payment_method: payment_method_id,
    });
  }

  // If they were past_due, reset to active (webhook will confirm when invoice pays)
  if (customer.payment_status === "past_due") {
    await supabase.from("customers").update({ payment_status: "active" }).eq("id", session.customerId);
  }

  return NextResponse.json({ ok: true });
}
