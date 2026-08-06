import { inTransaction, requestResult } from "../database";
import { STORES } from "../schema";
import type { LocalUser } from "../types";

export async function saveLocalUser(user: LocalUser) {
  await inTransaction(STORES.users, "readwrite", async (transaction) => {
    transaction.objectStore(STORES.users).put(user);
  });
  return user;
}

export async function getLocalUser(userId: string) {
  return inTransaction(STORES.users, "readonly", async (transaction) => {
    return requestResult(transaction.objectStore(STORES.users).get(userId)) as Promise<LocalUser | undefined>;
  });
}
