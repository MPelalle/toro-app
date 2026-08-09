export const PRESENCE_WINDOW_MS = 2 * 60 * 1_000;
export const ACTIVE_WORKOUT_WINDOW_MS = 6 * 60 * 60 * 1_000;

export type PresenceStatus = "TRAINING" | "ONLINE" | "OFFLINE";

export function presenceStatus(lastActiveAt: Date | null, activeWorkoutStartedAt: Date | null, now = new Date()): PresenceStatus {
  const recentlyActive = Boolean(lastActiveAt && now.getTime() - lastActiveAt.getTime() <= PRESENCE_WINDOW_MS);
  if (!recentlyActive) return "OFFLINE";
  const activeWorkout = Boolean(activeWorkoutStartedAt && now.getTime() - activeWorkoutStartedAt.getTime() <= ACTIVE_WORKOUT_WINDOW_MS);
  return activeWorkout ? "TRAINING" : "ONLINE";
}
