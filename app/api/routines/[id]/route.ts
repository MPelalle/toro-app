/* eslint-disable @typescript-eslint/no-explicit-any */
import { getCurrentUser } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { hasTrustedOrigin, isUuid, originError } from "@/lib/security";

const include = { exercises: { orderBy: { position: "asc" as const } } };
const notFound = () => Response.json({ error: "Rutina no encontrada" }, { status: 404 });
function serialize(plan: any) { return { ...plan, createdAt: plan.createdAt.toISOString(), days: Array.isArray(plan.days) ? plan.days : [], exercises: plan.exercises.map((exercise: any) => ({ ...exercise, note: exercise.note || "", completed: exercise.completed ?? null, actualReps: exercise.actualReps ?? null })) }; }
async function owned(id: string) { const user = await getCurrentUser(); if (!user) return null; return getPrisma().routinePlan.findFirst({ where: { id, userId: user.id }, include }); }

export async function GET(_: Request, ctx: RouteContext<"/api/routines/[id]">) { const { id } = await ctx.params; if (!isUuid(id)) return notFound(); const plan = await owned(id); return plan ? Response.json(serialize(plan)) : notFound(); }
export async function PATCH(request: Request, ctx: RouteContext<"/api/routines/[id]">) {
  if (!hasTrustedOrigin(request)) return originError();
  const { id } = await ctx.params; if (!isUuid(id)) return notFound(); const plan = await owned(id); if (!plan) return notFound();
  const body = await request.json().catch(() => null); if (!body || typeof body !== "object") return Response.json({ error: "Datos inválidos" }, { status: 400 });
  const prisma = getPrisma();
  if (body.active === true) {
    const updated = await prisma.$transaction(async (tx) => { await tx.routinePlan.updateMany({ where: { userId: plan.userId, active: true }, data: { active: false } }); return tx.routinePlan.update({ where: { id }, data: { active: true }, include }); });
    return Response.json(serialize(updated));
  }
  if (typeof body.exerciseId === "string" && isUuid(body.exerciseId)) {
    const exercise = plan.exercises.find((item) => item.id === body.exerciseId); if (!exercise) return Response.json({ error: "Ejercicio no encontrado" }, { status: 404 });
    const completed = typeof body.completed === "boolean" ? body.completed : null; const actualReps = body.actualReps === null || body.actualReps === "" ? null : Number(body.actualReps); const note = String(body.note || "").trim();
    if (completed === null || !Number.isInteger(actualReps ?? 0) || (actualReps !== null && (actualReps < 0 || actualReps > 100)) || note.length > 500) return Response.json({ error: "Resultado inválido" }, { status: 400 });
    await prisma.routineExercise.update({ where: { id: exercise.id }, data: { completed, actualReps, note: note || null } });
    const updated = await owned(id); return updated ? Response.json(serialize(updated)) : notFound();
  }
  const name = String(body.name || "").trim(); const type = String(body.type || ""); const days: string[] = Array.isArray(body.days) ? body.days.map((day: unknown) => String(day)) : [];
  if (!name || name.length > 80 || !["Weider", "Torso / Pierna", "Fullbody"].includes(type) || !days.length || days.length > 7 || new Set(days).size !== days.length || days.some((day) => !["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].includes(day))) return Response.json({ error: "Datos inválidos" }, { status: 400 });
  const updated = await prisma.routinePlan.update({ where: { id }, data: { name, type, days }, include }); return Response.json(serialize(updated));
}
export async function DELETE(request: Request, ctx: RouteContext<"/api/routines/[id]">) {
  if (!hasTrustedOrigin(request)) return originError();
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await ctx.params;
  if (!isUuid(id)) return notFound();
  const plan = await getPrisma().routinePlan.findFirst({ where: { id, userId: user.id }, select: { id: true } });
  if (!plan) return Response.json({ ok: true, applied: false });
  await getPrisma().routinePlan.delete({ where: { id } });
  return Response.json({ ok: true, applied: true });
}
