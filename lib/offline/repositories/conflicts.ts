import { inTransaction, requestResult } from "../database";
import { STORES } from "../schema";
import { getActiveOfflineUserId } from "./identity";
import type { ConflictBackup, OfflineWorkoutSession } from "../types";

export async function saveWorkoutSessionConflict(session: OfflineWorkoutSession, remote: { version?: unknown; updatedAt?: unknown }, reason: string) {
  const backup: ConflictBackup = {
    id: crypto.randomUUID(),
    entityType: "workout-session",
    entityId: session.id,
    userId: session.userId,
    createdAt: new Date().toISOString(),
    localVersion: session.version,
    localUpdatedAt: session.updatedAt,
    remoteVersion: typeof remote.version === "number" ? remote.version : null,
    remoteUpdatedAt: typeof remote.updatedAt === "string" ? remote.updatedAt : null,
    reason,
    localSnapshot: JSON.stringify(session),
    resolvedAt: null,
    resolution: null,
  };
  await inTransaction(STORES.conflicts, "readwrite", async (transaction) => {
    transaction.objectStore(STORES.conflicts).put(backup);
  });
  return backup;
}

export async function getUnresolvedConflicts() {
  const userId = await getActiveOfflineUserId();
  return inTransaction(STORES.conflicts, "readonly", async (transaction) => {
    const values = await requestResult(transaction.objectStore(STORES.conflicts).getAll()) as ConflictBackup[];
    return values.filter((conflict) => conflict.userId === userId && !conflict.resolvedAt);
  });
}
