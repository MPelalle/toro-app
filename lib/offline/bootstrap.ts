import type { Routine } from "@/lib/routines";
import { verifyConnectivity } from "./connectivity/status";
import { getActiveOfflineUserId } from "./repositories/identity";
import { getActiveUserSyncMetadata, setActiveUserSyncMetadata } from "./repositories/metadata";
import { cacheRoutineRecord } from "./repositories/routines";
import { cacheRemoteWorkoutSession } from "./repositories/workout-sessions";
import { LEGACY_LOCAL_USER_ID, type OfflineWorkoutSession } from "./types";

export type OfflineReadiness = "idle" | "preparing" | "ready" | "failed";
export type OfflineBootstrapResult = { state: OfflineReadiness; message: string };
type BootstrapPayload = { activeRoutine: Routine | null; recentSessions: OfflineWorkoutSession[]; downloadedAt: string };
type RoutineHistoryPayload = { recentSessions: OfflineWorkoutSession[]; downloadedAt: string };

function emit(result: OfflineBootstrapResult) {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent<OfflineBootstrapResult>("toro-offline-readiness", { detail: result }));
}

/** True once IndexedDB is scoped to the authenticated dashboard user. */
export async function isOfflineIdentityReady() {
  return (await getActiveOfflineUserId()) !== LEGACY_LOCAL_USER_ID;
}

/**
 * Fills the local progression cache for a specific routine. Calling this before
 * identity hydration is intentionally a no-op so remote data is never written
 * under the legacy local-user scope.
 */
export async function hydrateRoutineHistory(routineId: string) {
  if (!(await isOfflineIdentityReady())) return [];
  const response = await fetch(`/api/offline/routines/${encodeURIComponent(routineId)}/history`, { cache: "no-store", credentials: "same-origin" });
  if (!response.ok) throw new Error("No se pudo descargar el historial de la rutina.");
  const payload = await response.json() as RoutineHistoryPayload;
  if (!Array.isArray(payload.recentSessions)) throw new Error("El historial descargado no es válido.");
  for (const session of payload.recentSessions) await cacheRemoteWorkoutSession(session);
  return payload.recentSessions;
}

export async function prepareOfflineTrainingData(): Promise<OfflineBootstrapResult> {
  const preparing = { state: "preparing" as const, message: "Preparando datos offline." };
  emit(preparing);
  if (!(await verifyConnectivity("manual"))) {
    const cached = await getActiveUserSyncMetadata("offline-training-ready");
    if (cached) {
      const result = { state: "ready" as const, message: "TORO está listo para entrenar sin conexión." };
      emit(result);
      return result;
    }
    const result = { state: "failed" as const, message: "No se pudo completar la descarga offline." };
    emit(result);
    return result;
  }
  try {
    const response = await fetch("/api/offline/bootstrap", { cache: "no-store", credentials: "same-origin" });
    if (!response.ok) throw new Error("La descarga inicial no fue aceptada.");
    const payload = await response.json() as BootstrapPayload;
    if (payload.activeRoutine) await cacheRoutineRecord(payload.activeRoutine);
    for (const session of payload.recentSessions) await cacheRemoteWorkoutSession(session);
    await setActiveUserSyncMetadata("offline-training-ready", payload.downloadedAt);
    const result = { state: "ready" as const, message: "TORO está listo para entrenar sin conexión." };
    emit(result);
    return result;
  } catch {
    const result = { state: "failed" as const, message: "No se pudo completar la descarga offline." };
    emit(result);
    return result;
  }
}
