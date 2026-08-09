import { getCurrentUser } from "@/lib/auth";
import { serializeRemoteWorkoutSession } from "@/lib/offline/remote-session";
import { getPrisma } from "@/lib/prisma";

const routineInclude = { exercises: { orderBy: { position: "asc" as const } } };
const sessionInclude = { exercises: { orderBy: { position: "asc" as const }, include: { sets: { orderBy: { setNumber: "asc" as const } } } } };

function serializeRoutine(plan: { id: string; name: string; type: string; days: unknown; active: boolean; createdAt: Date; exercises: Array<{ id: string; name: string; muscle: string; sets: number; reps: number; weight: number; technique: string; completed: boolean | null; actualReps: number | null; note: string | null; trainingDay: string }> }) {
  return { id: plan.id, name: plan.name, type: plan.type, days: Array.isArray(plan.days) ? plan.days.filter((day): day is string => typeof day === "string") : [], active: plan.active, createdAt: plan.createdAt.toISOString(), exercises: plan.exercises.map((exercise) => ({ ...exercise, note: exercise.note ?? "" })) };
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  const prisma = getPrisma();
  const [activeRoutine, sessions] = await Promise.all([
    prisma.routinePlan.findFirst({ where: { userId: user.id, active: true }, include: routineInclude, orderBy: { updatedAt: "desc" } }),
    prisma.workoutSession.findMany({ where: { userId: user.id }, include: sessionInclude, orderBy: { clientUpdatedAt: "desc" }, take: 12 }),
  ]);
  return Response.json({ activeRoutine: activeRoutine ? serializeRoutine(activeRoutine) : null, recentSessions: sessions.map(serializeRemoteWorkoutSession), downloadedAt: new Date().toISOString() }, { headers: { "Cache-Control": "no-store" } });
}
