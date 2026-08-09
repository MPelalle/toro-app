import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { closeOfflineDatabase, inTransaction, openOfflineDatabase, requestResult } from "@/lib/offline/database";
import { clearOfflineIdentity, getActiveOfflineUserId, setActiveOfflineIdentity } from "@/lib/offline/repositories/identity";
import { hydrateRoutineHistory } from "@/lib/offline/bootstrap";
import { getUnresolvedConflicts } from "@/lib/offline/repositories/conflicts";
import { failedOperationCount, pendingOperationCount } from "@/lib/offline/repositories/operations";
import { createLocalWorkoutSession, getActiveLocalWorkoutSession, getLocalWorkoutSession, getRecentLocalWorkoutSessions, saveLocalWorkoutSession } from "@/lib/offline/repositories/workout-sessions";
import { retryPendingOperationsManually, synchronizePendingWorkoutSessions } from "@/lib/offline/sync/workout-sessions";
import { OFFLINE_DATABASE_NAME, OFFLINE_DATABASE_VERSION, STORES, type StoreName } from "@/lib/offline/schema";
import type { Routine } from "@/lib/routines";

const routine: Routine = {
  id: "routine-1",
  name: "Fuerza",
  type: "Full body",
  days: ["Lunes"],
  active: true,
  createdAt: "2026-08-06T10:00:00.000Z",
  exercises: [{ id: "exercise-1", name: "Sentadilla", muscle: "Piernas", sets: 2, reps: 8, weight: 80, technique: "Normal", completed: null, actualReps: null, note: "", trainingDay: "Lunes" }],
};

