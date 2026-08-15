import "server-only";

import { appCalendarDate, appDateKey, dateAtNoonUTC, storedDateKey } from "@/lib/app-date";
import type { ToroReward, ToroRewards } from "@/lib/reward-types";
import { getPrisma } from "@/lib/prisma";

function consecutiveDays(dates: Date[]) {
  const visited = new Set(dates.map(storedDateKey));
  const cursor = appCalendarDate();
  let total = 0;
  while (visited.has(storedDateKey(cursor))) { total += 1; cursor.setUTCDate(cursor.getUTCDate() - 1); }
  return total;
}

function weekKey(date: Date) {
  const cursor = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  cursor.setUTCDate(cursor.getUTCDate() + 4 - (cursor.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(cursor.getUTCFullYear(), 0, 1));
  return `${cursor.getUTCFullYear()}-${Math.ceil((((cursor.getTime() - yearStart.getTime()) / 86_400_000) + 1) / 7)}`;
}

function dayKey(day: string) {
  return day.normalize("NFD").replace(/\p{Diacritic}/gu, "").trim().slice(0, 3).toLowerCase();
}

function reward(id: ToroReward["id"], title: string, discount: ToroReward["discount"], description: string, progress: number, progressLabel: string): ToroReward {
  const code = discount === 10 ? "TORO10" : discount === 20 ? "TORO20" : discount === 50 ? "TORO50" : "TORO100";
  return { id, title, discount, description, progress: Math.max(0, Math.min(100, Math.round(progress))), progressLabel, unlocked: progress >= 100, code };
}

/** One public coupon per discount tier. The returned highest code is the only
 * one the UI promotes, so rewards never combine into a bigger discount. */
export async function getToroRewards(userId: string): Promise<ToroRewards> {
  const prisma = getPrisma();
  const thirtyFiveDaysAgo = dateAtNoonUTC(appDateKey(new Date(Date.now() - 35 * 86_400_000)));
  const [visits, personalRoutineCount, completedWorkoutCount, recentSessions, diets, mediumHabitChecks] = await Promise.all([
    prisma.appDailyVisit.findMany({ where: { userId }, select: { date: true }, orderBy: { date: "desc" } }),
    prisma.routinePlan.count({ where: { userId, kind: "PERSONAL" } }),
    prisma.workoutSession.count({ where: { userId, status: "FINISHED", routine: { userId, kind: "PERSONAL" } } }),
    prisma.workoutSession.findMany({ where: { userId, status: "FINISHED", routine: { userId, kind: "PERSONAL" }, OR: [{ finishedAt: { gte: thirtyFiveDaysAgo } }, { finishedAt: null, updatedAt: { gte: thirtyFiveDaysAgo } }] }, select: { routineId: true, finishedAt: true, updatedAt: true } }),
    prisma.dietPlan.findMany({ where: { userId, kind: "PERSONAL" }, select: { meals: { select: { id: true } }, dailyLogs: { select: { date: true, completedMealIds: true } } } }),
    prisma.habitCheckIn.count({ where: { completed: true, habit: { userId, importance: "MEDIUM" } } }),
  ]);

  const streak = consecutiveDays(visits.map((visit) => visit.date));
  const completeDietDays = new Set<string>();
  for (const diet of diets) {
    const meals = new Set(diet.meals.map((meal) => meal.id));
    for (const log of diet.dailyLogs) {
      const completed = Array.isArray(log.completedMealIds) ? log.completedMealIds.map(String) : [];
      if (meals.size && completed.length === meals.size && completed.every((id) => meals.has(id))) completeDietDays.add(storedDateKey(log.date));
    }
  }

  const plannedDays = await prisma.routinePlan.findMany({ where: { userId, kind: "PERSONAL" }, select: { id: true, days: true } });
  const plans = new Map(plannedDays.map((plan) => [plan.id, Array.isArray(plan.days) ? plan.days.map((day) => dayKey(String(day))) : []]));
  const completedByWeek = new Map<string, Set<string>>();
  for (const session of recentSessions) {
    const date = session.finishedAt || session.updatedAt;
    const key = `${session.routineId}:${weekKey(date)}`;
    const days = completedByWeek.get(key) || new Set<string>();
    days.add(dayKey(new Intl.DateTimeFormat("es-AR", { timeZone: "America/Argentina/Buenos_Aires", weekday: "short" }).format(date)));
    completedByWeek.set(key, days);
  }
  const completeRoutineWeeks = [...completedByWeek.entries()].filter(([key, completed]) => {
    const routineId = key.slice(0, key.indexOf(":"));
    const scheduled = plans.get(routineId) || [];
    return scheduled.length > 0 && scheduled.every((day) => completed.has(day));
  }).length;

  const rewards = [
    reward("routine", "Rutina completada", 10, "Creá una rutina personal y registrá un entrenamiento terminado.", personalRoutineCount && completedWorkoutCount ? 100 : personalRoutineCount ? 50 : 0, personalRoutineCount ? `${Math.min(completedWorkoutCount, 1)}/1 entrenamiento completado` : "Creá tu primera rutina"),
    reward("diet", "Una semana de dieta", 10, "Creá tu dieta y completá sus comidas durante siete días.", completeDietDays.size / 7 * 100, `${Math.min(completeDietDays.size, 7)}/7 días completos`),
    reward("habit", "Hábito de prioridad media", 10, "Completá al menos una vez un hábito de importancia media.", mediumHabitChecks ? 100 : 0, `${Math.min(mediumHabitChecks, 1)}/1 hábito completado`),
    reward("streak10", "Racha de 10 días", 20, "Entrá a TORO diez días seguidos.", streak / 10 * 100, `${Math.min(streak, 10)}/10 días seguidos`),
    reward("month", "Mes de constancia", 50, "Completá cuatro semanas de tu rutina y entrá treinta días seguidos.", Math.min(completeRoutineWeeks / 4, streak / 30) * 100, `${Math.min(completeRoutineWeeks, 4)}/4 semanas · ${Math.min(streak, 30)}/30 días`),
    reward("streak100", "Leyenda TORO", 100, "Entrá a TORO durante cien días seguidos.", streak / 100 * 100, `${Math.min(streak, 100)}/100 días seguidos`),
  ];
  const highestUnlocked = [...rewards].filter((item) => item.unlocked).sort((a, b) => b.discount - a.discount)[0] || null;
  return { rewards, highestUnlocked };
}
