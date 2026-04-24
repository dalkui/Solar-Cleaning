import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const { data: workers } = await supabase
    .from("workers")
    .select("*")
    .order("created_at", { ascending: false });

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const { data: bookings } = await supabase
    .from("bookings")
    .select("worker_id, scheduled_at, status")
    .gte("scheduled_at", monthStart.toISOString());

  const jobsThisMonth: Record<string, number> = {};
  const jobsThisWeek: Record<string, number> = {};
  (bookings || []).forEach((b: any) => {
    if (!b.worker_id) return;
    jobsThisMonth[b.worker_id] = (jobsThisMonth[b.worker_id] || 0) + 1;
    if (new Date(b.scheduled_at) >= weekStart) {
      jobsThisWeek[b.worker_id] = (jobsThisWeek[b.worker_id] || 0) + 1;
    }
  });

  const enriched = (workers || []).map((w: any) => ({
    ...w,
    jobs_this_month: jobsThisMonth[w.id] || 0,
    jobs_this_week: jobsThisWeek[w.id] || 0,
  }));

  return NextResponse.json(enriched);
}

export async function POST(req: NextRequest) {
  const { name, phone, email, pin, color } = await req.json();

  if (!name || !pin) {
    return NextResponse.json({ error: "Name and PIN are required" }, { status: 400 });
  }
  if (!/^\d{4}$/.test(pin)) {
    return NextResponse.json({ error: "PIN must be 4 digits" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("workers")
    .insert({ name, phone, email, pin, color: color || "#F5C518", status: "active" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Seed default Mon-Fri availability
  const availability = [1, 2, 3, 4, 5].map(day_of_week => ({
    worker_id: data.id,
    day_of_week,
    is_active: true,
    start_time: "08:00",
    end_time: "16:00",
  }));
  await supabase.from("worker_availability").insert(availability);

  return NextResponse.json(data);
}
