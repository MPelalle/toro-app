import "server-only";

import { appCalendarDate, appDateKey, storedDateKey } from "@/lib/app-date";
import { getPrisma } from "@/lib/prisma";
import { ACTIVE_WORKOUT_WINDOW_MS, presenceStatus } from "@/lib/presence";
import { getUserBadgeProfile } from "@/lib/user-badges";
import { buildWorkoutProgress } from "@/lib/workout-progress";
import { isSocialPostType } from "@/lib/social";
import { importPublicRoutineToPersonal } from "@/lib/community-routine-library";

export const FRIEND_LIMIT = 5;
export const NICKNAME_PATTERN = /^[A-Za-z0-9._]{3,20}$/;

export function normalizeNickname(value: string) {
  return value.trim().replace(/^@/, "").toLocaleLowerCase();
}

export function validateNickname(value: string) {
  const nickname = normalizeNickname(value);
  return NICKNAME_PATTERN.test(nickname) ? nickname : null;
}

function pair(userId: string, otherUserId: string) {
  return userId < otherUserId ? { userAId: userId, userBId: otherUserId } : { userAId: otherUserId, userBId: userId };
}

function friendshipWhere(userId: string) {
  return { status: "ACCEPTED" as const, OR: [{ userAId: userId }, { userBId: userId }] };
}

async function areAcceptedFriends(userId: string, otherUserId: string) {
  const friendship = await getPrisma().friendship.findUnique({ where: { userAId_userBId: pair(userId, otherUserId) }, select: { status: true } });
  return friendship?.status === "ACCEPTED";
}

export async function acceptedFriendCount(userId: string) {
  return getPrisma().friendship.count({ where: friendshipWhere(userId) });
}

export async function listFriends(userId: string) {
  const prisma = getPrisma();
  const friendships = await getPrisma().friendship.findMany({
    where: friendshipWhere(userId),
    include: { requester: { select: { id: true, name: true, nickname: true, avatarUrl: true, lastActiveAt: true } }, addressee: { select: { id: true, name: true, nickname: true, avatarUrl: true, lastActiveAt: true } } },
    orderBy: { updatedAt: "desc" },
  });
  const friends = friendships.map((friendship) => {
    const friend = friendship.requesterId === userId ? friendship.addressee : friendship.requester;
    return { friendshipId: friendship.id, ...friend, name: friend.name || friend.nickname || "Atleta" };
  });
  if (!friends.length) return [];
  const activeSince = new Date(Date.now() - ACTIVE_WORKOUT_WINDOW_MS);
  const activeSessions = await prisma.workoutSession.findMany({ where: { userId: { in: friends.map((friend) => friend.id) }, status: "IN_PROGRESS", startedAt: { gte: activeSince } }, select: { userId: true, startedAt: true } });
  const sessionByUser = new Map(activeSessions.map((session) => [session.userId, session.startedAt]));
  return friends.map(({ lastActiveAt, ...friend }) => ({ ...friend, presence: presenceStatus(lastActiveAt, sessionByUser.get(friend.id) || null) }));
}

export async function listPendingRequests(userId: string) {
  const requests = await getPrisma().friendship.findMany({
    where: { addresseeId: userId, status: "PENDING" },
    include: { requester: { select: { id: true, name: true, nickname: true, avatarUrl: true } } },
    orderBy: { createdAt: "desc" },
  });
  return requests.map((request) => ({ id: request.id, createdAt: request.createdAt, user: { ...request.requester, name: request.requester.name || request.requester.nickname || "Atleta" } }));
}

export async function searchUserByNickname(userId: string, query: string) {
  const nickname = validateNickname(query);
  if (!nickname) return null;
  const user = await getPrisma().user.findFirst({
    where: { nickname: { equals: nickname, mode: "insensitive" } },
    select: { id: true, name: true, nickname: true, avatarUrl: true },
  });
  if (!user || user.id === userId) return null;
  const friendship = await getPrisma().friendship.findUnique({ where: { userAId_userBId: pair(userId, user.id) }, select: { id: true, status: true, requesterId: true } });
  return { id: user.id, name: user.name || user.nickname || "Atleta", nickname: user.nickname, avatarUrl: user.avatarUrl, relationship: friendship ? { id: friendship.id, status: friendship.status, sentByMe: friendship.requesterId === userId } : null };
}

