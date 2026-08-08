import { getCurrentUser } from "@/lib/auth";
import { leaveSharedRoutine } from "@/lib/community";
import { hasTrustedOrigin, isUuid, originError } from "@/lib/security";

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!hasTrustedOrigin(request)) return originError();
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await ctx.params;
  if (!isUuid(id)) return Response.json({ error: "Rutina inválida" }, { status: 400 });
  try { await leaveSharedRoutine(user.id, id); return Response.json({ ok: true }); }
  catch (error) { return Response.json({ error: error instanceof Error ? error.message : "No se pudo abandonar la rutina." }, { status: 400 }); }
}
