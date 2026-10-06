import { NextRequest, NextResponse } from "next/server";
import { createToken, hashToken } from "@/lib/auth";
import { sendPinResetEmail } from "@/lib/mail";
import { getPrisma } from "@/lib/prisma";
import { hasTrustedOrigin, originError, rateLimit, rateLimitResponse } from "@/lib/security";

const genericMessage = "Si existe una cuenta confirmada con ese email, te enviamos un enlace para restablecer el PIN.";

export async function POST(request: NextRequest) {
  if (!hasTrustedOrigin(request)) return originError();
  const allowed = rateLimit(request, "forgot-pin", 3, 15 * 60_000);
  if (!allowed.ok) return rateLimitResponse(allowed.retryAfter);
  const body = await request.json().catch(() => null);
  const email = String(body?.email ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return NextResponse.json({ message: genericMessage });
  try {
    const prisma = getPrisma();
    const user = await prisma.user.findFirst({ where: { email, emailVerifiedAt: { not: null } }, select: { id: true } });
    if (!user) return NextResponse.json({ message: genericMessage });
    await prisma.authToken.deleteMany({ where: { userId: user.id, type: "RESET_PIN" } });
    const token = createToken();
    await prisma.authToken.create({ data: { userId: user.id, tokenHash: hashToken(token), type: "RESET_PIN", expiresAt: new Date(Date.now() + 30 * 60_000) } });
    const resetUrl = new URL("/reset-pin", process.env.APP_URL?.trim() || request.nextUrl.origin);
    resetUrl.searchParams.set("token", token);
    await sendPinResetEmail(email, resetUrl.toString());
  } catch (error) { console.error("forgot pin error", error); }
  return NextResponse.json({ message: genericMessage });
}
