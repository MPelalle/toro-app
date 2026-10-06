import { getCurrentUser } from "@/lib/auth";
import { createSocialComment, deleteSocialComment, listSocialComments } from "@/lib/social-feed";
import { rateLimitByKey, rateLimitResponse, hasTrustedOrigin, isUuid, originError } from "@/lib/security";
import { SOCIAL_LIMITS } from "@/lib/social-policy";

export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await ctx.params;
  if (!isUuid(id)) return Response.json({ error: "Actividad inválida." }, { status: 400 });
  const url = new URL(request.url);
  try {
    return Response.json(
      await listSocialComments(user.id, id, {
        cursor: url.searchParams.get("cursor"),
        limit: url.searchParams.get("limit"),
      }),
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "No se pudieron cargar los comentarios." }, { status: 400 });
  }
}

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!hasTrustedOrigin(request)) return originError();
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await ctx.params;
  if (!isUuid(id)) return Response.json({ error: "Actividad inválida." }, { status: 400 });
  const limited = rateLimitByKey(user.id, "social-comments", SOCIAL_LIMITS.commentsPerFifteenMinutes, 15 * 60_000);
  if (!limited.ok) return rateLimitResponse(limited.retryAfter);
  const body = await request.json().catch(() => null);
  try {
    return Response.json(await createSocialComment(user.id, id, body?.content), { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "No se pudo comentar." }, { status: 400 });
  }
}

export async function DELETE(request: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!hasTrustedOrigin(request)) return originError();
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await ctx.params;
  if (!isUuid(id)) return Response.json({ error: "Actividad inválida." }, { status: 400 });
  const commentId = new URL(request.url).searchParams.get("commentId") || "";
  if (!isUuid(commentId)) return Response.json({ error: "Comentario inválido." }, { status: 400 });
  const deleted = await deleteSocialComment(user.id, commentId);
  return deleted
    ? Response.json({ ok: true })
    : Response.json({ error: "Comentario no encontrado." }, { status: 404 });
}
