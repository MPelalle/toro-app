import { getCurrentUser } from "@/lib/auth";
import { copySharedRoutineToPersonal } from "@/lib/community";
import { hasTrustedOrigin, isUuid, originError } from "@/lib/security";

export async function POST(request: Request, ctx: RouteContext<"/api/community/routines/[id]/copy">) {
  if (!hasTrustedOrigin(request)) return originError();
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await ctx.params;
  if (!isUuid(id)) return Response.json({ error: "Rutina no encontrada." }, { status: 404 });

  try {
    const routine = await copySharedRoutineToPersonal(user.id, id);
    return Response.json(routine, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "No se pudo guardar tu copia." }, { status: 400 });
  }
}
