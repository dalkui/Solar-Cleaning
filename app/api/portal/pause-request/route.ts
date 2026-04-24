import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { verifyCustomerToken } from "@/lib/auth";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function POST(req: NextRequest) {
  const token = req.cookies.get("customer_token")?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const session = await verifyCustomerToken(token);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: customer } = await supabase
    .from("customers")
    .select("name, email, phone")
    .eq("id", session.customerId)
    .single();

  if (!customer) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await supabase.from("customer_messages").insert({
    customer_id: session.customerId,
    direction: "inbound",
    channel: "email",
    subject: "Pause request",
    body: "Customer asked to pause for a month instead of cancelling",
    purpose: "cancellation",
  });

  await resend.emails.send({
    from: "FluroSolar Admin <noreply@flurosolar.com>",
    to: process.env.ADMIN_EMAIL || "fluroservices@gmail.com",
    subject: `Pause request – ${customer.name}`,
    html: `<p><strong>${customer.name}</strong> (${customer.email}) would like to pause their subscription for a month instead of cancelling. Please reach out to discuss.</p><p>Phone: ${customer.phone}</p>`,
  }).catch(() => {});

  return NextResponse.json({ ok: true });
}
