import type { Routine, RoutineExercise } from "@/lib/routines";
import { getAllFromIndex, inTransaction, requestResult } from "../database";
import { STORES } from "../schema";
import { getActiveOfflineUserId } from "./identity";
import { LEGACY_LOCAL_USER_ID, type OfflineWorkoutExercise, type OfflineWorkoutSession, type OfflineWorkoutSet, type PendingOperation, type SyncStatus, type WorkoutSessionRow } from "../types";

function createClientId() {
  return crypto.randomUUID();
}

const ACTIVE_WORKOUT_MAX_AGE_MS = 6 * 60 * 60 * 1_000;

function isCurrentWorkoutSession(session: WorkoutSessionRow) {
  const startedAt = Date.parse(session.startedAt);
  return session.status === "IN_PROGRESS" && Number.isFinite(startedAt) && startedAt <= Date.now() && Date.now() - startedAt < ACTIVE_WORKOUT_MAX_AGE_MS;
}

function nowMetadata(id: string, now: string, status: SyncStatus): Omit<OfflineWorkoutSession, "routineId" | "status" | "startedAt" | "finishedAt" | "durationSeconds" | "notes" | "emotionalRating" | "emotionalState" | "clientUpdatedAt" | "exercises"> {
  return { id, userId: LEGACY_LOCAL_USER_ID, createdAt: now, updatedAt: now, deletedAt: null, syncStatus: status, lastSyncedAt: null, version: 1 };
}

function makeSessionExercise(exercise: RoutineExercise, position: number, sessionId: string, now: string): OfflineWorkoutExercise & { sets: OfflineWorkoutSet[] } {
  const id = createClientId();
  const base = nowMetadata(id, now, "pending");
  return {
    ...base,
    sessionId,
    routineExerciseId: exercise.id,
    catalogExerciseId: exercise.catalogExerciseId ?? null,
    position,
    name: exercise.name,
    muscle: exercise.muscle,
    sets: Array.from({ length: exercise.sets }, (_, index) => ({
      ...nowMetadata(createClientId(), now, "pending"),
      sessionId,
      sessionExerciseId: id,
      setNumber: index + 1,
      targetReps: exercise.reps,
      targetWeight: exercise.weight,
      reps: null,
      weight: null,
      rir: null,
      rpe: null,
      kind: "NORMAL",
      completed: false,
      note: null,
    })),
  };
}

export function createLocalWorkoutSession(routine: Routine): OfflineWorkoutSession {
  const now = new Date().toISOString();
  const id = createClientId();
  return {
    ...nowMetadata(id, now, "pending"),
    routineId: routine.id,
    status: "IN_PROGRESS",
    startedAt: now,
    finishedAt: null,
    durationSeconds: null,
    notes: null,
    emotionalRating: null,
    emotionalState: null,
    clientUpdatedAt: now,
    exercises: routine.exercises.map((exercise, position) => makeSessionExercise(exercise, position, id, now)),
  };
}

async function putSyncOperation(transaction: IDBTransaction, session: WorkoutSessionRow, now: string, operationType: "create" | "update") {
  const store = transaction.objectStore(STORES.syncQueue);
  const existing = (await getAllFromIndex<PendingOperation>(transaction, STORES.syncQueue, "by-entity-id", session.id))
    .find((operation) => operation.userId === session.userId && operation.entityType === "workout-session" && operation.status !== "conflict" && operation.status !== "exhausted");
  if (existing) {
    store.put({ ...existing, payload: { sessionId: session.id, clientUpdatedAt: session.clientUpdatedAt }, updatedAt: now, status: "pending", error: null, nextRetryAt: now });
    return;
  }
  const operationId = createClientId();
  store.put({ id: operationId, operationId, entityType: "workout-session", entityId: session.id, operationType, payload: { sessionId: session.id, clientUpdatedAt: session.clientUpdatedAt }, userId: session.userId, createdAt: now, updatedAt: now, attempts: 0, lastAttemptAt: null, nextRetryAt: now, status: "pending", error: null } satisfies PendingOperation);
}

