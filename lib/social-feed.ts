import "server-only";

import { getPrisma } from "@/lib/prisma";
import {
  assertCanInteractWithActivity,
  blockedUserIdsFor,
  getVisibleSocialActivity,
} from "@/lib/social-guard";
import { SOCIAL_LIMITS, normalizeSocialText } from "@/lib/social-policy";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 40;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type FeedCursor = { createdAt: string; id: string };

type FeedWorkout = {
  durationSeconds: number | null;
  startedAt: Date;
  finishedAt: Date | null;
  updatedAt: Date;
  routine: { name: string } | null;
  exercises: Array<{
    name: string;
    sets: Array<{
      completed: boolean;
      weight: number | null;
      reps: number | null;
    }>;
  }>;
};

type FeedActivity = {
  id: string;
  type: string;
  createdAt: Date;
  originalActivityId: string | null;
  actor: { id: string; name: string | null; nickname: string | null; avatarUrl: string | null };
  workoutSession: FeedWorkout | null;
  routine: {
    id: string;
    name: string;
    type: string;
    days: unknown;
    publishedAt: Date | null;
    isPublished: boolean;
    exercises: Array<{ id: string; sets: number }>;
  } | null;
  status: { id: string; content: string } | null;
  _count: { reactions: number; comments: number };
  reactions: Array<{ userId: string }>;
};

export type SocialFeedItem = {
  id: string;
  type: string;
  createdAt: string;
  actor: { id: string; name: string; nickname: string | null; avatarUrl: string | null };
  workout: {
    routineName: string;
    durationSeconds: number;
    volume: number;
    setCount: number;
    exerciseCount: number;
    highlightExercise: string | null;
  } | null;
  routine: {
    id: string;
    name: string;
    type: string;
    days: string[];
    exerciseCount: number;
    setCount: number;
    publishedAt: string | null;
  } | null;
  status: { id: string; content: string } | null;
  originalActivityId: string | null;
  reactionCount: number;
  commentCount: number;
  reactedByViewer: boolean;
};

export type SocialComment = {
  id: string;
  content: string;
  createdAt: string;
  canDelete: boolean;
  author: { id: string; name: string; nickname: string | null; avatarUrl: string | null };
};

function parsePageSize(value: string | null) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return DEFAULT_PAGE_SIZE;
  return Math.max(1, Math.min(MAX_PAGE_SIZE, parsed));
}

function encodeCursor(cursor: FeedCursor) {
  return Buffer.from(JSON.stringify(cursor)).toString("base64url");
}

function decodeCursor(value: string | null): FeedCursor | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Partial<FeedCursor>;
    const date = parsed.createdAt ? new Date(parsed.createdAt) : null;
    if (!date || Number.isNaN(date.getTime()) || !parsed.id || !UUID_PATTERN.test(parsed.id)) {
      return null;
    }
    return { createdAt: date.toISOString(), id: parsed.id };
  } catch {
    return null;
  }
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.map(String) : [];
}

function serializeActivity(activity: FeedActivity): SocialFeedItem {
  const completedSets = activity.workoutSession?.exercises
    .flatMap((exercise) => exercise.sets)
    .filter((set) => set.completed && set.weight !== null && set.reps !== null) ?? [];
  const volume = Math.round(
    completedSets.reduce(
      (total, set) => total + (set.weight || 0) * (set.reps || 0),
      0,
    ),
  );
  const workoutEnd = activity.workoutSession
    ? activity.workoutSession.finishedAt || activity.workoutSession.updatedAt
    : null;
  const durationSeconds = activity.workoutSession
    ? activity.workoutSession.durationSeconds ?? Math.max(
      0,
      Math.floor((workoutEnd!.getTime() - activity.workoutSession.startedAt.getTime()) / 1_000),
    )
    : 0;
  const highlightExercise = activity.workoutSession?.exercises
    .map((exercise) => ({
      name: exercise.name,
      volume: exercise.sets
        .filter((set) => set.completed && set.weight !== null && set.reps !== null)
        .reduce((total, set) => total + (set.weight || 0) * (set.reps || 0), 0),
    }))
    .sort((left, right) => right.volume - left.volume)[0]?.name ?? null;

  return {
    id: activity.id,
    type: activity.type,
    createdAt: activity.createdAt.toISOString(),
    actor: {
      id: activity.actor.id,
      name: activity.actor.name || activity.actor.nickname || "Atleta",
      nickname: activity.actor.nickname,
      avatarUrl: activity.actor.avatarUrl,
    },
    workout: activity.workoutSession
      ? {
        routineName: activity.workoutSession.routine?.name || "Entrenamiento libre",
        durationSeconds,
        volume,
        setCount: completedSets.length,
        exerciseCount: activity.workoutSession.exercises.length,
        highlightExercise,
      }
      : null,
    routine: activity.routine
      ? {
        id: activity.routine.id,
        name: activity.routine.name,
        type: activity.routine.type,
        days: stringArray(activity.routine.days),
        exerciseCount: activity.routine.exercises.length,
        setCount: activity.routine.exercises.reduce((total, exercise) => total + exercise.sets, 0),
        publishedAt: activity.routine.publishedAt?.toISOString() || null,
      }
      : null,
    status: activity.status,
    originalActivityId: activity.originalActivityId,
    reactionCount: activity._count.reactions,
    commentCount: activity._count.comments,
    reactedByViewer: activity.reactions.length > 0,
  };
}

