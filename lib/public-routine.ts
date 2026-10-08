import "server-only";

import { revalidateTag, unstable_cache } from "next/cache";
import { cache } from "react";
import { getPrisma } from "@/lib/prisma";
import { isUuid } from "@/lib/security";

type PublicRoutineExercise = {
  id: string;
  name: string;
  muscle: string;
  sets: number;
  reps: number;
  weight: number;
  technique: string;
  trainingDay: string;
  position: number;
};

function routineDays(value: unknown) {
  return Array.isArray(value) ? value.map(String).filter(Boolean).slice(0, 7) : [];
}

/**
 * This is deliberately viewerless: it only returns a routine whose author
 * explicitly chose the public routine visibility. It does not use profile
 * activity, body data, diet data, or private profile fields.
 */
async function loadPublicRoutine(routineId: string) {
  const plan = await getPrisma().routinePlan.findFirst({
    where: { id: routineId, kind: "PERSONAL", isPublished: true },
    select: {
      id: true,
      name: true,
      type: true,
      days: true,
      createdAt: true,
      publishedAt: true,
      user: {
        select: {
          nickname: true,
          name: true,
          avatarUrl: true,
          profileVisibility: true,
        },
      },
      exercises: {
        select: {
          id: true,
          name: true,
          muscle: true,
          sets: true,
          reps: true,
          weight: true,
          technique: true,
          trainingDay: true,
          position: true,
        },
        orderBy: { position: "asc" },
      },
    },
  });
  if (!plan) return null;

  const isPublicProfile = plan.user.profileVisibility === "PUBLIC";
  const nickname = plan.user.nickname;
  const creatorName = isPublicProfile
    ? plan.user.name || nickname || "Atleta TORO"
    : nickname || "Creador de TORO";
  const exercises: PublicRoutineExercise[] = plan.exercises;
  return {
    id: plan.id,
    name: plan.name,
    type: plan.type,
    days: routineDays(plan.days),
    createdAt: plan.createdAt.toISOString(),
    publishedAt: plan.publishedAt?.toISOString() || null,
    exerciseCount: exercises.length,
    setCount: exercises.reduce((total, exercise) => total + exercise.sets, 0),
    creator: {
      name: creatorName,
      nickname,
      avatarUrl: isPublicProfile ? plan.user.avatarUrl : null,
      profilePath:
        isPublicProfile && nickname
          ? `/profile/${encodeURIComponent(nickname)}`
          : null,
    },
    exercises,
  };
}

const getCachedPublicRoutine = unstable_cache(
  loadPublicRoutine,
  ["toro-public-routine-v1"],
  { revalidate: 60, tags: ["toro-public-routines"] },
);

export function revalidatePublicRoutines() {
  revalidateTag("toro-public-routines", { expire: 0 });
}

export const getPublicRoutine = cache(async (routineId: string) => {
  if (!isUuid(routineId)) return null;
  return getCachedPublicRoutine(routineId);
});
