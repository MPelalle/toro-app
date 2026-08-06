import { NextRequest, NextResponse } from "next/server";
import { createSession, sessionCookie, verifyPin } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { hasTrustedOrigin, originError, rateLimit, rateLimitResponse } from "@/lib/security";

export async function POST(request: NextRequest) {
  if (!hasTrustedOrigin(request)) return originError();
  const allowed = rateLimit(request, "login", 10, 15 * 60_000);
  if (!allowed.ok) return rateLimitResponse(allowed.retryAfter);

  try {
    const { email: rawEmail, pin: rawPin } = await request.json();
    const email = String(rawEmail ?? "").trim().toLowerCase();
    const pin = String(rawPin ?? "");
    if (email.length > 254 || !/^\d{6}$/.test(pin)) {
      return NextResponse.json({ error: "El email o el PIN no son correctos." }, { status: 401 });
    }
    const user = await getPrisma().user.findUnique({ where: { email } });
    if (!user || !user.pinHash || !verifyPin(pin, user.pinHash)) {
      return NextResponse.json({ error: "El email o el PIN no son correctos." }, { status: 401 });
    }
    if (!user.emailVerifiedAt) {
      return NextResponse.json({ error: "Tu cuenta todavía no está confirmada. Revisá tu casilla de correo y abrí el enlace que te enviamos." }, { status: 403 });
    }
    await getPrisma().user.update({ where: { id: user.id }, data: { loginCount: { increment: 1 } } });
    const { token, expiresAt } = await createSession(user.id);
    const response = NextResponse.json({ message: "Sesión iniciada.", redirectTo: "/dashboard" });
    const cookie = sessionCookie(token, expiresAt);
    response.cookies.set(cookie.name, cookie.value, cookie.options);
    return response;
  } catch (error) {
    console.error("login error", error);
    return NextResponse.json({ error: "No pudimos iniciar sesión. Intentá nuevamente." }, { status: 500 });
  }
}
