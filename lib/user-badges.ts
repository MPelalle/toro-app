import "server-only";

import { buildUserBadges, withBadgeTier, type BadgeTier, type UserBadge } from "@/lib/badges";
import { getPrisma } from "@/lib/prisma";

function argentinaDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = (type: string) => parts.find((part) => part.type === type)?.value || "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

function databaseDay(key: string) {
  return new Date(`${key}T12:00:00.000Z`);
}

function countConsecutiveDays(dates: Date[], today: string) {
  const found = new Set(dates.map((date) => date.toISOString().slice(0, 10)));
  const cursor = databaseDay(today);
  let total = 0;
  while (found.has(cursor.toISOString().slice(0, 10))) {
    total += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return total;
}

function weekKey(date: Date) {
  const cursor = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  cursor.setUTCDate(cursor.getUTCDate() + 4 - (cursor.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(cursor.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((cursor.getTime() - yearStart.getTime()) / 86_400_000) + 1) / 7);
  return `${cursor.getUTCFullYear()}-${week}`;
}

export type UserBadgeProfile = {
  displayName: string;
  badges: UserBadge[];
};

export async function getUserBadgeProfile(userId: string, displayName: string): Promise<UserBadgeProfile> {
  const prisma = getPrisma();
  const today = argentinaDateKey();
  const todayDate = databaseDay(today);

  await prisma.appDailyVisit.upsert({
    where: { userId_date: { userId, date: todayDate } },
    update: {},
    create: { userId, date: todayDate },
  });

  const [visits, completedHabits, sessions, diets, awards, routines] = await Promise.all([
    prisma.appDailyVisit.findMany({ where: { userId }, select: { date: true } }),
    prisma.habitCheckIn.count({ where: { habit: { userId }, completed: true } }),
    prisma.workoutSession.findMany({
      where: { userId, status: "FINISHED" },
      select: { routineId: true, finishedAt: true, updatedAt: true },
    }),
    prisma.dietPlan.findMany({
      where: { userId },
      select: {
        meals: { select: { id: true } },
        dailyLogs: { select: { date: true, completedMealIds: true } },
      },
    }),
    prisma.userBadgeAward.findMany({ where: { userId }, select: { badgeId: true, tier: true } }),
    prisma.routinePlan.findMany({ where: { userId }, select: { id: true, days: true } }),
  ]);

  const completeDietDays = new Set<string>();
  for (const diet of diets) {
    const mealIds = new Set(diet.meals.map((meal) => meal.id));
    if (!mealIds.size) continue;
    for (const log of diet.dailyLogs) {
      const completed = Array.isArray(log.completedMealIds) ? log.completedMealIds.map(String) : [];
      if (mealIds.size === completed.length && completed.every((id) => mealIds.has(id))) {
        completeDietDays.add(log.date.toISOString().slice(0, 10));
      }
    }
  }

  const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const plannedDays = new Map(routines.map((routine) => [routine.id, Array.isArray(routine.days) ? routine.days.map(String) : []]));
  const completedDaysByWeek = new Map<string, Set<string>>();
  for (const session of sessions) {
    const day = databaseDay(argentinaDateKey(session.finishedAt || session.updatedAt));
    const key = `${session.routineId}:${weekKey(day)}`;
    const completed = completedDaysByWeek.get(key) || new Set<string>();
    completed.add(dayNames[day.getUTCDay()]);
    completedDaysByWeek.set(key, completed);
  }
  const routineWeeks = [...completedDaysByWeek.entries()].filter(([key, completed]) => {
    const routineId = key.slice(0, key.indexOf(":"));
    const planned = plannedDays.get(routineId) || [];
    return planned.length > 0 && planned.every((day) => completed.has(day));
  }).length;
  const calculatedBadges = buildUserBadges({
    streak: countConsecutiveDays(visits.map((visit) => visit.date), today),
    routine: routineWeeks,
    diet: Math.floor(completeDietDays.size / 7),
    habits: completedHabits,
  });
  const awardsByBadge = new Map(awards.map((award) => [award.badgeId, award.tier]));
  const badges = calculatedBadges.map((badge) => {
    const awardedTier = awardsByBadge.get(badge.id) ?? 0;
    return withBadgeTier(badge, Math.max(badge.tier, Math.min(4, awardedTier)) as BadgeTier);
  });

  await Promise.all(badges.filter((badge) => badge.tier > (awardsByBadge.get(badge.id) ?? 0)).map((badge) =>
    prisma.userBadgeAward.upsert({
      where: { userId_badgeId: { userId, badgeId: badge.id } },
      update: { tier: badge.tier },
      create: { userId, badgeId: badge.id, tier: badge.tier },
    }),
  ));

  return { displayName, badges };
}
