import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// Public list of active worker names for the login dropdown
export async function GET() {
  const { data } = await supabase
    .from("workers")
    .select("id, name, color")
    .eq("status", "active")
    .order("name");
  return NextResponse.json(data || []);
}
