import { getCurrentUser } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";

const routineInclude = { exercises: { orderBy: { position: "asc" as const } } };
const sessionInclude = { exercises: { orderBy: { position: "asc" as const }, include: { sets: { orderBy: { setNumber: "asc" as const } } } } };

function iso(value: Date | null) { return value?.toISOString() ?? null; }

function serializeRoutine(plan: { id: string; name: string; type: string; days: unknown; active: boolean; createdAt: Date; exercises: Array<{ id: string; name: string; muscle: string; sets: number; reps: number; weight: number; technique: string; completed: boolean | null; actualReps: number | null; note: string | null; trainingDay: string }> }) {
  return { id: plan.id, name: plan.name, type: plan.type, days: Array.isArray(plan.days) ? plan.days.filter((day): day is string => typeof day === "string") : [], active: plan.active, createdAt: plan.createdAt.toISOString(), exercises: plan.exercises.map((exercise) => ({ ...exercise, note: exercise.note ?? "" })) };
}

function serializeSession(session: { id: string; userId: string; routineId: string; status: "IN_PROGRESS" | "FINISHED"; startedAt: Date; finishedAt: Date | null; durationSeconds: number | null; notes: string | null; emotionalRating: number | null; version: number; clientUpdatedAt: Date; createdAt: Date; updatedAt: Date; exercises: Array<{ id: string; routineExerciseId: string; position: number; name: string; muscle: string; sets: Array<{ id: string; setNumber: number; targetReps: number; targetWeight: number; reps: number | null; weight: number | null; rir: number | null; rpe: number | null; note: string | null; completed: boolean; createdAt: Date; updatedAt: Date }> }> }) {
  const metadata = (id: string, createdAt: Date, updatedAt: Date) => ({ id, userId: session.userId, createdAt: createdAt.toISOString(), updatedAt: updatedAt.toISOString(), deletedAt: null, syncStatus: "synced" as const, lastSyncedAt: updatedAt.toISOString(), version: 1 });
  return { ...metadata(session.id, session.createdAt, session.updatedAt), version: session.version, routineId: session.routineId, status: session.status, startedAt: session.startedAt.toISOString(), finishedAt: iso(session.finishedAt), durationSeconds: session.durationSeconds, notes: session.notes, emotionalRating: session.emotionalRating, clientUpdatedAt: session.clientUpdatedAt.toISOString(), exercises: session.exercises.map((exercise) => ({ ...metadata(exercise.id, session.createdAt, session.updatedAt), sessionId: session.id, routineExerciseId: exercise.routineExerciseId, position: exercise.position, name: exercise.name, muscle: exercise.muscle, sets: exercise.sets.map((set) => ({ ...metadata(set.id, set.createdAt, set.updatedAt), sessionId: session.id, sessionExerciseId: exercise.id, setNumber: set.setNumber, targetReps: set.targetReps, targetWeight: set.targetWeight, reps: set.reps, weight: set.weight, rir: set.rir, rpe: set.rpe, note: set.note, completed: set.completed })) })) };
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  const prisma = getPrisma();
  const [activeRoutine, sessions] = await Promise.all([
    prisma.routinePlan.findFirst({ where: { userId: user.id, active: true }, include: routineInclude, orderBy: { updatedAt: "desc" } }),
    prisma.workoutSession.findMany({ where: { userId: user.id }, include: sessionInclude, orderBy: { clientUpdatedAt: "desc" }, take: 12 }),
  ]);
  return Response.json({ activeRoutine: activeRoutine ? serializeRoutine(activeRoutine) : null, recentSessions: sessions.map(serializeSession), downloadedAt: new Date().toISOString() }, { headers: { "Cache-Control": "no-store" } });
}
