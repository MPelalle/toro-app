import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/prisma";

const exerciseSelect = { id: true, catalogExerciseId: true, sets: true, position: true, name: true, muscle: true, reps: true, weight: true, technique: true, trainingDay: true } as const;
const creatorSelect = { id: true, name: true, nickname: true, avatarUrl: true } as const;
export const ROUTINE_DISCOVERY_PAGE_SIZE = 24;
const MAX_DISCOVERY_QUERY_LENGTH = 60;
const MAX_DISCOVERY_TYPE_LENGTH = 60;

export const ROUTINE_DISCOVERY_SORTS = ["recent", "popular"] as const;
export type RoutineDiscoverySort = (typeof ROUTINE_DISCOVERY_SORTS)[number];

export type RoutineDiscoveryOptions = {
  cursor?: string | null;
  query?: string | null;
  type?: string | null;
  days?: number | null;
  sort?: RoutineDiscoverySort | null;
};

type DiscoveryCursor = {
  sort: RoutineDiscoverySort;
  id: string;
  sortTime: string;
  importCount: number;
};

type RankedRoutine = {
  id: string;
  importCount: number;
  sortTime: Date;
};

function creatorName(creator: { name: string | null; nickname: string | null }) {
  return creator.name || creator.nickname || "Atleta";
}

function days(value: unknown) {
  return Array.isArray(value) ? value.map(String) : [];
}

function trimFilter(value: string | null | undefined, maximum: number) {
  const trimmed = value?.trim().replace(/\s+/g, " ") || "";
  return trimmed.slice(0, maximum);
}

function normalizeOptions(options: RoutineDiscoveryOptions) {
  const query = trimFilter(options.query, MAX_DISCOVERY_QUERY_LENGTH);
  const type = trimFilter(options.type, MAX_DISCOVERY_TYPE_LENGTH);
  const parsedDays = Number(options.days);
  const days = Number.isInteger(parsedDays) && parsedDays >= 1 && parsedDays <= 7 ? parsedDays : null;
  const sort = options.sort === "popular" ? "popular" : "recent";
  return { query, type, days, sort } as const;
}

function decodeCursor(value: string | null | undefined): DiscoveryCursor | null {
  if (!value || value.length > 300) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Partial<DiscoveryCursor>;
    if (
      (parsed.sort !== "recent" && parsed.sort !== "popular") ||
      typeof parsed.id !== "string" ||
      !/^[0-9a-f-]{36}$/i.test(parsed.id) ||
      typeof parsed.sortTime !== "string" ||
      Number.isNaN(new Date(parsed.sortTime).getTime()) ||
      !Number.isInteger(parsed.importCount) ||
      (parsed.importCount ?? -1) < 0
    ) return null;
    return parsed as DiscoveryCursor;
  } catch {
    return null;
  }
}

function encodeCursor(row: RankedRoutine, sort: RoutineDiscoverySort) {
  return Buffer.from(JSON.stringify({
    sort,
    id: row.id,
    sortTime: row.sortTime.toISOString(),
    importCount: row.importCount,
  })).toString("base64url");
}

/**
 * Builds a single, parameterised WHERE clause for discovery.  The exercise
 * lookup happens inside EXISTS so a search does not multiply routine rows.
 */
function discoveryConditions({ query, type, days: dayCount }: ReturnType<typeof normalizeOptions>) {
  const conditions = [
    Prisma.sql`p."kind" = 'PERSONAL'::"RoutineKind"`,
    Prisma.sql`p."is_published" = true`,
  ];
  if (query) {
    const term = `%${query}%`;
    conditions.push(Prisma.sql`(
      p."name" ILIKE ${term}
      OR p."type" ILIKE ${term}
      OR EXISTS (
        SELECT 1 FROM "routine_exercises" e
        WHERE e."routine_id" = p."id"
          AND (e."name" ILIKE ${term} OR e."muscle" ILIKE ${term})
      )
    )`);
  }
  if (type) conditions.push(Prisma.sql`LOWER(p."type") = LOWER(${type})`);
  if (dayCount) {
    conditions.push(Prisma.sql`(
      CASE WHEN jsonb_typeof(p."days") = 'array' THEN jsonb_array_length(p."days") ELSE 0 END
    ) = ${dayCount}`);
  }
  return Prisma.join(conditions, " AND ");
}

