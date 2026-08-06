import { NextRequest, NextResponse } from "next/server";
import { createSession, hashToken, sessionCookie } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const loginUrl = new URL("/login", request.url);
  if (!token) {
    loginUrl.searchParams.set("error", "El enlace de confirmación no es válido.");
    return NextResponse.redirect(loginUrl);
  }
  const prisma = getPrisma();
  const record = await prisma.authToken.findFirst({ where: { tokenHash: hashToken(token), type: "VERIFY_EMAIL", expiresAt: { gt: new Date() } } });
  if (!record) {
    loginUrl.searchParams.set("error", "El enlace venció o ya fue utilizado. Registrate de nuevo para recibir otro.");
    return NextResponse.redirect(loginUrl);
  }
  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { emailVerifiedAt: new Date() } }),
    prisma.authToken.delete({ where: { id: record.id } }),
  ]);
  const { token: sessionToken, expiresAt } = await createSession(record.userId);
  const response = NextResponse.redirect(new URL("/dashboard", request.url));
  const cookie = sessionCookie(sessionToken, expiresAt);
  response.cookies.set(cookie.name, cookie.value, cookie.options);
  return response;
}