export async function sendFriendRequest(userId: string, nicknameInput: string) {
  const nickname = validateNickname(nicknameInput);
  if (!nickname) throw new Error("El nickname debe tener entre 3 y 20 caracteres y solo puede usar letras, números, . o _.");
  const prisma = getPrisma();
  const recipient = await prisma.user.findFirst({ where: { nickname: { equals: nickname, mode: "insensitive" } }, select: { id: true } });
  if (!recipient) throw new Error("No encontramos ese nickname.");
  if (recipient.id === userId) throw new Error("No podés agregarte a vos mismo.");
  const canonicalPair = pair(userId, recipient.id);
  const [ownCount, recipientCount] = await Promise.all([acceptedFriendCount(userId), acceptedFriendCount(recipient.id)]);
  if (ownCount >= FRIEND_LIMIT) throw new Error("Ya alcanzaste el límite de 5 amigos.");
  if (recipientCount >= FRIEND_LIMIT) throw new Error("Esta persona ya alcanzó el límite de 5 amigos.");
  const existing = await prisma.friendship.findUnique({ where: { userAId_userBId: canonicalPair } });
  if (existing?.status === "ACCEPTED") throw new Error("Ya son amigos.");
  if (existing?.status === "PENDING" && existing.requesterId !== userId) throw new Error("Esta persona ya te envió una solicitud. Aceptala desde Solicitudes.");
  if (existing?.status === "PENDING") throw new Error("La solicitud ya fue enviada.");
  if (existing) return prisma.friendship.update({ where: { id: existing.id }, data: { requesterId: userId, addresseeId: recipient.id, status: "PENDING" } });
  try {
    return await prisma.friendship.create({ data: { requesterId: userId, addresseeId: recipient.id, ...canonicalPair } });
  } catch (error) {
    const existing = await prisma.friendship.findUnique({ where: { userAId_userBId: canonicalPair } });
    if (existing?.status === "ACCEPTED") throw new Error("Ya son amigos.");
    if (existing?.status === "PENDING" && existing.requesterId !== userId) throw new Error("Esta persona ya te envió una solicitud. Aceptala desde Solicitudes.");
    if (existing?.status === "PENDING") throw new Error("La solicitud ya fue enviada.");
    throw error;
  }
}

export async function respondToFriendRequest(userId: string, friendshipId: string, action: "accept" | "reject" | "cancel") {
  const prisma = getPrisma();
  return prisma.$transaction(async (tx) => {
    const friendship = await tx.friendship.findUnique({ where: { id: friendshipId } });
    if (!friendship || friendship.status !== "PENDING") throw new Error("La solicitud ya no está disponible.");
    if (action === "cancel") {
      if (friendship.requesterId !== userId) throw new Error("No podés cancelar esta solicitud.");
      return tx.friendship.update({ where: { id: friendshipId }, data: { status: "CANCELLED" } });
    }
    if (friendship.addresseeId !== userId) throw new Error("No podés responder esta solicitud.");
    if (action === "reject") return tx.friendship.update({ where: { id: friendshipId }, data: { status: "REJECTED" } });
    const [requesterCount, addresseeCount] = await Promise.all([
      tx.friendship.count({ where: friendshipWhere(friendship.requesterId) }),
      tx.friendship.count({ where: friendshipWhere(friendship.addresseeId) }),
    ]);
    if (requesterCount >= FRIEND_LIMIT || addresseeCount >= FRIEND_LIMIT) throw new Error("Uno de los dos ya alcanzó el límite de 5 amigos.");
    return tx.friendship.update({ where: { id: friendshipId }, data: { status: "ACCEPTED" } });
  }, { isolationLevel: "Serializable" });
}

export async function removeFriend(userId: string, friendshipId: string) {
  const deleted = await getPrisma().friendship.deleteMany({ where: { id: friendshipId, status: "ACCEPTED", OR: [{ userAId: userId }, { userBId: userId }] } });
  if (!deleted.count) throw new Error("Amistad no encontrada.");
}

export async function getSharedRoutineForMember(userId: string, routineId: string) {
  return getPrisma().routinePlan.findFirst({
    where: { id: routineId, kind: "SHARED", members: { some: { userId } } },
    include: { exercises: { orderBy: { position: "asc" } }, members: { include: { user: { select: { id: true, name: true, nickname: true, avatarUrl: true } } }, orderBy: { createdAt: "asc" } }, updatedBy: { select: { id: true, nickname: true, name: true } } },
  });
}

export async function listSharedRoutines(userId: string) {
  return getPrisma().routinePlan.findMany({
    where: { kind: "SHARED", members: { some: { userId } } },
    include: { exercises: { select: { id: true } }, members: { include: { user: { select: { id: true, name: true, nickname: true, avatarUrl: true } } }, orderBy: { createdAt: "asc" } }, updatedBy: { select: { nickname: true, name: true } } },
    orderBy: { updatedAt: "desc" },
  });
}

