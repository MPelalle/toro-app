import { cacheRoutine, cacheRoutines, createClientId, getCachedRoutine, getCachedRoutines, syncPendingSessions } from "@/lib/offline";
import { enqueueRoutineRequest } from "@/lib/offline/repositories/operations";
import { setRoutineSyncStatus } from "@/lib/offline/repositories/routines";

export type RoutineExercise = { id: string; name: string; muscle: string; sets: number; reps: number; weight: number; technique: string; completed: boolean | null; actualReps: number | null; note: string; trainingDay: string };
export type Routine = { id: string; name: string; type: string; kind?: "PERSONAL" | "SHARED"; days: string[]; active: boolean; exercises: RoutineExercise[]; createdAt: string };

export async function routineRequest<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...options, headers: { "Content-Type": "application/json", ...(options?.headers || {}) } });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error || "No se pudo guardar la rutina.");
  }
  return response.json() as Promise<T>;
}

async function refreshRoutines(onRemote?: (routines: Routine[]) => void) { try { const routines = await routineRequest<Routine[]>("/api/routines"); await cacheRoutines(routines); onRemote?.(routines); } catch { /* retain local snapshot */ } }
async function refreshRoutine(id: string, onRemote?: (routine: Routine) => void) { try { const routine = await routineRequest<Routine>(`/api/routines/${id}`); await cacheRoutine(routine); onRemote?.(routine); } catch { /* retain local snapshot */ } }

export async function getRoutinesOfflineFirst(onRemote?: (routines: Routine[]) => void) {
  const routines = await getCachedRoutines();
  if (routines.length) { void refreshRoutines(onRemote); return { routines, source: "cache" as const }; }
  try { const remote = await routineRequest<Routine[]>("/api/routines"); await cacheRoutines(remote); return { routines: remote, source: "network" as const }; }
  catch { return { routines, source: "cache" as const }; }
}

export async function getRoutineOfflineFirst(id: string, onRemote?: (routine: Routine) => void) {
  const routine = await getCachedRoutine(id);
  if (routine) { void refreshRoutine(id, onRemote); return { routine, source: "cache" as const }; }
  try { const remote = await routineRequest<Routine>(`/api/routines/${id}`); await cacheRoutine(remote); return { routine: remote, source: "network" as const }; }
  catch { return { routine, source: "cache" as const }; }
}

type RoutineDraft = Omit<Routine, "id" | "createdAt" | "active" | "exercises"> & { exercises: Array<Omit<RoutineExercise, "id">> };

function validateDraft(draft: RoutineDraft) {
  if (!draft.name.trim() || !draft.days.length || !draft.exercises.length) throw new Error("La rutina necesita nombre, días y al menos un ejercicio.");
  if (draft.exercises.some((exercise) => !exercise.name.trim() || !exercise.muscle.trim() || !Number.isInteger(exercise.sets) || exercise.sets < 1 || !Number.isInteger(exercise.reps) || exercise.reps < 1 || !Number.isFinite(exercise.weight) || exercise.weight < 0)) throw new Error("Revisá los valores de los ejercicios.");
}

async function queueRoutine(id: string, url: string, method: "POST" | "PATCH" | "DELETE", body: unknown) {
  await enqueueRoutineRequest(id, { url, method, body: body === undefined ? null : JSON.stringify(body) });
  await setRoutineSyncStatus(id, "pending");
  void syncPendingSessions();
}

export async function createRoutineOfflineFirst(draft: RoutineDraft) {
  validateDraft(draft);
  const routine: Routine = { ...draft, id: createClientId(), active: true, createdAt: new Date().toISOString(), exercises: draft.exercises.map((exercise) => ({ ...exercise, id: createClientId() })) };
  await cacheRoutine(routine); await setRoutineSyncStatus(routine.id, "pending");
  try { const remote = await routineRequest<Routine>("/api/routines", { method: "POST", body: JSON.stringify(routine) }); await cacheRoutine(remote); return remote; }
  catch { await queueRoutine(routine.id, "/api/routines", "POST", routine); return routine; }
}

export async function updateRoutineOfflineFirst(id: string, patch: Partial<Pick<Routine, "name" | "type" | "days" | "active">>) {
  const existing = await getCachedRoutine(id);
  if (!existing) throw new Error("La rutina todavía no está disponible en este dispositivo.");
  const local = { ...existing, ...patch };
  await cacheRoutine(local); await setRoutineSyncStatus(id, "pending");
  try { const remote = await routineRequest<Routine>(`/api/routines/${id}`, { method: "PATCH", body: JSON.stringify(patch) }); await cacheRoutine(remote); return remote; }
  catch { await queueRoutine(id, `/api/routines/${id}`, "PATCH", patch); return local; }
}

export async function activateRoutineOfflineFirst(id: string) {
  const routines = await getCachedRoutines();
  await Promise.all(routines.map((routine) => cacheRoutine({ ...routine, active: routine.id === id })));
  return updateRoutineOfflineFirst(id, { active: true });
}

export async function deleteRoutineOfflineFirst(id: string) {
  await setRoutineSyncStatus(id, "pending", new Date().toISOString());
  try { await routineRequest(`/api/routines/${id}`, { method: "DELETE" }); await setRoutineSyncStatus(id, "synced", new Date().toISOString()); }
  catch { await queueRoutine(id, `/api/routines/${id}`, "DELETE", undefined); }
}
