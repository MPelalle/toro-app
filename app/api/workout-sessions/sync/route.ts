import { getCurrentUser } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { hasTrustedOrigin, isUuid, originError } from "@/lib/security";

type IncomingSet = { id: string; setNumber: number; targetReps: number; targetWeight: number; reps: number | null; weight: number | null; rir: number | null; rpe: number | null; note: string | null; completed: boolean };
type IncomingExercise = { id: string; routineExerciseId: string; position: number; name: string; muscle: string; sets: IncomingSet[] };
type IncomingSession = { id: string; routineId: string; status: "IN_PROGRESS" | "FINISHED"; startedAt: Date; finishedAt: Date | null; durationSeconds: number | null; notes: string | null; emotionalRating: number | null; version: number; updatedAt: Date; clientUpdatedAt: Date; exercises: IncomingExercise[] };

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object";
const parseDate = (value: unknown) => { const date = new Date(String(value)); return Number.isNaN(date.getTime()) ? null : date; };
const numberInRange = (value: unknown, min: number, max: number, integer = false) => { const number = Number(value); return Number.isFinite(number) && number >= min && number <= max && (!integer || Number.isInteger(number)) ? number : null; };
const nullableText = (value: unknown, maximum: number) => value === null || value === undefined || String(value).trim() === "" ? null : String(value).trim().slice(0, maximum);

function readSession(body: unknown): IncomingSession | null {
  if (!isRecord(body) || !isRecord(body.session)) return null;
  const raw = body.session; const id = String(raw.id || ""); const routineId = String(raw.routineId || ""); const status = raw.status;
  const startedAt = parseDate(raw.startedAt); const finishedAt = raw.finishedAt === null ? null : parseDate(raw.finishedAt); const updatedAt = parseDate(raw.updatedAt); const clientUpdatedAt = parseDate(raw.clientUpdatedAt);
  const durationSeconds = raw.durationSeconds === null || raw.durationSeconds === undefined ? null : numberInRange(raw.durationSeconds, 0, 86_400, true); const version = numberInRange(raw.version, 1, 1_000_000, true);
  const emotionalRating = raw.emotionalRating === null || raw.emotionalRating === undefined ? null : numberInRange(raw.emotionalRating, 1, 5, true);
  const notes = nullableText(raw.notes, 2_000);
  if (!isUuid(String(body.operationId || "")) || !isUuid(id) || !isUuid(routineId) || (status !== "IN_PROGRESS" && status !== "FINISHED") || !startedAt || !updatedAt || !clientUpdatedAt || version === null || (raw.finishedAt !== null && !finishedAt) || (status === "FINISHED" && !finishedAt) || durationSeconds === null && raw.durationSeconds !== null && raw.durationSeconds !== undefined || emotionalRating === null && raw.emotionalRating !== null && raw.emotionalRating !== undefined || !Array.isArray(raw.exercises) || !raw.exercises.length || raw.exercises.length > 60) return null;
  const exercises: IncomingExercise[] = [];
  for (const [position, item] of raw.exercises.entries()) {
    if (!isRecord(item) || !isUuid(String(item.id || "")) || !isUuid(String(item.routineExerciseId || "")) || String(item.name || "").trim().length < 1 || String(item.name).length > 100 || String(item.muscle || "").trim().length < 1 || String(item.muscle).length > 60 || !Array.isArray(item.sets) || !item.sets.length || item.sets.length > 20) return null;
    const sets: IncomingSet[] = [];
    for (const [setIndex, set] of item.sets.entries()) {
      if (!isRecord(set) || !isUuid(String(set.id || ""))) return null;
      const targetReps = numberInRange(set.targetReps, 1, 100, true); const targetWeight = numberInRange(set.targetWeight, 0, 1000); const reps = set.reps === null ? null : numberInRange(set.reps, 0, 100, true); const weight = set.weight === null ? null : numberInRange(set.weight, 0, 1000); const rir = set.rir === null || set.rir === undefined ? null : numberInRange(set.rir, 0, 10, true); const rpe = set.rpe === null || set.rpe === undefined ? null : numberInRange(set.rpe, 1, 10, true); const note = nullableText(set.note, 500);
      if (targetReps === null || targetWeight === null || reps === null && set.reps !== null || weight === null && set.weight !== null || rir === null && set.rir !== null && set.rir !== undefined || rpe === null && set.rpe !== null && set.rpe !== undefined || typeof set.completed !== "boolean") return null;
      sets.push({ id: String(set.id), setNumber: setIndex + 1, targetReps, targetWeight, reps, weight, rir, rpe, note, completed: set.completed });
    }
    exercises.push({ id: String(item.id), routineExerciseId: String(item.routineExerciseId), position, name: String(item.name).trim(), muscle: String(item.muscle).trim(), sets });
  }
  return { id, routineId, status, startedAt, finishedAt, durationSeconds, notes, emotionalRating, version, updatedAt, clientUpdatedAt, exercises };
}

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return originError();
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });
  const session = readSession(await request.json().catch(() => null));
  if (!session) return Response.json({ error: "Sesión inválida" }, { status: 400 });
  const prisma = getPrisma(); const routine = await prisma.routinePlan.findFirst({ where: { id: session.routineId, userId: user.id }, select: { id: true } });
  if (!routine) return Response.json({ error: "Rutina no encontrada" }, { status: 404 });
  const existing = await prisma.workoutSession.findFirst({ where: { id: session.id, userId: user.id }, select: { clientUpdatedAt: true, updatedAt: true, version: true } });
  if (existing && existing.clientUpdatedAt.getTime() === session.clientUpdatedAt.getTime() && existing.version === session.version) return Response.json({ ok: true, applied: false });
  if (existing && (existing.clientUpdatedAt > session.clientUpdatedAt || existing.version > session.version || existing.updatedAt > session.updatedAt && existing.version >= session.version)) return Response.json({ error: "La sesión fue modificada desde otro dispositivo.", conflict: { version: existing.version, updatedAt: existing.updatedAt.toISOString() } }, { status: 409 });
  await prisma.$transaction(async (tx) => {
    const data = { status: session.status, startedAt: session.startedAt, finishedAt: session.finishedAt, durationSeconds: session.durationSeconds, notes: session.notes, emotionalRating: session.emotionalRating, version: session.version, clientUpdatedAt: session.clientUpdatedAt };
    if (existing) { await tx.workoutSessionExercise.deleteMany({ where: { sessionId: session.id } }); await tx.workoutSession.update({ where: { id: session.id }, data }); }
    else await tx.workoutSession.create({ data: { id: session.id, userId: user.id, routineId: session.routineId, ...data } });
    await tx.workoutSessionExercise.createMany({ data: session.exercises.map((exercise) => ({ id: exercise.id, sessionId: session.id, routineExerciseId: exercise.routineExerciseId, position: exercise.position, name: exercise.name, muscle: exercise.muscle })) });
    await tx.workoutSet.createMany({ data: session.exercises.flatMap((exercise) => exercise.sets.map((set) => ({ id: set.id, sessionExerciseId: exercise.id, setNumber: set.setNumber, targetReps: set.targetReps, targetWeight: set.targetWeight, reps: set.reps, weight: set.weight, rir: set.rir, rpe: set.rpe, note: set.note, completed: set.completed }))) });
  });
  return Response.json({ ok: true, applied: true });
}
