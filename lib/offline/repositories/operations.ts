import { getAllFromIndex, inTransaction, requestResult } from "../database";
import { STORES } from "../schema";
import type { PendingOperation, QueueOperationStatus, QueuedRequest, SyncEntityType } from "../types";
import { getActiveOfflineUserId } from "./identity";

const MAX_ATTEMPTS = 5;
const BASE_RETRY_MS = 5_000;
const MAX_RETRY_MS = 5 * 60_000;

function nextRetry(attempts: number, now: number) {
  return new Date(now + Math.min(MAX_RETRY_MS, BASE_RETRY_MS * 2 ** Math.max(0, attempts - 1))).toISOString();
}

function operationOrder(left: PendingOperation, right: PendingOperation) {
  if (left.entityType === right.entityType && left.entityId === right.entityId) {
    const rank = { create: 0, update: 1, delete: 2 } as const;
    if (rank[left.operationType] !== rank[right.operationType]) return rank[left.operationType] - rank[right.operationType];
  }
  return left.createdAt.localeCompare(right.createdAt) || left.operationId.localeCompare(right.operationId);
}

export async function getReadyOperations() {
  const userId = await getActiveOfflineUserId();
  const now = new Date().toISOString();
  return inTransaction(STORES.syncQueue, "readonly", async (transaction) => {
    const operations = await requestResult(transaction.objectStore(STORES.syncQueue).getAll()) as PendingOperation[];
    return operations
      .filter((operation) => operation.userId === userId && (operation.status === "pending" || operation.status === "failed") && (!operation.nextRetryAt || operation.nextRetryAt <= now))
      .sort(operationOrder);
  });
}

export async function pendingOperationCount() {
  const userId = await getActiveOfflineUserId();
  return inTransaction(STORES.syncQueue, "readonly", async (transaction) => {
    const operations = await requestResult(transaction.objectStore(STORES.syncQueue).getAll()) as PendingOperation[];
    return operations.filter((operation) => operation.userId === userId && operation.status !== "exhausted" && operation.status !== "conflict").length;
  });
}

export async function failedOperationCount() {
  const userId = await getActiveOfflineUserId();
  return inTransaction(STORES.syncQueue, "readonly", async (transaction) => {
    const operations = await requestResult(transaction.objectStore(STORES.syncQueue).getAll()) as PendingOperation[];
    return operations.filter((operation) => operation.userId === userId && (operation.status === "failed" || operation.status === "exhausted" || operation.status === "conflict")).length;
  });
}

/** Includes failed and conflict records, which still need a user's decision before logout. */
export async function unsyncedOperationCount() {
  const userId = await getActiveOfflineUserId();
  return inTransaction(STORES.syncQueue, "readonly", async (transaction) => {
    const operations = await requestResult(transaction.objectStore(STORES.syncQueue).getAll()) as PendingOperation[];
    return operations.filter((operation) => operation.userId === userId).length;
  });
}

export async function getNextRetryDelay() {
  const userId = await getActiveOfflineUserId();
  return inTransaction(STORES.syncQueue, "readonly", async (transaction) => {
    const operations = await requestResult(transaction.objectStore(STORES.syncQueue).getAll()) as PendingOperation[];
    const nextTimes = operations
      .filter((operation) => operation.userId === userId && (operation.status === "pending" || operation.status === "failed") && operation.nextRetryAt)
      .map((operation) => new Date(operation.nextRetryAt as string).getTime())
      .filter(Number.isFinite);
    if (!nextTimes.length) return null;
    return Math.max(0, Math.min(...nextTimes) - Date.now());
  });
}

export async function markOperationAttempt(operationId: string) {
  await inTransaction(STORES.syncQueue, "readwrite", async (transaction) => {
    const store = transaction.objectStore(STORES.syncQueue);
    const operation = await requestResult(store.get(operationId)) as PendingOperation | undefined;
    if (!operation) return;
    const now = new Date().toISOString();
    store.put({ ...operation, attempts: operation.attempts + 1, lastAttemptAt: now, updatedAt: now, status: "syncing", error: null, nextRetryAt: null });
  });
}

