import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { data: customer, error } = await supabase
    .from("customers")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });

  const { data: jobs } = await supabase
    .from("bookings")
    .select("*, workers(id, name, color)")
    .eq("customer_id", id)
    .order("scheduled_at", { ascending: false, nullsFirst: false });

  return NextResponse.json({ customer, jobs: jobs || [] });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();

  const update: Record<string, any> = {};
  const allowed = ["notes", "auto_schedule", "preferred_time_of_day", "sms_opt_out", "name", "phone", "email", "street", "suburb", "state", "postcode"];
  for (const k of allowed) {
    if (body[k] !== undefined) update[k] = body[k];
  }

  const { error } = await supabase
    .from("customers")
    .update(update)
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