async function ensureFriends(userId: string, friendIds: string[]) {
  const uniqueIds = [...new Set(friendIds)];
  if (!uniqueIds.length || uniqueIds.length > FRIEND_LIMIT || uniqueIds.some((id) => id === userId)) throw new Error("Elegí entre 1 y 5 alumnos válidos.");
  const friendships = await getPrisma().friendship.findMany({ where: { status: "ACCEPTED", OR: uniqueIds.map((friendId) => ({ OR: [{ userAId: userId, userBId: friendId }, { userAId: friendId, userBId: userId }] })) }, select: { userAId: true, userBId: true } });
  if (friendships.length !== uniqueIds.length) throw new Error("Solo podés asignar planes a tus amigos aceptados.");
  return uniqueIds;
}

export async function createSharedRoutine(userId: string, sourceRoutineId: string, friendIds: string[], name?: string) {
  const prisma = getPrisma();
  const memberIds = await ensureFriends(userId, friendIds);
  return prisma.$transaction(async (tx) => {
    const source = await tx.routinePlan.findFirst({ where: { id: sourceRoutineId, userId, kind: "PERSONAL" }, include: { exercises: { orderBy: { position: "asc" } } } });
    if (!source) throw new Error("Elegí una rutina personal válida para usar como base.");
    const routineName = String(name || source.name).trim();
    if (!routineName || routineName.length > 80) throw new Error("El nombre de la rutina no es válido.");
    return tx.routinePlan.create({
      data: {
        userId, updatedById: userId, name: routineName, type: source.type, kind: "SHARED", days: source.days === null ? [] : source.days,
        exercises: { create: source.exercises.map((exercise) => ({ position: exercise.position, catalogExerciseId: exercise.catalogExerciseId, name: exercise.name, muscle: exercise.muscle, sets: exercise.sets, reps: exercise.reps, weight: exercise.weight, technique: exercise.technique, trainingDay: exercise.trainingDay, completed: null, actualReps: null, note: null })) },
        members: { create: [{ userId, role: "OWNER" }, ...memberIds.map((memberId) => ({ userId: memberId, role: "MEMBER" as const }))] },
      },
      include: { members: { include: { user: { select: { nickname: true, name: true } } } } },
    });
  });
}

/**
 * Turns a program someone shared with the current user into an independent
 * personal routine. The copy deliberately starts without completion data, so
 * a member never inherits another athlete's check-ins or notes.
 */
export async function copySharedRoutineToPersonal(userId: string, sourceRoutineId: string) {
  const prisma = getPrisma();
  return prisma.$transaction(async (tx) => {
    const source = await tx.routinePlan.findFirst({
      where: { id: sourceRoutineId, kind: "SHARED", members: { some: { userId } } },
      include: { exercises: { orderBy: { position: "asc" } } },
    });
    if (!source) throw new Error("No tenés acceso a esta rutina compartida.");
    if (!source.exercises.length) throw new Error("Esta rutina no tiene ejercicios para copiar.");

    const personalCount = await tx.routinePlan.count({ where: { userId, kind: "PERSONAL" } });
    if (personalCount >= 5) throw new Error("Ya alcanzaste el límite de 5 rutinas personales.");

    const copySuffix = " · copia";
    const sourceName = source.name.trim().slice(0, 80 - copySuffix.length);
    const name = `${sourceName || "Rutina compartida"}${copySuffix}`;

    return tx.routinePlan.create({
      data: {
        userId,
        updatedById: userId,
        name,
        type: source.type,
        kind: "PERSONAL",
        days: source.days === null ? [] : source.days,
        // A copy should never take over the routine the athlete is already using.
        active: false,
        exercises: {
          create: source.exercises.map((exercise) => ({
            position: exercise.position,
            catalogExerciseId: exercise.catalogExerciseId,
            name: exercise.name,
            muscle: exercise.muscle,
            sets: exercise.sets,
            reps: exercise.reps,
            weight: exercise.weight,
            technique: exercise.technique,
            trainingDay: exercise.trainingDay,
            completed: null,
            actualReps: null,
            note: null,
          })),
        },
      },
      select: { id: true, name: true, active: true },
    });
  }, { isolationLevel: "Serializable" });
}

export async function copyPublicRoutineToPersonal(viewerId: string, nicknameInput: string, routineId: string) {
  const nickname = validateNickname(nicknameInput);
  if (!nickname) throw new Error("Perfil no encontrado.");
  const prisma = getPrisma();
  const source = await prisma.routinePlan.findFirst({ where: { id: routineId, kind: "PERSONAL", isPublished: true, user: { nickname: { equals: nickname, mode: "insensitive" } } }, select: { id: true, userId: true } });
  if (!source) throw new Error("No tenés acceso a esta rutina.");
  return importPublicRoutineToPersonal(viewerId, source.id);
}

export async function createCommunityStatus(userId: string, contentInput: string) {
  const content = contentInput.trim().replace(/\s+/g, " ");
  if (!content || content.length > 280) throw new Error("El mensaje debe tener entre 1 y 280 caracteres.");
  return getPrisma().communityStatus.create({ data: { userId, content }, select: { id: true, content: true, createdAt: true } });
}

