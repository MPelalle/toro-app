export type ProgressSet = { completed: boolean; weight: number | null; reps: number | null };
export type ProgressSession = {
  id: string;
  finishedAt: Date | string | null;
  updatedAt?: Date | string;
  exercises: Array<{ name: string; muscle: string; sets: ProgressSet[] }>;
};

export type ProgressRecord = { date: string; exercise: string; estimatedOneRepMax: number; weight: number; reps: number };
export type ProgressCalendarDay = { date: string; workouts: number; volume: number; maxWeight: number; records: number };
export type ExerciseProgress = {
  name: string;
  muscle: string;
  bestWeight: number;
  estimatedOneRepMax: number;
  history: Array<{ date: string; volume: number; maxWeight: number; estimatedOneRepMax: number }>;
};

function dateKey(value: Date | string) {
  return new Date(value).toISOString().slice(0, 10);
}

function number(value: number | null) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : 0;
}

export function estimateOneRepMax(weight: number, reps: number) {
  if (weight <= 0 || reps <= 0) return 0;
  return weight * (1 + reps / 30);
}

export function buildWorkoutProgress(sessions: ProgressSession[]) {
  const calendar = new Map<string, ProgressCalendarDay>();
  const exercises = new Map<string, ExerciseProgress>();
  const bestEstimatedMax = new Map<string, number>();
  const records: ProgressRecord[] = [];
  let totalVolume = 0;
  let completedSessions = 0;

  const ordered = [...sessions]
    .filter((session) => session.finishedAt)
    .sort((a, b) => new Date(a.finishedAt!).getTime() - new Date(b.finishedAt!).getTime() || a.id.localeCompare(b.id));

  for (const session of ordered) {
    const date = dateKey(session.finishedAt!);
    const day = calendar.get(date) || { date, workouts: 0, volume: 0, maxWeight: 0, records: 0 };
    day.workouts += 1;
    completedSessions += 1;

    for (const exercise of session.exercises) {
      const completed = exercise.sets.filter((set) => set.completed && number(set.weight) > 0 && number(set.reps) > 0);
      if (!completed.length) continue;

      const key = exercise.name.trim().toLocaleLowerCase();
      const volume = completed.reduce((sum, set) => sum + number(set.weight) * number(set.reps), 0);
      const maxWeight = Math.max(...completed.map((set) => number(set.weight)));
      const bestSet = completed.reduce((best, set) => {
        const e1rm = estimateOneRepMax(number(set.weight), number(set.reps));
        return e1rm > best.e1rm ? { e1rm, weight: number(set.weight), reps: number(set.reps) } : best;
      }, { e1rm: 0, weight: 0, reps: 0 });
      const priorBest = bestEstimatedMax.get(key) || 0;
      const isNewRecord = priorBest > 0 && bestSet.e1rm > priorBest + 0.01;

      if (isNewRecord) {
        records.push({ date, exercise: exercise.name, estimatedOneRepMax: Math.round(bestSet.e1rm), weight: bestSet.weight, reps: bestSet.reps });
        day.records += 1;
      }
      bestEstimatedMax.set(key, Math.max(priorBest, bestSet.e1rm));

      const current = exercises.get(key) || { name: exercise.name, muscle: exercise.muscle, bestWeight: 0, estimatedOneRepMax: 0, history: [] };
      current.bestWeight = Math.max(current.bestWeight, maxWeight);
      current.estimatedOneRepMax = Math.max(current.estimatedOneRepMax, bestSet.e1rm);
      current.history.push({ date, volume: Math.round(volume), maxWeight, estimatedOneRepMax: Math.round(bestSet.e1rm) });
      exercises.set(key, current);
      day.volume += volume;
      day.maxWeight = Math.max(day.maxWeight, maxWeight);
      totalVolume += volume;
    }
    calendar.set(date, day);
  }

  return {
    summary: { sessions: completedSessions, volume: Math.round(totalVolume), records: records.length },
    calendar: [...calendar.values()].map((day) => ({ ...day, volume: Math.round(day.volume) })),
    records: records.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 12),
    exercises: [...exercises.values()].map((exercise) => ({
      ...exercise,
      bestWeight: Math.round(exercise.bestWeight * 100) / 100,
      estimatedOneRepMax: Math.round(exercise.estimatedOneRepMax),
      history: exercise.history.slice(-12),
    })).sort((a, b) => b.estimatedOneRepMax - a.estimatedOneRepMax),
  };
}
