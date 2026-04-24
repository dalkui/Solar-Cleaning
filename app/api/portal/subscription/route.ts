import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabase } from "@/lib/supabase";
import { verifyCustomerToken } from "@/lib/auth";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function GET(req: NextRequest) {
  const token = req.cookies.get("customer_token")?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const session = await verifyCustomerToken(token);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: customer } = await supabase
    .from("customers")
    .select("stripe_customer_id, stripe_subscription_id, plan")
    .eq("id", session.customerId)
    .single();

  if (!customer?.stripe_subscription_id || !customer.stripe_customer_id) {
    return NextResponse.json({ subscription: null, paymentMethod: null });
  }

  const [subscription, stripeCustomer] = await Promise.all([
    stripe.subscriptions.retrieve(customer.stripe_subscription_id),
    stripe.customers.retrieve(customer.stripe_customer_id),
  ]);

  let paymentMethod: any = null;
  const defaultPmId = (stripeCustomer as Stripe.Customer).invoice_settings?.default_payment_method as string | undefined;
  if (defaultPmId) {
    const pm = await stripe.paymentMethods.retrieve(defaultPmId);
    if (pm.card) {
      paymentMethod = {
        brand: pm.card.brand,
        last4: pm.card.last4,
        exp_month: pm.card.exp_month,
        exp_year: pm.card.exp_year,
      };
    }
  }

  const item = subscription.items.data[0];
  const amount = subscription.items.data.reduce((sum, i) => sum + ((i.price.unit_amount || 0) * (i.quantity || 1)), 0);

  return NextResponse.json({
    subscription: {
      id: subscription.id,
      status: subscription.status,
      cancel_at_period_end: subscription.cancel_at_period_end,
      current_period_end: (item as any)?.current_period_end || null,
      amount: amount / 100,
      currency: subscription.currency,
      interval: item?.price.recurring?.interval || "month",
      plan: customer.plan,
    },
    paymentMethod,
  });
}