async function deleteSessionChildren(transaction: IDBTransaction, sessionId: string) {
  const exercisesStore = transaction.objectStore(STORES.workoutSessionExercises);
  const setsStore = transaction.objectStore(STORES.workoutSets);
  const [exercises, sets] = await Promise.all([
    getAllFromIndex<OfflineWorkoutExercise>(transaction, STORES.workoutSessionExercises, "by-session-id", sessionId),
    getAllFromIndex<OfflineWorkoutSet>(transaction, STORES.workoutSets, "by-session-id", sessionId),
  ]);
  exercises.forEach((exercise) => exercisesStore.delete(exercise.id));
  sets.forEach((set) => setsStore.delete(set.id));
}

export async function saveLocalWorkoutSession(session: OfflineWorkoutSession, source: "local" | "remote" = "local") {
  const now = new Date().toISOString();
  const userId = await getActiveOfflineUserId();
  return inTransaction([STORES.workoutSessions, STORES.workoutSessionExercises, STORES.workoutSets, STORES.syncQueue], "readwrite", async (transaction) => {
    const { exercises, ...sessionFields } = session;
    const sessions = transaction.objectStore(STORES.workoutSessions);
    const existing = await requestResult(sessions.get(session.id)) as WorkoutSessionRow | undefined;
    const row: WorkoutSessionRow = {
      ...sessionFields,
      userId: existing?.userId && existing.userId !== LEGACY_LOCAL_USER_ID ? existing.userId : userId,
      createdAt: existing?.createdAt ?? session.createdAt ?? now,
      updatedAt: source === "local" ? now : session.updatedAt,
      deletedAt: null,
      syncStatus: source === "local" ? "pending" : "synced",
      lastSyncedAt: source === "local" ? existing?.lastSyncedAt ?? null : session.lastSyncedAt ?? now,
      version: source === "local" ? (existing?.version ?? session.version ?? 0) + 1 : session.version,
      clientUpdatedAt: source === "local" ? now : session.clientUpdatedAt,
    };
    sessions.put(row);
    await deleteSessionChildren(transaction, row.id);

    const exerciseStore = transaction.objectStore(STORES.workoutSessionExercises);
    const setStore = transaction.objectStore(STORES.workoutSets);
    exercises.forEach((exercise) => {
      const localExercise: OfflineWorkoutExercise = {
        ...exercise,
        userId: row.userId,
        sessionId: row.id,
        createdAt: exercise.createdAt || row.createdAt,
        updatedAt: source === "local" ? now : exercise.updatedAt,
        deletedAt: null,
        syncStatus: source === "local" ? "pending" : "synced",
        lastSyncedAt: source === "local" ? null : exercise.lastSyncedAt ?? now,
        version: (exercise.version ?? 0) + 1,
      };
      exerciseStore.put(localExercise);
      exercise.sets.forEach((set) => {
        setStore.put({
          ...set,
          userId: row.userId,
          sessionId: row.id,
          sessionExerciseId: localExercise.id,
          createdAt: set.createdAt || row.createdAt,
          updatedAt: source === "local" ? now : set.updatedAt,
          deletedAt: null,
          syncStatus: source === "local" ? "pending" : "synced",
          lastSyncedAt: source === "local" ? null : set.lastSyncedAt ?? now,
          version: (set.version ?? 0) + 1,
        } satisfies OfflineWorkoutSet);
      });
    });
    if (source === "local") await putSyncOperation(transaction, row, now, existing ? "update" : "create");
    return { ...row, exercises };
  });
}

export async function cacheRemoteWorkoutSession(session: OfflineWorkoutSession) {
  const existing = await getLocalWorkoutSession(session.id);
  if (existing && (existing.syncStatus !== "synced" || existing.clientUpdatedAt >= session.clientUpdatedAt)) return false;
  await saveLocalWorkoutSession(session, "remote");
  return true;
}

