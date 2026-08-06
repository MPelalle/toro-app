import { reportNetworkFailure, reportNetworkSuccess, verifyConnectivity } from "../connectivity/status";
import { getNextRetryDelay, getReadyOperations, markOperationAttempt, markOperationFailure, markOperationStatus, recoverInterruptedOperations, removeOperation, retryOperationsManually } from "../repositories/operations";
import { setRoutineSyncStatus } from "../repositories/routines";
import { getLocalWorkoutSession, updateLocalWorkoutSessionSyncStatus } from "../repositories/workout-sessions";
import { saveWorkoutSessionConflict } from "../repositories/conflicts";
import { setActiveUserSyncMetadata } from "../repositories/metadata";
import type { QueuedRequest } from "../types";
import { setSyncRuntime } from "./runtime";

let synchronizing = false;
let retryTimer: number | null = null;

function emitSyncChange() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event("toro-sync-change"));
}

function scheduleRetry(delay: number | null) {
  if (typeof window === "undefined" || delay === null) return;
  if (retryTimer !== null) window.clearTimeout(retryTimer);
  retryTimer = window.setTimeout(() => {
    retryTimer = null;
    void synchronizePendingWorkoutSessions();
  }, delay);
}

function readRequest(payload: Record<string, unknown>): QueuedRequest | null {
  const request = payload.request;
  if (!request || typeof request !== "object" || Array.isArray(request)) return null;
  const value = request as Record<string, unknown>;
  const method = value.method;
  const url = value.url;
  const body = value.body;
  if ((method !== "POST" && method !== "PATCH" && method !== "DELETE") || typeof url !== "string" || !url.startsWith("/api/routines") || (body !== null && typeof body !== "string")) return null;
  return { method, url, body };
}

async function responseError(response: Response, fallback: string) {
  const body = await response.json().catch(() => null) as { error?: unknown } | null;
  return typeof body?.error === "string" ? body.error : fallback;
}

async function conflictDetails(response: Response) {
  const body = await response.json().catch(() => null) as { error?: unknown; conflict?: { version?: unknown; updatedAt?: unknown } } | null;
  return { reason: typeof body?.error === "string" ? body.error : "La sesión fue modificada desde otro dispositivo.", remote: body?.conflict ?? {} };
}

export async function synchronizePendingWorkoutSessions() {
  if (synchronizing || !(await verifyConnectivity("manual", true))) return;
  synchronizing = true;
  setSyncRuntime({ isSynchronizing: true, lastError: null });
  emitSyncChange();
  let synchronizedAt: string | null = null;
  try {
    await recoverInterruptedOperations();
    const operations = await getReadyOperations();
    for (const operation of operations) {
      await markOperationAttempt(operation.operationId);

      if (operation.entityType === "routine") {
        const request = readRequest(operation.payload);
        if (!request) {
          await markOperationStatus(operation.operationId, "exhausted", "La solicitud local de rutina es inválida.");
          await setRoutineSyncStatus(operation.entityId, "failed");
          continue;
        }
        try {
          const response = await fetch(request.url, { method: request.method, headers: request.body ? { "Content-Type": "application/json" } : undefined, body: request.body });
          reportNetworkSuccess();
          if (response.status === 409) {
            await markOperationStatus(operation.operationId, "conflict", "La rutina fue modificada en otro dispositivo.");
            await setRoutineSyncStatus(operation.entityId, "conflict");
            continue;
          }
          if (!response.ok) throw new Error(await responseError(response, "La rutina no fue aceptada por el servidor."));
          await setRoutineSyncStatus(operation.entityId, "synced", request.method === "DELETE" ? new Date().toISOString() : null);
          await removeOperation(operation.operationId);
          synchronizedAt = new Date().toISOString();
        } catch (error) {
          reportNetworkFailure(error);
          const message = error instanceof Error ? error.message : "No se pudo sincronizar la rutina.";
          await markOperationFailure(operation.operationId, message);
          await setRoutineSyncStatus(operation.entityId, "failed");
          setSyncRuntime({ lastError: message });
          break;
        }
        continue;
      }

      const session = await getLocalWorkoutSession(operation.entityId);
      if (!session) {
        await markOperationStatus(operation.operationId, "exhausted", "La sesión local ya no está disponible para sincronizar.");
        continue;
      }
      await updateLocalWorkoutSessionSyncStatus(session.id, "syncing", session.lastSyncedAt);
      try {
        const response = await fetch("/api/workout-sessions/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ operationId: operation.operationId, session }) });
        reportNetworkSuccess();
        if (response.status === 409) {
          const conflict = await conflictDetails(response);
          await saveWorkoutSessionConflict(session, conflict.remote, conflict.reason);
          await markOperationStatus(operation.operationId, "conflict", conflict.reason);
          await updateLocalWorkoutSessionSyncStatus(session.id, "conflict", session.lastSyncedAt);
          continue;
        }
        if (!response.ok) throw new Error(await responseError(response, "La sincronización no fue aceptada."));
        await updateLocalWorkoutSessionSyncStatus(session.id, "synced", new Date().toISOString());
        await removeOperation(operation.operationId);
        synchronizedAt = new Date().toISOString();
      } catch (error) {
        reportNetworkFailure(error);
        const message = error instanceof Error ? error.message : "No se pudo sincronizar la sesión.";
        await markOperationFailure(operation.operationId, message);
        await updateLocalWorkoutSessionSyncStatus(session.id, "failed", session.lastSyncedAt);
        setSyncRuntime({ lastError: message });
        break;
      }
    }
  } finally {
    synchronizing = false;
    if (synchronizedAt) {
      await setActiveUserSyncMetadata("last-successful-sync", synchronizedAt).catch(() => undefined);
      setSyncRuntime({ isSynchronizing: false, lastSyncedAt: synchronizedAt });
    } else {
      setSyncRuntime({ isSynchronizing: false });
    }
    scheduleRetry(await getNextRetryDelay().catch(() => null));
    emitSyncChange();
  }
}

export async function retryPendingOperationsManually() {
  await retryOperationsManually();
  emitSyncChange();
  await synchronizePendingWorkoutSessions();
}