export async function deleteCommunityStatus(userId: string, statusId: string) {
  const deleted = await getPrisma().communityStatus.deleteMany({ where: { id: statusId, userId } });
  return deleted.count > 0;
}

export async function createCommunityProfileMessage(authorId: string, nicknameInput: string, contentInput: string) {
  const nickname = validateNickname(nicknameInput);
  const content = contentInput.trim().replace(/\s+/g, " ");
  if (!nickname || !content || content.length > 280) throw new Error("El mensaje debe tener entre 1 y 280 caracteres.");
  const profileUser = await getPrisma().user.findFirst({ where: { nickname: { equals: nickname, mode: "insensitive" } }, select: { id: true, profileMessageAudience: true } });
  if (!profileUser) throw new Error("Perfil no encontrado.");
  if (profileUser.id === authorId) throw new Error("No podés dejarte un mensaje a vos mismo.");
  if (profileUser.profileMessageAudience === "FRIENDS" && !(await areAcceptedFriends(authorId, profileUser.id))) throw new Error("Esta persona sólo recibe mensajes de sus amigos.");
  return getPrisma().communityProfileMessage.create({
    data: { authorId, profileUserId: profileUser.id, content },
    select: { id: true, content: true, createdAt: true },
  });
}

export async function deleteCommunityProfileMessage(userId: string, messageId: string) {
  const deleted = await getPrisma().communityProfileMessage.deleteMany({ where: { id: messageId, OR: [{ authorId: userId }, { profileUserId: userId }] } });
  return deleted.count > 0;
}

type CommunityRoutine = { id: string; name: string; type: string; days: string[]; exerciseCount: number; setCount: number };
type CommunityBaseActivity =
  | { id: string; type: "workout"; sourceType: "WORKOUT"; sourceId: string; date: string; routineName: string; durationSeconds: number; volume: number; exerciseCount: number }
  | { id: string; type: "record"; sourceType: "RECORD"; sourceId: string; date: string; exercise: string; weight: number; reps: number }
  | { id: string; type: "routine"; sourceType: "ROUTINE"; sourceId: string; date: string; routine: CommunityRoutine }
  | { id: string; type: "status"; sourceType: "STATUS"; sourceId: string; date: string; content: string };

const activityExerciseSelect = { name: true, muscle: true, sets: { select: { completed: true, weight: true, reps: true } } } as const;
const activitySessionSelect = { id: true, userId: true, startedAt: true, finishedAt: true, updatedAt: true, durationSeconds: true, routine: { select: { name: true } }, exercises: { select: activityExerciseSelect } } as const;

function workoutActivity(session: { id: string; startedAt: Date; finishedAt: Date | null; updatedAt: Date; durationSeconds: number | null; routine: { name: string }; exercises: Array<{ name: string; muscle: string; sets: Array<{ completed: boolean; weight: number | null; reps: number | null }> }> }): CommunityBaseActivity {
  const completed = session.exercises.flatMap((exercise) => exercise.sets).filter((set) => set.completed && set.weight !== null && set.reps !== null);
  return {
    id: `workout:${session.id}`,
    type: "workout",
    sourceType: "WORKOUT",
    sourceId: session.id,
    date: (session.finishedAt || session.updatedAt).toISOString(),
    routineName: session.routine.name,
    durationSeconds: session.durationSeconds ?? Math.max(0, Math.floor(((session.finishedAt || session.updatedAt).getTime() - session.startedAt.getTime()) / 1_000)),
    volume: Math.round(completed.reduce((total, set) => total + (set.weight || 0) * (set.reps || 0), 0)),
    exerciseCount: session.exercises.length,
  };
}

