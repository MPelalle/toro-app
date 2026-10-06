import { getCurrentUser } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import {
  buildProgressAnalytics,
  compareSummary,
  previousRangeStart,
  rangeStart,
  type ProgressRange,
} from "@/lib/progress-analytics";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });

  const value = new URL(request.url).searchParams.get("range") || "3M";
  const range: ProgressRange = ["1M", "3M", "6M", "1Y", "ALL"].includes(value)
    ? (value as ProgressRange)
    : "3M";
  const start = rangeStart(range);
  const previousStart = previousRangeStart(range);
  const sessionSelect = {
    id: true,
    finishedAt: true,
    durationSeconds: true,
    routine: { select: { name: true } },
    exercises: {
      select: {
        name: true,
        muscle: true,
        sets: {
          select: { completed: true, reps: true, weight: true, kind: true },
        },
      },
    },
  } as const;
  const [sessions, previousSessions, activeRoutine, latestWeight] =
    await Promise.all([
      getPrisma().workoutSession.findMany({
        where: {
          userId: user.id,
          status: "FINISHED",
          ...(start ? { finishedAt: { gte: start } } : {}),
        },
        orderBy: { finishedAt: "asc" },
        select: sessionSelect,
      }),
      previousStart && start
        ? getPrisma().workoutSession.findMany({
            where: {
              userId: user.id,
              status: "FINISHED",
              finishedAt: { gte: previousStart, lt: start },
            },
            orderBy: { finishedAt: "asc" },
            select: sessionSelect,
          })
        : Promise.resolve([]),
      getPrisma().routinePlan.findFirst({
        where: { userId: user.id, kind: "PERSONAL", active: true },
        select: { days: true },
      }),
      getPrisma().dietWeightEntry.findFirst({
        where: { userId: user.id },
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        select: { weight: true },
      }),
    ]);

  const targetSessionsPerWeek =
    Array.isArray(activeRoutine?.days) && activeRoutine.days.length
      ? activeRoutine.days.length
      : 3;
  const serialize = (items: typeof sessions) =>
    items.map((session) => ({
      ...session,
      routineName: session.routine?.name ?? "Entrenamiento libre",
    }));
  const current = buildProgressAnalytics(
    serialize(sessions),
    targetSessionsPerWeek,
  );
  const previous = buildProgressAnalytics(
    serialize(previousSessions),
    targetSessionsPerWeek,
  );
  return Response.json(
    {
      ...current,
      comparison: compareSummary(current.summary, previous.summary),
      bodyWeight: latestWeight?.weight ?? null,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
