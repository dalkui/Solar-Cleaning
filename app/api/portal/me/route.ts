import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { verifyCustomerToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("customer_token")?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const session = await verifyCustomerToken(token);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [custRes, bookingsRes, messagesRes] = await Promise.all([
    supabase.from("customers").select("*").eq("id", session.customerId).single(),
    supabase
      .from("bookings")
      .select("*, workers(id, name, color)")
      .eq("customer_id", session.customerId)
      .order("scheduled_at", { ascending: true, nullsFirst: false }),
    supabase
      .from("customer_messages")
      .select("*")
      .eq("customer_id", session.customerId)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  return NextResponse.json({
    customer: custRes.data,
    bookings: bookingsRes.data || [],
    messages: messagesRes.data || [],
  });
}
