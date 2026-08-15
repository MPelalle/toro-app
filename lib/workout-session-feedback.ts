export const WORKOUT_EMOTIONAL_STATES = [
  { value: "POWERFUL", label: "Con fuerza", icon: "💪" },
  { value: "ENERGIZED", label: "Con energía", icon: "⚡" },
  { value: "SATISFIED", label: "Satisfecho", icon: "🙌" },
  { value: "CHALLENGED", label: "Desafiado", icon: "🔥" },
  { value: "RECOVERING", label: "En recuperación", icon: "🌿" },
] as const;

export type WorkoutEmotionalState = (typeof WORKOUT_EMOTIONAL_STATES)[number]["value"];

export function isWorkoutEmotionalState(value: unknown): value is WorkoutEmotionalState {
  return typeof value === "string" && WORKOUT_EMOTIONAL_STATES.some((state) => state.value === value);
}
