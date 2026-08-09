import { getCurrentUser } from "@/lib/auth";
import { createSharedRoutine, listSharedRoutines } from "@/lib/community";
import { hasTrustedOrigin, isUuid, originError } from "@/lib/security";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });
  const routines = await listSharedRoutines(user.id);
  return Response.json(routines.map((routine) => ({ id: routine.id, name: routine.name, type: routine.type, days: Array.isArray(routine.days) ? routine.days : [], exerciseCount: routine.exercises.length, updatedAt: routine.updatedAt.toISOString(), members: routine.members.map((member) => ({ id: member.userId, name: member.user.name || member.user.nickname || "Atleta", nickname: member.user.nickname })) })));
}

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return originError();
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });
  const body = await request.json().catch(() => null);
  const sourceRoutineId = String(body?.sourceRoutineId || "");
  const friendIds: string[] = Array.isArray(body?.friendIds) ? body.friendIds.map(String) : [];
  if (!isUuid(sourceRoutineId) || !friendIds.length || friendIds.length > 5 || friendIds.some((id) => !isUuid(id))) return Response.json({ error: "Elegí una rutina y entre 1 y 5 alumnos válidos." }, { status: 400 });
  try { const routine = await createSharedRoutine(user.id, sourceRoutineId, friendIds, typeof body?.name === "string" ? body.name : undefined); return Response.json({ id: routine.id }, { status: 201 }); }
  catch (error) { return Response.json({ error: error instanceof Error ? error.message : "No se pudo crear la rutina compartida." }, { status: 400 }); }
}
