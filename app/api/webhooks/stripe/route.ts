import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabase } from "@/lib/supabase";
import { Resend } from "resend";
import { renderEmail } from "@/lib/email-template";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const resend = new Resend(process.env.RESEND_API_KEY!);

function planMonths(plan: string): number {
  if (plan === "elite") return 3;
  if (plan === "basic") return 12;
  return 6;
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function firstOfMonth(date: Date): string {
  return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().slice(0, 10);
}

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
    const subscribedAt = new Date(sub.start_date * 1000);
    const plan = meta.plan || "standard";
    const autoSchedule = meta.auto_schedule !== "false";
    const preferredTime = meta.preferred_time_of_day || "any";

    const { data: customer } = await supabase.from("customers").upsert({
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
      plan,
      status:   "active",
      payment_status: "active",
      auto_schedule: autoSchedule,
      preferred_time_of_day: preferredTime,
      subscribed_at: subscribedAt.toISOString(),
    }, { onConflict: "stripe_subscription_id" }).select().single();

    if (customer) {
      const { data: existing } = await supabase
        .from("bookings")
        .select("id")
        .eq("customer_id", customer.id)
        .eq("status", "pending")
        .maybeSingle();

      if (!existing) {
        const dueDate = addMonths(subscribedAt, planMonths(plan));
        await supabase.from("bookings").insert({
          customer_id: customer.id,
          status: "pending",
          due_month: firstOfMonth(dueDate),
          scheduled_at: null,
        });
      }

      // Welcome email
      if (customer.email) {
        const planName = plan.charAt(0).toUpperCase() + plan.slice(1);
        await resend.emails.send({
          from: "FluroSolar <noreply@flurosolar.com>",
          to: customer.email,
          subject: "Welcome to FluroSolar ☀️",
          html: renderEmail({
            preheader: "Your subscription is active. Here's what happens next.",
            heading: "Welcome to FluroSolar",
            intro: `Hi ${customer.name || "there"} — you're all set up on the <strong>${planName}</strong> plan. Thanks for joining us.`,
            body: `
              <p style="margin:0 0 16px;font-weight:600;color:#F5C518;">What happens next</p>
              <ul style="margin:0 0 16px;padding-left:20px;color:#EFF4FF;">
                <li style="margin-bottom:8px;">Your first clean is scheduled automatically — we'll email you the date once we've picked a time</li>
                <li style="margin-bottom:8px;">Log in to your portal any time to view bookings, update your card, or reschedule</li>
                <li style="margin-bottom:8px;">No password — just enter your email and we'll send you a one-tap login link</li>
              </ul>
              <p style="margin:0;color:#7A95B0;">You can log in using the button below:</p>
            `,
            cta: { label: "Log in to your portal →", href: "https://flurosolar.com/portal/login" },
          }),
        }).catch(() => {});
      }
    }
  }

  if (event.type === "invoice.payment_failed") {
    const invoice = event.data.object as Stripe.Invoice;
    const subId = (invoice as any).subscription as string | null;
    if (subId) {
      const { data: customer } = await supabase
        .from("customers")
        .update({ payment_status: "past_due" })
        .eq("stripe_subscription_id", subId)
        .select()
        .single();

      if (customer?.email) {
        await resend.emails.send({
          from: "FluroSolar <noreply@flurosolar.com>",
          to: customer.email,
          subject: "Payment failed — please update your card",
          html: renderEmail({
            preheader: "Your last payment didn't go through — update your card to keep your cleans.",
            heading: "We couldn't process your payment",
            intro: `Hi ${customer.name || "there"} — your recent FluroSolar payment didn't go through.`,
            body: `
              <p style="margin:0 0 12px;">This is usually an expired card or a bank hold. No rush — we'll retry automatically, but the quickest fix is to update your card now.</p>
            `,
            cta: { label: "Update payment method →", href: "https://flurosolar.com/portal/account" },
            footer: "We'll retry over the next few days. Reply if you need help.",
          }),
        }).catch(() => {});
      }
    }
  }

  if (event.type === "customer.subscription.updated") {
    const sub = event.data.object as Stripe.Subscription;
    if (sub.status === "unpaid" || sub.status === "past_due") {
      await resend.emails.send({
        from: "FluroSolar Admin <noreply@flurosolar.com>",
        to: process.env.ADMIN_EMAIL || "fluroservices@gmail.com",
        subject: `Payment issue escalating — ${sub.id}`,
        html: `<p>Subscription <strong>${sub.id}</strong> is now <strong>${sub.status}</strong>. Follow up with the customer.</p>`,
      }).catch(() => {});
    }
  }

  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object as Stripe.Subscription;
    const meta = sub.metadata || {};

    await supabase
      .from("customers")
      .update({ status: "cancelled", payment_status: "cancelled", cancelled_at: new Date().toISOString() })
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
