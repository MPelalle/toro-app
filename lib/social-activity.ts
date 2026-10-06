import "server-only";

import { getPrisma } from "@/lib/prisma";

/** Idempotent activity creation. Social failures must never invalidate a workout. */
export async function ensureWorkoutActivity(sessionId: string) {
  const prisma = getPrisma();
  const session = await prisma.workoutSession.findFirst({
    where: { id: sessionId, status: "FINISHED", finishedAt: { not: null } },
    select: { id: true, userId: true, routineId: true },
  });
  if (!session) return null;
  return prisma.socialActivity.upsert({
    where: { workoutSessionId: session.id },
    update: {},
    create: { actorUserId: session.userId, type: "WORKOUT_COMPLETED", workoutSessionId: session.id, routineId: session.routineId },
    select: { id: true },
  });
}

/** Creates the feed representation of a short status without coupling status
 * persistence to social delivery. The status remains valid if this fails. */
export async function ensureStatusActivity(statusId: string) {
  const prisma = getPrisma();
  const status = await prisma.communityStatus.findUnique({
    where: { id: statusId },
    select: { id: true, userId: true },
  });
  if (!status) return null;
  return prisma.socialActivity.upsert({
    where: { statusId: status.id },
    update: {},
    create: {
      actorUserId: status.userId,
      type: "STATUS",
      statusId: status.id,
    },
    select: { id: true },
  });
}

/** A published routine has one durable social event. The compound unique
 * constraint protects concurrent publication requests as well as retries. */
export async function ensureRoutinePublishedActivity(routineId: string) {
  const prisma = getPrisma();
  const routine = await prisma.routinePlan.findFirst({
    where: { id: routineId, kind: "PERSONAL", isPublished: true },
    select: { id: true, userId: true },
  });
  if (!routine) return null;
  return prisma.socialActivity.upsert({
    where: {
      routineId_type: {
        routineId: routine.id,
        type: "ROUTINE_PUBLISHED",
      },
    },
    update: {},
    create: {
      actorUserId: routine.userId,
      type: "ROUTINE_PUBLISHED",
      routineId: routine.id,
    },
    select: { id: true },
  });
}
