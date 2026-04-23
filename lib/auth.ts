import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE_NAME = "admin_token";
const secret = () => new TextEncoder().encode(process.env.ADMIN_JWT_SECRET!);

export async function signAdminToken() {
  return new SignJWT({ admin: true })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(secret());
}

export async function verifyAdminToken(token: string) {
  try {
    await jwtVerify(token, secret());
    return true;
  } catch {
    return false;
  }
}

export async function getAdminSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return false;
  return verifyAdminToken(token);
}

export { COOKIE_NAME };
