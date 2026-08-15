import { getCurrentUser } from "@/lib/auth";
import { getCommunityLibraryRoutine } from "@/lib/community-routine-library";
import { isUuid } from "@/lib/security";

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await ctx.params;
  if (!isUuid(id)) return Response.json({ error: "Rutina no encontrada." }, { status: 404 });
  const routine = await getCommunityLibraryRoutine(user.id, id);
  return routine ? Response.json(routine, { headers: { "Cache-Control": "no-store" } }) : Response.json({ error: "Rutina no encontrada." }, { status: 404 });
}
