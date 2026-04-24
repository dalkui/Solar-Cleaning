import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const { customer_id, scheduled_at } = await req.json();
  const { data, error } = await supabase
    .from("bookings")
    .insert({ customer_id, scheduled_at, status: "confirmed" })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  let query = supabase
    .from("bookings")
    .select("*, customers(name, street, suburb, postcode, plan, stories, panels, email, phone)")
    .order("scheduled_at");

  if (from) query = query.gte("scheduled_at", from);
  if (to) query = query.lte("scheduled_at", to);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
