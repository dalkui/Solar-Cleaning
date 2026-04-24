import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const secret = () => new TextEncoder().encode(process.env.ADMIN_JWT_SECRET!);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/admin/login") return NextResponse.next();

  if (pathname.startsWith("/admin") || pathname.startsWith("/schedule")) {
    const token = request.cookies.get("admin_token")?.value;
    if (!token) return NextResponse.redirect(new URL("/admin/login", request.url));

    try {
      await jwtVerify(token, secret());
      return NextResponse.next();
    } catch {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/schedule/:path*", "/schedule"],
};