async function connectionIdsFor(userId: string) {
  const friendships = await getPrisma().friendship.findMany({
    where: {
      status: "ACCEPTED",
      OR: [{ userAId: userId }, { userBId: userId }],
    },
    select: { userAId: true, userBId: true },
  });
  return friendships.map((friendship) =>
    friendship.userAId === userId ? friendship.userBId : friendship.userAId,
  );
}

/** A personalized, cursor-paginated Club feed. It only selects the viewer's
 * own events and events from accepted friends; public discovery is intentionally
 * separate so a social graph never leaks into a cached generic feed. */
export async function listSocialFeed(
  viewerId: string,
  options: { cursor?: string | null; limit?: string | null } = {},
) {
  const cursor = decodeCursor(options.cursor || null);
  if (options.cursor && !cursor) throw new Error("Cursor de feed inválido.");
  const limit = parsePageSize(options.limit || null);
  const friendIds = await connectionIdsFor(viewerId);
  const blockedIds = await blockedUserIdsFor(viewerId, friendIds);
  const visibleFriendIds = friendIds.filter((id) => !blockedIds.has(id));
  const cursorDate = cursor ? new Date(cursor.createdAt) : null;
  const activities = await getPrisma().socialActivity.findMany({
    where: {
      deletedAt: null,
      AND: [
        {
          OR: [
            { actorUserId: viewerId },
            {
              actorUserId: { in: visibleFriendIds },
              actor: { profileVisibility: { in: ["PUBLIC", "FRIENDS"] } },
            },
          ],
        },
        {
          OR: [
            { type: { not: "ROUTINE_PUBLISHED" } },
            { actorUserId: viewerId },
            { routine: { is: { isPublished: true } } },
          ],
        },
        ...(cursor && cursorDate
          ? [{ OR: [{ createdAt: { lt: cursorDate } }, { createdAt: cursorDate, id: { lt: cursor.id } }] }]
          : []),
      ],
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    include: {
      actor: { select: { id: true, name: true, nickname: true, avatarUrl: true } },
      workoutSession: {
        select: {
          durationSeconds: true,
          startedAt: true,
          finishedAt: true,
          updatedAt: true,
          routine: { select: { name: true } },
          exercises: {
            select: {
              name: true,
              sets: { select: { completed: true, weight: true, reps: true } },
            },
          },
        },
      },
      routine: {
        select: {
          id: true,
          name: true,
          type: true,
          days: true,
          publishedAt: true,
          isPublished: true,
          exercises: { select: { id: true, sets: true } },
        },
      },
      status: { select: { id: true, content: true } },
      _count: {
        select: {
          reactions: true,
          comments: { where: { deletedAt: null } },
        },
      },
      reactions: { where: { userId: viewerId }, select: { userId: true }, take: 1 },
    },
  });
  const hasMore = activities.length > limit;
  const page = hasMore ? activities.slice(0, limit) : activities;
  const last = page.at(-1);
  return {
    activities: page.map((activity) => serializeActivity(activity)),
    nextCursor: hasMore && last
      ? encodeCursor({ createdAt: last.createdAt.toISOString(), id: last.id })
      : null,
  };
}

async function interactionCount(activityId: string) {
  return getPrisma().socialActivityReaction.count({ where: { activityId } });
}

/** Idempotent create for an optimistic like button. The unique primary key
 * prevents a user from producing duplicate reactions under retries. */
export async function addSocialReaction(viewerId: string, activityId: string) {
  const activity = await assertCanInteractWithActivity(viewerId, activityId);
  const prisma = getPrisma();
  const existing = await prisma.socialActivityReaction.findUnique({
    where: { activityId_userId: { activityId, userId: viewerId } },
    select: { userId: true },
  });
  if (!existing) {
    try {
      await prisma.socialActivityReaction.create({ data: { activityId, userId: viewerId } });
      if (activity.actorUserId !== viewerId) {
        await prisma.socialNotification.upsert({
          where: {
            userId_actorId_type_targetId: {
              userId: activity.actorUserId,
              actorId: viewerId,
              type: "ACTIVITY_LIKED",
              targetId: activityId,
            },
          },
          update: { readAt: null, createdAt: new Date(), targetType: "ACTIVITY" },
          create: {
            userId: activity.actorUserId,
            actorId: viewerId,
            type: "ACTIVITY_LIKED",
            targetType: "ACTIVITY",
            targetId: activityId,
          },
        });
      }
    } catch (error) {
      // A concurrent retry may win the unique constraint. It still means the
      // desired final state is reacted, so do not turn it into a client error.
      if (!(error && typeof error === "object" && "code" in error && error.code === "P2002")) throw error;
    }
  }
  return { reacted: true, reactionCount: await interactionCount(activityId) };
}

export async function removeSocialReaction(viewerId: string, activityId: string) {
  await assertCanInteractWithActivity(viewerId, activityId);
  await getPrisma().socialActivityReaction.deleteMany({
    where: { activityId, userId: viewerId },
  });
  return { reacted: false, reactionCount: await interactionCount(activityId) };
}

export async function listSocialComments(
  viewerId: string,
  activityId: string,
  options: { cursor?: string | null; limit?: string | null } = {},
) {
  const visibleActivity = await getVisibleSocialActivity(viewerId, activityId);
  if (!visibleActivity) throw new Error("Esta actividad no está disponible.");
  const cursor = decodeCursor(options.cursor || null);
  if (options.cursor && !cursor) throw new Error("Cursor de comentarios inválido.");
  const limit = parsePageSize(options.limit || null);
  const cursorDate = cursor ? new Date(cursor.createdAt) : null;
  const prisma = getPrisma();
  // The set is normally tiny and avoids exposing a blocked person's comment
  // merely because they were not part of the feed's initial actor list.
  const blocks = await prisma.socialBlock.findMany({
    where: { OR: [{ blockerId: viewerId }, { blockedId: viewerId }] },
    select: { blockerId: true, blockedId: true },
  });
  const blockedCommenters = blocks.map((block) =>
    block.blockerId === viewerId ? block.blockedId : block.blockerId,
  );
  const comments = await prisma.socialActivityComment.findMany({
    where: {
      activityId,
      deletedAt: null,
      userId: { notIn: blockedCommenters },
      ...(cursor && cursorDate
        ? { OR: [{ createdAt: { gt: cursorDate } }, { createdAt: cursorDate, id: { gt: cursor.id } }] }
        : {}),
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    take: limit + 1,
    include: {
      user: { select: { id: true, name: true, nickname: true, avatarUrl: true } },
    },
  });
  const hasMore = comments.length > limit;
  const page = hasMore ? comments.slice(0, limit) : comments;
  const last = page.at(-1);
  return {
    comments: page.map((comment) => ({
      id: comment.id,
      content: comment.content,
      createdAt: comment.createdAt.toISOString(),
      canDelete: comment.userId === viewerId,
      author: {
        id: comment.user.id,
        name: comment.user.name || comment.user.nickname || "Atleta",
        nickname: comment.user.nickname,
        avatarUrl: comment.user.avatarUrl,
      },
    })),
    nextCursor: hasMore && last
      ? encodeCursor({ createdAt: last.createdAt.toISOString(), id: last.id })
      : null,
  };
}

export async function createSocialComment(
  viewerId: string,
  activityId: string,
  contentInput: unknown,
) {
  const content = normalizeSocialText(contentInput, SOCIAL_LIMITS.commentMaxLength);
  if (!content) throw new Error("El comentario debe tener entre 1 y 500 caracteres.");
  const activity = await assertCanInteractWithActivity(viewerId, activityId);
  const prisma = getPrisma();
  const comment = await prisma.socialActivityComment.create({
    data: { activityId, userId: viewerId, content },
    include: { user: { select: { id: true, name: true, nickname: true, avatarUrl: true } } },
  });
  if (activity.actorUserId !== viewerId) {
    await prisma.socialNotification.create({
      data: {
        userId: activity.actorUserId,
        actorId: viewerId,
        type: "ACTIVITY_COMMENTED",
        targetType: "ACTIVITY",
        targetId: comment.id,
      },
    });
  }
  return {
    id: comment.id,
    content: comment.content,
    createdAt: comment.createdAt.toISOString(),
    canDelete: true,
    author: {
      id: comment.user.id,
      name: comment.user.name || comment.user.nickname || "Atleta",
      nickname: comment.user.nickname,
      avatarUrl: comment.user.avatarUrl,
    },
  } satisfies SocialComment;
}

export async function deleteSocialComment(viewerId: string, commentId: string) {
  const deleted = await getPrisma().socialActivityComment.updateMany({
    where: { id: commentId, userId: viewerId, deletedAt: null },
    data: { deletedAt: new Date() },
  });
  return deleted.count > 0;
}
