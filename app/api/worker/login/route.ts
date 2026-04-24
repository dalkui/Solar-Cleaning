import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { signWorkerToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { name, pin } = await req.json();

  const { data: worker } = await supabase
    .from("workers")
    .select("id, name, pin, status")
    .eq("name", name)
    .eq("status", "active")
    .single();

  if (!worker || worker.pin !== pin) {
    return NextResponse.json({ error: "Invalid name or PIN" }, { status: 401 });
  }

  const token = await signWorkerToken(worker.id, worker.name);

  const res = NextResponse.json({ ok: true, name: worker.name });
  res.cookies.set("worker_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 12,
    path: "/",
  });
  return res;
}