async function getCommunityProfileActivity(userId: string) {
  const prisma = getPrisma();
  const [sessions, routines, statuses] = await Promise.all([
    prisma.workoutSession.findMany({
      where: { userId, status: "FINISHED", finishedAt: { not: null } },
      orderBy: { finishedAt: "asc" },
      select: activitySessionSelect,
    }),
    prisma.routinePlan.findMany({
      where: { userId, kind: "PERSONAL", isPublished: true },
      orderBy: { publishedAt: "desc" },
      take: 8,
      select: { id: true, name: true, type: true, days: true, publishedAt: true, exercises: { select: { id: true, sets: true } } },
    }),
    prisma.communityStatus.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 12, select: { id: true, content: true, createdAt: true } }),
  ]);

  const progress = buildWorkoutProgress(sessions.map((session) => ({ id: session.id, finishedAt: session.finishedAt, updatedAt: session.updatedAt, exercises: session.exercises })));
  const workouts = sessions.map(workoutActivity);
  const records = progress.records.map((record) => {
    const sourceId = `record:${record.date}:${record.exercise}`;
    return { id: sourceId, type: "record" as const, sourceType: "RECORD" as const, sourceId, date: `${record.date}T12:00:00.000Z`, exercise: record.exercise, weight: record.weight, reps: record.reps };
  });
  const publishedRoutines = routines.map((routine) => ({ id: `routine:${routine.id}`, type: "routine" as const, sourceType: "ROUTINE" as const, sourceId: routine.id, date: (routine.publishedAt || new Date(0)).toISOString(), routine: { id: routine.id, name: routine.name, type: routine.type, days: Array.isArray(routine.days) ? routine.days.map(String) : [], exerciseCount: routine.exercises.length, setCount: routine.exercises.reduce((total, exercise) => total + exercise.sets, 0) } }));
  const messages = statuses.map((status) => ({ id: `status:${status.id}`, type: "status" as const, sourceType: "STATUS" as const, sourceId: status.id, date: status.createdAt.toISOString(), content: status.content }));
  const activity = [...workouts, ...records, ...publishedRoutines, ...messages].sort((left, right) => right.date.localeCompare(left.date)).slice(0, 24);
  return { progress, routines: publishedRoutines.map((item) => item.routine), activity: activity as CommunityBaseActivity[] };
}

async function resolveRepostOriginals(reposts: Array<{ originalAuthorId: string; originalType: string; originalId: string }>) {
  const prisma = getPrisma();
  const valid = reposts.filter((repost) => isSocialPostType(repost.originalType));
  const authorIds = [...new Set(valid.map((repost) => repost.originalAuthorId))];
  if (!authorIds.length) return new Map<string, CommunityBaseActivity>();
  const byType = (type: "WORKOUT" | "ROUTINE" | "STATUS") => valid.filter((repost) => repost.originalType === type);
  const [sessions, routines, statuses] = await Promise.all([
    prisma.workoutSession.findMany({ where: { id: { in: byType("WORKOUT").map((repost) => repost.originalId) }, userId: { in: authorIds } }, select: activitySessionSelect }),
    prisma.routinePlan.findMany({ where: { id: { in: byType("ROUTINE").map((repost) => repost.originalId) }, userId: { in: authorIds }, kind: "PERSONAL", isPublished: true }, select: { id: true, name: true, type: true, days: true, publishedAt: true, exercises: { select: { id: true, sets: true } } } }),
    prisma.communityStatus.findMany({ where: { id: { in: byType("STATUS").map((repost) => repost.originalId) }, userId: { in: authorIds } }, select: { id: true, content: true, createdAt: true } }),
  ]);
  const resolved = new Map<string, CommunityBaseActivity>();
  for (const session of sessions) resolved.set(`WORKOUT:${session.id}`, workoutActivity(session));
  for (const routine of routines) resolved.set(`ROUTINE:${routine.id}`, { id: `routine:${routine.id}`, type: "routine", sourceType: "ROUTINE", sourceId: routine.id, date: (routine.publishedAt || new Date(0)).toISOString(), routine: { id: routine.id, name: routine.name, type: routine.type, days: Array.isArray(routine.days) ? routine.days.map(String) : [], exerciseCount: routine.exercises.length, setCount: routine.exercises.reduce((total, exercise) => total + exercise.sets, 0) } });
  for (const status of statuses) resolved.set(`STATUS:${status.id}`, { id: `status:${status.id}`, type: "status", sourceType: "STATUS", sourceId: status.id, date: status.createdAt.toISOString(), content: status.content });
  // Un récord depende de todas las sesiones previas. Se consulta una vez por autor, se comparte entre
  // sus reposts y conserva el cálculo histórico en vez de inferir una marca desde una sola sesión.
  const recordAuthors = [...new Set(valid.filter((repost) => repost.originalType === "RECORD").map((repost) => repost.originalAuthorId))];
  const recordActivities = await Promise.all(recordAuthors.map(async (authorId) => [authorId, await getCommunityProfileActivity(authorId)] as const));
  for (const [authorId, activity] of recordActivities) {
    for (const item of activity.activity) if (item.sourceType === "RECORD") resolved.set(`${authorId}:RECORD:${item.sourceId}`, item);
  }
  return resolved;
}

