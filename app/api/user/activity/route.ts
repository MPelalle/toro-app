import { getCurrentSession, refreshSessionIfNeeded, sessionCookie } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { hasTrustedOrigin, originError } from "@/lib/security";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return originError();
  const session = await getCurrentSession();
  const user = session?.user;
  if (!user || !session) return Response.json({ error: "No autorizado" }, { status: 401 });
  const body = await request.json().catch(() => ({})); const seconds = Math.min(300, Math.max(0, Number(body.seconds) || 0));
  await getPrisma().user.update({ where: { id: user.id }, data: { appSeconds: seconds ? { increment: Math.round(seconds) } : undefined, lastActiveAt: new Date() } });
  const renewed = await refreshSessionIfNeeded(session);
  const response = NextResponse.json({ ok: true });
  if (renewed) {
    const cookie = sessionCookie(renewed.token, renewed.expiresAt);
    response.cookies.set(cookie.name, cookie.value, cookie.options);
  }
  return response;
}
