import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { signCustomerToken } from "@/lib/auth";

// Bot-detection heuristic — email scanners prefetch links to check for malware,
// and shouldn't be issued a session cookie or mark the token as used.
function looksLikeScanner(ua: string | null): boolean {
  if (!ua) return true;
  const s = ua.toLowerCase();
  return (
    s.includes("bot") ||
    s.includes("crawler") ||
    s.includes("spider") ||
    s.includes("preview") ||
    s.includes("headless") ||
    s.includes("facebookexternalhit") ||
    s.includes("slackbot") ||
    s.includes("twitterbot") ||
    s.includes("googleimageproxy") ||
    s.includes("ggpht") ||
    !s.includes("mozilla") // real browsers identify as Mozilla
  );
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  if (!token) return NextResponse.redirect(new URL("/portal/login?error=invalid", req.url));

  const ua = req.headers.get("user-agent");
  if (looksLikeScanner(ua)) {
    // Don't consume the token for email scanners
    return new NextResponse("OK", { status: 200 });
  }

  const { data: row } = await supabase
    .from("customer_login_tokens")
    .select("*")
    .eq("token", token)
    .maybeSingle();

  if (!row || new Date(row.expires_at) < new Date()) {
    return NextResponse.redirect(new URL("/portal/login?error=expired", req.url));
  }

  // Mark as used (best-effort, but allow reuse within the hour in case this doesn't stick)
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
