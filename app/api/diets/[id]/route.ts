/* eslint-disable @typescript-eslint/no-explicit-any */
import { getCurrentUser } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { hasTrustedOrigin, isUuid, originError } from "@/lib/security";

const include = { meals: { orderBy: { position: "asc" as const } }, weightEntries: { orderBy: { date: "asc" as const } }, dailyLogs: { orderBy: { date: "asc" as const } } };
const key = (date: Date) => date.toISOString().slice(0, 10);
function serialize(plan: any) {
  return { ...plan, createdAt: plan.createdAt.toISOString(), meals: plan.meals.map((meal: any) => ({ ...meal, foods: Array.isArray(meal.foods) ? meal.foods : [] })), weightHistory: plan.weightEntries.map((item: any) => ({ ...item, date: key(item.date) })), dailyLogs: plan.dailyLogs.map((item: any) => ({ date: key(item.date), completedMeals: Array.isArray(item.completedMealIds) ? item.completedMealIds : [], comment: item.comment || "" })) };
}
async function owned(id: string) {
  const user = await getCurrentUser();
  if (!user) return null;
  return getPrisma().dietPlan.findFirst({ where: { id, userId: user.id }, include });
}
const notFound = () => Response.json({ error: "Plan no encontrado" }, { status: 404 });

export async function GET(_: Request, ctx: RouteContext<"/api/diets/[id]">) {
  const { id } = await ctx.params;
  if (!isUuid(id)) return notFound();
  const plan = await owned(id);
  return plan ? Response.json(serialize(plan)) : notFound();
}

export async function PUT(request: Request, ctx: RouteContext<"/api/diets/[id]">) {
  if (!hasTrustedOrigin(request)) return originError();
  const { id } = await ctx.params;
  if (!isUuid(id)) return notFound();
  const plan = await owned(id);
  if (!plan) return notFound();
  const body = await request.json().catch(() => null);
  const name = String(body?.name || "").trim();
  if (!body || !name || name.length > 120 || !["lose", "maintain", "gain"].includes(body.goal) || typeof body.active !== "boolean") {
    return Response.json({ error: "Datos inválidos" }, { status: 400 });
  }
  const updated = await getPrisma().dietPlan.update({ where: { id }, data: { name, goal: body.goal, active: body.active }, include });
  return Response.json(serialize(updated));
}

export async function DELETE(request: Request, ctx: RouteContext<"/api/diets/[id]">) {
  if (!hasTrustedOrigin(request)) return originError();
  const { id } = await ctx.params;
  if (!isUuid(id)) return notFound();
  const plan = await owned(id);
  if (!plan) return notFound();
  await getPrisma().dietPlan.delete({ where: { id } });
  return Response.json({ ok: true });
}
