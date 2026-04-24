import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const secret = () => new TextEncoder().encode(process.env.ADMIN_JWT_SECRET!);

async function verifyJwt(token: string) {
  try {
    await jwtVerify(token, secret());
    return true;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/admin/login" || pathname === "/worker/login") {
    return NextResponse.next();
  }

  if (pathname.startsWith("/admin") || pathname.startsWith("/schedule")) {
    const token = request.cookies.get("admin_token")?.value;
    if (!token) return NextResponse.redirect(new URL("/admin/login", request.url));
    const valid = await verifyJwt(token);
    if (!valid) return NextResponse.redirect(new URL("/admin/login", request.url));
    return NextResponse.next();
  }

  if (pathname.startsWith("/worker")) {
    const token = request.cookies.get("worker_token")?.value;
    if (!token) return NextResponse.redirect(new URL("/worker/login", request.url));
    const valid = await verifyJwt(token);
    if (!valid) return NextResponse.redirect(new URL("/worker/login", request.url));
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/schedule/:path*", "/schedule", "/worker/:path*", "/worker"],
};
