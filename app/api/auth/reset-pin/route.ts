import { NextRequest, NextResponse } from "next/server";
import { hashPin, hashToken } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { hasTrustedOrigin, originError, rateLimit, rateLimitResponse } from "@/lib/security";

export async function POST(request: NextRequest) {
  if (!hasTrustedOrigin(request)) return originError();
  const allowed = rateLimit(request, "reset-pin", 8, 15 * 60_000);
  if (!allowed.ok) return rateLimitResponse(allowed.retryAfter);
  const body = await request.json().catch(() => null);
  const token = String(body?.token ?? ""); const pin = String(body?.pin ?? "");
  if (!token || !/^\d{6}$/.test(pin)) return NextResponse.json({ error: "El enlace o el PIN no son válidos." }, { status: 400 });
  const prisma = getPrisma();
  const record = await prisma.authToken.findFirst({ where: { tokenHash: hashToken(token), type: "RESET_PIN", expiresAt: { gt: new Date() } } });
  if (!record) return NextResponse.json({ error: "El enlace venció o ya fue utilizado." }, { status: 400 });
  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { pinHash: hashPin(pin) } }),
    prisma.authToken.deleteMany({ where: { userId: record.userId, type: "RESET_PIN" } }),
    prisma.session.deleteMany({ where: { userId: record.userId } }),
  ]);
  return NextResponse.json({ message: "PIN actualizado. Ya podés iniciar sesión." });
}
