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

  const { data: customer } = await supabase
    .from("customers")
    .select("stripe_subscription_id")
    .eq("id", session.customerId)
    .single();

  if (!customer?.stripe_subscription_id) return NextResponse.json({ error: "No subscription" }, { status: 404 });

  await stripe.subscriptions.update(customer.stripe_subscription_id, { cancel_at_period_end: false });
  return NextResponse.json({ ok: true });
}
