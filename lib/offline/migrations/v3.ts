import { STORES } from "../schema";
import type { PendingOperation, QueuedRequest } from "../types";

type UnknownRecord = Record<string, unknown>;
const isRecord = (value: unknown): value is UnknownRecord => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const stringValue = (value: unknown, fallback = "") => typeof value === "string" && value ? value : fallback;
const numberValue = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? value : 0;

export function migrateVersionTwoToThree(transaction: IDBTransaction) {
  const store = transaction.objectStore(STORES.syncQueue);
  const request = store.openCursor();
  request.onsuccess = () => {
    const cursor = request.result;
    if (!cursor) return;
    const source = isRecord(cursor.value) ? cursor.value : null;
    if (!source) {
      cursor.continue();
      return;
    }
    const operationId = stringValue(source.operationId, stringValue(source.id));
    const requestPayload = isRecord(source.request) ? source.request as QueuedRequest : null;
    const isRoutine = source.type === "SYNC_ROUTINE_REQUEST" || requestPayload !== null;
    const method = requestPayload?.method;
    const operation: PendingOperation = {
      id: operationId,
      operationId,
      entityType: isRoutine ? "routine" : "workout-session",
      entityId: stringValue(source.entityId, stringValue(source.sessionId)),
      operationType: isRoutine ? (method === "POST" ? "create" : method === "DELETE" ? "delete" : "update") : "update",
      payload: isRoutine && requestPayload ? { request: requestPayload } : { sessionId: stringValue(source.entityId, stringValue(source.sessionId)) },
      userId: stringValue(source.userId, "legacy-local-user"),
      createdAt: stringValue(source.createdAt, new Date().toISOString()),
      updatedAt: stringValue(source.updatedAt, stringValue(source.createdAt, new Date().toISOString())),
      attempts: numberValue(source.attempts),
      lastAttemptAt: null,
      nextRetryAt: new Date().toISOString(),
      status: source.syncStatus === "conflict" ? "conflict" : "pending",
      error: typeof source.lastError === "string" ? source.lastError : null,
    };
    cursor.update(operation);
    cursor.continue();
  };
}
