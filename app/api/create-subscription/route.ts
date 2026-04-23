import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const planPrices: Record<string, { firstClean: string; monthly: string }> = {
  basic: {
    firstClean: process.env.STRIPE_BASIC_FIRST_CLEAN!,
    monthly: process.env.STRIPE_BASIC_MONTHLY!,
  },
  standard: {
    firstClean: process.env.STRIPE_STANDARD_FIRST_CLEAN!,
    monthly: process.env.STRIPE_STANDARD_MONTHLY!,
  },
  elite: {
    firstClean: process.env.STRIPE_ELITE_FIRST_CLEAN!,
    monthly: process.env.STRIPE_ELITE_MONTHLY!,
  },
};

export async function POST(req: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  try {
    const { plan, bookingDetails = {} } = await req.json();

    const prices = planPrices[plan];
    if (!prices) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const origin = req.headers.get("origin") || "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      ui_mode: "elements",
      mode: "subscription",
      line_items: [
        { price: prices.firstClean, quantity: 1 },
        { price: prices.monthly, quantity: 1 },
      ],
      subscription_data: {
        metadata: {
          plan,
          name:     bookingDetails.name     || "",
          phone:    bookingDetails.phone    || "",
          street:   bookingDetails.street   || "",
          suburb:   bookingDetails.suburb   || "",
          state:    bookingDetails.state    || "",
          postcode: bookingDetails.postcode || "",
          stories:  bookingDetails.stories  || "",
          panels:   bookingDetails.panels   || "",
        },
      },
      return_url: `${origin}/success?plan=${plan}&session_id={CHECKOUT_SESSION_ID}`,
    });

    return NextResponse.json({ clientSecret: session.client_secret });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Stripe error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
