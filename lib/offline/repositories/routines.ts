import type { Routine, RoutineExercise } from "@/lib/routines";
import { getAllFromIndex, inTransaction, requestResult } from "../database";
import { STORES } from "../schema";
import { getActiveOfflineUserId } from "./identity";
import type { LocalRoutine, LocalRoutineDay, LocalRoutineExercise } from "../types";

function routineMetadata(id: string, userId: string, createdAt: string, updatedAt: string): Omit<LocalRoutine, "name" | "type" | "active"> {
  return { id, userId, createdAt, updatedAt, deletedAt: null, syncStatus: "synced", lastSyncedAt: updatedAt, version: 1 };
}

function dayId(routineId: string, position: number) {
  return `${routineId}:day:${position}`;
}

async function writeRoutine(transaction: IDBTransaction, routine: Routine, userId: string) {
  const routines = transaction.objectStore(STORES.routines);
  const existing = await requestResult(routines.get(routine.id)) as LocalRoutine | undefined;
  if (existing && existing.userId === userId && existing.syncStatus !== "synced") return;
  const now = new Date().toISOString();
  const createdAt = existing?.createdAt ?? routine.createdAt ?? now;
  const base = { ...routineMetadata(routine.id, userId, createdAt, now), version: existing?.version ?? 1 };
  routines.put({ ...base, name: routine.name, type: routine.type, active: routine.active } satisfies LocalRoutine);

  const daysStore = transaction.objectStore(STORES.routineDays);
  const exercisesStore = transaction.objectStore(STORES.routineExercises);
  const [oldDays, oldExercises] = await Promise.all([
    getAllFromIndex<LocalRoutineDay>(transaction, STORES.routineDays, "by-routine-id", routine.id),
    getAllFromIndex<LocalRoutineExercise>(transaction, STORES.routineExercises, "by-routine-id", routine.id),
  ]);
  oldDays.forEach((day) => daysStore.delete(day.id));
  oldExercises.forEach((exercise) => exercisesStore.delete(exercise.id));

  const daysByName = new Map<string, string>();
  routine.days.forEach((name, position) => {
    const id = dayId(routine.id, position);
    daysByName.set(name, id);
    daysStore.put({ ...base, id, routineId: routine.id, position, name } satisfies LocalRoutineDay);
  });
  routine.exercises.forEach((exercise, position) => {
    exercisesStore.put({
      ...base,
      id: exercise.id,
      routineId: routine.id,
      routineDayId: daysByName.get(exercise.trainingDay) ?? null,
      position,
      name: exercise.name,
      muscle: exercise.muscle,
      targetSets: exercise.sets,
      targetReps: exercise.reps,
      targetWeight: exercise.weight,
      technique: exercise.technique,
      completed: exercise.completed,
      actualReps: exercise.actualReps,
      note: exercise.note,
      trainingDay: exercise.trainingDay,
    } satisfies LocalRoutineExercise);
  });
}

export async function cacheRoutineRecord(routine: Routine) {
  const userId = await getActiveOfflineUserId();
  await inTransaction([STORES.routines, STORES.routineDays, STORES.routineExercises], "readwrite", async (transaction) => {
    await writeRoutine(transaction, routine, userId);
  });
}

export async function cacheRoutineRecords(routines: Routine[]) {
  const userId = await getActiveOfflineUserId();
  await inTransaction([STORES.routines, STORES.routineDays, STORES.routineExercises], "readwrite", async (transaction) => {
    for (const routine of routines) await writeRoutine(transaction, routine, userId);
  });
}

function toRoutineExercise(exercise: LocalRoutineExercise): RoutineExercise {
  return {
    id: exercise.id,
    name: exercise.name,
    muscle: exercise.muscle,
    sets: exercise.targetSets,
    reps: exercise.targetReps,
    weight: exercise.targetWeight,
    technique: exercise.technique,
    completed: exercise.completed,
    actualReps: exercise.actualReps,
    note: exercise.note,
    trainingDay: exercise.trainingDay,
  };
}

async function hydrateRoutine(transaction: IDBTransaction, routine: LocalRoutine): Promise<Routine> {
  const [days, exercises] = await Promise.all([
    getAllFromIndex<LocalRoutineDay>(transaction, STORES.routineDays, "by-routine-id", routine.id),
    getAllFromIndex<LocalRoutineExercise>(transaction, STORES.routineExercises, "by-routine-id", routine.id),
  ]);
  return {
    id: routine.id,
    name: routine.name,
    type: routine.type,
    active: routine.active,
    days: days.filter((day) => !day.deletedAt).sort((a, b) => a.position - b.position).map((day) => day.name),
    exercises: exercises.filter((exercise) => !exercise.deletedAt).sort((a, b) => a.position - b.position).map(toRoutineExercise),
    createdAt: routine.createdAt,
  };
}

export async function getCachedRoutineRecord(id: string) {
  const userId = await getActiveOfflineUserId();
  return inTransaction([STORES.routines, STORES.routineDays, STORES.routineExercises], "readonly", async (transaction) => {
    const routine = await requestResult(transaction.objectStore(STORES.routines).get(id)) as LocalRoutine | undefined;
    return routine && routine.userId === userId && !routine.deletedAt ? hydrateRoutine(transaction, routine) : undefined;
  });
}

export async function getCachedRoutineRecords() {
  const userId = await getActiveOfflineUserId();
  return inTransaction([STORES.routines, STORES.routineDays, STORES.routineExercises], "readonly", async (transaction) => {
    const routines = await requestResult(transaction.objectStore(STORES.routines).getAll()) as LocalRoutine[];
    return Promise.all(routines.filter((routine) => routine.userId === userId && !routine.deletedAt).map((routine) => hydrateRoutine(transaction, routine)));
  });
}

export async function setRoutineSyncStatus(id: string, syncStatus: LocalRoutine["syncStatus"], deletedAt: string | null = null) {
  await inTransaction([STORES.routines, STORES.routineDays, STORES.routineExercises], "readwrite", async (transaction) => {
    const now = new Date().toISOString();
    const routines = transaction.objectStore(STORES.routines);
    const routine = await requestResult(routines.get(id)) as LocalRoutine | undefined;
    if (!routine) return;
    routines.put({ ...routine, syncStatus, deletedAt, updatedAt: now, version: routine.version + 1 });
    const [days, exercises] = await Promise.all([
      getAllFromIndex<LocalRoutineDay>(transaction, STORES.routineDays, "by-routine-id", id),
      getAllFromIndex<LocalRoutineExercise>(transaction, STORES.routineExercises, "by-routine-id", id),
    ]);
    days.forEach((day) => transaction.objectStore(STORES.routineDays).put({ ...day, syncStatus, deletedAt, updatedAt: now, version: day.version + 1 }));
    exercises.forEach((exercise) => transaction.objectStore(STORES.routineExercises).put({ ...exercise, syncStatus, deletedAt, updatedAt: now, version: exercise.version + 1 }));
  });
}
