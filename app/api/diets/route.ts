/* eslint-disable @typescript-eslint/no-explicit-any */
import { getCurrentUser } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { hasTrustedOrigin, originError } from "@/lib/security";

const include = { meals: { orderBy: { position: "asc" as const } }, weightEntries: { orderBy: { date: "asc" as const } }, dailyLogs: { orderBy: { date: "asc" as const } } };
const dateKey = (date: Date) => date.toISOString().slice(0, 10);
function serialize(plan: any) {
  return { ...plan, createdAt: plan.createdAt.toISOString(), meals: plan.meals.map((meal: any) => ({ ...meal, foods: Array.isArray(meal.foods) ? meal.foods : [] })), weightHistory: plan.weightEntries.map((item: any) => ({ ...item, date: dateKey(item.date) })), dailyLogs: plan.dailyLogs.map((item: any) => ({ date: dateKey(item.date), completedMeals: Array.isArray(item.completedMealIds) ? item.completedMealIds : [], comment: item.comment || "" })) };
}
function bad(message: string, status = 400) { return Response.json({ error: message }, { status }); }

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return bad("No autorizado", 401);
  const plans = await getPrisma().dietPlan.findMany({ where: { userId: user.id }, include, orderBy: { createdAt: "desc" } });
  return Response.json(plans.map(serialize));
}

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return originError();
  const user = await getCurrentUser();
  if (!user) return bad("No autorizado", 401);
  const body = await request.json().catch(() => null);
  if (!body || !Array.isArray(body.meals) || !body.meals.length || body.meals.length > 6) return bad("Elegí alimentos para al menos una comida.");
  const number = (value: unknown, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const bounded = (value: unknown, max: number) => Math.max(0, Math.min(max, Math.round(number(value))));
  const age = number(body.age); const weight = number(body.weight); const height = number(body.height); const activity = number(body.activity);
  if (!body.name?.trim() || age < 14 || age > 120 || weight < 35 || weight > 500 || height < 120 || height > 250 || !["male", "female"].includes(body.sex) || !["lose", "maintain", "gain"].includes(body.goal) || ![1.2, 1.375, 1.55, 1.725, 1.9].includes(activity) || ![3, 4, 6].includes(body.meals.length)) return bad("Revisá los datos del plan.");
  const mealsAreValid = body.meals.every((meal: unknown) => {
    if (!meal || typeof meal !== "object") return false;
    const item = meal as Record<string, unknown>;
    return typeof item.name === "string" && item.name.trim().length > 0 && item.name.length <= 80 && typeof item.time === "string" && /^\d{2}:\d{2}$/.test(item.time) && Array.isArray(item.foods) && item.foods.length > 0 && item.foods.length <= 20;
  });
  if (!mealsAreValid) return bad("Las comidas del plan no son válidas.");
  const prisma = getPrisma();
  await prisma.dietPlan.updateMany({ where: { userId: user.id, active: true }, data: { active: false } });
  const plan = await prisma.dietPlan.create({ data: {
    userId: user.id, name: String(body.name).trim().slice(0, 120), sex: body.sex, age, weight, height, activity, activityLabel: String(body.activityLabel || ""), goal: body.goal,
    mealsPerDay: body.meals.length, calories: number(body.calories), tdee: number(body.tdee), protein: number(body.protein), carbs: number(body.carbs), fats: number(body.fats), active: true,
    meals: { create: body.meals.map((meal: any, position: number) => ({ position, name: String(meal.name).trim().slice(0, 80), time: String(meal.time).slice(0, 5), kcal: bounded(meal.kcal, 10_000), protein: bounded(meal.protein, 1_000), carbs: bounded(meal.carbs, 1_000), fats: bounded(meal.fats, 1_000), foods: meal.foods.map((food: unknown) => String(food).slice(0, 200)).slice(0, 20) })) },
    weightEntries: { create: { date: new Date(), weight } },
  }, include });
  return Response.json(serialize(plan), { status: 201 });
}
