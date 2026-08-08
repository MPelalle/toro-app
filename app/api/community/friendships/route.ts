import { getCurrentUser } from "@/lib/auth";
import { removeFriend, respondToFriendRequest, sendFriendRequest } from "@/lib/community";
import { hasTrustedOrigin, isUuid, originError } from "@/lib/security";

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return originError();
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });
  try {
    const body = await request.json().catch(() => null);
    const friendship = await sendFriendRequest(user.id, String(body?.nickname || ""));
    return Response.json({ id: friendship.id, status: friendship.status }, { status: 201 });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "No se pudo enviar la solicitud." }, { status: 400 }); }
}

export async function PATCH(request: Request) {
  if (!hasTrustedOrigin(request)) return originError();
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });
  const body = await request.json().catch(() => null);
  const id = String(body?.id || ""); const action = body?.action;
  if (!isUuid(id) || !["accept", "reject", "cancel"].includes(action)) return Response.json({ error: "Solicitud inválida." }, { status: 400 });
  try { const friendship = await respondToFriendRequest(user.id, id, action); return Response.json({ id: friendship.id, status: friendship.status }); }
  catch (error) { return Response.json({ error: error instanceof Error ? error.message : "No se pudo actualizar la solicitud." }, { status: 400 }); }
}

export async function DELETE(request: Request) {
  if (!hasTrustedOrigin(request)) return originError();
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id") || "";
  if (!isUuid(id)) return Response.json({ error: "Amistad inválida." }, { status: 400 });
  try { await removeFriend(user.id, id); return Response.json({ ok: true }); }
  catch (error) { return Response.json({ error: error instanceof Error ? error.message : "No se pudo eliminar la amistad." }, { status: 400 }); }
}
