export const OFFLINE_DATABASE_NAME = "toro-offline";
export const OFFLINE_DATABASE_VERSION = 4;

export const STORES = {
  users: "users",
  routines: "routines",
  routineDays: "routine-days",
  routineExercises: "routine-exercises",
  workoutSessions: "workout-sessions",
  workoutSessionExercises: "workout-session-exercises",
  workoutSets: "workout-sets",
  syncQueue: "sync-queue",
  syncMetadata: "sync-metadata",
  conflicts: "conflicts",
} as const;

export type StoreName = (typeof STORES)[keyof typeof STORES];

function ensureIndex(store: IDBObjectStore, name: string, keyPath: string | string[], unique = false) {
  if (!store.indexNames.contains(name)) store.createIndex(name, keyPath, { unique });
}

export function ensureSchema(database: IDBDatabase, transaction: IDBTransaction) {
  const getStore = (name: StoreName, keyPath: string) => database.objectStoreNames.contains(name)
    ? transaction.objectStore(name)
    : database.createObjectStore(name, { keyPath });

  const users = getStore(STORES.users, "id");
  ensureIndex(users, "by-user-id", "userId", true);

  const routines = getStore(STORES.routines, "id");
  ensureIndex(routines, "by-user-id", "userId");
  ensureIndex(routines, "by-sync-status", "syncStatus");

  const routineDays = getStore(STORES.routineDays, "id");
  ensureIndex(routineDays, "by-routine-id", "routineId");
  ensureIndex(routineDays, "by-user-id", "userId");

  const routineExercises = getStore(STORES.routineExercises, "id");
  ensureIndex(routineExercises, "by-routine-id", "routineId");
  ensureIndex(routineExercises, "by-user-id", "userId");

  const sessions = getStore(STORES.workoutSessions, "id");
  ensureIndex(sessions, "by-user-id", "userId");
  ensureIndex(sessions, "by-routine-id", "routineId");
  ensureIndex(sessions, "by-sync-status", "syncStatus");

  const sessionExercises = getStore(STORES.workoutSessionExercises, "id");
  ensureIndex(sessionExercises, "by-session-id", "sessionId");
  ensureIndex(sessionExercises, "by-user-id", "userId");

  const sets = getStore(STORES.workoutSets, "id");
  ensureIndex(sets, "by-session-id", "sessionId");
  ensureIndex(sets, "by-session-exercise-id", "sessionExerciseId");
  ensureIndex(sets, "by-user-id", "userId");

  const queue = getStore(STORES.syncQueue, "id");
  ensureIndex(queue, "by-user-id", "userId");
  ensureIndex(queue, "by-entity-id", "entityId");
  ensureIndex(queue, "by-sync-status", "syncStatus");
  ensureIndex(queue, "by-status", "status");
  ensureIndex(queue, "by-next-retry-at", "nextRetryAt");
  ensureIndex(queue, "by-user-entity", ["userId", "entityId"]);

  getStore(STORES.syncMetadata, "key");

  const conflicts = getStore(STORES.conflicts, "id");
  ensureIndex(conflicts, "by-user-id", "userId");
  ensureIndex(conflicts, "by-entity-id", "entityId");
}
