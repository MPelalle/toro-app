import "server-only";

import { getPrisma } from "@/lib/prisma";
import { ACTIVE_WORKOUT_WINDOW_MS, presenceStatus } from "@/lib/presence";

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
        exercises: { create: source.exercises.map((exercise) => ({ position: exercise.position, name: exercise.name, muscle: exercise.muscle, sets: exercise.sets, reps: exercise.reps, weight: exercise.weight, technique: exercise.technique, trainingDay: exercise.trainingDay, completed: exercise.completed, actualReps: exercise.actualReps, note: exercise.note })) },
        members: { create: [{ userId, role: "OWNER" }, ...memberIds.map((memberId) => ({ userId: memberId, role: "MEMBER" as const }))] },
      },
      include: { members: { include: { user: { select: { nickname: true, name: true } } } } },
    });
  });
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
    const routine = await tx.routinePlan.findFirst({ where: { id: routineId, kind: "SHARED", members: { some: { userId } } }, select: { id: true } });
    if (!routine) throw new Error("Rutina compartida no encontrada.");
    await tx.routineMember.delete({ where: { routineId_userId: { routineId, userId } } });
    const left = await tx.routineMember.count({ where: { routineId } });
    if (!left) await tx.routinePlan.delete({ where: { id: routineId } });
  });
}

function weekStart() {
  const date = new Date(); date.setHours(0, 0, 0, 0); date.setDate(date.getDate() - ((date.getDay() + 6) % 7)); return date;
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
  const since = weekStart();
  const metrics = new Map(memberIds.map((id) => [id, { sessions: 0, volume: 0, sets: 0, prs: 0 }]));
  const progress = new Map<string, Map<string, { current: number; previous: number }>>();
  const personalBest = new Map<string, Map<string, number>>();
  const activity: Array<{ id: string; userId: string; name: string; nickname: string | null; avatarUrl: string | null; date: string; text: string }> = [];
  for (const session of sessions) {
    const at = session.finishedAt || session.updatedAt;
    const currentWeek = at >= since;
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
      if (currentWeek) values.current = Math.max(values.current, best); else values.previous = Math.max(values.previous, best);
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
