import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { verifyWorkerToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const token = req.cookies.get("worker_token")?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const session = await verifyWorkerToken(token);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { start_date, end_date, date, reason } = await req.json();
  const startDate = start_date || date;
  const endDate = end_date || startDate;
  if (!startDate) return NextResponse.json({ error: "Missing start_date" }, { status: 400 });
  if (endDate < startDate) return NextResponse.json({ error: "End date must be on or after start date" }, { status: 400 });

  const { data, error } = await supabase
    .from("worker_unavailable_dates")
    .insert({ worker_id: session.workerId, date: startDate, end_date: endDate, reason: reason || null })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  const token = req.cookies.get("worker_token")?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const session = await verifyWorkerToken(token);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const { data: row } = await supabase
    .from("worker_unavailable_dates")
    .select("worker_id")
    .eq("id", id)
    .single();
  if (!row || row.worker_id !== session.workerId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { error } = await supabase.from("worker_unavailable_dates").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
