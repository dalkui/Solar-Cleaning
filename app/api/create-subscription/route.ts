import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const planPrices: Record<string, { firstClean: string; monthly: string; name: string }> = {
  basic: {
    firstClean: process.env.STRIPE_BASIC_FIRST_CLEAN!,
    monthly: process.env.STRIPE_BASIC_MONTHLY!,
    name: "Basic Plan",
  },
  standard: {
    firstClean: process.env.STRIPE_STANDARD_FIRST_CLEAN!,
    monthly: process.env.STRIPE_STANDARD_MONTHLY!,
    name: "Standard Plan",
  },
  elite: {
    firstClean: process.env.STRIPE_ELITE_FIRST_CLEAN!,
    monthly: process.env.STRIPE_ELITE_MONTHLY!,
    name: "Elite Plan",
  },
};

export async function POST(req: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  try {
    const { plan, email, name } = await req.json();

    const prices = planPrices[plan];
    if (!prices) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    // Create customer
    const customer = await stripe.customers.create({ email, name });

    // Create subscription with first clean as invoice item
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: prices.monthly }],
      add_invoice_items: [{ price: prices.firstClean, quantity: 1 }],
      payment_behavior: "default_incomplete",
      payment_settings: { save_default_payment_method: "on_subscription" },
      expand: ["latest_invoice.payment_intent"],
      metadata: { plan },
    });

    const invoice = subscription.latest_invoice as Stripe.Invoice & { payment_intent: Stripe.PaymentIntent };
    const paymentIntent = invoice.payment_intent;

    return NextResponse.json({
      subscriptionId: subscription.id,
      clientSecret: paymentIntent.client_secret,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Stripe error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
