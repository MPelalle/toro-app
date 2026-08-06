import { migrateVersionOneToTwo } from "./migrations/v2";
import { migrateVersionTwoToThree } from "./migrations/v3";
import { migrateVersionThreeToFour } from "./migrations/v4";
import { OFFLINE_DATABASE_NAME, OFFLINE_DATABASE_VERSION, ensureSchema, type StoreName } from "./schema";

let databasePromise: Promise<IDBDatabase> | null = null;

export function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("No se pudo acceder a IndexedDB."));
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("No se pudo completar la operación local."));
    transaction.onabort = () => reject(transaction.error ?? new Error("La operación local fue cancelada."));
  });
}

export function isOfflineStorageAvailable() {
  return typeof window !== "undefined" && "indexedDB" in window;
}

export function openOfflineDatabase(): Promise<IDBDatabase> {
  if (!isOfflineStorageAvailable()) return Promise.reject(new Error("El almacenamiento offline no está disponible en este navegador."));
  if (databasePromise) return databasePromise;

  databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(OFFLINE_DATABASE_NAME, OFFLINE_DATABASE_VERSION);
    request.onupgradeneeded = (event) => {
      const transaction = request.transaction;
      if (!transaction) {
        reject(new Error("No se pudo iniciar la migración local."));
        return;
      }
      ensureSchema(request.result, transaction);
      if (event.oldVersion > 0 && event.oldVersion < 2) migrateVersionOneToTwo(transaction);
      if (event.oldVersion > 0 && event.oldVersion < 3) migrateVersionTwoToThree(transaction);
      if (event.oldVersion > 0 && event.oldVersion < 4) migrateVersionThreeToFour(transaction);
    };
    request.onsuccess = () => {
      const database = request.result;
      database.onversionchange = () => {
        database.close();
        databasePromise = null;
      };
      resolve(database);
    };
    request.onerror = () => {
      databasePromise = null;
      reject(request.error ?? new Error("IndexedDB no está disponible."));
    };
    request.onblocked = () => reject(new Error("Cerrá las otras pestañas de TORO para actualizar el almacenamiento local."));
  });

  return databasePromise;
}

/** Closes the cached connection so a browser upgrade (and integration tests) can reopen it safely. */
export async function closeOfflineDatabase() {
  if (!databasePromise) return;
  const database = await databasePromise;
  database.close();
  databasePromise = null;
}

export async function inTransaction<T>(stores: StoreName | StoreName[], mode: IDBTransactionMode, run: (transaction: IDBTransaction) => Promise<T>): Promise<T> {
  const database = await openOfflineDatabase();
  const transaction = database.transaction(stores, mode);
  try {
    const result = await run(transaction);
    await transactionDone(transaction);
    return result;
  } catch (error) {
    try {
      transaction.abort();
    } catch {
      // The transaction may have finished while the request error propagated.
    }
    throw error;
  }
}

export async function getAllFromIndex<T>(transaction: IDBTransaction, storeName: StoreName, indexName: string, value: IDBValidKey): Promise<T[]> {
  return requestResult(transaction.objectStore(storeName).index(indexName).getAll(value)) as Promise<T[]>;
}