export async function createCommunityRepost(userId: string, nicknameInput: string, originalType: unknown, originalId: unknown) {
  const nickname = validateNickname(nicknameInput);
  if (!nickname || !isSocialPostType(originalType) || typeof originalId !== "string" || !originalId) throw new Error("Publicación inválida.");
  const prisma = getPrisma();
  const originalAuthor = await prisma.user.findFirst({ where: { nickname: { equals: nickname, mode: "insensitive" } }, select: { id: true } });
  if (!originalAuthor || originalAuthor.id === userId) throw new Error("No podés repostear esta publicación.");
  const source = (await getCommunityProfileActivity(originalAuthor.id)).activity.find((item) => item.sourceType === originalType && item.sourceId === originalId);
  if (!source) throw new Error("La publicación original ya no está disponible.");

  return prisma.$transaction(async (tx) => {
    const existing = await tx.socialRepost.findUnique({ where: { userId_originalType_originalId: { userId, originalType, originalId } }, select: { id: true } });
    if (existing) return { id: existing.id, created: false };
    const repost = await tx.socialRepost.create({ data: { userId, originalAuthorId: originalAuthor.id, originalType, originalId }, select: { id: true } });
    await tx.socialNotification.upsert({
      where: { userId_actorId_type_targetId: { userId: originalAuthor.id, actorId: userId, type: "REPOST", targetId: `${originalType}:${originalId}` } },
      update: { readAt: null, createdAt: new Date(), targetType: originalType },
      create: { userId: originalAuthor.id, actorId: userId, type: "REPOST", targetType: originalType, targetId: `${originalType}:${originalId}` },
    });
    return { id: repost.id, created: true };
  }, { isolationLevel: "Serializable" });
}

export async function deleteCommunityRepost(userId: string, repostId: string) {
  const deleted = await getPrisma().socialRepost.deleteMany({ where: { id: repostId, userId } });
  return deleted.count > 0;
}

export async function listSocialNotifications(userId: string) {
  const notifications = await getPrisma().socialNotification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { actor: { select: { name: true, nickname: true, avatarUrl: true } } },
  });
  return notifications.map((notification) => ({ id: notification.id, type: notification.type, targetType: notification.targetType, createdAt: notification.createdAt.toISOString(), readAt: notification.readAt?.toISOString() ?? null, actor: { name: notification.actor.name || notification.actor.nickname || "Atleta", nickname: notification.actor.nickname, avatarUrl: notification.actor.avatarUrl } }));
}

/** Compact private snapshot used by the signed-in athlete's dashboard. */
export async function getMyCommunitySummary(userId: string) {
  const prisma = getPrisma();
  const [user, lastMessage, unreadNotifications, friends, publishedRoutines, lastWorkout, lastPost] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { name: true, nickname: true, avatarUrl: true } }),
    prisma.communityProfileMessage.findFirst({ where: { profileUserId: userId }, orderBy: { createdAt: "desc" }, include: { author: { select: { name: true, nickname: true } } } }),
    prisma.socialNotification.count({ where: { userId, readAt: null } }),
    acceptedFriendCount(userId),
    prisma.routinePlan.count({ where: { userId, kind: "PERSONAL", isPublished: true } }),
    prisma.workoutSession.findFirst({ where: { userId, status: "FINISHED", finishedAt: { not: null } }, orderBy: { finishedAt: "desc" }, select: { finishedAt: true, updatedAt: true, durationSeconds: true, routine: { select: { name: true } } } }),
    prisma.communityStatus.findFirst({ where: { userId }, orderBy: { createdAt: "desc" }, select: { content: true, createdAt: true } }),
  ]);
  return {
    profile: { name: user?.name || user?.nickname || "Atleta", nickname: user?.nickname || null, avatarUrl: user?.avatarUrl || null },
    friendCount: friends,
    publishedRoutineCount: publishedRoutines,
    unreadNotifications,
    lastWorkout: lastWorkout ? { routineName: lastWorkout.routine.name, date: (lastWorkout.finishedAt || lastWorkout.updatedAt).toISOString(), durationSeconds: lastWorkout.durationSeconds || 0, volume: 0 } : null,
    lastPost: lastPost ? { content: lastPost.content, date: lastPost.createdAt.toISOString() } : null,
    lastMessage: lastMessage ? { content: lastMessage.content, date: lastMessage.createdAt.toISOString(), author: { name: lastMessage.author.name || lastMessage.author.nickname || "Atleta", nickname: lastMessage.author.nickname } } : null,
  };
}

export async function markSocialNotificationsRead(userId: string) {
  await getPrisma().socialNotification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });
}

