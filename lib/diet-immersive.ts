import "server-only";

import { appCalendarDate, appDateKey, dateAtNoonUTC, storedDateKey } from "@/lib/app-date";
import { getPrisma } from "@/lib/prisma";

export const DIET_FEELINGS = ["Excelente", "Bien", "Normal", "Baja energía", "Mucho hambre"] as const;
export type DietFeeling = (typeof DIET_FEELINGS)[number];

type WeeklyInput = { weight: number; feeling: DietFeeling; energy: number; hunger: number; note: string };

function currentWeekStart() {
  const date = appCalendarDate();
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  return dateAtNoonUTC(storedDateKey(date));
}

function round(value: number, step = 5) {
  return Math.round(value / step) * step;
}

function scaleFoodPortion(value: unknown, factor: number) {
  if (typeof value !== "string") return String(value);
  return value.replace(/^(\d+(?:\.\d+)?)\s*×/, (_, amount) => `${Math.max(0.1, Math.round(Number(amount) * factor * 10) / 10)} ×`);
}

function adjustmentFor(goal: string, previousWeight: number, weight: number) {
  const change = weight - previousWeight;
  const rate = change / previousWeight;
  if (goal === "lose") return rate >= -0.001 ? -100 : rate < -0.0125 ? 100 : 0;
  if (goal === "gain") return rate <= 0.001 ? 100 : rate > 0.0075 ? -100 : 0;
  return Math.abs(rate) > 0.004 ? (change > 0 ? -100 : 100) : 0;
}

export async function saveImmersiveDietCheckIn(userId: string, dietId: string, input: WeeklyInput) {
  const prisma = getPrisma();
  return prisma.$transaction(async (tx) => {
    const diet = await tx.dietPlan.findFirst({
      where: { id: dietId, userId, kind: "PERSONAL", immersiveMode: true },
      include: { meals: { orderBy: { position: "asc" } } },
    });
    if (!diet) throw new Error("El seguimiento inmersivo sólo está disponible en tus dietas personales activadas.");
    const weekStart = currentWeekStart();
    const existing = await tx.dietWeeklyCheckIn.findUnique({ where: { dietId_userId_weekStart: { dietId, userId, weekStart } } });
    if (existing) {
      const checkIn = await tx.dietWeeklyCheckIn.update({ where: { id: existing.id }, data: { weight: input.weight, feeling: input.feeling, energy: input.energy, hunger: input.hunger, note: input.note || null } });
      await tx.dietPlan.update({ where: { id: diet.id }, data: { weight: input.weight } });
      await tx.dietWeightEntry.updateMany({ where: { dietId, userId, date: weekStart }, data: { weight: input.weight, note: input.note || null } });
      return checkIn;
    }

    const previous = await tx.dietWeeklyCheckIn.findFirst({ where: { dietId, userId }, orderBy: { weekStart: "desc" } });
    const logs = await tx.dietDailyLog.findMany({ where: { dietId, userId, date: { gte: weekStart, lte: dateAtNoonUTC(appDateKey()) } }, select: { completedMealIds: true } });
    const completedMeals = logs.reduce((total, log) => total + (Array.isArray(log.completedMealIds) ? log.completedMealIds.length : 0), 0);
    const adherence = diet.meals.length ? completedMeals / (7 * diet.meals.length) : 0;
    const canAdjust = Boolean(previous && logs.length >= 5 && adherence >= 0.7);
    const requestedAdjustment = canAdjust && previous ? adjustmentFor(diet.goal, previous.weight, input.weight) : 0;
    const minimumCalories = diet.sex === "male" ? 1500 : 1200;
    const adjustmentKcal = requestedAdjustment && diet.calories + requestedAdjustment >= minimumCalories ? requestedAdjustment : 0;

    const checkIn = await tx.dietWeeklyCheckIn.create({ data: { dietId, userId, weekStart, ...input, note: input.note || null, adjustmentKcal } });
    await tx.dietWeightEntry.create({ data: { dietId, userId, date: weekStart, weight: input.weight, note: input.note || `Revisión semanal · ${input.feeling}` } });

    if (adjustmentKcal) {
      const calories = diet.calories + adjustmentKcal;
      const protein = Math.max(diet.protein, round(input.weight * (diet.goal === "lose" ? 1.8 : 1.6)));
      const fats = Math.max(round(input.weight * 0.8), round(diet.fats * calories / diet.calories));
      const carbs = Math.max(0, round((calories - protein * 4 - fats * 9) / 4));
      const factor = calories / diet.calories;
      await tx.dietPlan.update({
        where: { id: diet.id },
        data: {
          weight: input.weight,
          calories,
          protein,
          fats,
          carbs,
          meals: { update: diet.meals.map((meal) => ({ where: { id: meal.id }, data: { kcal: round(meal.kcal * factor), protein: round(meal.protein * protein / diet.protein), fats: round(meal.fats * fats / diet.fats), carbs: round(meal.carbs * carbs / Math.max(1, diet.carbs)), foods: Array.isArray(meal.foods) ? meal.foods.map((food) => scaleFoodPortion(food, factor)) : [] } })) },
        },
      });
    } else {
      await tx.dietPlan.update({ where: { id: diet.id }, data: { weight: input.weight } });
    }
    return checkIn;
  }, { isolationLevel: "Serializable" });
}
