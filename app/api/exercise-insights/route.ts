import { getCurrentUser } from "@/lib/auth";
import { listFriends } from "@/lib/community";
import { getPrisma } from "@/lib/prisma";
import { estimateOneRepMax } from "@/lib/workout-progress";

type WorkoutSet = { completed: boolean; weight: number | null; reps: number | null };

function best(sets: WorkoutSet[]) {
  return sets.reduce(
    (current, set) => {
      if (!set.completed || set.weight === null || set.reps === null) return current;
      const e1rm = estimateOneRepMax(set.weight, set.reps);
      return e1rm > current.e1rm || (e1rm === current.e1rm && set.weight > current.weight)
        ? { weight: set.weight, reps: set.reps, e1rm }
        : current;
    },
    { weight: 0, reps: 0, e1rm: 0 },
  );
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });
  const name = (new URL(request.url).searchParams.get("name") || "").trim();
  if (!name || name.length > 100)
    return Response.json({ error: "Ejercicio inválido" }, { status: 400 });

  const exerciseWhere = { name: { equals: name, mode: "insensitive" as const } };
  const prisma = getPrisma();
  const [ownSessions, friends] = await Promise.all([
    prisma.workoutSession.findMany({
      where: { userId: user.id, status: "FINISHED", exercises: { some: exerciseWhere } },
      orderBy: { finishedAt: "desc" },
      take: 12,
      select: {
        id: true,
        finishedAt: true,
        updatedAt: true,
        exercises: { where: exerciseWhere, select: { sets: { select: { completed: true, weight: true, reps: true } } } },
      },
    }),
    listFriends(user.id),
  ]);
  const visibleFriendProfiles = friends.length
    ? await prisma.user.findMany({
        where: { id: { in: friends.map((friend) => friend.id) }, profileVisibility: { not: "PRIVATE" } },
        select: { id: true },
      })
    : [];
  const visibleFriendIds = new Set(visibleFriendProfiles.map((friend) => friend.id));
  const visibleFriends = friends.filter((friend) => visibleFriendIds.has(friend.id));
  const friendIds = visibleFriends.map((friend) => friend.id);
  const friendSessions = friendIds.length
    ? await prisma.workoutSession.findMany({
        where: { userId: { in: friendIds }, status: "FINISHED", exercises: { some: exerciseWhere } },
        orderBy: { finishedAt: "desc" },
        take: 100,
        select: {
          userId: true,
          exercises: { where: exerciseWhere, select: { sets: { select: { completed: true, weight: true, reps: true } } } },
        },
      })
    : [];

  const history = ownSessions
    .map((session) => {
      const score = best(session.exercises.flatMap((exercise) => exercise.sets));
      return score.e1rm
        ? {
            id: session.id,
            date: (session.finishedAt || session.updatedAt).toISOString(),
            weight: score.weight,
            reps: score.reps,
            estimatedOneRepMax: Math.round(score.e1rm),
          }
        : null;
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
  const personal = history.reduce(
    (current, item) =>
      item.estimatedOneRepMax > current.estimatedOneRepMax ? item : current,
    { weight: 0, reps: 0, estimatedOneRepMax: 0, date: "", id: "" },
  );
  const bestByFriend = new Map<string, { weight: number; reps: number; e1rm: number }>();
  for (const session of friendSessions) {
    const score = best(session.exercises.flatMap((exercise) => exercise.sets));
    const previous = bestByFriend.get(session.userId);
    if (score.e1rm && (!previous || score.e1rm > previous.e1rm)) bestByFriend.set(session.userId, score);
  }
  const friendRecord = visibleFriends
    .map((friend) => ({ friend, score: bestByFriend.get(friend.id) }))
    .filter((item): item is { friend: (typeof friends)[number]; score: { weight: number; reps: number; e1rm: number } } => Boolean(item.score))
    .sort((left, right) => right.score.e1rm - left.score.e1rm)[0];

  return Response.json(
    {
      personal: personal.estimatedOneRepMax ? personal : null,
      history,
      friendRecord: friendRecord
        ? {
            name: friendRecord.friend.name,
            nickname: friendRecord.friend.nickname,
            weight: friendRecord.score.weight,
            reps: friendRecord.score.reps,
            estimatedOneRepMax: Math.round(friendRecord.score.e1rm),
          }
        : null,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
