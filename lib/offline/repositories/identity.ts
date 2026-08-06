import { inTransaction, requestResult } from "../database";
import { STORES, type StoreName } from "../schema";
import { LEGACY_LOCAL_USER_ID, type LocalSyncMetadata, type LocalUser } from "../types";

const ACTIVE_USER_KEY = "active-user-id";

export type OfflineIdentity = Pick<LocalUser, "id" | "email" | "name" | "username">;

export async function setActiveOfflineIdentity(identity: OfflineIdentity) {
  const now = new Date().toISOString();
  const user: LocalUser = {
    ...identity,
    userId: identity.id,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    syncStatus: "synced",
    lastSyncedAt: now,
    version: 1,
  };
  const metadata: LocalSyncMetadata = { key: ACTIVE_USER_KEY, value: identity.id, updatedAt: now };
  await inTransaction([STORES.users, STORES.syncMetadata], "readwrite", async (transaction) => {
    transaction.objectStore(STORES.users).put(user);
    transaction.objectStore(STORES.syncMetadata).put(metadata);
  });
}

export async function getActiveOfflineUserId() {
  return inTransaction(STORES.syncMetadata, "readonly", async (transaction) => {
    const value = await requestResult(transaction.objectStore(STORES.syncMetadata).get(ACTIVE_USER_KEY)) as LocalSyncMetadata | undefined;
    return value?.value ?? LEGACY_LOCAL_USER_ID;
  });
}

const USER_SCOPED_STORES: StoreName[] = [STORES.users, STORES.routines, STORES.routineDays, STORES.routineExercises, STORES.workoutSessions, STORES.workoutSessionExercises, STORES.workoutSets, STORES.syncQueue, STORES.conflicts];

export async function clearOfflineIdentity(preservePendingData: boolean) {
  const userId = await getActiveOfflineUserId();
  await inTransaction([...USER_SCOPED_STORES, STORES.syncMetadata], "readwrite", async (transaction) => {
    if (!preservePendingData && userId !== LEGACY_LOCAL_USER_ID) {
      for (const storeName of USER_SCOPED_STORES) {
        const store = transaction.objectStore(storeName);
        const records = await requestResult(store.getAll()) as Array<{ id?: string; userId?: string }>;
        records.filter((record) => record.userId === userId && record.id).forEach((record) => store.delete(record.id as string));
      }
    }
    transaction.objectStore(STORES.syncMetadata).delete(ACTIVE_USER_KEY);
  });
}
