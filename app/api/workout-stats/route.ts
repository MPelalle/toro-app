import { getCurrentUser } from "@/lib/auth";
import { appCalendarDate, appDateKey, storedDateKey } from "@/lib/app-date";
import { getPrisma } from "@/lib/prisma";
import { isUuid } from "@/lib/security";

type Point = { date: string; volume: number };

function dateKey(value: Date) {
  return appDateKey(value);
}

function consecutiveTrainingDays(days: string[]) {
  const unique = new Set(days);
  const cursor = appCalendarDate();
  if (!unique.has(storedDateKey(cursor))) cursor.setUTCDate(cursor.getUTCDate() - 1);
  let streak = 0;
  while (unique.has(storedDateKey(cursor))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });
  const routineId = new URL(request.url).searchParams.get("routineId") || "";
  if (!isUuid(routineId)) return Response.json({ error: "Rutina inválida" }, { status: 400 });

  const sessions = await getPrisma().workoutSession.findMany({
    where: { userId: user.id, routineId, status: "FINISHED" },
    orderBy: { finishedAt: "asc" },
    select: {
      finishedAt: true,
      updatedAt: true,
      exercises: {
        select: {
          name: true,
          muscle: true,
          sets: {
            select: {
              completed: true,
              reps: true,
              weight: true,
            },
          },
        },
      },
    },
  });
  const exerciseMap = new Map<string, { name: string; muscle: string; bestWeight: number; estimatedOneRepMax: number; history: Point[] }>();
  const weeklyMuscles = new Map<string, number>();
  const weekStart = appCalendarDate();
  weekStart.setUTCDate(weekStart.getUTCDate() - 6);
  const weekStartKey = storedDateKey(weekStart);

  for (const session of sessions) {
    const finishedAt = session.finishedAt || session.updatedAt;
    const date = dateKey(finishedAt);
    for (const exercise of session.exercises) {
      const completed = exercise.sets.filter((set) => set.completed && set.reps !== null && set.weight !== null);
      if (!completed.length) continue;
      const key = exercise.name.trim().toLocaleLowerCase();
      const stats = exerciseMap.get(key) || { name: exercise.name, muscle: exercise.muscle, bestWeight: 0, estimatedOneRepMax: 0, history: [] };
      const volume = completed.reduce((total, set) => total + (set.weight || 0) * (set.reps || 0), 0);
      stats.history.push({ date, volume: Math.round(volume) });
      for (const set of completed) {
        stats.bestWeight = Math.max(stats.bestWeight, set.weight || 0);
        stats.estimatedOneRepMax = Math.max(stats.estimatedOneRepMax, (set.weight || 0) * (1 + (set.reps || 0) / 30));
      }
      exerciseMap.set(key, stats);
      if (date >= weekStartKey) weeklyMuscles.set(exercise.muscle, (weeklyMuscles.get(exercise.muscle) || 0) + completed.length);
    }
  }

  return Response.json({
    streak: consecutiveTrainingDays(sessions.map((session) => dateKey(session.finishedAt || session.updatedAt))),
    exercises: [...exerciseMap.values()].map((item) => ({ ...item, estimatedOneRepMax: Math.round(item.estimatedOneRepMax), history: item.history.slice(-8) })),
    muscles: [...weeklyMuscles.entries()].map(([name, sets]) => ({ name, sets })).sort((a, b) => b.sets - a.sets),
  }, { headers: { "Cache-Control": "no-store" } });
}
