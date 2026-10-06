import { NextRequest, NextResponse } from "next/server";
import { createToken, hashToken } from "@/lib/auth";
import { sendVerificationEmail } from "@/lib/mail";
import { getPrisma } from "@/lib/prisma";
import {
  hasTrustedOrigin,
  originError,
  rateLimit,
  rateLimitResponse,
} from "@/lib/security";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const genericMessage =
  "Si existe una cuenta pendiente con ese email, te enviamos un nuevo enlace de confirmación.";

export async function POST(request: NextRequest) {
  if (!hasTrustedOrigin(request)) return originError();
  const allowed = rateLimit(request, "resend-verification", 3, 15 * 60_000);
  if (!allowed.ok) return rateLimitResponse(allowed.retryAfter);

  const body = await request.json().catch(() => null);
  const email = String(body?.email ?? "").trim().toLowerCase();
  if (!EMAIL_PATTERN.test(email) || email.length > 254)
    return NextResponse.json({ message: genericMessage });

  try {
    const prisma = getPrisma();
    const user = await prisma.user.findFirst({
      where: { email, emailVerifiedAt: null },
      select: { id: true },
    });
    if (!user) return NextResponse.json({ message: genericMessage });

    const configuredUrl = process.env.APP_URL?.trim() || request.nextUrl.origin;
    const verificationUrl = new URL("/api/auth/verify", configuredUrl);
    if (!['http:', 'https:'].includes(verificationUrl.protocol)) {
      throw new Error("APP_URL inválida");
    }

    const token = createToken();
    verificationUrl.searchParams.set("token", token);
    await prisma.$transaction([
      prisma.authToken.deleteMany({
        where: { userId: user.id, type: "VERIFY_EMAIL" },
      }),
      prisma.authToken.create({
        data: {
          userId: user.id,
          tokenHash: hashToken(token),
          type: "VERIFY_EMAIL",
          expiresAt: new Date(Date.now() + 86_400_000),
        },
      }),
    ]);
    await sendVerificationEmail(email, verificationUrl.toString());
  } catch (error) {
    console.error("resend verification error", error);
  }

  return NextResponse.json({ message: genericMessage });
}
