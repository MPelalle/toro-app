import { getCurrentUser } from "@/lib/auth";
import { copyPublicRoutineToPersonal } from "@/lib/community";
import { hasTrustedOrigin, isUuid, originError } from "@/lib/security";

export async function POST(request: Request, ctx: { params: Promise<{ nickname: string; id: string }> }) {
  if (!hasTrustedOrigin(request)) return originError();
  const viewer = await getCurrentUser();
  if (!viewer) return Response.json({ error: "No autorizado" }, { status: 401 });
  const { nickname, id } = await ctx.params;
  if (!isUuid(id)) return Response.json({ error: "Rutina no encontrada." }, { status: 404 });
  try {
    const result = await copyPublicRoutineToPersonal(viewer.id, nickname, id);
    return Response.json(result.routine, { status: result.created ? 201 : 200 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "No se pudo guardar la rutina." }, { status: 400 });
  }
}
