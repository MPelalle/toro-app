import "server-only";

import { getPrisma } from "@/lib/prisma";
import {
  type SocialReportReason,
  SOCIAL_LIMITS,
  normalizeSocialText,
} from "@/lib/social-policy";

export type CommunityProfileAccessTarget = {
  id: string;
  profileVisibility: "PUBLIC" | "FRIENDS" | "PRIVATE";
};

export function socialPair(userId: string, otherUserId: string) {
  return userId < otherUserId
    ? { userAId: userId, userBId: otherUserId }
    : { userAId: otherUserId, userBId: userId };
}

/** A block is bilateral for discovery and interactions, even though only one side created it. */
export async function isSociallyBlocked(userId: string, otherUserId: string) {
  if (userId === otherUserId) return false;
  const block = await getPrisma().socialBlock.findFirst({
    where: {
      OR: [
        { blockerId: userId, blockedId: otherUserId },
        { blockerId: otherUserId, blockedId: userId },
      ],
    },
    select: { blockerId: true },
  });
  return Boolean(block);
}

/** Returns target IDs that must not appear to this viewer. Useful for batched feed queries. */
export async function blockedUserIdsFor(viewerId: string, candidateIds: string[]) {
  const uniqueIds = [...new Set(candidateIds.filter((id) => id && id !== viewerId))];
  if (!uniqueIds.length) return new Set<string>();
  const blocks = await getPrisma().socialBlock.findMany({
    where: {
      OR: [
        { blockerId: viewerId, blockedId: { in: uniqueIds } },
        { blockerId: { in: uniqueIds }, blockedId: viewerId },
      ],
    },
    select: { blockerId: true, blockedId: true },
  });
  return new Set(
    blocks.map((block) =>
      block.blockerId === viewerId ? block.blockedId : block.blockerId,
    ),
  );
}

export async function areSocialFriends(userId: string, otherUserId: string) {
  if (userId === otherUserId) return true;
  const friendship = await getPrisma().friendship.findUnique({
    where: { userAId_userBId: socialPair(userId, otherUserId) },
    select: { status: true },
  });
  return friendship?.status === "ACCEPTED";
}

/** Privacy must be evaluated before data is selected for a profile or activity. */
export async function canViewCommunityProfile(
  viewerId: string,
  profileUser: CommunityProfileAccessTarget,
) {
  if (viewerId === profileUser.id) return true;
  if (await isSociallyBlocked(viewerId, profileUser.id)) return false;
  if (profileUser.profileVisibility === "PUBLIC") return true;
  if (profileUser.profileVisibility === "PRIVATE") return false;
  return areSocialFriends(viewerId, profileUser.id);
}

export async function assertCanInteractWithUser(actorId: string, targetUserId: string) {
  if (actorId === targetUserId) return;
  if (await isSociallyBlocked(actorId, targetUserId)) {
    throw new Error("No podés interactuar con esta cuenta.");
  }
}

/**
 * Resolves an activity only when it is still visible to the viewer. Route
 * handlers can use this before reactions/comments/reposts instead of trusting
 * a client-provided owner id.
 */
export async function getVisibleSocialActivity(viewerId: string, activityId: string) {
  const activity = await getPrisma().socialActivity.findFirst({
    where: { id: activityId, deletedAt: null },
    select: {
      id: true,
      actorUserId: true,
      type: true,
      routine: { select: { isPublished: true } },
      actor: { select: { id: true, profileVisibility: true } },
    },
  });
  if (!activity || !(await canViewCommunityProfile(viewerId, activity.actor))) {
    return null;
  }
  if (
    activity.type === "ROUTINE_PUBLISHED" &&
    viewerId !== activity.actorUserId &&
    !activity.routine?.isPublished
  ) {
    return null;
  }
  return activity;
}

export async function assertCanInteractWithActivity(viewerId: string, activityId: string) {
  const activity = await getVisibleSocialActivity(viewerId, activityId);
  if (!activity) throw new Error("Esta actividad no está disponible.");
  await assertCanInteractWithUser(viewerId, activity.actorUserId);
  return activity;
}

