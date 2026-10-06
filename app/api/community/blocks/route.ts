import { getCurrentUser } from "@/lib/auth";
import {
  blockSocialUser,
  listBlockedSocialUsers,
  unblockSocialUser,
} from "@/lib/social-guard";
import { SOCIAL_LIMITS } from "@/lib/social-policy";
import {
  hasTrustedOrigin,
  isUuid,
  originError,
  rateLimit,
  rateLimitByKey,
  rateLimitResponse,
} from "@/lib/security";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });
  return Response.json(
    { users: await listBlockedSocialUsers(user.id) },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return originError();
  const requestLimit = rateLimit(request, "social-block-ip", SOCIAL_LIMITS.blocksPerDay, 24 * 60 * 60_000);
  if (!requestLimit.ok) return rateLimitResponse(requestLimit.retryAfter);
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });
  const userLimit = rateLimitByKey(user.id, "social-block", SOCIAL_LIMITS.blocksPerDay, 24 * 60 * 60_000);
  if (!userLimit.ok) return rateLimitResponse(userLimit.retryAfter);
  const body = await request.json().catch(() => null);
  const blockedId = String(body?.userId || "");
  if (!isUuid(blockedId)) return Response.json({ error: "Cuenta inválida." }, { status: 400 });
  try {
    const result = await blockSocialUser(user.id, blockedId);
    return Response.json(result, { status: result.created ? 201 : 200 });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "No se pudo bloquear la cuenta." },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request) {
  if (!hasTrustedOrigin(request)) return originError();
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });
  const blockedId = new URL(request.url).searchParams.get("userId") || "";
  if (!isUuid(blockedId)) return Response.json({ error: "Cuenta inválida." }, { status: 400 });
  const removed = await unblockSocialUser(user.id, blockedId);
  return removed
    ? Response.json({ ok: true })
    : Response.json({ error: "Ese bloqueo no existe." }, { status: 404 });
}
