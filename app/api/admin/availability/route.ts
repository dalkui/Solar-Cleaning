import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const { data, error } = await supabase
    .from("availability_settings")
    .select("*")
    .order("day_of_week");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PUT(req: NextRequest) {
  const settings = await req.json();
  for (const s of settings) {
    const { error } = await supabase
      .from("availability_settings")
      .update({
        start_time: s.start_time,
        end_time: s.end_time,
        max_jobs: s.max_jobs,
        is_active: s.is_active,
      })
      .eq("day_of_week", s.day_of_week);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
