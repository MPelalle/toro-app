import { getCurrentUser } from "@/lib/auth";
import { getSharedRoutineDashboard } from "@/lib/community";
import { isUuid } from "@/lib/security";

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await ctx.params;
  if (!isUuid(id)) return Response.json({ error: "Rutina inválida" }, { status: 400 });
  const dashboard = await getSharedRoutineDashboard(user.id, id);
  return dashboard ? Response.json(dashboard, { headers: { "Cache-Control": "no-store" } }) : Response.json({ error: "Este panel es visible solo para el profesor que asignó la rutina." }, { status: 403 });
}
