import "server-only";

import { createHash, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { getPrisma } from "@/lib/prisma";

const SESSION_COOKIE = "toro_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function createToken() {
  return randomBytes(32).toString("base64url");
}

export function hashPin(pin: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(pin, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPin(pin: string, storedHash: string) {
  const [salt, hash] = storedHash.split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(pin, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

export async function createSession(userId: string) {
  const token = createToken();
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE * 1000);
  await getPrisma().$transaction([
    getPrisma().session.deleteMany({ where: { userId } }),
    getPrisma().session.create({ data: { userId, tokenHash: hashToken(token), expiresAt } }),
  ]);
  return { token, expiresAt };
}

export const sessionCookie = (token: string, expiresAt: Date) => ({
  name: SESSION_COOKIE,
  value: token,
  options: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    expires: expiresAt,
  },
});

export async function getCurrentUser() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await getPrisma().session.findFirst({
    where: { tokenHash: hashToken(token), expiresAt: { gt: new Date() } },
    include: { user: true },
  });
  return session?.user.emailVerifiedAt ? session.user : null;
}

export async function deleteCurrentSession() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (token) await getPrisma().session.deleteMany({ where: { tokenHash: hashToken(token) } });
}

export { SESSION_COOKIE };
