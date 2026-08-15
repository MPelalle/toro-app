import { getCurrentUser } from "@/lib/auth";
import { importPublicRoutineToPersonal } from "@/lib/community-routine-library";
import { hasTrustedOrigin, isUuid, originError } from "@/lib/security";

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!hasTrustedOrigin(request)) return originError();
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await ctx.params;
  if (!isUuid(id)) return Response.json({ error: "Rutina no encontrada." }, { status: 404 });
  try {
    const result = await importPublicRoutineToPersonal(user.id, id);
    return Response.json(result, { status: result.created ? 201 : 200 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "No se pudo importar la rutina." }, { status: 400 });
  }
}
