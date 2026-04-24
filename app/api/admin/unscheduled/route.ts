import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const { data: customers } = await supabase
    .from("customers")
    .select("id, name, suburb, plan, panels, stories, street, postcode")
    .eq("status", "active");

  const { data: bookings } = await supabase
    .from("bookings")
    .select("customer_id")
    .in("status", ["confirmed", "pending"])
    .gte("scheduled_at", new Date().toISOString());

  const scheduledIds = new Set((bookings || []).map((b: any) => b.customer_id));
  const unscheduled = (customers || []).filter((c: any) => !scheduledIds.has(c.id));

  return NextResponse.json(unscheduled);
}
