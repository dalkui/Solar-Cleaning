import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [workerRes, availRes, unavailRes, bookingsRes, photosRes] = await Promise.all([
    supabase.from("workers").select("*").eq("id", id).single(),
    supabase.from("worker_availability").select("*").eq("worker_id", id).order("day_of_week"),
    supabase.from("worker_unavailable_dates").select("*").eq("worker_id", id).order("date"),
    supabase
      .from("bookings")
      .select("*, customers(name, suburb)")
      .eq("worker_id", id)
      .order("scheduled_at", { ascending: false })
      .limit(50),
    supabase.from("job_photos").select("*").eq("worker_id", id).order("created_at", { ascending: false }).limit(60),
  ]);

  const worker = workerRes.data;
  const bookings = bookingsRes.data || [];

  // Stats
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const completed = bookings.filter((b: any) => b.status === "completed");
  const stats = {
    total: completed.length,
    this_month: completed.filter((b: any) => new Date(b.scheduled_at) >= monthStart).length,
    this_week: completed.filter((b: any) => new Date(b.scheduled_at) >= weekStart).length,
  };

  // Timesheet: group updates by day
  const { data: updates } = await supabase
    .from("job_updates")
    .select("*")
    .eq("worker_id", id)
    .in("type", ["arrived", "completed"])
    .gte("created_at", new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString())
    .order("created_at");

  const byDay: Record<string, { arrived: string[]; completed: string[] }> = {};
  (updates || []).forEach((u: any) => {
    const day = new Date(u.created_at).toLocaleDateString("en-CA", { timeZone: "Australia/Sydney" });
    if (!byDay[day]) byDay[day] = { arrived: [], completed: [] };
    if (u.type === "arrived") byDay[day].arrived.push(u.created_at);
    else if (u.type === "completed") byDay[day].completed.push(u.created_at);
  });

  const timesheet = Object.entries(byDay)
    .map(([date, { arrived, completed: done }]) => {
      const first = arrived.sort()[0];
      const last = done.sort().reverse()[0];
      const hours = first && last ? (new Date(last).getTime() - new Date(first).getTime()) / 3600000 : 0;
      return { date, first_arrived: first, last_completed: last, hours: Math.max(0, hours), jobs: done.length };
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  return NextResponse.json({
    worker,
    availability: availRes.data || [],
    unavailable_dates: unavailRes.data || [],
    bookings,
    photos: photosRes.data || [],
    stats,
    timesheet,
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();

  const update: Record<string, any> = {};
  ["name", "phone", "email", "pin", "color", "status"].forEach(k => {
    if (body[k] !== undefined) update[k] = body[k];
  });

  if (update.pin && !/^\d{4}$/.test(update.pin)) {
    return NextResponse.json({ error: "PIN must be 4 digits" }, { status: 400 });
  }

  const { error } = await supabase.from("workers").update(update).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Soft delete to preserve history
  const { error } = await supabase.from("workers").update({ status: "inactive" }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
