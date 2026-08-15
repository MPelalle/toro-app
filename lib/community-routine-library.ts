import "server-only";

import { getPrisma } from "@/lib/prisma";

const exerciseSelect = { id: true, catalogExerciseId: true, sets: true, position: true, name: true, muscle: true, reps: true, weight: true, technique: true, trainingDay: true } as const;
const creatorSelect = { id: true, name: true, nickname: true, avatarUrl: true } as const;
const DISCOVERY_PAGE_SIZE = 24;

function creatorName(creator: { name: string | null; nickname: string | null }) {
  return creator.name || creator.nickname || "Atleta";
}

function days(value: unknown) {
  return Array.isArray(value) ? value.map(String) : [];
}

function summary(plan: { id: string; name: string; type: string; days: unknown; createdAt: Date; publishedAt: Date | null; exercises: Array<{ sets: number }> }) {
  return {
    id: plan.id,
    name: plan.name,
    type: plan.type,
    days: days(plan.days),
    createdAt: plan.createdAt.toISOString(),
    publishedAt: plan.publishedAt?.toISOString() || null,
    exerciseCount: plan.exercises.length,
    setCount: plan.exercises.reduce((total, exercise) => total + exercise.sets, 0),
  };
}

export async function listCommunityRoutineLibrary(viewerId: string, cursor?: string | null) {
  const prisma = getPrisma();
  const validCursor = cursor && /^[0-9a-f-]{36}$/i.test(cursor) ? cursor : undefined;
  const [published, imports] = await Promise.all([
    prisma.routinePlan.findMany({
      where: { kind: "PERSONAL", isPublished: true },
      include: { user: { select: creatorSelect }, exercises: { select: { id: true, sets: true } } },
      orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
      ...(validCursor ? { cursor: { id: validCursor }, skip: 1 } : {}),
      take: DISCOVERY_PAGE_SIZE + 1,
    }),
    prisma.routinePlan.findMany({
      where: { userId: viewerId, kind: "PERSONAL", importedFromRoutineId: { not: null } },
      include: { exercises: { select: { id: true, sets: true } } },
      orderBy: { createdAt: "desc" },
      take: 80,
    }),
  ]);

  const hasMore = published.length > DISCOVERY_PAGE_SIZE;
  const discoveryPage = hasMore ? published.slice(0, DISCOVERY_PAGE_SIZE) : published;
  const sourceIds = discoveryPage.map((item) => item.id);
  const [importCounts, existingImports] = sourceIds.length ? await Promise.all([
    prisma.routinePlan.groupBy({ by: ["importedFromRoutineId"], where: { importedFromRoutineId: { in: sourceIds } }, _count: { _all: true } }),
    prisma.routinePlan.findMany({ where: { userId: viewerId, importedFromRoutineId: { in: sourceIds } }, select: { id: true, importedFromRoutineId: true } }),
  ]) : [[], []];
  const countBySource = new Map(importCounts.flatMap((item) => item.importedFromRoutineId ? [[item.importedFromRoutineId, item._count._all] as const] : []));
  const importedBySource = new Map(existingImports.flatMap((item) => item.importedFromRoutineId ? [[item.importedFromRoutineId, item.id] as const] : []));

  return {
    discoveries: discoveryPage.map((plan) => ({
      ...summary(plan),
      creator: { ...plan.user, name: creatorName(plan.user) },
      importCount: countBySource.get(plan.id) || 0,
      isOwn: plan.userId === viewerId,
      importedRoutineId: importedBySource.get(plan.id) || null,
    })),
    nextCursor: hasMore ? discoveryPage.at(-1)?.id || null : null,
    imports: imports.map((plan) => ({
      ...summary(plan),
      sourceRoutineId: plan.importedFromRoutineId,
      creator: { id: plan.importedFromUserId, name: plan.importedFromCreatorName || "Creador original", nickname: null, avatarUrl: null },
    })),
  };
}

