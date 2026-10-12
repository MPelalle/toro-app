import { describe, expect, it } from "vitest";
import type { OfflineWorkoutSession } from "@/lib/offline/types";
import {
  formatWorkoutRest,
  getCurrentWorkoutSet,
  getLiveWorkoutActions,
  getLiveWorkoutNotificationContent,
  getWorkoutRoute,
  isCurrentWorkoutSet,
  isLiveWorkoutAction,
} from "@/lib/workout-live";

const session: OfflineWorkoutSession = {
  id: "session-12345678",
  userId: "user",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  deletedAt: null,
  syncStatus: "synced",
  lastSyncedAt: null,
  version: 1,
  routineId: "routine-12345678",
  status: "IN_PROGRESS",
  startedAt: "2026-01-01T00:00:00.000Z",
  finishedAt: null,
  durationSeconds: null,
  notes: null,
  emotionalRating: null,
  emotionalState: null,
  clientUpdatedAt: "2026-01-01T00:00:00.000Z",
  exercises: [
    {
      id: "exercise",
      userId: "user",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      deletedAt: null,
      syncStatus: "pending",
      lastSyncedAt: null,
      version: 1,
      sessionId: "session-12345678",
      routineExerciseId: null,
      catalogExerciseId: null,
      position: 0,
      name: "Jalón al pecho",
      muscle: "Espalda",
      restSeconds: null,
      supersetGroupId: null,
      sets: [
        {
          id: "set-1",
          userId: "user",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
          deletedAt: null,
          syncStatus: "pending",
          lastSyncedAt: null,
          version: 1,
          sessionId: "session-12345678",
          sessionExerciseId: "exercise",
          setNumber: 1,
          targetReps: 10,
          targetWeight: 0,
          reps: null,
          weight: null,
          rir: null,
          rpe: null,
          kind: "NORMAL",
          completed: false,
          note: null,
        },
      ],
    },
  ],
};

describe("live workout notification state", () => {
  it("derives the current exercise, set, repetition target and rest from the session", () => {
    const content = getLiveWorkoutNotificationContent(session, 91_000, null, 7_000);
    expect(content.body).toBe("Jalón al pecho · Serie 1 de 1\nObjetivo: 10 repeticiones\nDescanso: 01:24");
    expect(getCurrentWorkoutSet(session)?.set.id).toBe("set-1");
    expect(isCurrentWorkoutSet(session, "exercise", "set-1")).toBe(true);
    expect(content.restLabel).toBe("01:24");
    expect(getLiveWorkoutNotificationContent(
      { ...session, syncStatus: "pending" },
      null,
      null,
    ).body).toContain("Guardado local · sincronización pendiente");
  });

  it("rejects an action from a notification whose set has already changed", () => {
    const completed: OfflineWorkoutSession = {
      ...session,
      exercises: session.exercises.map((exercise) => ({
        ...exercise,
        sets: exercise.sets.map((set) => ({ ...set, completed: true })),
      })),
    };
    expect(isCurrentWorkoutSet(completed, "exercise", "set-1")).toBe(false);
    expect(isCurrentWorkoutSet(session, "exercise", "stale-set")).toBe(false);
  });

  it("prioritizes available actions and respects a browser's action limit", () => {
    expect(getLiveWorkoutActions(session, "running", 2)).toEqual([
      { action: "complete_set", title: "Completar serie" },
      { action: "toggle_rest", title: "Pausar descanso" },
    ]);
    expect(getLiveWorkoutActions(session, "paused", 3).map(({ title }) => title)).toEqual([
      "Completar serie",
      "Reanudar descanso",
      "Abrir TORO",
    ]);
  });

  it("formats remaining time, resolves the session route and rejects unknown actions", () => {
    expect(formatWorkoutRest(65)).toBe("01:05");
    expect(getWorkoutRoute(session)).toBe("/dashboard/routine/routine-12345678");
    expect(isLiveWorkoutAction("complete_set")).toBe(true);
    expect(isLiveWorkoutAction("delete_session")).toBe(false);
  });
});
