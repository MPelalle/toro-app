import { inTransaction, requestResult } from "../database";
import { STORES } from "../schema";
import type { LocalSyncMetadata } from "../types";
import { getActiveOfflineUserId } from "./identity";

export async function setSyncMetadata(key: string, value: string) {
  const metadata: LocalSyncMetadata = { key, value, updatedAt: new Date().toISOString() };
  await inTransaction(STORES.syncMetadata, "readwrite", async (transaction) => {
    transaction.objectStore(STORES.syncMetadata).put(metadata);
  });
}

export async function getSyncMetadata(key: string) {
  return inTransaction(STORES.syncMetadata, "readonly", async (transaction) => {
    return requestResult(transaction.objectStore(STORES.syncMetadata).get(key)) as Promise<LocalSyncMetadata | undefined>;
  });
}

function activeUserKey(key: string, userId: string) {
  return `user:${userId}:${key}`;
}

export async function setActiveUserSyncMetadata(key: string, value: string) {
  const userId = await getActiveOfflineUserId();
  await setSyncMetadata(activeUserKey(key, userId), value);
}

export async function getActiveUserSyncMetadata(key: string) {
  const userId = await getActiveOfflineUserId();
  return getSyncMetadata(activeUserKey(key, userId));
}