function transactionFinished(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

async function resetDatabase() {
  const database = await openOfflineDatabase();
  const stores = Object.values(STORES) as StoreName[];
  const transaction = database.transaction(stores, "readwrite");
  stores.forEach((store) => transaction.objectStore(store).clear());
  await transactionFinished(transaction);
}

async function activate(userId = "user-a") {
  await setActiveOfflineIdentity({ id: userId, email: `${userId}@toro.test`, name: userId, username: userId });
}

async function storedSession() {
  const local = createLocalWorkoutSession(routine);
  await saveLocalWorkoutSession(local);
  const session = await getLocalWorkoutSession(local.id);
  if (!session) throw new Error("La sesión no se guardó.");
  return session;
}

function mockFetch(syncResponse: () => Response | Promise<Response>) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input.toString();
    if (url === "/api/health") return new Response(null, { status: 204 });
    if (url === "/api/workout-sessions/sync") return syncResponse();
    throw new Error(`Solicitud inesperada: ${url}`);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe.sequential("persistencia offline de entrenamientos", () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    Object.defineProperty(globalThis.navigator, "onLine", { configurable: true, value: true });
    await resetDatabase();
    await activate();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("guarda, edita y elimina una serie offline sin perder la sesión", async () => {
    const session = await storedSession();
    const firstSet = session.exercises[0].sets[0];
    const edited = {
      ...session,
      exercises: session.exercises.map((exercise) => ({ ...exercise, sets: exercise.sets.map((set) => set.id === firstSet.id ? { ...set, reps: 8, weight: 92.5, rir: 2, completed: true } : set) })),
    };
    await saveLocalWorkoutSession(edited);
    const afterEdit = await getLocalWorkoutSession(session.id);
    expect(afterEdit?.exercises[0].sets[0]).toMatchObject({ reps: 8, weight: 92.5, rir: 2, completed: true });

    await saveLocalWorkoutSession({ ...afterEdit!, exercises: afterEdit!.exercises.map((exercise) => ({ ...exercise, sets: exercise.sets.filter((set) => set.id !== firstSet.id) })) });
    const afterDelete = await getLocalWorkoutSession(session.id);
    expect(afterDelete?.exercises[0].sets).toHaveLength(1);
    expect(await pendingOperationCount()).toBe(1);
  });

  it("recupera una sesión activa luego de cerrar y reabrir la base local", async () => {
    const session = await storedSession();
    await closeOfflineDatabase();
    const recovered = await getActiveLocalWorkoutSession(routine.id);
    expect(recovered?.id).toBe(session.id);
    expect(recovered?.status).toBe("IN_PROGRESS");
  });

  it("coalesce cambios repetidos en una única operación pendiente", async () => {
    const session = await storedSession();
    await saveLocalWorkoutSession({ ...session, notes: "Primera nota" });
    await saveLocalWorkoutSession({ ...session, notes: "Nota final" });
    expect(await pendingOperationCount()).toBe(1);
  });

  it("sincroniza al recuperar conexión sin duplicar el registro", async () => {
    const session = await storedSession();
    const fetchMock = mockFetch(() => Response.json({ ok: true }));
    await synchronizePendingWorkoutSessions();
    await synchronizePendingWorkoutSessions();

    const synced = await getLocalWorkoutSession(session.id);
    expect(synced?.syncStatus).toBe("synced");
    expect(await pendingOperationCount()).toBe(0);
    expect(fetchMock.mock.calls.filter(([url]) => url === "/api/workout-sessions/sync")).toHaveLength(1);
  });

  it("reintenta una operación fallida y completa la sincronización", async () => {
    await storedSession();
    let attempt = 0;
    mockFetch(() => {
      attempt += 1;
      if (attempt === 1) throw new TypeError("NetworkError");
      return Response.json({ ok: true });
    });
    await synchronizePendingWorkoutSessions();
    expect(await failedOperationCount()).toBe(1);
    await retryPendingOperationsManually();
    expect(await pendingOperationCount()).toBe(0);
    expect(attempt).toBe(2);
  });

  it("separa sesiones y cola entre usuarios", async () => {
    const session = await storedSession();
    await activate("user-b");
    expect(await getLocalWorkoutSession(session.id)).toBeUndefined();
    expect(await pendingOperationCount()).toBe(0);
    await activate("user-a");
    expect((await getLocalWorkoutSession(session.id))?.id).toBe(session.id);
    expect(await getActiveOfflineUserId()).toBe("user-a");
  });

  it("preserva una copia local cuando el servidor informa un conflicto", async () => {
    const session = await storedSession();
    mockFetch(() => Response.json({ error: "Conflicto", conflict: { version: 4, updatedAt: "2026-08-06T12:00:00.000Z" } }, { status: 409 }));
    await synchronizePendingWorkoutSessions();
    const conflicts = await getUnresolvedConflicts();
    const conflicted = await getLocalWorkoutSession(session.id);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]).toMatchObject({ entityId: session.id, userId: "user-a", remoteVersion: 4 });
    expect(conflicted?.syncStatus).toBe("conflict");
  });

  it("permite finalizar un entrenamiento completo sin conexión", async () => {
    const session = await storedSession();
    const finishedAt = "2026-08-06T11:00:00.000Z";
    await saveLocalWorkoutSession({ ...session, status: "FINISHED", finishedAt, durationSeconds: 3_600, notes: "Buen entrenamiento", emotionalRating: 5, exercises: session.exercises.map((exercise) => ({ ...exercise, sets: exercise.sets.map((set) => ({ ...set, reps: 8, weight: 80, completed: true })) })) });
    const finished = await getLocalWorkoutSession(session.id);
    expect(finished).toMatchObject({ status: "FINISHED", finishedAt, durationSeconds: 3_600, emotionalRating: 5, notes: "Buen entrenamiento" });
    expect(finished?.exercises[0].sets.every((set) => set.completed)).toBe(true);
  });

  it("recupera el historial terminado local para asistir la próxima sesión", async () => {
    const first = await storedSession();
    const second = await storedSession();
    await saveLocalWorkoutSession({ ...first, status: "FINISHED", finishedAt: "2026-08-05T10:00:00.000Z", durationSeconds: 1_800 });
    await saveLocalWorkoutSession({ ...second, status: "FINISHED", finishedAt: "2026-08-06T10:00:00.000Z", durationSeconds: 1_800 });

    const history = await getRecentLocalWorkoutSessions(routine.id);

    expect(history.map((session) => session.id)).toEqual([second.id, first.id]);
    expect(history.every((session) => session.status === "FINISHED")).toBe(true);
  });

  it("hidrata el historial remoto solo después de fijar la identidad local", async () => {
    const local = createLocalWorkoutSession(routine);
    const remote = {
      ...local,
      status: "FINISHED" as const,
      finishedAt: "2026-08-06T10:00:00.000Z",
      durationSeconds: 1_800,
      clientUpdatedAt: "2026-08-06T10:00:00.000Z",
      updatedAt: "2026-08-06T10:00:00.000Z",
    };
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input) === `/api/offline/routines/${routine.id}/history`) return Response.json({ recentSessions: [remote], downloadedAt: "2026-08-06T10:00:00.000Z" });
      throw new Error(`Solicitud inesperada: ${input}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    await clearOfflineIdentity(true);
    await expect(hydrateRoutineHistory(routine.id)).resolves.toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();

    await activate();
    await hydrateRoutineHistory(routine.id);

    expect((await getLocalWorkoutSession(remote.id))?.status).toBe("FINISHED");
    expect((await getLocalWorkoutSession(remote.id))?.syncStatus).toBe("synced");
    expect(await pendingOperationCount()).toBe(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("migra una base v1 a la versión actual sin descartar la rutina", async () => {
    await closeOfflineDatabase();
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase(OFFLINE_DATABASE_NAME);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(OFFLINE_DATABASE_NAME, 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore(STORES.routines, { keyPath: "id" });
        request.result.createObjectStore(STORES.workoutSessions, { keyPath: "id" });
        request.result.createObjectStore(STORES.syncQueue, { keyPath: "id" });
      };
      request.onsuccess = () => {
        const database = request.result;
        const transaction = database.transaction(STORES.routines, "readwrite");
        transaction.objectStore(STORES.routines).put({ id: "legacy-routine", value: { id: "legacy-routine", name: "Anterior", type: "Fullbody", days: ["Lunes"], exercises: [] } });
        transaction.oncomplete = () => { database.close(); resolve(); };
        transaction.onerror = () => reject(transaction.error);
      };
      request.onerror = () => reject(request.error);
    });

    const migrated = await openOfflineDatabase();
    expect(migrated.version).toBe(OFFLINE_DATABASE_VERSION);
    const legacyRoutine = await inTransaction(STORES.routines, "readonly", (transaction) => requestResult(transaction.objectStore(STORES.routines).get("legacy-routine")));
    expect(legacyRoutine).toMatchObject({ id: "legacy-routine", userId: "legacy-local-user", syncStatus: "synced", name: "Anterior" });
  });
});
