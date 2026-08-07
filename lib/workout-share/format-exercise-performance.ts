import type { CompletedSet } from "@/types/workout-share";

export function formatExercisePerformance(sets: CompletedSet[]) {
  const completed = sets.filter((set) => set.completed && Number.isFinite(set.reps) && set.reps > 0);
  if (!completed.length) return null;
  const reps = completed.map((set) => set.reps);
  return reps.every((rep) => rep === reps[0]) ? `${completed.length} × ${reps[0]}` : `${completed.length} series · ${reps.join(" / ")} reps`;
}
