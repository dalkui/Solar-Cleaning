import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const update: Record<string, any> = {};
  if (body.status !== undefined) update.status = body.status;
  if (body.scheduled_at !== undefined) update.scheduled_at = body.scheduled_at;

  const { error } = await supabase
    .from("bookings")
    .update(update)
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