export async function getCommunityProfile(viewerId: string, nicknameInput: string) {
  const nickname = validateNickname(nicknameInput);
  if (!nickname) return null;
  const prisma = getPrisma();
  const user = await prisma.user.findFirst({
    where: { nickname: { equals: nickname, mode: "insensitive" } },
    select: { id: true, name: true, nickname: true, avatarUrl: true, bio: true, profileMessageAudience: true, createdAt: true },
  });
  // A valid Community profile is discoverable for any authenticated user. Publishing
  // a message is controlled separately by the owner's audience preference.
  if (!user || !user.nickname) return null;

  const [base, badgeProfile, reposts, profileMessages, canPostMessage] = await Promise.all([
    getCommunityProfileActivity(user.id),
    getUserBadgeProfile(user.id, user.name || user.nickname || "Atleta", { trackActivity: false }),
    prisma.socialRepost.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 24,
      include: { originalAuthor: { select: { id: true, name: true, nickname: true, avatarUrl: true } } },
    }),
    prisma.communityProfileMessage.findMany({ where: { profileUserId: user.id }, orderBy: { createdAt: "desc" }, take: 30, include: { author: { select: { id: true, name: true, nickname: true } } } }),
    user.id === viewerId ? Promise.resolve(false) : user.profileMessageAudience === "ANYONE" ? Promise.resolve(true) : areAcceptedFriends(viewerId, user.id),
  ]);
  const originals = await resolveRepostOriginals(reposts);
  const repostActivity = reposts.flatMap((repost) => {
    const original = isSocialPostType(repost.originalType) ? (repost.originalType === "RECORD" ? originals.get(`${repost.originalAuthorId}:RECORD:${repost.originalId}`) : originals.get(`${repost.originalType}:${repost.originalId}`)) : null;
    return original ? [{ id: `repost:${repost.id}`, type: "repost" as const, date: repost.createdAt.toISOString(), originalAuthor: { name: repost.originalAuthor.name || repost.originalAuthor.nickname || "Atleta", nickname: repost.originalAuthor.nickname, avatarUrl: repost.originalAuthor.avatarUrl }, original }] : [];
  });
  const activity = [...base.activity, ...repostActivity].sort((left, right) => right.date.localeCompare(left.date)).slice(0, 24);

  return {
    isOwnProfile: user.id === viewerId,
    user: { name: user.name || user.nickname, nickname: user.nickname, avatarUrl: user.avatarUrl, bio: user.bio, joinedAt: user.createdAt.toISOString() },
    stats: { workouts: base.progress.summary.sessions, volume: base.progress.summary.volume, records: base.progress.summary.records },
    badges: badgeProfile.badges,
    records: base.progress.records.slice(0, 6),
    routines: base.routines,
    activity,
    canPostMessage,
    messages: profileMessages.map((message) => ({ id: message.id, content: message.content, createdAt: message.createdAt.toISOString(), canDelete: message.authorId === viewerId || message.profileUserId === viewerId, author: { id: message.author.id, name: message.author.name || message.author.nickname || "Atleta", nickname: message.author.nickname } })),
  };
}

export async function createSharedDiet(userId: string, sourceDietId: string, friendIds: string[], name?: string) {
  const prisma = getPrisma();
  const memberIds = await ensureFriends(userId, friendIds);
  return prisma.$transaction(async (tx) => {
    const source = await tx.dietPlan.findFirst({ where: { id: sourceDietId, userId, kind: "PERSONAL" }, include: { meals: { orderBy: { position: "asc" } } } });
    if (!source) throw new Error("Elegí una dieta personal válida para usar como base.");
    const dietName = String(name || source.name).trim();
    if (!dietName || dietName.length > 120) throw new Error("El nombre de la dieta no es válido.");
    return tx.dietPlan.create({
      data: {
        userId, updatedById: userId, kind: "SHARED", name: dietName, sex: source.sex, age: source.age, weight: source.weight, height: source.height, activity: source.activity, activityLabel: source.activityLabel, goal: source.goal, mealsPerDay: source.mealsPerDay, calories: source.calories, tdee: source.tdee, protein: source.protein, carbs: source.carbs, fats: source.fats, active: true,
        meals: { create: source.meals.map((meal) => ({ position: meal.position, name: meal.name, time: meal.time, kcal: meal.kcal, protein: meal.protein, carbs: meal.carbs, fats: meal.fats, foods: JSON.parse(JSON.stringify(meal.foods)) })) },
        members: { create: [{ userId, role: "OWNER" }, ...memberIds.map((memberId) => ({ userId: memberId, role: "MEMBER" as const }))] },
      },
      include: { members: { include: { user: { select: { nickname: true, name: true } } } } },
    });
  });
}

export async function listSharedDiets(userId: string) {
  return getPrisma().dietPlan.findMany({ where: { kind: "SHARED", members: { some: { userId } } }, include: { meals: { select: { id: true } }, members: { include: { user: { select: { id: true, name: true, nickname: true, avatarUrl: true } } }, orderBy: { createdAt: "asc" } }, updatedBy: { select: { nickname: true, name: true } } }, orderBy: { updatedAt: "desc" } });
}

export async function leaveSharedRoutine(userId: string, routineId: string) {
  const prisma = getPrisma();
  return prisma.$transaction(async (tx) => {
    const routine = await tx.routinePlan.findFirst({ where: { id: routineId, kind: "SHARED", members: { some: { userId } } }, select: { id: true, userId: true } });
    if (!routine) throw new Error("Rutina compartida no encontrada.");
    if (routine.userId === userId) throw new Error("Quien creó la rutina no puede abandonarla. Eliminá o reasigná el programa desde su administración.");
    await tx.routineMember.delete({ where: { routineId_userId: { routineId, userId } } });
    const left = await tx.routineMember.count({ where: { routineId } });
    if (!left) await tx.routinePlan.delete({ where: { id: routineId } });
  });
}

