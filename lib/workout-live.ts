import type { OfflineWorkoutSession } from "@/lib/offline/types";

export const LIVE_WORKOUT_NOTIFICATION_TAG = "toro-live-workout";
export const LIVE_WORKOUT_PREFERENCE_KEY = "toro-live-workout-notifications";

export type LiveWorkoutAction = "complete_set" | "toggle_rest" | "open_workout";

export function getCurrentWorkoutSet(session: OfflineWorkoutSession) {
  for (const exercise of [...session.exercises].sort((a, b) => a.position - b.position)) {
    const set = [...exercise.sets]
      .sort((a, b) => a.setNumber - b.setNumber)
      .find((candidate) => !candidate.completed);
    if (set) return { exercise, set };
  }
  return null;
}

export function formatWorkoutRest(seconds: number) {
  const safeSeconds = Math.max(0, Math.ceil(seconds));
  return `${String(Math.floor(safeSeconds / 60)).padStart(2, "0")}:${String(safeSeconds % 60).padStart(2, "0")}`;
}

export function getWorkoutRoute(session: OfflineWorkoutSession) {
  return `/dashboard/routine/${encodeURIComponent(session.routineId ?? "free")}`;
}

export function isCurrentWorkoutSet(
  session: OfflineWorkoutSession,
  exerciseId: string | undefined,
  setId: string | undefined,
) {
  const current = getCurrentWorkoutSet(session);
  return Boolean(current && current.exercise.id === exerciseId && current.set.id === setId);
}

export function getLiveWorkoutNotificationContent(
  session: OfflineWorkoutSession,
  restUntil: number | null,
  pausedRestRemaining: number | null,
  now = Date.now(),
) {
  if (session.status === "FINISHED") {
    return {
      title: "TORO · Entrenamiento finalizado",
      body: session.syncStatus === "synced"
        ? "Tu sesión quedó guardada y sincronizada."
        : "Tu sesión quedó guardada en este dispositivo · pendiente de sincronización.",
      current: null,
      restLabel: null,
    };
  }

  const current = getCurrentWorkoutSet(session);
  const restSeconds = restUntil
    ? Math.max(0, Math.ceil((restUntil - now) / 1_000))
    : pausedRestRemaining;
  const restLabel = restSeconds === null ? null : formatWorkoutRest(restSeconds);
  const bodyLines = current
    ? [
        `${current.exercise.name} · Serie ${current.set.setNumber} de ${current.exercise.sets.length}`,
        `Objetivo: ${current.set.targetReps} repeticiones`,
      ]
    : ["Sesión en curso · todas las series están completas."];
  if (restLabel) bodyLines.push(`${restUntil ? "Descanso" : "Descanso pausado"}: ${restLabel}`);
  if (session.syncStatus === "pending" || session.syncStatus === "syncing")
    bodyLines.push("Guardado local · sincronización pendiente");
  else if (session.syncStatus === "failed")
    bodyLines.push("Guardado local · sincronización con error");
  else if (session.syncStatus === "conflict")
    bodyLines.push("Guardado local · conflicto de sincronización");

  return {
    title: "TORO · Entrenamiento en progreso",
    body: bodyLines.join("\n"),
    current,
    restLabel,
  };
}

export function getLiveWorkoutActions(
  session: OfflineWorkoutSession,
  restState: "running" | "paused" | null,
  maxActions: number | undefined,
) {
  const actions: Array<{ action: LiveWorkoutAction; title: string }> = [];
  if (session.status === "IN_PROGRESS") {
    if (getCurrentWorkoutSet(session))
      actions.push({ action: "complete_set", title: "Completar serie" });
    if (restState === "running")
      actions.push({ action: "toggle_rest", title: "Pausar descanso" });
    else if (restState === "paused")
      actions.push({ action: "toggle_rest", title: "Reanudar descanso" });
    else if (!restState)
      actions.push({ action: "toggle_rest", title: "Iniciar descanso" });
  }
  actions.push({ action: "open_workout", title: "Abrir TORO" });
  return actions.slice(0, Math.max(0, Math.min(3, maxActions ?? 2)));
}

export function isLiveWorkoutAction(value: unknown): value is LiveWorkoutAction {
  return value === "complete_set" || value === "toggle_rest" || value === "open_workout";
}
