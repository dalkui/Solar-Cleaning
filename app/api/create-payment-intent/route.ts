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
    const { plan } = await req.json();

    const prices = planPrices[plan];
    if (!prices) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const origin = req.headers.get("origin") || "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [
        {
          price: prices.monthly,
          quantity: 1,
        },
      ],
      subscription_data: {
        metadata: { plan },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        add_invoice_items: [{ price: prices.firstClean, quantity: 1 }],
      } as any,
      success_url: `${origin}/success?plan=${plan}`,
      cancel_url: `${origin}/#pricing`,
      currency: "aud",
      billing_address_collection: "required",
      phone_number_collection: { enabled: true },
      custom_text: {
        submit: {
          message: `You'll be charged for your first clean today, then ${prices.name} billing begins monthly.`,
        },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Stripe error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
