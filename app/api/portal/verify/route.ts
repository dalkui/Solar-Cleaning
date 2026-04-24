import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { signCustomerToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  if (!token) return NextResponse.redirect(new URL("/portal/login?error=invalid", req.url));

  const { data: row } = await supabase
    .from("customer_login_tokens")
    .select("*")
    .eq("token", token)
    .maybeSingle();

  if (!row || row.used || new Date(row.expires_at) < new Date()) {
    return NextResponse.redirect(new URL("/portal/login?error=expired", req.url));
  }

  await supabase.from("customer_login_tokens").update({ used: true }).eq("id", row.id);

  const jwt = await signCustomerToken(row.customer_id);
  const res = NextResponse.redirect(new URL("/portal", req.url));
  res.cookies.set("customer_token", jwt, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 12,
    path: "/",
  });
  return res;
}