export async function getCommunityLibraryRoutine(viewerId: string, routineId: string) {
  const prisma = getPrisma();
  const plan = await prisma.routinePlan.findFirst({
    where: { id: routineId, kind: "PERSONAL", OR: [{ isPublished: true }, { userId: viewerId }] },
    include: { user: { select: creatorSelect }, exercises: { select: exerciseSelect, orderBy: { position: "asc" } } },
  });
  if (!plan) return null;
  const savedCopy = plan.userId === viewerId ? null : await prisma.routinePlan.findFirst({ where: { userId: viewerId, importedFromRoutineId: plan.id }, select: { id: true } });
  const displayCreator = plan.importedFromRoutineId
    ? { id: plan.importedFromUserId, name: plan.importedFromCreatorName || "Creador original", nickname: null, avatarUrl: null }
    : { ...plan.user, name: creatorName(plan.user) };
  return {
    ...summary(plan),
    creator: displayCreator,
    isOwn: plan.userId === viewerId,
    importedRoutineId: savedCopy?.id || null,
    importedFromCreatorName: plan.importedFromCreatorName,
    exercises: plan.exercises.map((exercise) => ({ ...exercise, position: exercise.position + 1 })),
  };
}

export async function importPublicRoutineToPersonal(viewerId: string, sourceRoutineId: string) {
  const prisma = getPrisma();
  try {
    return await prisma.$transaction(async (tx) => {
      const source = await tx.routinePlan.findFirst({
        where: { id: sourceRoutineId, kind: "PERSONAL", isPublished: true },
        include: { user: { select: creatorSelect }, exercises: { orderBy: { position: "asc" } } },
      });
      if (!source) throw new Error("La rutina pública ya no está disponible.");
      if (source.userId === viewerId) throw new Error("Esta rutina ya es tuya.");
      if (!source.exercises.length) throw new Error("Esta rutina no tiene ejercicios para importar.");

      const existing = await tx.routinePlan.findFirst({ where: { userId: viewerId, importedFromRoutineId: source.id }, select: { id: true, name: true } });
      if (existing) return { routine: existing, created: false };

      const personalCount = await tx.routinePlan.count({ where: { userId: viewerId, kind: "PERSONAL" } });
      if (personalCount >= 5) throw new Error("Ya alcanzaste el límite de 5 rutinas personales.");
      const suffix = " · copia";
      const name = `${source.name.trim().slice(0, 80 - suffix.length) || "Rutina publicada"}${suffix}`;
      const routine = await tx.routinePlan.create({
        data: {
          userId: viewerId,
          updatedById: viewerId,
          name,
          type: source.type,
          kind: "PERSONAL",
          days: source.days === null ? [] : source.days,
          active: false,
          isPublished: false,
          importedFromRoutineId: source.id,
          importedFromUserId: source.userId,
          importedFromCreatorName: creatorName(source.user),
          exercises: { create: source.exercises.map((exercise) => ({ position: exercise.position, catalogExerciseId: exercise.catalogExerciseId, name: exercise.name, muscle: exercise.muscle, sets: exercise.sets, reps: exercise.reps, weight: exercise.weight, technique: exercise.technique, trainingDay: exercise.trainingDay, completed: null, actualReps: null, note: null })) },
        },
        select: { id: true, name: true },
      });
      await tx.socialNotification.upsert({
        where: { userId_actorId_type_targetId: { userId: source.userId, actorId: viewerId, type: "ROUTINE_SAVED", targetId: source.id } },
        update: { readAt: null, createdAt: new Date(), targetType: "ROUTINE" },
        create: { userId: source.userId, actorId: viewerId, type: "ROUTINE_SAVED", targetType: "ROUTINE", targetId: source.id },
      });
      return { routine, created: true };
    }, { isolationLevel: "Serializable" });
  } catch (error) {
    // The unique index is the final guard for two tabs importing simultaneously.
    const existing = await prisma.routinePlan.findFirst({ where: { userId: viewerId, importedFromRoutineId: sourceRoutineId }, select: { id: true, name: true } });
    if (existing) return { routine: existing, created: false };
    throw error;
  }
}