function weekStartKey(value = new Date()) {
  const date = appCalendarDate(value);
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  return storedDateKey(date);
}

export async function getSharedRoutineDashboard(userId: string, routineId: string) {
  const routine = await getSharedRoutineForMember(userId, routineId);
  if (!routine) return null;
  if (routine.userId !== userId) return null;
  const memberIds = routine.members.map((member) => member.userId);
  const sessions = await getPrisma().workoutSession.findMany({
    where: { routineId, userId: { in: memberIds }, status: "FINISHED" },
    orderBy: { finishedAt: "asc" },
    select: { id: true, userId: true, status: true, finishedAt: true, updatedAt: true, exercises: { select: { name: true, sets: { select: { completed: true, weight: true, reps: true } } } } },
  });
  const currentWeekStart = weekStartKey();
  const previousWeekStart = weekStartKey(appCalendarDate(new Date(Date.now() - 7 * 86_400_000)));
  const metrics = new Map(memberIds.map((id) => [id, { sessions: 0, volume: 0, sets: 0, prs: 0 }]));
  const progress = new Map<string, Map<string, { current: number; previous: number }>>();
  const personalBest = new Map<string, Map<string, number>>();
  const activity: Array<{ id: string; userId: string; name: string; nickname: string | null; avatarUrl: string | null; date: string; text: string }> = [];
  for (const session of sessions) {
    const at = session.finishedAt || session.updatedAt;
    const sessionDay = appDateKey(at);
    const currentWeek = sessionDay >= currentWeekStart;
    const previousWeek = sessionDay >= previousWeekStart && sessionDay < currentWeekStart;
    const metric = metrics.get(session.userId)!;
    if (currentWeek) metric.sessions += 1;
    let sessionVolume = 0; let completedSets = 0; let sessionPrs = 0;
    for (const exercise of session.exercises) {
      const completed = exercise.sets.filter((set) => set.completed && set.weight !== null && set.reps !== null);
      const volume = completed.reduce((sum, set) => sum + (set.weight || 0) * (set.reps || 0), 0);
      if (currentWeek) { sessionVolume += volume; completedSets += completed.length; }
      const key = exercise.name.trim().toLocaleLowerCase();
      const best = Math.max(0, ...completed.map((set) => (set.weight || 0) * (1 + (set.reps || 0) / 30)));
      const bests = personalBest.get(session.userId) || new Map<string, number>();
      const before = bests.get(key) || 0;
      if (best > before && before > 0) sessionPrs += 1;
      if (best > before) bests.set(key, best);
      personalBest.set(session.userId, bests);
      const map = progress.get(key) || new Map<string, { current: number; previous: number }>();
      const values = map.get(session.userId) || { current: 0, previous: 0 };
      if (currentWeek) values.current = Math.max(values.current, best);
      else if (previousWeek) values.previous = Math.max(values.previous, best);
      map.set(session.userId, values); progress.set(key, map);
    }
    if (currentWeek) { metric.volume += sessionVolume; metric.sets += completedSets; metric.prs += sessionPrs; }
    const member = routine.members.find((item) => item.userId === session.userId)?.user;
    if (member && session.status === "FINISHED") activity.push({ id: session.id, userId: session.userId, name: member.name || member.nickname || "Atleta", nickname: member.nickname, avatarUrl: member.avatarUrl, date: at.toISOString(), text: `@${member.nickname || member.name || "atleta"} completó ${routine.name}` });
  }
  return {
    routine: { id: routine.id, name: routine.name, type: routine.type, days: Array.isArray(routine.days) ? routine.days : [], updatedAt: routine.updatedAt.toISOString(), updatedBy: routine.updatedBy ? (routine.updatedBy.nickname || routine.updatedBy.name) : null },
    members: routine.members.map((member) => ({ id: member.userId, name: member.user.name || member.user.nickname || "Atleta", nickname: member.user.nickname, avatarUrl: member.user.avatarUrl, metrics: metrics.get(member.userId)! })),
    exercises: [...progress.entries()].slice(0, 8).map(([name, values]) => ({ name, members: memberIds.map((id) => { const value = values.get(id) || { current: 0, previous: 0 }; return { userId: id, current: Math.round(value.current), previous: Math.round(value.previous), progress: value.previous > 0 ? Math.round(((value.current - value.previous) / value.previous) * 1000) / 10 : null }; }) })),
    activity: activity.slice(-8).reverse(),
  };
}
