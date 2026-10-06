import "server-only";

import { cache } from "react";
import { getPrisma } from "@/lib/prisma";
import { validateUsername } from "@/lib/username";

function asDays(value: unknown) {
  return Array.isArray(value) ? value.map(String).filter(Boolean).slice(0, 7) : [];
}

/**
 * Public-profile projection for shared links. It intentionally contains no
 * activity feed, workout metrics, body progress, diets, messages or presence.
 */
export const getPublicCommunityProfile = cache(async (nicknameInput: string) => {
  const nickname = validateUsername(nicknameInput);
  if (!nickname) return null;
  const prisma = getPrisma();
  const user = await prisma.user.findFirst({
    where: {
      nickname: { equals: nickname, mode: "insensitive" },
      profileVisibility: "PUBLIC",
    },
    select: {
      id: true,
      name: true,
      nickname: true,
      bio: true,
      avatarUrl: true,
      createdAt: true,
      routines: {
        where: { kind: "PERSONAL", isPublished: true },
        select: {
          id: true,
          name: true,
          type: true,
          days: true,
          publishedAt: true,
          exercises: { select: { id: true, sets: true } },
        },
        orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
        take: 12,
      },
    },
  });
  if (!user || !user.nickname) return null;
  const routineIds = user.routines.map((routine) => routine.id);
  const imports = routineIds.length
    ? await prisma.routinePlan.groupBy({
      by: ["importedFromRoutineId"],
      where: { importedFromRoutineId: { in: routineIds } },
      _count: { _all: true },
    })
    : [];
  const importCount = new Map(
    imports.flatMap((item) => item.importedFromRoutineId
      ? [[item.importedFromRoutineId, item._count._all] as const]
      : []),
  );

  return {
    id: user.id,
    name: user.name || user.nickname,
    nickname: user.nickname,
    bio: user.bio,
    avatarUrl: user.avatarUrl,
    joinedAt: user.createdAt.toISOString(),
    routines: user.routines.map((routine) => ({
      id: routine.id,
      name: routine.name,
      type: routine.type,
      days: asDays(routine.days),
      publishedAt: routine.publishedAt?.toISOString() || null,
      exerciseCount: routine.exercises.length,
      setCount: routine.exercises.reduce((total, exercise) => total + exercise.sets, 0),
      importCount: importCount.get(routine.id) || 0,
    })),
  };
});
