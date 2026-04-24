import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { verifyWorkerToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("worker_token")?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const session = await verifyWorkerToken(token);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [availRes, unavailRes] = await Promise.all([
    supabase.from("worker_availability").select("*").eq("worker_id", session.workerId).order("day_of_week"),
    supabase.from("worker_unavailable_dates").select("*").eq("worker_id", session.workerId).order("date"),
  ]);

  return NextResponse.json({
    availability: availRes.data || [],
    unavailable_dates: unavailRes.data || [],
  });
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get("worker_token")?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const session = await verifyWorkerToken(token);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { days } = await req.json();

  await supabase.from("worker_availability").delete().eq("worker_id", session.workerId);

  const rows = (days || []).map((d: any) => ({
    worker_id: session.workerId,
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
