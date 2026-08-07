import type { CompletedExercise } from "@/types/workout-share";

export function calculateWorkoutVolume(exercises: CompletedExercise[]) {
  return exercises.flatMap((exercise) => exercise.sets).filter((set) => set.completed && Number.isFinite(set.weight) && Number.isFinite(set.reps)).reduce((total, set) => total + set.weight * set.reps, 0);
}

export function calculateWorkoutDuration(startedAt: Date | string, completedAt: Date | string) {
  const milliseconds = new Date(completedAt).getTime() - new Date(startedAt).getTime();
  const minutes = Math.max(0, Math.floor(milliseconds / 60_000));
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return hours ? `${hours} H ${String(remainingMinutes).padStart(2, "0")} MIN` : `${remainingMinutes} MIN`;
}

export function calculatePersonalRecords(exercises: CompletedExercise[]) {
  return exercises.flatMap((exercise) => exercise.sets).filter((set) => set.completed && set.isPersonalRecord === true).length;
}
