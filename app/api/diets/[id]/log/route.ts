import { getCurrentUser } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { hasTrustedOrigin, isUuid, isValidDateKey, originError } from "@/lib/security";

export async function POST(request: Request, ctx: RouteContext<"/api/diets/[id]/log">) {
  if (!hasTrustedOrigin(request)) return originError();
  const { id } = await ctx.params;
  if (!isUuid(id)) return Response.json({ error: "Plan no encontrado" }, { status: 404 });
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });
  const diet = await getPrisma().dietPlan.findFirst({ where: { id, userId: user.id }, include: { meals: { select: { id: true } } } });
  if (!diet) return Response.json({ error: "Plan no encontrado" }, { status: 404 });
  const body = await request.json().catch(() => null);
  const date = String(body?.date || "");
  const completedMeals: string[] = Array.isArray(body?.completedMeals) ? body.completedMeals.map((meal: unknown) => String(meal)) : [];
  const comment = String(body?.comment || "").trim();
  const mealIds = new Set(diet.meals.map((meal) => meal.id));
  const today = new Date().toISOString().slice(0, 10);
  if (!body || !isValidDateKey(date) || date > today || completedMeals.length > diet.meals.length || new Set(completedMeals).size !== completedMeals.length || completedMeals.some((mealId) => !mealIds.has(mealId)) || comment.length > 1000) {
    return Response.json({ error: "Registro inválido" }, { status: 400 });
  }
  const result = await getPrisma().dietDailyLog.upsert({
    where: { dietId_date: { dietId: id, date: new Date(`${date}T12:00:00.000Z`) } },
    update: { completedMealIds: completedMeals, comment: comment || null },
    create: { dietId: id, date: new Date(`${date}T12:00:00.000Z`), completedMealIds: completedMeals, comment: comment || null },
  });
  return Response.json({ date, completedMeals: Array.isArray(result.completedMealIds) ? result.completedMealIds : [], comment: result.comment || "" });
}