export async function blockSocialUser(blockerId: string, blockedId: string) {
  if (!blockedId || blockedId === blockerId) {
    throw new Error("No podés bloquear esta cuenta.");
  }
  const prisma = getPrisma();
  const target = await prisma.user.findUnique({
    where: { id: blockedId },
    select: { id: true },
  });
  if (!target) throw new Error("La cuenta no está disponible.");

  const existing = await prisma.socialBlock.findUnique({
    where: { blockerId_blockedId: { blockerId, blockedId } },
    select: { blockerId: true },
  });
  if (existing) return { blockedId, created: false };

  await prisma.$transaction(async (tx) => {
    await tx.socialBlock.create({ data: { blockerId, blockedId } });
    await tx.friendship.deleteMany({
      where: socialPair(blockerId, blockedId),
    });
    await tx.routineMember.deleteMany({
      where: {
        OR: [
          { userId: blockerId, routine: { userId: blockedId } },
          { userId: blockedId, routine: { userId: blockerId } },
        ],
      },
    });
    await tx.dietMember.deleteMany({
      where: {
        OR: [
          { userId: blockerId, diet: { userId: blockedId } },
          { userId: blockedId, diet: { userId: blockerId } },
        ],
      },
    });
    await tx.communityProfileMessage.deleteMany({
      where: {
        OR: [
          { authorId: blockerId, profileUserId: blockedId },
          { authorId: blockedId, profileUserId: blockerId },
        ],
      },
    });
    await tx.socialRepost.deleteMany({
      where: {
        OR: [
          { userId: blockerId, originalAuthorId: blockedId },
          { userId: blockedId, originalAuthorId: blockerId },
        ],
      },
    });
    await tx.socialActivityReaction.deleteMany({
      where: {
        OR: [
          { userId: blockerId, activity: { actorUserId: blockedId } },
          { userId: blockedId, activity: { actorUserId: blockerId } },
        ],
      },
    });
    await tx.socialActivityComment.deleteMany({
      where: {
        OR: [
          { userId: blockerId, activity: { actorUserId: blockedId } },
          { userId: blockedId, activity: { actorUserId: blockerId } },
        ],
      },
    });
    await tx.socialNotification.deleteMany({
      where: {
        OR: [
          { userId: blockerId, actorId: blockedId },
          { userId: blockedId, actorId: blockerId },
        ],
      },
    });
  });
  return { blockedId, created: true };
}

export async function unblockSocialUser(blockerId: string, blockedId: string) {
  const result = await getPrisma().socialBlock.deleteMany({
    where: { blockerId, blockedId },
  });
  return result.count > 0;
}

export async function listBlockedSocialUsers(blockerId: string) {
  const blocks = await getPrisma().socialBlock.findMany({
    where: { blockerId },
    orderBy: { createdAt: "desc" },
    include: {
      blocked: { select: { id: true, name: true, nickname: true, avatarUrl: true } },
    },
  });
  return blocks.map((block) => ({
    id: block.blocked.id,
    name: block.blocked.name || block.blocked.nickname || "Atleta",
    nickname: block.blocked.nickname,
    avatarUrl: block.blocked.avatarUrl,
    blockedAt: block.createdAt.toISOString(),
  }));
}

export async function createSocialReport(
  reporterId: string,
  input: {
    targetUserId?: string | null;
    activityId?: string | null;
    reason: SocialReportReason;
    detail?: unknown;
  },
) {
  const targetUserId = input.targetUserId || null;
  const activityId = input.activityId || null;
  if ((targetUserId && activityId) || (!targetUserId && !activityId)) {
    throw new Error("Elegí una cuenta o una actividad para reportar.");
  }
  const detail =
    input.detail === undefined || input.detail === null || input.detail === ""
      ? null
      : normalizeSocialText(input.detail, SOCIAL_LIMITS.reportDetailMaxLength);
  if (input.detail && !detail) {
    throw new Error("El detalle del reporte es demasiado largo.");
  }

  const prisma = getPrisma();
  let resolvedTargetUserId = targetUserId;
  if (activityId) {
    const activity = await getVisibleSocialActivity(reporterId, activityId);
    if (!activity) throw new Error("Esta actividad no está disponible.");
    resolvedTargetUserId = activity.actorUserId;
  } else if (targetUserId) {
    const target = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true },
    });
    if (!target || target.id === reporterId) {
      throw new Error("La cuenta no está disponible para reportar.");
    }
  }
  if (resolvedTargetUserId === reporterId) {
    throw new Error("No podés reportar tu propio contenido.");
  }

  const since = new Date(Date.now() - 24 * 60 * 60_000);
  const existing = await prisma.socialReport.findFirst({
    where: {
      reporterId,
      targetUserId: resolvedTargetUserId,
      activityId,
      reason: input.reason,
      createdAt: { gte: since },
    },
    select: { id: true },
  });
  if (existing) return { id: existing.id, created: false };

  const report = await prisma.socialReport.create({
    data: {
      reporterId,
      targetUserId: resolvedTargetUserId,
      activityId,
      reason: input.reason,
      detail,
    },
    select: { id: true },
  });
  return { id: report.id, created: true };
}
