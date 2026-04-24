import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { verifyCustomerToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("customer_token")?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const session = await verifyCustomerToken(token);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const bookingId = searchParams.get("booking_id");
  if (!bookingId) return NextResponse.json({ photos: [] });

  // Verify booking belongs to this customer
  const { data: booking } = await supabase.from("bookings").select("id").eq("id", bookingId).eq("customer_id", session.customerId).single();
  if (!booking) return NextResponse.json({ photos: [] });

  const { data: photos } = await supabase.from("job_photos").select("*").eq("booking_id", bookingId).order("created_at");
  return NextResponse.json({ photos: photos || [] });
}
