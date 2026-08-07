export type CompletedSet = { id: string; weight: number; reps: number; completed: boolean; isPersonalRecord?: boolean };
export type CompletedExercise = { id: string; name: string; sets: CompletedSet[] };
export type CompletedWorkoutShareData = { workoutName: string; startedAt: Date | string; completedAt: Date | string; exercises: CompletedExercise[] };

export type WorkoutShareCardProps = { workout: CompletedWorkoutShareData };
