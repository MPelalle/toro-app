import { getCurrentUser } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { hasTrustedOrigin, originError } from "@/lib/security";

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return originError();
  const user = await getCurrentUser(); if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });
  const body = await request.json().catch(() => ({})); const seconds = Math.min(300, Math.max(0, Number(body.seconds) || 0));
  await getPrisma().user.update({ where: { id: user.id }, data: { appSeconds: seconds ? { increment: Math.round(seconds) } : undefined, lastActiveAt: new Date() } });
  return Response.json({ ok: true });
}
