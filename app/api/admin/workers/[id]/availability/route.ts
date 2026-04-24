import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data } = await supabase
    .from("worker_availability")
    .select("*")
    .eq("worker_id", id)
    .order("day_of_week");
  return NextResponse.json(data || []);
}

// Replace full week availability in one call
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { days } = await req.json();
  // days: [{ day_of_week, is_active, start_time, end_time }, ...]

  await supabase.from("worker_availability").delete().eq("worker_id", id);

  const rows = (days || []).map((d: any) => ({
    worker_id: id,
    day_of_week: d.day_of_week,
    is_active: !!d.is_active,
    start_time: d.start_time || "08:00",
    end_time: d.end_time || "16:00",
  }));

  if (rows.length > 0) {
    const { error } = await supabase.from("worker_availability").insert(rows);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
