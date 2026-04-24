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
    .select("stripe_customer_id")
    .eq("id", session.customerId)
    .single();

  if (!customer?.stripe_customer_id) return NextResponse.json({ invoices: [] });

  const list = await stripe.invoices.list({
    customer: customer.stripe_customer_id,
    limit: 24,
  });

  const invoices = list.data.map(inv => ({
    id: inv.id,
    number: inv.number,
    status: inv.status,
    amount_paid: inv.amount_paid / 100,
    amount_due: inv.amount_due / 100,
    currency: inv.currency,
    created: inv.created,
    hosted_invoice_url: inv.hosted_invoice_url,
    invoice_pdf: inv.invoice_pdf,
  }));

  return NextResponse.json({ invoices });
}
