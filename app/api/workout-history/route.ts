import { getCurrentUser } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { isUuid, isValidDateKey } from "@/lib/security";

const take = 30;
function toDate(value: string | null, end = false) {
  if (!value || !isValidDateKey(value)) return null;
  const date = new Date(`${value}T${end ? "23:59:59.999" : "00:00:00.000"}Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });
  const url = new URL(request.url);
  const query = (url.searchParams.get("q") || "").trim().slice(0, 100);
  const routineId = (url.searchParams.get("routine") || "").trim();
  const fromKey = url.searchParams.get("from");
  const toKey = url.searchParams.get("to");
  const from = toDate(fromKey);
  const to = toDate(toKey, true);
  const cursor = url.searchParams.get("cursor") || undefined;
  if ((fromKey && !from) || (toKey && !to) || (routineId && !isUuid(routineId)))
    return Response.json({ error: "Filtros inválidos" }, { status: 400 });
  if (cursor && !isUuid(cursor))
    return Response.json({ error: "Cursor inválido" }, { status: 400 });
  const where = {
    userId: user.id,
    status: "FINISHED" as const,
    ...(routineId ? { routineId } : {}),
    ...(from || to
      ? {
          finishedAt: {
            ...(from ? { gte: from } : {}),
            ...(to ? { lte: to } : {}),
          },
        }
      : {}),
    ...(query
      ? {
          OR: [
            {
              routine: {
                name: { contains: query, mode: "insensitive" as const },
              },
            },
            {
              exercises: {
                some: {
                  name: { contains: query, mode: "insensitive" as const },
                },
              },
            },
          ],
        }
      : {}),
  };
  const sessions = await getPrisma().workoutSession.findMany({
    where,
    orderBy: [{ finishedAt: "desc" }, { id: "desc" }],
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true,
      finishedAt: true,
      durationSeconds: true,
      notes: true,
      emotionalRating: true,
      emotionalState: true,
      routine: { select: { name: true } },
      exercises: {
        select: {
          name: true,
          muscle: true,
          sets: {
            select: { completed: true, weight: true, reps: true, kind: true },
          },
        },
      },
    },
  });
  const page = sessions.slice(0, take).map((session) => {
    const sets = session.exercises
      .flatMap((exercise) => exercise.sets)
      .filter(
        (set) =>
          set.completed &&
          set.kind !== "WARMUP" &&
          (set.weight || 0) >= 0 &&
          (set.reps || 0) > 0,
      );
    return {
      id: session.id,
      date: session.finishedAt?.toISOString() ?? null,
      routine: session.routine?.name ?? "Entrenamiento libre",
      durationSeconds: session.durationSeconds,
      notes: session.notes,
      emotionalRating: session.emotionalRating,
      emotionalState: session.emotionalState,
      exercises: session.exercises.map((exercise) => ({
        name: exercise.name,
        muscle: exercise.muscle,
        sets: exercise.sets
          .filter((set) => set.completed)
          .map((set) => ({
            weight: set.weight,
            reps: set.reps,
            kind: set.kind,
          })),
      })),
      volume: Math.round(
        sets.reduce(
          (total, set) => total + (set.weight || 0) * (set.reps || 0),
          0,
        ),
      ),
      completedSets: sets.length,
    };
  });
  return Response.json(
    {
      sessions: page,
      nextCursor: sessions.length > take ? sessions[take].id : null,
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
