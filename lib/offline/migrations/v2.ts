import { STORES } from "../schema";
import { LEGACY_LOCAL_USER_ID, type OfflineWorkoutExercise, type OfflineWorkoutSet, type PendingOperation, type SyncMetadata } from "../types";

type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is UnknownRecord => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const text = (value: unknown, fallback = "") => typeof value === "string" && value.trim() ? value : fallback;
const number = (value: unknown, fallback = 0) => typeof value === "number" && Number.isFinite(value) ? value : fallback;
const booleanOrNull = (value: unknown) => typeof value === "boolean" ? value : null;
const stringOrNull = (value: unknown) => typeof value === "string" ? value : null;

function metadata(id: string, updatedAt: string): SyncMetadata {
  return { id, userId: LEGACY_LOCAL_USER_ID, createdAt: updatedAt, updatedAt, deletedAt: null, syncStatus: "synced", lastSyncedAt: updatedAt, version: 1 };
}

function migrateRoutines(transaction: IDBTransaction, now: string) {
  const routines = transaction.objectStore(STORES.routines);
  const days = transaction.objectStore(STORES.routineDays);
  const exercises = transaction.objectStore(STORES.routineExercises);
  const cursorRequest = routines.openCursor();

  cursorRequest.onsuccess = () => {
    const cursor = cursorRequest.result;
    if (!cursor) return;
    const row = isRecord(cursor.value) ? cursor.value : null;
    const value = row && isRecord(row.value) ? row.value : row;
    const id = value ? text(value.id) : "";
    if (!value || !id) {
      cursor.continue();
      return;
    }

    const updatedAt = text(value.updatedAt, text(row?.cachedAt, now));
    const routineDays = Array.isArray(value.days) ? value.days.map((day) => text(day)).filter(Boolean) : [];
    cursor.update({
      ...metadata(id, updatedAt),
      name: text(value.name, "Rutina sin nombre"),
      type: text(value.type, "Fullbody"),
      active: value.active === true,
    });

    routineDays.forEach((name, position) => {
      const dayId = `${id}:day:${position}`;
      days.put({ ...metadata(dayId, updatedAt), routineId: id, position, name });
    });

    const sourceExercises = Array.isArray(value.exercises) ? value.exercises : [];
    sourceExercises.forEach((source, position) => {
      if (!isRecord(source)) return;
      const exerciseId = text(source.id, `${id}:exercise:${position}`);
      const trainingDay = text(source.trainingDay);
      const dayPosition = routineDays.indexOf(trainingDay);
      exercises.put({
        ...metadata(exerciseId, updatedAt),
        routineId: id,
        routineDayId: dayPosition >= 0 ? `${id}:day:${dayPosition}` : null,
        position,
        name: text(source.name, "Ejercicio"),
        muscle: text(source.muscle, "General"),
        targetSets: number(source.sets, 1),
        targetReps: number(source.reps, 1),
        targetWeight: number(source.weight),
        technique: text(source.technique, "Normal"),
        completed: booleanOrNull(source.completed),
        actualReps: typeof source.actualReps === "number" ? source.actualReps : null,
        note: text(source.note),
        trainingDay,
      });
    });
    cursor.continue();
  };
}

function migrateSessions(transaction: IDBTransaction, now: string) {
  const sessions = transaction.objectStore(STORES.workoutSessions);
  const exercises = transaction.objectStore(STORES.workoutSessionExercises);
  const sets = transaction.objectStore(STORES.workoutSets);
  const cursorRequest = sessions.openCursor();

  cursorRequest.onsuccess = () => {
    const cursor = cursorRequest.result;
    if (!cursor) return;
    const source = isRecord(cursor.value) ? cursor.value : null;
    const id = source ? text(source.id) : "";
    if (!source || !id) {
      cursor.continue();
      return;
    }

    const updatedAt = text(source.clientUpdatedAt, now);
    cursor.update({
      ...metadata(id, updatedAt),
      routineId: text(source.routineId),
      status: source.status === "FINISHED" ? "FINISHED" : "IN_PROGRESS",
      startedAt: text(source.startedAt, updatedAt),
      finishedAt: stringOrNull(source.finishedAt),
      durationSeconds: null,
      notes: null,
      emotionalRating: null,
      clientUpdatedAt: updatedAt,
    });

    const sourceExercises = Array.isArray(source.exercises) ? source.exercises : [];
    sourceExercises.forEach((sourceExercise, position) => {
      if (!isRecord(sourceExercise)) return;
      const exerciseId = text(sourceExercise.id, `${id}:exercise:${position}`);
      const exercise: OfflineWorkoutExercise = {
        ...metadata(exerciseId, updatedAt),
        sessionId: id,
        routineExerciseId: text(sourceExercise.routineExerciseId),
        position: number(sourceExercise.position, position),
        name: text(sourceExercise.name, "Ejercicio"),
        muscle: text(sourceExercise.muscle, "General"),
      };
      exercises.put(exercise);

      const sourceSets = Array.isArray(sourceExercise.sets) ? sourceExercise.sets : [];
      sourceSets.forEach((sourceSet, setIndex) => {
        if (!isRecord(sourceSet)) return;
        const setId = text(sourceSet.id, `${exerciseId}:set:${setIndex}`);
        const set: OfflineWorkoutSet = {
          ...metadata(setId, updatedAt),
          sessionId: id,
          sessionExerciseId: exerciseId,
          setNumber: number(sourceSet.setNumber, setIndex + 1),
          targetReps: number(sourceSet.targetReps, 1),
          targetWeight: number(sourceSet.targetWeight),
          reps: typeof sourceSet.reps === "number" ? sourceSet.reps : null,
          weight: typeof sourceSet.weight === "number" ? sourceSet.weight : null,
          rir: null,
          rpe: null,
          kind: "NORMAL",
          completed: sourceSet.completed === true,
          note: null,
        };
        sets.put(set);
      });
    });
    cursor.continue();
  };
}

function migrateQueue(transaction: IDBTransaction, now: string) {
  const queue = transaction.objectStore(STORES.syncQueue);
  const cursorRequest = queue.openCursor();
  cursorRequest.onsuccess = () => {
    const cursor = cursorRequest.result;
    if (!cursor) return;
    const source = isRecord(cursor.value) ? cursor.value : null;
    const id = source ? text(source.id) : "";
    if (source && id) {
      const createdAt = text(source.createdAt, now);
      const operation: PendingOperation = {
        id,
        operationId: id,
        entityType: "workout-session",
        entityId: text(source.sessionId),
        operationType: "update",
        payload: { sessionId: text(source.sessionId) },
        userId: LEGACY_LOCAL_USER_ID,
        createdAt,
        updatedAt: createdAt,
        attempts: number(source.attempts),
        lastAttemptAt: null,
        nextRetryAt: createdAt,
        status: "pending",
        error: null,
      };
      cursor.update(operation);
    }
    cursor.continue();
  };
}

export function migrateVersionOneToTwo(transaction: IDBTransaction) {
  const now = new Date().toISOString();
  migrateRoutines(transaction, now);
  migrateSessions(transaction, now);
  migrateQueue(transaction, now);
}
