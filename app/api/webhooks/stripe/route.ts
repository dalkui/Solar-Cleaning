import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabase } from "@/lib/supabase";
import { Resend } from "resend";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const resend = new Resend(process.env.RESEND_API_KEY!);

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    return NextResponse.json({ error: "Webhook signature invalid" }, { status: 400 });
  }

  if (event.type === "customer.subscription.created") {
    const sub = event.data.object as Stripe.Subscription;
    const meta = sub.metadata || {};

    const stripeCustomer = await stripe.customers.retrieve(sub.customer as string) as Stripe.Customer;

    await supabase.from("customers").upsert({
      stripe_subscription_id: sub.id,
      stripe_customer_id: sub.customer as string,
      name:     meta.name     || stripeCustomer.name || "",
      email:    stripeCustomer.email || "",
      phone:    meta.phone    || "",
      street:   meta.street   || "",
      suburb:   meta.suburb   || "",
      state:    meta.state    || "",
      postcode: meta.postcode || "",
      stories:  meta.stories  || "",
      panels:   meta.panels   || "",
      plan:     meta.plan     || "standard",
      status:   "active",
      subscribed_at: new Date(sub.start_date * 1000).toISOString(),
    }, { onConflict: "stripe_subscription_id" });
  }

  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object as Stripe.Subscription;
    const meta = sub.metadata || {};

    await supabase
      .from("customers")
      .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
      .eq("stripe_subscription_id", sub.id);

    await resend.emails.send({
      from: "FluroSolar Admin <noreply@flurosolar.com>",
      to: process.env.ADMIN_EMAIL!,
      subject: `Cancellation: ${meta.name || "A customer"} cancelled their ${meta.plan || ""} plan`,
      html: `
        <h2>Subscription Cancelled</h2>
        <p><strong>Name:</strong> ${meta.name || "Unknown"}</p>
        <p><strong>Phone:</strong> ${meta.phone || "—"}</p>
        <p><strong>Address:</strong> ${meta.street}, ${meta.suburb} ${meta.postcode}</p>
        <p><strong>Plan:</strong> ${meta.plan}</p>
        <p><strong>Panels:</strong> ${meta.panels}</p>
        <p><strong>Storey:</strong> ${meta.stories}</p>
        <p><strong>Stripe Subscription ID:</strong> ${sub.id}</p>
        <p style="color:#e53e3e;"><strong>Check if early cancellation fee applies ($150).</strong></p>
      `,
    });
  }

  return NextResponse.json({ received: true });
}
