import type { Routine } from "@/lib/routines";
import type { OfflineWorkoutSession } from "./offline/types";
import { cacheRoutineRecord, cacheRoutineRecords, getCachedRoutineRecord, getCachedRoutineRecords } from "./offline/repositories/routines";
import { failedOperationCount, pendingOperationCount, unsyncedOperationCount } from "./offline/repositories/operations";
import { clearOfflineIdentity, setActiveOfflineIdentity, type OfflineIdentity } from "./offline/repositories/identity";
import { createLocalWorkoutSession, getActiveLocalWorkoutSession, getLocalWorkoutSession, saveLocalWorkoutSession } from "./offline/repositories/workout-sessions";
import { retryPendingOperationsManually, synchronizePendingWorkoutSessions } from "./offline/sync/workout-sessions";
import { prepareOfflineTrainingData } from "./offline/bootstrap";

export type { OfflineWorkoutExercise, OfflineWorkoutSession, OfflineWorkoutSet as WorkoutSet } from "./offline/types";

function emitSyncChange() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event("toro-sync-change"));
}

export function setWorkoutInProgress(active: boolean) {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("toro-workout-status-change", { detail: { active } }));
}

export function createClientId() {
  return crypto.randomUUID();
}

export async function setActiveOfflineUser(user: OfflineIdentity) {
  await setActiveOfflineIdentity(user);
}

export async function clearOfflineUser(preservePendingData: boolean) {
  await clearOfflineIdentity(preservePendingData);
}

export async function cacheRoutines(routines: Routine[]) {
  await cacheRoutineRecords(routines);
}

export async function getCachedRoutines() {
  return getCachedRoutineRecords();
}

export async function cacheRoutine(routine: Routine) {
  await cacheRoutineRecord(routine);
}

export async function getCachedRoutine(id: string) {
  return getCachedRoutineRecord(id);
}

export function createWorkoutSession(routine: Routine) {
  return createLocalWorkoutSession(routine);
}

export async function getWorkoutSession(id: string) {
  return getLocalWorkoutSession(id);
}

export async function getActiveWorkoutSession(routineId: string) {
  return getActiveLocalWorkoutSession(routineId);
}

export async function saveWorkoutSession(session: OfflineWorkoutSession) {
  const saved = await saveLocalWorkoutSession(session);
  emitSyncChange();
  return saved;
}

export async function enqueueSessionSync(sessionId: string) {
  const session = await getLocalWorkoutSession(sessionId);
  if (!session) return;
  await saveLocalWorkoutSession(session);
  emitSyncChange();
}

export async function pendingSyncCount() {
  return pendingOperationCount();
}

export async function failedSyncCount() {
  return failedOperationCount();
}

export async function unsyncedSyncCount() {
  return unsyncedOperationCount();
}

export async function syncPendingSessions() {
  await synchronizePendingWorkoutSessions();
}

export async function retryFailedSyncOperations() {
  await retryPendingOperationsManually();
}

export async function prepareOfflineTraining() {
  return prepareOfflineTrainingData();
}

export * from "./offline/types";
