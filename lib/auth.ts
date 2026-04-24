import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const ADMIN_COOKIE = "admin_token";
const WORKER_COOKIE = "worker_token";
const CUSTOMER_COOKIE = "customer_token";
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
  const token = cookieStore.get(ADMIN_COOKIE)?.value;
  if (!token) return false;
  return verifyAdminToken(token);
}

export async function signWorkerToken(workerId: string, name: string) {
  return new SignJWT({ workerId, name })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("12h")
    .sign(secret());
}

export async function verifyWorkerToken(token: string): Promise<{ workerId: string; name: string } | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    return { workerId: payload.workerId as string, name: payload.name as string };
  } catch {
    return null;
  }
}

export async function getWorkerSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(WORKER_COOKIE)?.value;
  if (!token) return null;
  return verifyWorkerToken(token);
}

export async function signCustomerToken(customerId: string) {
  return new SignJWT({ customerId })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("12h")
    .sign(secret());
}

export async function verifyCustomerToken(token: string): Promise<{ customerId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    return { customerId: payload.customerId as string };
  } catch {
    return null;
  }
}

export async function getCustomerSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(CUSTOMER_COOKIE)?.value;
  if (!token) return null;
  return verifyCustomerToken(token);
}

export { ADMIN_COOKIE as COOKIE_NAME, WORKER_COOKIE, CUSTOMER_COOKIE };
