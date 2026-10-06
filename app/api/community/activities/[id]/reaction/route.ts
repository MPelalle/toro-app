import { getCurrentUser } from "@/lib/auth";
import { addSocialReaction, removeSocialReaction } from "@/lib/social-feed";
import { rateLimitByKey, rateLimitResponse, hasTrustedOrigin, isUuid, originError } from "@/lib/security";
import { SOCIAL_LIMITS } from "@/lib/social-policy";

async function context(request: Request, id: string) {
  if (!hasTrustedOrigin(request)) return { error: originError() };
  const user = await getCurrentUser();
  if (!user) return { error: Response.json({ error: "No autorizado" }, { status: 401 }) };
  if (!isUuid(id)) return { error: Response.json({ error: "Actividad inválida." }, { status: 400 }) };
  const limited = rateLimitByKey(user.id, "social-reactions", SOCIAL_LIMITS.reactionsPerMinute, 60_000);
  if (!limited.ok) return { error: rateLimitResponse(limited.retryAfter) };
  return { user };
}

export async function PUT(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const resolved = await context(request, id);
  if ("error" in resolved) return resolved.error;
  try {
    return Response.json(await addSocialReaction(resolved.user.id, id));
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "No se pudo reaccionar." }, { status: 400 });
  }
}

export async function DELETE(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const resolved = await context(request, id);
  if ("error" in resolved) return resolved.error;
  try {
    return Response.json(await removeSocialReaction(resolved.user.id, id));
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "No se pudo quitar la reacción." }, { status: 400 });
  }
}
