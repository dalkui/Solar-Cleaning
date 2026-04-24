import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { verifyWorkerToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("worker_token")?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const session = await verifyWorkerToken(token);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayEnd = new Date(today);
  todayEnd.setHours(23, 59, 59, 999);

  const { data, error } = await supabase
    .from("bookings")
    .select("*, customers(name, phone, email, street, suburb, state, postcode, plan, stories, panels, notes)")
    .eq("worker_id", session.workerId)
    .gte("scheduled_at", today.toISOString())
    .lte("scheduled_at", todayEnd.toISOString())
    .order("scheduled_at");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}
