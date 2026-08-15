import { getCurrentUser } from "@/lib/auth";
import { createCommunityStatus, deleteCommunityStatus } from "@/lib/community";
import { hasTrustedOrigin, isUuid, originError } from "@/lib/security";

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return originError();
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });
  const body = await request.json().catch(() => null);
  try {
    return Response.json(await createCommunityStatus(user.id, String(body?.content || "")), { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "No se pudo publicar el mensaje." }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  if (!hasTrustedOrigin(request)) return originError();
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id") || "";
  if (!isUuid(id)) return Response.json({ error: "Publicación inválida." }, { status: 400 });
  const deleted = await deleteCommunityStatus(user.id, id);
  return deleted ? Response.json({ ok: true }) : Response.json({ error: "Publicación no encontrada." }, { status: 404 });
}