async function listRankedRoutineIds(options: ReturnType<typeof normalizeOptions>, rawCursor: string | null | undefined) {
  const prisma = getPrisma();
  const cursor = decodeCursor(rawCursor);
  const usableCursor = cursor?.sort === options.sort ? cursor : null;
  const cursorTime = usableCursor ? new Date(usableCursor.sortTime) : null;
  const conditions = discoveryConditions(options);

  if (options.sort === "popular") {
    const pageCondition = usableCursor && cursorTime
      ? Prisma.sql`WHERE (
          ranked."importCount" < ${usableCursor.importCount}
          OR (
            ranked."importCount" = ${usableCursor.importCount}
            AND (
              ranked."sortTime" < ${cursorTime}
              OR (ranked."sortTime" = ${cursorTime} AND ranked.id < ${usableCursor.id}::uuid)
            )
          )
        )`
      : Prisma.empty;
    return prisma.$queryRaw<RankedRoutine[]>(Prisma.sql`
      WITH ranked AS (
        SELECT
          p."id" AS id,
          COUNT(copies."id")::int AS "importCount",
          COALESCE(p."published_at", p."created_at") AS "sortTime"
        FROM "routine_plans" p
        LEFT JOIN "routine_plans" copies ON copies."imported_from_routine_id" = p."id"
        WHERE ${conditions}
        GROUP BY p."id"
      )
      SELECT id, "importCount", "sortTime"
      FROM ranked
      ${pageCondition}
      ORDER BY "importCount" DESC, "sortTime" DESC, id DESC
      LIMIT ${ROUTINE_DISCOVERY_PAGE_SIZE + 1}
    `);
  }

  const pageCondition = usableCursor && cursorTime
    ? Prisma.sql`WHERE (
        ranked."sortTime" < ${cursorTime}
        OR (ranked."sortTime" = ${cursorTime} AND ranked.id < ${usableCursor.id}::uuid)
      )`
    : Prisma.empty;
  return prisma.$queryRaw<RankedRoutine[]>(Prisma.sql`
    WITH ranked AS (
      SELECT
        p."id" AS id,
        COUNT(copies."id")::int AS "importCount",
        COALESCE(p."published_at", p."created_at") AS "sortTime"
      FROM "routine_plans" p
      LEFT JOIN "routine_plans" copies ON copies."imported_from_routine_id" = p."id"
      WHERE ${conditions}
      GROUP BY p."id"
    )
    SELECT id, "importCount", "sortTime"
    FROM ranked
    ${pageCondition}
    ORDER BY "sortTime" DESC, id DESC
    LIMIT ${ROUTINE_DISCOVERY_PAGE_SIZE + 1}
  `);
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

export async function listCommunityRoutineLibrary(viewerId: string, options: RoutineDiscoveryOptions = {}) {
  const prisma = getPrisma();
  const filters = normalizeOptions(options);
  const [ranked, imports, typeRows] = await Promise.all([
    listRankedRoutineIds(filters, options.cursor),
    prisma.routinePlan.findMany({
      where: { userId: viewerId, kind: "PERSONAL", importedFromRoutineId: { not: null } },
      include: { exercises: { select: { id: true, sets: true } } },
      orderBy: { createdAt: "desc" },
      take: 80,
    }),
    prisma.routinePlan.findMany({
      where: { kind: "PERSONAL", isPublished: true },
      select: { type: true },
      distinct: ["type"],
      orderBy: { type: "asc" },
      take: 24,
    }),
  ]);

  const hasMore = ranked.length > ROUTINE_DISCOVERY_PAGE_SIZE;
  const discoveryRows = hasMore ? ranked.slice(0, ROUTINE_DISCOVERY_PAGE_SIZE) : ranked;
  const sourceIds = discoveryRows.map((item) => item.id);
  const [plans, existingImports] = sourceIds.length ? await Promise.all([
    prisma.routinePlan.findMany({
      where: { id: { in: sourceIds } },
      include: { user: { select: creatorSelect }, exercises: { select: { id: true, sets: true } } },
    }),
    prisma.routinePlan.findMany({ where: { userId: viewerId, importedFromRoutineId: { in: sourceIds } }, select: { id: true, importedFromRoutineId: true } }),
  ]) : [[], []];
  const plansById = new Map(plans.map((plan) => [plan.id, plan]));
  const countBySource = new Map(discoveryRows.map((item) => [item.id, Number(item.importCount)]));
  const importedBySource = new Map(existingImports.flatMap((item) => item.importedFromRoutineId ? [[item.importedFromRoutineId, item.id] as const] : []));

  return {
    discoveries: discoveryRows.flatMap((row) => {
      const plan = plansById.get(row.id);
      return plan ? [{
        ...summary(plan),
        creator: { ...plan.user, name: creatorName(plan.user) },
        importCount: countBySource.get(plan.id) || 0,
        isOwn: plan.userId === viewerId,
        importedRoutineId: importedBySource.get(plan.id) || null,
      }] : [];
    }),
    nextCursor: hasMore && discoveryRows.at(-1) ? encodeCursor(discoveryRows.at(-1)!, filters.sort) : null,
    filters: {
      query: filters.query,
      type: filters.type,
      days: filters.days,
      sort: filters.sort,
      types: typeRows.map((row) => row.type).filter(Boolean),
    },
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
          notes: source.notes,
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
