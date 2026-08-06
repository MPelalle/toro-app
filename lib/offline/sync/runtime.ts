export type SyncRuntimeSnapshot = {
  isSynchronizing: boolean;
  lastError: string | null;
  lastSyncedAt: string | null;
};

let snapshot: SyncRuntimeSnapshot = { isSynchronizing: false, lastError: null, lastSyncedAt: null };
const listeners = new Set<(next: SyncRuntimeSnapshot) => void>();

function publish(next: SyncRuntimeSnapshot) {
  snapshot = next;
  listeners.forEach((listener) => listener(snapshot));
  if (typeof window !== "undefined") window.dispatchEvent(new Event("toro-sync-change"));
}

export function getSyncRuntimeSnapshot() {
  return snapshot;
}

export function subscribeSyncRuntime(listener: (next: SyncRuntimeSnapshot) => void) {
  listeners.add(listener);
  listener(snapshot);
  return () => listeners.delete(listener);
}

export function setSyncRuntime(patch: Partial<SyncRuntimeSnapshot>) {
  publish({ ...snapshot, ...patch });
}
