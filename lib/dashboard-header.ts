import "server-only";

import { getPrisma } from "@/lib/prisma";

export type DashboardHeaderStats = {
  streak: number;
  progress: number;
};

function dateKey(date: Date) {
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

function consecutiveVisits(dates: Date[], today: string) {
  const visitDays = new Set(dates.map((date) => date.toISOString().slice(0, 10)));
  const cursor = databaseDay(today);
  let streak = 0;

  while (visitDays.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  return streak;
}

export async function getDashboardHeaderStats(userId: string): Promise<DashboardHeaderStats> {
  const prisma = getPrisma();
  const today = dateKey(new Date());
  const todayDate = databaseDay(today);

  await prisma.appDailyVisit.upsert({
    where: { userId_date: { userId, date: todayDate } },
    update: {},
    create: { userId, date: todayDate },
  });

  const [visits, habits, diet, routine] = await Promise.all([
    prisma.appDailyVisit.findMany({ where: { userId }, select: { date: true }, orderBy: { date: "desc" } }),
    prisma.habit.findMany({
      where: { userId, status: "ACTIVE" },
      include: { checkIns: { where: { completedAt: todayDate, completed: true }, select: { id: true } } },
    }),
    prisma.dietPlan.findFirst({
      where: { userId, active: true },
      orderBy: { updatedAt: "desc" },
      include: {
        meals: { select: { id: true } },
        dailyLogs: { where: { date: todayDate }, select: { completedMealIds: true } },
      },
    }),
    prisma.routinePlan.findFirst({
      where: { userId, active: true },
      orderBy: { updatedAt: "desc" },
      select: { id: true, days: true },
    }),
  ]);

  const ratios: number[] = [];

  if (habits.length) {
    ratios.push(habits.filter((habit) => habit.checkIns.length > 0).length / habits.length);
  }

  if (diet?.meals.length) {
    const completed = Array.isArray(diet.dailyLogs[0]?.completedMealIds) ? diet.dailyLogs[0].completedMealIds.length : 0;
    ratios.push(Math.min(1, completed / diet.meals.length));
  }

  const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const scheduledToday = routine && Array.isArray(routine.days) && routine.days.includes(dayNames[todayDate.getUTCDay()]);
  if (scheduledToday) {
    const start = new Date(`${today}T00:00:00.000Z`);
    const end = new Date(`${today}T23:59:59.999Z`);
    const session = await prisma.workoutSession.findFirst({
      where: { userId, routineId: routine.id, startedAt: { gte: start, lte: end } },
      orderBy: { updatedAt: "desc" },
      include: { exercises: { include: { sets: { select: { completed: true } } } } },
    });
    const sets = session?.exercises.flatMap((exercise) => exercise.sets) || [];
    ratios.push(sets.length ? sets.filter((set) => set.completed).length / sets.length : 0);
  }

  return {
    streak: consecutiveVisits(visits.map((visit) => visit.date), today),
    progress: ratios.length ? Math.round((ratios.reduce((total, ratio) => total + ratio, 0) / ratios.length) * 100) : 0,
  };
}
