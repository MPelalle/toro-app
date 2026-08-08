export const SYNC_STATUSES = ["synced", "pending", "syncing", "failed", "conflict"] as const;
export type SyncStatus = (typeof SYNC_STATUSES)[number];

export type SyncMetadata = {
  id: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  syncStatus: SyncStatus;
  lastSyncedAt: string | null;
  version: number;
};

export type LocalUser = SyncMetadata & {
  email: string | null;
  name: string | null;
  username: string | null;
};

export type LocalRoutine = SyncMetadata & {
  name: string;
  type: string;
  kind?: "PERSONAL" | "SHARED";
  active: boolean;
};

export type LocalRoutineDay = SyncMetadata & {
  routineId: string;
  position: number;
  name: string;
};

export type LocalRoutineExercise = SyncMetadata & {
  routineId: string;
  routineDayId: string | null;
  position: number;
  name: string;
  muscle: string;
  targetSets: number;
  targetReps: number;
  targetWeight: number;
  technique: string;
  completed: boolean | null;
  actualReps: number | null;
  note: string;
  trainingDay: string;
};

export type OfflineWorkoutSet = SyncMetadata & {
  sessionId: string;
  sessionExerciseId: string;
  setNumber: number;
  targetReps: number;
  targetWeight: number;
  reps: number | null;
  weight: number | null;
  rir: number | null;
  rpe: number | null;
  kind: "WARMUP" | "NORMAL" | "DROP" | "FAILURE";
  completed: boolean;
  note: string | null;
};

export type OfflineWorkoutExercise = SyncMetadata & {
  sessionId: string;
  routineExerciseId: string;
  position: number;
  name: string;
  muscle: string;
};

export type OfflineWorkoutSession = SyncMetadata & {
  routineId: string;
  status: "IN_PROGRESS" | "FINISHED";
  startedAt: string;
  finishedAt: string | null;
  durationSeconds: number | null;
  notes: string | null;
  emotionalRating: number | null;
  clientUpdatedAt: string;
  exercises: Array<OfflineWorkoutExercise & { sets: OfflineWorkoutSet[] }>;
};

export type WorkoutSessionRow = Omit<OfflineWorkoutSession, "exercises">;

export type SyncEntityType = "workout-session" | "routine";
export type QueueOperationType = "create" | "update" | "delete";
export type QueueOperationStatus = "pending" | "syncing" | "failed" | "conflict" | "exhausted";

export type QueuedRequest = {
  url: string;
  method: "POST" | "PATCH" | "DELETE";
  body: string | null;
};

export type PendingOperation = {
  id: string;
  operationId: string;
  entityType: SyncEntityType;
  entityId: string;
  operationType: QueueOperationType;
  payload: Record<string, unknown>;
  userId: string;
  createdAt: string;
  updatedAt: string;
  attempts: number;
  lastAttemptAt: string | null;
  nextRetryAt: string | null;
  status: QueueOperationStatus;
  error: string | null;
};

export type LocalSyncMetadata = {
  key: string;
  value: string;
  updatedAt: string;
};

export type ConflictBackup = {
  id: string;
  entityType: SyncEntityType;
  entityId: string;
  userId: string;
  createdAt: string;
  localVersion: number;
  localUpdatedAt: string;
  remoteVersion: number | null;
  remoteUpdatedAt: string | null;
  reason: string;
  localSnapshot: string;
  resolvedAt: string | null;
  resolution: "keep-local" | "keep-remote" | "duplicate" | null;
};

export const LEGACY_LOCAL_USER_ID = "legacy-local-user";
