"use client";

import { useCallback, useEffect, useState } from "react";
import { prepareOfflineTraining, retryFailedSyncOperations, setActiveOfflineUser, syncPendingSessions } from "@/lib/offline";
import type { OfflineIdentity } from "./repositories/identity";
import { failedOperationCount, pendingOperationCount, unsyncedOperationCount } from "./repositories/operations";
import { getActiveUserSyncMetadata } from "./repositories/metadata";
import { getConnectivitySnapshot, startConnectivityMonitoring, subscribeConnectivity, verifyConnectivity, type ConnectivitySnapshot } from "./connectivity/status";
import { getSyncRuntimeSnapshot, subscribeSyncRuntime, type SyncRuntimeSnapshot } from "./sync/runtime";
import type { OfflineBootstrapResult } from "./bootstrap";

export function useConnectivity() {
  const [snapshot, setSnapshot] = useState<ConnectivitySnapshot>(() => getConnectivitySnapshot());

  useEffect(() => {
    const stopMonitoring = startConnectivityMonitoring();
    const unsubscribe = subscribeConnectivity(setSnapshot);
    return () => {
      unsubscribe();
      stopMonitoring();
    };
  }, []);

  return {
    ...snapshot,
    isOnline: snapshot.reachable,
    checkConnectivity: () => verifyConnectivity("manual", true),
  };
}

export type SyncStatus = SyncRuntimeSnapshot & {
  pendingOperations: number;
  failedOperations: number;
  unsyncedOperations: number;
  syncAvailable: () => Promise<void>;
  syncNow: () => Promise<void>;
  refresh: () => Promise<void>;
};

export function useSyncStatus(): SyncStatus {
  const [runtime, setRuntime] = useState<SyncRuntimeSnapshot>(() => getSyncRuntimeSnapshot());
  const [counts, setCounts] = useState({ pendingOperations: 0, failedOperations: 0, unsyncedOperations: 0 });

  const refresh = useCallback(async () => {
    const [pendingOperations, failedOperations, unsyncedOperations, lastSync] = await Promise.all([
      pendingOperationCount(),
      failedOperationCount(),
      unsyncedOperationCount(),
      getActiveUserSyncMetadata("last-successful-sync"),
    ]);
    setCounts({ pendingOperations, failedOperations, unsyncedOperations });
    if (lastSync?.value) setRuntime((current) => current.lastSyncedAt ? current : { ...current, lastSyncedAt: lastSync.value });
  }, []);

  useEffect(() => {
    const initialRefresh = window.setTimeout(() => void refresh().catch(() => undefined), 0);
    const unsubscribeRuntime = subscribeSyncRuntime(setRuntime);
    const refreshFromEvent = () => void refresh().catch(() => undefined);
    window.addEventListener("toro-sync-change", refreshFromEvent);
    return () => {
      window.clearTimeout(initialRefresh);
      unsubscribeRuntime();
      window.removeEventListener("toro-sync-change", refreshFromEvent);
    };
  }, [refresh]);

  const syncAvailable = useCallback(async () => {
    await syncPendingSessions();
    await refresh();
  }, [refresh]);

  const syncNow = useCallback(async () => {
    await retryFailedSyncOperations();
    await refresh();
  }, [refresh]);

  return { ...runtime, ...counts, syncAvailable, syncNow, refresh };
}

export function usePendingOperations() {
  const { pendingOperations, failedOperations, unsyncedOperations, refresh } = useSyncStatus();
  return { pendingOperations, failedOperations, unsyncedOperations, refresh };
}

export function useOfflineReady(user: OfflineIdentity) {
  const [result, setResult] = useState<OfflineBootstrapResult>({ state: "idle", message: "" });

  useEffect(() => {
    let current = true;
    let bootstrapTimer: number | null = null;
    let idleCallback: number | null = null;
    const idleWindow = window as unknown as { requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number; cancelIdleCallback?: (handle: number) => void };
    const update = (event: Event) => {
      if (current) setResult((event as CustomEvent<OfflineBootstrapResult>).detail);
    };
    const prepare = () => {
      void prepareOfflineTraining()
        .then((next) => { if (current) setResult(next); })
        .catch(() => { if (current) setResult({ state: "failed", message: "No se pudo completar la descarga offline." }); });
    };
    window.addEventListener("toro-offline-readiness", update);
    void setActiveOfflineUser(user)
      .then(() => {
        if (!current) return;
        if (idleWindow.requestIdleCallback) idleCallback = idleWindow.requestIdleCallback(prepare, { timeout: 1_500 });
        else bootstrapTimer = window.setTimeout(prepare, 350);
      })
      .catch(() => { if (current) setResult({ state: "failed", message: "No se pudo completar la descarga offline." }); });
    return () => {
      current = false;
      if (bootstrapTimer !== null) window.clearTimeout(bootstrapTimer);
      if (idleCallback !== null) idleWindow.cancelIdleCallback?.(idleCallback);
      window.removeEventListener("toro-offline-readiness", update);
    };
  }, [user]);

  return { ...result, isOfflineReady: result.state === "ready" };
}
