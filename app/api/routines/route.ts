/* eslint-disable @typescript-eslint/no-explicit-any */
import { getCurrentUser } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { hasTrustedOrigin, isUuid, originError } from "@/lib/security";

const days = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const types = ["Weider", "Torso / Pierna", "Fullbody"];
const techniques = ["Normal", "Drop-set", "Rest-pause", "Superserie", "Tempo controlado"];
const include = { exercises: { orderBy: { position: "asc" as const } } };

function serialize(plan: any) {
  return { ...plan, createdAt: plan.createdAt.toISOString(), days: Array.isArray(plan.days) ? plan.days : [], exercises: plan.exercises.map((exercise: any) => ({ ...exercise, note: exercise.note || "", completed: exercise.completed ?? null, actualReps: exercise.actualReps ?? null })) };
}

function readRoutine(body: unknown) {
  if (!body || typeof body !== "object") return null;
  const value = body as Record<string, unknown>;
  const id = value.id === undefined ? undefined : String(value.id);
  const name = String(value.name || "").trim(); const type = String(value.type || ""); const routineDays = Array.isArray(value.days) ? value.days.map(String) : [];
  const sourceExercises = Array.isArray(value.exercises) ? value.exercises : [];
  if ((id !== undefined && !isUuid(id)) || !name || name.length > 80 || !types.includes(type) || !routineDays.length || routineDays.length > 7 || new Set(routineDays).size !== routineDays.length || routineDays.some((day) => !days.includes(day)) || !sourceExercises.length || sourceExercises.length > 60) return null;
  const exercises = sourceExercises.map((source, position) => {
    if (!source || typeof source !== "object") return null;
    const item = source as Record<string, unknown>;
    const number = (input: unknown) => Number(input);
    const sets = number(item.sets); const reps = number(item.reps); const weight = number(item.weight); const actualReps = item.actualReps === null || item.actualReps === "" || item.actualReps === undefined ? null : number(item.actualReps);
    const exercise = { position, name: String(item.name || "").trim(), muscle: String(item.muscle || "").trim(), sets, reps, weight, technique: String(item.technique || ""), trainingDay: String(item.trainingDay || ""), completed: typeof item.completed === "boolean" ? item.completed : null, actualReps, note: String(item.note || "").trim() };
    if (!exercise.name || exercise.name.length > 100 || !exercise.muscle || exercise.muscle.length > 60 || !Number.isInteger(sets) || sets < 1 || sets > 20 || !Number.isInteger(reps) || reps < 1 || reps > 100 || !Number.isFinite(weight) || weight < 0 || weight > 1_000 || !techniques.includes(exercise.technique) || !routineDays.includes(exercise.trainingDay) || (actualReps !== null && (!Number.isInteger(actualReps) || actualReps < 0 || actualReps > 100)) || exercise.note.length > 500) return null;
    return exercise;
  });
  return exercises.every(Boolean) ? { id, name, type, days: routineDays, exercises: exercises as NonNullable<typeof exercises[number]>[] } : null;
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });
  const plans = await getPrisma().routinePlan.findMany({ where: { userId: user.id, kind: "PERSONAL" }, include, orderBy: { createdAt: "desc" } });
  return Response.json(plans.map(serialize));
}

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return originError();
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });
  const values = readRoutine(await request.json().catch(() => null));
  if (!values) return Response.json({ error: "Los datos de la rutina no son válidos." }, { status: 400 });
  const prisma = getPrisma();
  if (values.id) {
    const existing = await prisma.routinePlan.findUnique({ where: { id: values.id }, include });
    if (existing) {
      if (existing.userId !== user.id) return Response.json({ error: "Conflicto de identificador de rutina." }, { status: 409 });
      return Response.json(serialize(existing));
    }
  }
  const count = await prisma.routinePlan.count({ where: { userId: user.id, kind: "PERSONAL" } });
  if (count >= 5) return Response.json({ error: "Podés guardar hasta cinco rutinas." }, { status: 400 });
  const plan = await prisma.$transaction(async (tx) => {
    await tx.routinePlan.updateMany({ where: { userId: user.id, active: true }, data: { active: false } });
    return tx.routinePlan.create({ data: { ...(values.id ? { id: values.id } : {}), name: values.name, type: values.type, kind: "PERSONAL", days: values.days, userId: user.id, updatedById: user.id, active: true, exercises: { create: values.exercises } }, include });
  });
  return Response.json(serialize(plan), { status: 201 });
}
