import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { generateSlots } from "@/lib/slots";

export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

  const { data: tokenRow, error: tokenErr } = await supabase
    .from("booking_tokens")
    .select("*, customers(*)")
    .eq("token", token)
    .single();

  if (tokenErr || !tokenRow) return NextResponse.json({ error: "Invalid link" }, { status: 404 });
  if (tokenRow.used) return NextResponse.json({ error: "This link has already been used" }, { status: 410 });
  if (new Date(tokenRow.expires_at) < new Date()) return NextResponse.json({ error: "This link has expired" }, { status: 410 });

  const { data: availability } = await supabase
    .from("availability_settings")
    .select("*")
    .eq("is_active", true);

  const activeDays = new Map((availability || []).map((a: any) => [a.day_of_week, a]));

  const now = new Date();
  const threeWeeksOut = new Date();
  threeWeeksOut.setDate(now.getDate() + 21);

  const { data: existingBookings } = await supabase
    .from("bookings")
    .select("scheduled_at")
    .in("status", ["confirmed", "pending"])
    .gte("scheduled_at", now.toISOString())
    .lte("scheduled_at", threeWeeksOut.toISOString());

  const bookedTimes = new Set((existingBookings || []).map((b: any) => b.scheduled_at.slice(0, 16)));

  const availableDates: Record<string, string[]> = {};
  const cursor = new Date(now);
  cursor.setDate(cursor.getDate() + 1);

  while (cursor <= threeWeeksOut) {
    const dow = cursor.getDay();
    const dayConfig = activeDays.get(dow);
    if (dayConfig) {
      const dateStr = cursor.toISOString().split("T")[0];
      const slots = generateSlots(dayConfig.start_time, dayConfig.end_time, dayConfig.max_jobs);
      const available = slots.filter((s) => !bookedTimes.has(`${dateStr}T${s}`));
      if (available.length > 0) availableDates[dateStr] = available;
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return NextResponse.json({
    customer: {
      name: tokenRow.customers.name,
      email: tokenRow.customers.email,
      address: `${tokenRow.customers.street}, ${tokenRow.customers.suburb}`,
    },
    availableDates,
  });
}
