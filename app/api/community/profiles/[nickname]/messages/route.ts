import { getCurrentUser } from "@/lib/auth";
import { createCommunityProfileMessage, deleteCommunityProfileMessage } from "@/lib/community";
import { SOCIAL_LIMITS } from "@/lib/social-policy";
import { hasTrustedOrigin, isUuid, originError, rateLimit, rateLimitByKey, rateLimitResponse } from "@/lib/security";

export async function POST(request: Request, ctx: RouteContext<"/api/community/profiles/[nickname]/messages">) {
  if (!hasTrustedOrigin(request)) return originError();
  const requestLimit = rateLimit(request, "social-profile-message-ip", SOCIAL_LIMITS.profileMessagesPerFifteenMinutes, 15 * 60_000);
  if (!requestLimit.ok) return rateLimitResponse(requestLimit.retryAfter);
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });
  const userLimit = rateLimitByKey(user.id, "social-profile-message", SOCIAL_LIMITS.profileMessagesPerFifteenMinutes, 15 * 60_000);
  if (!userLimit.ok) return rateLimitResponse(userLimit.retryAfter);
  const { nickname } = await ctx.params;
  const body = await request.json().catch(() => null);
  try {
    return Response.json(await createCommunityProfileMessage(user.id, nickname, String(body?.content || "")), { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "No se pudo dejar el mensaje." }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  if (!hasTrustedOrigin(request)) return originError();
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id") || "";
  if (!isUuid(id)) return Response.json({ error: "Mensaje inválido." }, { status: 400 });
  const deleted = await deleteCommunityProfileMessage(user.id, id);
  return deleted ? Response.json({ ok: true }) : Response.json({ error: "Mensaje no encontrado." }, { status: 404 });
}