export async function markOperationFailure(operationId: string, error: string) {
  await inTransaction(STORES.syncQueue, "readwrite", async (transaction) => {
    const store = transaction.objectStore(STORES.syncQueue);
    const operation = await requestResult(store.get(operationId)) as PendingOperation | undefined;
    if (!operation) return;
    const now = Date.now();
    const exhausted = operation.attempts >= MAX_ATTEMPTS;
    store.put({ ...operation, updatedAt: new Date(now).toISOString(), status: exhausted ? "exhausted" : "failed", error, nextRetryAt: exhausted ? null : nextRetry(operation.attempts, now) });
  });
}

export async function markOperationStatus(operationId: string, status: QueueOperationStatus, error: string | null = null) {
  await inTransaction(STORES.syncQueue, "readwrite", async (transaction) => {
    const store = transaction.objectStore(STORES.syncQueue);
    const operation = await requestResult(store.get(operationId)) as PendingOperation | undefined;
    if (operation) store.put({ ...operation, status, error, updatedAt: new Date().toISOString(), nextRetryAt: status === "conflict" || status === "exhausted" ? null : operation.nextRetryAt });
  });
}

export async function removeOperation(operationId: string) {
  await inTransaction(STORES.syncQueue, "readwrite", async (transaction) => {
    transaction.objectStore(STORES.syncQueue).delete(operationId);
  });
}

export async function recoverInterruptedOperations() {
  const userId = await getActiveOfflineUserId();
  await inTransaction(STORES.syncQueue, "readwrite", async (transaction) => {
    const store = transaction.objectStore(STORES.syncQueue);
    const operations = await requestResult(store.getAll()) as PendingOperation[];
    const now = new Date().toISOString();
    operations.filter((operation) => operation.userId === userId && operation.status === "syncing").forEach((operation) => {
      store.put({ ...operation, status: "failed", error: "La aplicación se cerró durante la sincronización. Se reintentará.", nextRetryAt: now, updatedAt: now });
    });
  });
}

export async function retryOperationsManually() {
  const userId = await getActiveOfflineUserId();
  await inTransaction(STORES.syncQueue, "readwrite", async (transaction) => {
    const store = transaction.objectStore(STORES.syncQueue);
    const operations = await requestResult(store.getAll()) as PendingOperation[];
    const now = new Date().toISOString();
    operations.filter((operation) => operation.userId === userId && (operation.status === "failed" || operation.status === "exhausted" || operation.status === "conflict")).forEach((operation) => {
      store.put({ ...operation, status: "pending", attempts: 0, error: null, nextRetryAt: now, updatedAt: now });
    });
  });
}

async function enqueueOperation(entityType: SyncEntityType, entityId: string, operationType: PendingOperation["operationType"], payload: Record<string, unknown>) {
  const userId = await getActiveOfflineUserId();
  const now = new Date().toISOString();
  await inTransaction(STORES.syncQueue, "readwrite", async (transaction) => {
    const store = transaction.objectStore(STORES.syncQueue);
    const existing = (await getAllFromIndex<PendingOperation>(transaction, STORES.syncQueue, "by-entity-id", entityId))
      .find((operation) => operation.userId === userId && operation.entityType === entityType && operation.operationType === operationType && operation.status !== "conflict" && operation.status !== "exhausted");
    if (existing) {
      store.put({ ...existing, payload, updatedAt: now, status: "pending", error: null, nextRetryAt: now });
      return;
    }
    const operationId = crypto.randomUUID();
    store.put({ id: operationId, operationId, entityType, entityId, operationType, payload, userId, createdAt: now, updatedAt: now, attempts: 0, lastAttemptAt: null, nextRetryAt: now, status: "pending", error: null } satisfies PendingOperation);
  });
}

export async function enqueueRoutineRequest(entityId: string, request: QueuedRequest) {
  const operationType = request.method === "POST" ? "create" : request.method === "DELETE" ? "delete" : "update";
  await enqueueOperation("routine", entityId, operationType, { request });
}

export async function enqueueWorkoutSessionSync(sessionId: string, clientUpdatedAt: string) {
  await enqueueOperation("workout-session", sessionId, "update", { sessionId, clientUpdatedAt });
}
