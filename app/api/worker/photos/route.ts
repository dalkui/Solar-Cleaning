import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { verifyWorkerToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const token = req.cookies.get("worker_token")?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const session = await verifyWorkerToken(token);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const bookingId = formData.get("booking_id") as string | null;
  const photoType = (formData.get("type") as string) || "after";

  if (!file || !bookingId) {
    return NextResponse.json({ error: "Missing file or booking_id" }, { status: 400 });
  }

  // Verify booking belongs to this worker
  const { data: booking } = await supabase
    .from("bookings")
    .select("id")
    .eq("id", bookingId)
    .eq("worker_id", session.workerId)
    .single();

  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

  const ext = file.name.split(".").pop() || "jpg";
  const path = `${bookingId}/${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadErr } = await supabase.storage
    .from("job-photos")
    .upload(path, buffer, { contentType: file.type, upsert: false });

  if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 500 });

  const { data: urlData } = supabase.storage.from("job-photos").getPublicUrl(path);
  const url = urlData.publicUrl;

  await supabase.from("job_photos").insert({
    booking_id: bookingId,
    worker_id: session.workerId,
    url,
    type: photoType,
  });

  return NextResponse.json({ ok: true, url });
}
