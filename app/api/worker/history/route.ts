import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { verifyWorkerToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("worker_token")?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const session = await verifyWorkerToken(token);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: bookings, error } = await supabase
    .from("bookings")
    .select("*, customers(name, suburb, plan, panels, stories)")
    .eq("worker_id", session.workerId)
    .eq("status", "completed")
    .order("scheduled_at", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const bookingIds = (bookings || []).map((b: any) => b.id);

  const [updatesRes, photosRes] = await Promise.all([
    bookingIds.length > 0
      ? supabase.from("job_updates").select("*").in("booking_id", bookingIds)
      : Promise.resolve({ data: [] }),
    bookingIds.length > 0
      ? supabase.from("job_photos").select("*").in("booking_id", bookingIds)
      : Promise.resolve({ data: [] }),
  ]);

  const updates = updatesRes.data || [];
  const photos = photosRes.data || [];

  const enriched = (bookings || []).map((b: any) => ({
    ...b,
    job_updates: updates.filter((u: any) => u.booking_id === b.id),
    job_photos: photos.filter((p: any) => p.booking_id === b.id),
  }));

  return NextResponse.json(enriched);
}
