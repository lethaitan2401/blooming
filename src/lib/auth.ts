import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { db } from "./db";
import { SESSION_COOKIE as COOKIE } from "./constants";

const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET || "dev-only-secret-change-me-please-32chars-min",
);

export type SessionPayload = {
  userId: string;
  email: string;
  name: string;
  roleKey: string;
};

export async function createSession(payload: SessionPayload) {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);

  const store = await cookies();
  store.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function destroySession() {
  const store = await cookies();
  store.delete(COOKIE);
}

/** Payload phiên (nhẹ, đọc từ cookie) — dùng cho guard nhanh. */
export async function getSessionPayload(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

/** Người dùng hiện tại kèm role + permissions (truy vấn DB). */
export async function getCurrentUser() {
  const payload = await getSessionPayload();
  if (!payload) return null;
  const user = await db.user.findUnique({
    where: { id: payload.userId },
    include: { role: true },
  });
  if (!user || !user.isActive) return null;
  return user;
}

export function verifyTokenValue(token: string) {
  return jwtVerify(token, secret);
}

export { COOKIE as SESSION_COOKIE };
