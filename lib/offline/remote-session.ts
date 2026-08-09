import type { OfflineWorkoutSession, OfflineWorkoutSet } from "./types";

type RemoteWorkoutSet = {
  id: string;
  setNumber: number;
  targetReps: number;
  targetWeight: number;
  reps: number | null;
  weight: number | null;
  rir: number | null;
  rpe: number | null;
  kind: string;
  note: string | null;
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type RemoteWorkoutSession = {
  id: string;
  userId: string;
  routineId: string;
  status: "IN_PROGRESS" | "FINISHED";
  startedAt: Date;
  finishedAt: Date | null;
  durationSeconds: number | null;
  notes: string | null;
  emotionalRating: number | null;
  version: number;
  clientUpdatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  exercises: Array<{
    id: string;
    routineExerciseId: string;
    position: number;
    name: string;
    muscle: string;
    sets: RemoteWorkoutSet[];
  }>;
};

function metadata(id: string, userId: string, createdAt: Date, updatedAt: Date) {
  return {
    id,
    userId,
    createdAt: createdAt.toISOString(),
    updatedAt: updatedAt.toISOString(),
    deletedAt: null,
    syncStatus: "synced" as const,
    lastSyncedAt: updatedAt.toISOString(),
    version: 1,
  };
}

function setKind(kind: string): OfflineWorkoutSet["kind"] {
  return kind === "WARMUP" || kind === "DROP" || kind === "FAILURE" ? kind : "NORMAL";
}

/** Serializes server sessions into the same shape used by the IndexedDB repository. */
export function serializeRemoteWorkoutSession(session: RemoteWorkoutSession): OfflineWorkoutSession {
  return {
    ...metadata(session.id, session.userId, session.createdAt, session.updatedAt),
    version: session.version,
    routineId: session.routineId,
    status: session.status,
    startedAt: session.startedAt.toISOString(),
    finishedAt: session.finishedAt?.toISOString() ?? null,
    durationSeconds: session.durationSeconds,
    notes: session.notes,
    emotionalRating: session.emotionalRating,
    clientUpdatedAt: session.clientUpdatedAt.toISOString(),
    exercises: session.exercises.map((exercise) => ({
      ...metadata(exercise.id, session.userId, session.createdAt, session.updatedAt),
      sessionId: session.id,
      routineExerciseId: exercise.routineExerciseId,
      position: exercise.position,
      name: exercise.name,
      muscle: exercise.muscle,
      sets: exercise.sets.map((set) => ({
        ...metadata(set.id, session.userId, set.createdAt, set.updatedAt),
        sessionId: session.id,
        sessionExerciseId: exercise.id,
        setNumber: set.setNumber,
        targetReps: set.targetReps,
        targetWeight: set.targetWeight,
        reps: set.reps,
        weight: set.weight,
        rir: set.rir,
        rpe: set.rpe,
        kind: setKind(set.kind),
        note: set.note,
        completed: set.completed,
      })),
    })),
  };
}
