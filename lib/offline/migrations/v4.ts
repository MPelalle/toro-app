import { STORES } from "../schema";

// The v4 upgrade adds the conflict-backup store. Existing data is untouched.
export function migrateVersionThreeToFour(transaction: IDBTransaction) {
  if (!transaction.db.objectStoreNames.contains(STORES.conflicts)) transaction.db.createObjectStore(STORES.conflicts, { keyPath: "id" });
}
