import { getCurrentUser } from "@/lib/auth";
import { createCommunityRepost, deleteCommunityRepost } from "@/lib/community";
import { hasTrustedOrigin, isUuid, originError } from "@/lib/security";

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return originError();
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });
  const body = await request.json().catch(() => null);
  try {
    return Response.json(await createCommunityRepost(user.id, String(body?.nickname || ""), body?.originalType, body?.originalId), { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "No se pudo repostear la publicación." }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  if (!hasTrustedOrigin(request)) return originError();
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id") || "";
  if (!isUuid(id)) return Response.json({ error: "Repost inválido." }, { status: 400 });
  const deleted = await deleteCommunityRepost(user.id, id);
  return deleted ? Response.json({ ok: true }) : Response.json({ error: "Repost no encontrado." }, { status: 404 });
}
