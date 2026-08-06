import { NextResponse } from "next/server";
import { deleteCurrentSession, SESSION_COOKIE } from "@/lib/auth";
import { hasTrustedOrigin, originError } from "@/lib/security";

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return originError();
  await deleteCurrentSession();
  const response = NextResponse.json({ redirectTo: "/login" });
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    expires: new Date(0),
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
