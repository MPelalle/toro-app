import { getCurrentUser } from "@/lib/auth";
import { createCommunityProfileMessage, deleteCommunityProfileMessage } from "@/lib/community";
import { hasTrustedOrigin, isUuid, originError } from "@/lib/security";

export async function POST(request: Request, ctx: RouteContext<"/api/community/profiles/[nickname]/messages">) {
  if (!hasTrustedOrigin(request)) return originError();
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });
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
