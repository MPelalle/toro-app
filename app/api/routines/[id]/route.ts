/* eslint-disable @typescript-eslint/no-explicit-any */
import { getCurrentUser } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { hasTrustedOrigin, isUuid, originError } from "@/lib/security";

const include = { exercises: { orderBy: { position: "asc" as const } } };
const notFound = () => Response.json({ error: "Rutina no encontrada" }, { status: 404 });
function serialize(plan: any, viewerId?: string) { return { ...plan, createdAt: plan.createdAt.toISOString(), canEdit: viewerId ? plan.userId === viewerId : undefined, days: Array.isArray(plan.days) ? plan.days : [], exercises: plan.exercises.map((exercise: any) => ({ ...exercise, note: exercise.note || "", completed: exercise.completed ?? null, actualReps: exercise.actualReps ?? null })) }; }
async function accessible(id: string) { const user = await getCurrentUser(); if (!user) return null; const plan = await getPrisma().routinePlan.findFirst({ where: { id, OR: [{ userId: user.id, kind: "PERSONAL" }, { kind: "SHARED", members: { some: { userId: user.id } } }] }, include: { ...include, members: { select: { userId: true } } } }); return { user, plan }; }

export async function GET(_: Request, ctx: RouteContext<"/api/routines/[id]">) { const { id } = await ctx.params; if (!isUuid(id)) return notFound(); const result = await accessible(id); return result?.plan && result.user ? Response.json(serialize(result.plan, result.user.id)) : notFound(); }
export async function PATCH(request: Request, ctx: RouteContext<"/api/routines/[id]">) {
  if (!hasTrustedOrigin(request)) return originError();
  const { id } = await ctx.params; if (!isUuid(id)) return notFound(); const result = await accessible(id); const plan = result?.plan; const user = result?.user; if (!plan || !user) return notFound();
  if (plan.kind === "SHARED" && plan.userId !== user.id) return Response.json({ error: "Solo quien creó la rutina puede modificarla." }, { status: 403 });
  const body = await request.json().catch(() => null); if (!body || typeof body !== "object") return Response.json({ error: "Datos inválidos" }, { status: 400 });
  const prisma = getPrisma();
  const publicationData = typeof body.isPublished === "boolean"
    ? plan.kind === "PERSONAL" && plan.userId === user.id
      ? { isPublished: body.isPublished, publishedAt: body.isPublished ? (plan.publishedAt || new Date()) : null }
      : null
    : {};
  if (publicationData === null) return Response.json({ error: "Solo podés publicar tus rutinas personales." }, { status: 403 });
  if (body.active === true) {
    if (plan.kind === "SHARED") return Response.json({ error: "Las rutinas compartidas no modifican tu rutina personal activa." }, { status: 400 });
    const updated = await prisma.$transaction(async (tx) => { await tx.routinePlan.updateMany({ where: { userId: plan.userId, kind: "PERSONAL", active: true }, data: { active: false } }); return tx.routinePlan.update({ where: { id }, data: { active: true, updatedById: user.id }, include }); });
    return Response.json(serialize(updated));
  }
  if (typeof body.exerciseId === "string" && isUuid(body.exerciseId)) {
    const exercise = plan.exercises.find((item) => item.id === body.exerciseId); if (!exercise) return Response.json({ error: "Ejercicio no encontrado" }, { status: 404 });
    const completed = typeof body.completed === "boolean" ? body.completed : null; const actualReps = body.actualReps === null || body.actualReps === "" ? null : Number(body.actualReps); const note = String(body.note || "").trim();
    if (completed === null || !Number.isInteger(actualReps ?? 0) || (actualReps !== null && (actualReps < 0 || actualReps > 100)) || note.length > 500) return Response.json({ error: "Resultado inválido" }, { status: 400 });
    await prisma.routineExercise.update({ where: { id: exercise.id }, data: { completed, actualReps, note: note || null } });
    const refreshed = await accessible(id); return refreshed?.plan ? Response.json(serialize(refreshed.plan)) : notFound();
  }
  const name = String(body.name || "").trim(); const type = String(body.type || ""); const days: string[] = Array.isArray(body.days) ? body.days.map((day: unknown) => String(day)) : [];
  if (!name || name.length > 80 || !["Weider", "Torso / Pierna", "Fullbody", "Personalizada"].includes(type) || !days.length || days.length > 7 || new Set(days).size !== days.length || days.some((day) => !["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].includes(day))) return Response.json({ error: "Datos inválidos" }, { status: 400 });
  const sourceExercises = Array.isArray(body.exercises) ? body.exercises : null;
  if (sourceExercises) {
    if (!sourceExercises.length || sourceExercises.length > 60) return Response.json({ error: "La rutina necesita entre 1 y 60 ejercicios." }, { status: 400 });
    const exercises = sourceExercises.map((source: unknown, position: number) => {
      if (!source || typeof source !== "object") return null;
      const item = source as Record<string, unknown>;
      const sets = Number(item.sets); const reps = Number(item.reps); const weight = Number(item.weight);
      const catalogExerciseId = item.catalogExerciseId === null || item.catalogExerciseId === undefined || item.catalogExerciseId === "" ? null : String(item.catalogExerciseId).trim();
      const exercise = { position, catalogExerciseId, name: String(item.name || "").trim(), muscle: String(item.muscle || "").trim(), sets, reps, weight, technique: String(item.technique || ""), trainingDay: String(item.trainingDay || "") };
      return (catalogExerciseId === null || catalogExerciseId.length <= 100) && exercise.name && exercise.name.length <= 100 && exercise.muscle && exercise.muscle.length <= 60 && Number.isInteger(sets) && sets >= 1 && sets <= 20 && Number.isInteger(reps) && reps >= 1 && reps <= 100 && Number.isFinite(weight) && weight >= 0 && weight <= 1_000 && ["Normal", "Drop-set", "Rest-pause", "Superserie", "Tempo controlado"].includes(exercise.technique) && days.includes(exercise.trainingDay) ? exercise : null;
    });
    if (!exercises.every(Boolean)) return Response.json({ error: "Revisá los datos de los ejercicios." }, { status: 400 });
    const updated = await prisma.$transaction(async (tx) => {
      await tx.routineExercise.deleteMany({ where: { routineId: id } });
      return tx.routinePlan.update({ where: { id }, data: { name, type, days, updatedById: user.id, ...publicationData, exercises: { create: exercises as NonNullable<typeof exercises[number]>[] } }, include });
    });
    return Response.json(serialize(updated));
  }
  const updated = await prisma.routinePlan.update({ where: { id }, data: { name, type, days, updatedById: user.id, ...publicationData }, include }); return Response.json(serialize(updated));
}
export async function DELETE(request: Request, ctx: RouteContext<"/api/routines/[id]">) {
  if (!hasTrustedOrigin(request)) return originError();
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await ctx.params;
  if (!isUuid(id)) return notFound();
  const plan = await getPrisma().routinePlan.findFirst({ where: { id, userId: user.id, kind: "PERSONAL" }, select: { id: true } });
  if (!plan) return Response.json({ ok: true, applied: false });
  await getPrisma().routinePlan.delete({ where: { id } });
  return Response.json({ ok: true, applied: true });
}
