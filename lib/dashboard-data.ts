import "server-only";

import { appDateKey, dateAtNoonUTC } from "@/lib/app-date";
import type { DailyDietLog, DietMeal } from "@/lib/diet-types";
import { getMyCommunitySummary } from "@/lib/community";
import { getPrisma } from "@/lib/prisma";
import { getCachedToroRewards } from "@/lib/rewards";
import { getCachedUserBadgeProfile } from "@/lib/user-badges";
import type { Routine } from "@/lib/routines";
import type { UserBadge } from "@/lib/badges";
import type { ToroRewards } from "@/lib/reward-types";

export type DashboardDiet = {
  id: string;
  name: string;
  active: boolean;
  meals: DietMeal[];
  dailyLogs: DailyDietLog[];
};

export type DashboardData = {
  user: { displayName: string };
  training: Routine | null;
  diet: DashboardDiet | null;
  habits: {
    active: number;
    completed: number;
    items: Array<{
      id: string;
      name: string;
      completed: boolean;
      importance: "LOW" | "MEDIUM" | "HIGH";
    }>;
  };
  community: { me: Awaited<ReturnType<typeof getMyCommunitySummary>> };
  badges: UserBadge[];
  rewards: ToroRewards;
};

function routineSnapshot(plan: NonNullable<Awaited<ReturnType<typeof getTrainingRoutine>>>): Routine {
  return {
    id: plan.id,
    name: plan.name,
    type: plan.type,
    kind: "PERSONAL",
    canEdit: true,
    days: Array.isArray(plan.days) ? plan.days.map(String) : [],
    active: plan.active,
    isPublished: plan.isPublished,
    publishedAt: plan.publishedAt?.toISOString() ?? null,
    createdAt: plan.createdAt.toISOString(),
    exercises: plan.exercises.map((exercise) => ({
      ...exercise,
      completed: exercise.completed ?? null,
      actualReps: exercise.actualReps ?? null,
      note: exercise.note || "",
    })),
  };
}

function getTrainingRoutine(userId: string) {
  return getPrisma().routinePlan.findFirst({
    where: { userId, kind: "PERSONAL" },
    orderBy: [{ active: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      name: true,
      type: true,
      days: true,
      active: true,
      isPublished: true,
      publishedAt: true,
      createdAt: true,
      exercises: {
        orderBy: { position: "asc" },
        select: {
          id: true,
          catalogExerciseId: true,
          name: true,
          muscle: true,
          sets: true,
          reps: true,
          weight: true,
          technique: true,
          restSeconds: true,
          supersetGroupId: true,
          completed: true,
          actualReps: true,
          note: true,
          trainingDay: true,
        },
      },
    },
  });
}

async function getDashboardDiet(userId: string, today: Date): Promise<DashboardDiet | null> {
  const plan = await getPrisma().dietPlan.findFirst({
    where: {
      OR: [
        { userId, kind: "PERSONAL" },
        { kind: "SHARED", members: { some: { userId } } },
      ],
    },
    orderBy: [{ active: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      name: true,
      active: true,
      meals: {
        orderBy: { position: "asc" },
        select: {
          id: true,
          name: true,
          time: true,
          kcal: true,
          protein: true,
          carbs: true,
          fats: true,
          foods: true,
        },
      },
      dailyLogs: {
        where: { userId, date: today },
        select: { date: true, completedMealIds: true, comment: true },
      },
    },
  });
  if (!plan) return null;

  return {
    id: plan.id,
    name: plan.name,
    active: plan.active,
    meals: plan.meals.map((meal) => ({
      ...meal,
      foods: Array.isArray(meal.foods) ? meal.foods.map(String) : [],
    })),
    dailyLogs: plan.dailyLogs.map((log) => ({
      date: appDateKey(log.date),
      completedMeals: Array.isArray(log.completedMealIds) ? log.completedMealIds.map(String) : [],
      comment: log.comment || "",
    })),
  };
}

export async function getDashboardData(user: {
  id: string;
  name: string | null;
  username: string | null;
}): Promise<DashboardData> {
  const todayKey = appDateKey();
  const today = dateAtNoonUTC(todayKey);
  const checkInDayStart = new Date(`${todayKey}T00:00:00.000Z`);
  const checkInDayEnd = new Date(checkInDayStart.getTime() + 86_400_000);
  const displayName = user.name || user.username || "Campeón";
  const prisma = getPrisma();

  const [habitRows, routine, diet, community, badgeProfile, rewards] = await Promise.all([
    prisma.habit.findMany({
      where: { userId: user.id, status: "ACTIVE" },
      select: {
        id: true,
        name: true,
        importance: true,
        checkIns: {
          where: {
            completed: true,
            completedAt: { gte: checkInDayStart, lt: checkInDayEnd },
          },
          select: { id: true },
        },
      },
    }),
    getTrainingRoutine(user.id),
    getDashboardDiet(user.id, today),
    getMyCommunitySummary(user.id),
    getCachedUserBadgeProfile(user.id, displayName),
    getCachedToroRewards(user.id),
  ]);

  const importanceOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 } as const;
  const items = habitRows
    .map((habit) => ({
      id: habit.id,
      name: habit.name,
      completed: habit.checkIns.length > 0,
      importance: habit.importance,
    }))
    .sort(
      (first, second) =>
        Number(first.completed) - Number(second.completed) ||
        importanceOrder[first.importance] - importanceOrder[second.importance] ||
        first.name.localeCompare(second.name, "es"),
    );

  return {
    user: { displayName: badgeProfile.displayName },
    training: routine ? routineSnapshot(routine) : null,
    diet,
    habits: {
      active: items.length,
      completed: items.filter((habit) => habit.completed).length,
      items,
    },
    community: { me: community },
    badges: badgeProfile.badges,
    rewards,
  };
}
