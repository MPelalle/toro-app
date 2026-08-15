/* eslint-disable @typescript-eslint/no-explicit-any */
import { getCurrentUser } from "@/lib/auth";
import { storedDateKey } from "@/lib/app-date";
import { getPrisma } from "@/lib/prisma";
import { hasTrustedOrigin, isUuid, originError } from "@/lib/security";

const key = storedDateKey;
const includeFor = (userId: string) => ({ meals: { orderBy: { position: "asc" as const } }, weightEntries: { where: { userId }, orderBy: { date: "asc" as const } }, dailyLogs: { where: { userId }, orderBy: { date: "asc" as const } }, weeklyCheckIns: { where: { userId }, orderBy: { weekStart: "asc" as const } }, members: { select: { userId: true } } });
function serialize(plan: any, viewerId: string) { return { ...plan, createdAt: plan.createdAt.toISOString(), canEdit: plan.userId === viewerId, meals: plan.meals.map((meal: any) => ({ ...meal, foods: Array.isArray(meal.foods) ? meal.foods : [] })), weightHistory: plan.weightEntries.map((item: any) => ({ ...item, date: key(item.date) })), dailyLogs: plan.dailyLogs.map((item: any) => ({ date: key(item.date), completedMeals: Array.isArray(item.completedMealIds) ? item.completedMealIds : [], comment: item.comment || "" })), weeklyCheckIns: (plan.weeklyCheckIns || []).map((item: any) => ({ ...item, weekStart: key(item.weekStart) })) }; }
async function accessible(id: string) { const user = await getCurrentUser(); if (!user) return null; const plan = await getPrisma().dietPlan.findFirst({ where: { id, OR: [{ userId: user.id, kind: "PERSONAL" }, { kind: "SHARED", members: { some: { userId: user.id } } }] }, include: includeFor(user.id) }); return { user, plan }; }
const notFound = () => Response.json({ error: "Plan no encontrado" }, { status: 404 });

export async function GET(_: Request, ctx: RouteContext<"/api/diets/[id]">) { const { id } = await ctx.params; if (!isUuid(id)) return notFound(); const result = await accessible(id); return result?.plan && result.user ? Response.json(serialize(result.plan, result.user.id)) : notFound(); }
export async function PUT(request: Request, ctx: RouteContext<"/api/diets/[id]">) {
  if (!hasTrustedOrigin(request)) return originError(); const { id } = await ctx.params; if (!isUuid(id)) return notFound(); const result = await accessible(id); const plan = result?.plan; const user = result?.user; if (!plan || !user) return notFound(); if (plan.userId !== user.id) return Response.json({ error: "Solo quien creó la dieta puede editarla." }, { status: 403 });
  const body = await request.json().catch(() => null); const name = String(body?.name || "").trim(); if (!body || !name || name.length > 120 || !["lose", "maintain", "gain"].includes(body.goal) || typeof body.active !== "boolean") return Response.json({ error: "Datos inválidos" }, { status: 400 });
  const updated = await getPrisma().dietPlan.update({ where: { id }, data: { name, goal: body.goal, active: body.active, updatedById: user.id }, include: includeFor(user.id) }); return Response.json(serialize(updated, user.id));
}
export async function DELETE(request: Request, ctx: RouteContext<"/api/diets/[id]">) { if (!hasTrustedOrigin(request)) return originError(); const { id } = await ctx.params; if (!isUuid(id)) return notFound(); const result = await accessible(id); if (!result?.plan || !result.user) return notFound(); if (result.plan.userId !== result.user.id) return Response.json({ error: "Solo quien creó la dieta puede eliminarla." }, { status: 403 }); await getPrisma().dietPlan.delete({ where: { id } }); return Response.json({ ok: true }); }
