import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const [workersRes, bookingsRes] = await Promise.all([
    supabase.from("workers").select("*").eq("status", "active").order("name"),
    supabase
      .from("bookings")
      .select("*, customers(name, suburb, phone)")
      .gte("scheduled_at", today.toISOString())
      .lt("scheduled_at", tomorrow.toISOString())
      .neq("status", "cancelled")
      .order("scheduled_at"),
  ]);

  const bookings = bookingsRes.data || [];
  const bookingIds = bookings.map((b: any) => b.id);

  const { data: updates } = bookingIds.length > 0
    ? await supabase.from("job_updates").select("*").in("booking_id", bookingIds).order("created_at")
    : { data: [] };

  const updatesByBooking: Record<string, any[]> = {};
  (updates || []).forEach((u: any) => {
    if (!updatesByBooking[u.booking_id]) updatesByBooking[u.booking_id] = [];
    updatesByBooking[u.booking_id].push(u);
  });

  const enrichedBookings = bookings.map((b: any) => ({
    ...b,
    job_updates: updatesByBooking[b.id] || [],
  }));

  return NextResponse.json({
    workers: workersRes.data || [],
    bookings: enrichedBookings,
    updated_at: new Date().toISOString(),
  });
}
