import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data } = await supabase
    .from("worker_unavailable_dates")
    .select("*")
    .eq("worker_id", id)
    .order("date");
  return NextResponse.json(data || []);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { start_date, end_date, date, reason } = await req.json();
  const startDate = start_date || date;
  const endDate = end_date || startDate;
  if (!startDate) return NextResponse.json({ error: "Missing start_date" }, { status: 400 });

  const { data, error } = await supabase
    .from("worker_unavailable_dates")
    .insert({ worker_id: id, date: startDate, end_date: endDate, reason: reason || null })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const dateId = searchParams.get("date_id");
  if (!dateId) return NextResponse.json({ error: "Missing date_id" }, { status: 400 });
  const { error } = await supabase.from("worker_unavailable_dates").delete().eq("id", dateId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
