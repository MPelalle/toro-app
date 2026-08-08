import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createToken, hashPin, hashToken } from "@/lib/auth";
import { sendVerificationEmail } from "@/lib/mail";
import { getPrisma } from "@/lib/prisma";
import { hasTrustedOrigin, originError, rateLimit, rateLimitResponse } from "@/lib/security";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  if (!hasTrustedOrigin(request)) return originError();
  const allowed = rateLimit(request, "register", 5, 15 * 60_000);
  if (!allowed.ok) return rateLimitResponse(allowed.retryAfter);

  try {
    const body = await request.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    const username = String(body.username ?? "").trim();
    const pin = String(body.pin ?? "");
    if (!EMAIL_PATTERN.test(email) || !/^[a-zA-Z0-9._]{3,20}$/.test(username) || !/^\d{6}$/.test(pin)) {
      return NextResponse.json({ error: "Completá un email válido, un nickname de 3 a 20 caracteres (letras, números, . o _) y un PIN de 6 dígitos." }, { status: 400 });
    }

    const prisma = getPrisma();
    const existing = await prisma.user.findUnique({ where: { email } });
    let userId: string;
    if (existing?.emailVerifiedAt) {
      return NextResponse.json({ error: "Ese correo ya tiene una cuenta confirmada. Iniciá sesión." }, { status: 409 });
    }
    if (existing) {
      const usernameTaken = await prisma.user.findFirst({ where: { username, id: { not: existing.id } } });
      if (usernameTaken) return NextResponse.json({ error: "No pudimos crear la cuenta con esos datos." }, { status: 409 });
      userId = existing.id;
      await prisma.user.update({ where: { id: userId }, data: { username, nickname: username.toLowerCase(), name: username, pinHash: hashPin(pin) } });
    } else {
      const usernameTaken = await prisma.user.findUnique({ where: { username } });
      if (usernameTaken) return NextResponse.json({ error: "Ese nombre de usuario ya está en uso." }, { status: 409 });
      userId = randomUUID();
      await prisma.user.create({ data: { id: userId, email, username, nickname: username.toLowerCase(), name: username, pinHash: hashPin(pin) } });
    }

    await prisma.authToken.deleteMany({ where: { userId, type: "VERIFY_EMAIL" } });
    const token = createToken();
    await prisma.authToken.create({ data: { userId, tokenHash: hashToken(token), type: "VERIFY_EMAIL", expiresAt: new Date(Date.now() + 86_400_000) } });
    const configuredUrl = process.env.APP_URL?.trim();
    const appUrl = configuredUrl || request.nextUrl.origin;
    let verificationUrl: URL;
    try {
      verificationUrl = new URL("/api/auth/verify", appUrl);
    } catch {
      throw new Error("APP_URL inválida");
    }
    if (!['http:', 'https:'].includes(verificationUrl.protocol)) throw new Error("APP_URL inválida");
    verificationUrl.searchParams.set("token", token);
    await sendVerificationEmail(email, verificationUrl.toString());
    return NextResponse.json({ message: "Te enviamos un correo de confirmación. Revisá tu casilla para activar tu cuenta." });
  } catch (error) {
    console.error("register error", error);
    return NextResponse.json({ error: "No pudimos enviar el correo de confirmación. Revisá la configuración SMTP e intentá de nuevo." }, { status: 500 });
  }
}