async function hydrateSession(transaction: IDBTransaction, session: WorkoutSessionRow): Promise<OfflineWorkoutSession> {
  const exercises = await getAllFromIndex<OfflineWorkoutExercise>(transaction, STORES.workoutSessionExercises, "by-session-id", session.id);
  const hydratedExercises = await Promise.all(exercises.filter((exercise) => !exercise.deletedAt).sort((a, b) => a.position - b.position).map(async (exercise) => ({
    ...exercise,
    sets: (await getAllFromIndex<OfflineWorkoutSet>(transaction, STORES.workoutSets, "by-session-exercise-id", exercise.id))
      .filter((set) => !set.deletedAt)
      .sort((a, b) => a.setNumber - b.setNumber),
  })));
  return { ...session, exercises: hydratedExercises };
}

export async function getLocalWorkoutSession(id: string) {
  const userId = await getActiveOfflineUserId();
  return inTransaction([STORES.workoutSessions, STORES.workoutSessionExercises, STORES.workoutSets], "readonly", async (transaction) => {
    const session = await requestResult(transaction.objectStore(STORES.workoutSessions).get(id)) as WorkoutSessionRow | undefined;
    return session && session.userId === userId && !session.deletedAt ? hydrateSession(transaction, session) : undefined;
  });
}

export async function getActiveLocalWorkoutSession(routineId: string) {
  const userId = await getActiveOfflineUserId();
  return inTransaction([STORES.workoutSessions, STORES.workoutSessionExercises, STORES.workoutSets], "readonly", async (transaction) => {
    const sessions = await getAllFromIndex<WorkoutSessionRow>(transaction, STORES.workoutSessions, "by-routine-id", routineId);
    const active = sessions.filter((session) => session.userId === userId && !session.deletedAt && isCurrentWorkoutSession(session)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
    return active ? hydrateSession(transaction, active) : undefined;
  });
}

/**
 * Historial local para las ayudas de progresión. Se limita para mantener la
 * consulta rápida y funciona igual con sesiones aún pendientes de sincronizar.
 */
export async function getRecentLocalWorkoutSessions(routineId: string, limit = 16) {
  const userId = await getActiveOfflineUserId();
  const take = Math.max(0, Math.min(50, Math.floor(limit)));
  return inTransaction([STORES.workoutSessions, STORES.workoutSessionExercises, STORES.workoutSets], "readonly", async (transaction) => {
    const sessions = await getAllFromIndex<WorkoutSessionRow>(transaction, STORES.workoutSessions, "by-routine-id", routineId);
    const recent = sessions
      .filter((session) => session.userId === userId && !session.deletedAt && session.status === "FINISHED" && session.finishedAt)
      .sort((left, right) => (right.finishedAt || right.updatedAt).localeCompare(left.finishedAt || left.updatedAt))
      .slice(0, take);
    return Promise.all(recent.map((session) => hydrateSession(transaction, session)));
  });
}

export async function updateLocalWorkoutSessionSyncStatus(sessionId: string, status: SyncStatus, lastSyncedAt: string | null) {
  await inTransaction([STORES.workoutSessions, STORES.workoutSessionExercises, STORES.workoutSets], "readwrite", async (transaction) => {
    const sessions = transaction.objectStore(STORES.workoutSessions);
    const session = await requestResult(sessions.get(sessionId)) as WorkoutSessionRow | undefined;
    if (!session) return;
    const now = new Date().toISOString();
    sessions.put({ ...session, syncStatus: status, lastSyncedAt, updatedAt: now, version: session.version + 1 });
    const [exercises, sets] = await Promise.all([
      getAllFromIndex<OfflineWorkoutExercise>(transaction, STORES.workoutSessionExercises, "by-session-id", sessionId),
      getAllFromIndex<OfflineWorkoutSet>(transaction, STORES.workoutSets, "by-session-id", sessionId),
    ]);
    exercises.forEach((exercise) => transaction.objectStore(STORES.workoutSessionExercises).put({ ...exercise, syncStatus: status, lastSyncedAt, updatedAt: now, version: exercise.version + 1 }));
    sets.forEach((set) => transaction.objectStore(STORES.workoutSets).put({ ...set, syncStatus: status, lastSyncedAt, updatedAt: now, version: set.version + 1 }));
  });
}
