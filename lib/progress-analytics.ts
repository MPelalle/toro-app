import { estimateOneRepMax } from "@/lib/workout-progress";

export type ProgressRange = "1M" | "3M" | "6M" | "1Y" | "ALL";
export type AnalyticsSet = {
  completed: boolean;
  weight: number | null;
  reps: number | null;
  kind?: string | null;
};
export type AnalyticsSession = {
  id: string;
  finishedAt: Date | string | null;
  durationSeconds: number | null;
  routineName?: string;
  exercises: Array<{ name: string; muscle: string; sets: AnalyticsSet[] }>;
};

export function rangeStart(range: ProgressRange, now = new Date()) {
  if (range === "ALL") return null;
  const months =
    range === "1M" ? 1 : range === "3M" ? 3 : range === "6M" ? 6 : 12;
  const result = new Date(now);
  result.setMonth(result.getMonth() - months);
  return result;
}

/** Beginning of the period immediately preceding `range`; ALL has no fair comparison. */
export function previousRangeStart(range: ProgressRange, now = new Date()) {
  const start = rangeStart(range, now);
  if (!start) return null;
  const previous = new Date(start);
  const months =
    range === "1M" ? 1 : range === "3M" ? 3 : range === "6M" ? 6 : 12;
  previous.setMonth(previous.getMonth() - months);
  return previous;
}

export function compareSummary(
  current: { sessions: number; volume: number; records: number },
  previous: { sessions: number; volume: number; records: number },
) {
  return {
    sessions: percent(current.sessions, previous.sessions),
    volume: percent(current.volume, previous.volume),
    records: current.records - previous.records,
  };
}

function validWorkingSet(set: AnalyticsSet) {
  return (
    set.completed &&
    set.kind !== "WARMUP" &&
    Number.isFinite(set.weight) &&
    Number.isFinite(set.reps) &&
    (set.weight || 0) >= 0 &&
    (set.reps || 0) > 0
  );
}
function dateKey(value: Date | string) {
  return new Date(value).toISOString().slice(0, 10);
}
function weekKey(value: Date | string) {
  const date = new Date(value);
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() - day + 1);
  return date.toISOString().slice(0, 10);
}
function percent(current: number, previous: number) {
  return previous > 0
    ? Math.round(((current - previous) / previous) * 1000) / 10
    : null;
}

export function buildProgressAnalytics(
  sessions: AnalyticsSession[],
  targetSessionsPerWeek: number,
) {
  const ordered = sessions
    .filter((session) => session.finishedAt)
    .sort(
      (a, b) =>
        new Date(a.finishedAt!).getTime() - new Date(b.finishedAt!).getTime(),
    );
  const muscles = new Map<
    string,
    { sets: number; weeks: Set<string>; weekly: Map<string, number> }
  >();
  const exercises = new Map<
    string,
    {
      name: string;
      muscle: string;
      points: Array<{
        date: string;
        e1rm: number;
        volume: number;
        weight: number;
        reps: number;
      }>;
      maxWeight: number;
      maxE1rm: number;
      sets: number;
    }
  >();
  const calendar = new Map<
    string,
    {
      date: string;
      workouts: number;
      volume: number;
      maxWeight: number;
      records: number;
      durationSeconds: number;
      exercises: string[];
    }
  >();
  const priorBest = new Map<string, { e1rm: number; weight: number }>();
  const routines = new Map<
    string,
    {
      name: string;
      sessions: number;
      volume: number;
      durationSeconds: number;
      lastDate: string;
    }
  >();
  const records: Array<{
    date: string;
    exercise: string;
    type: "WEIGHT" | "E1RM";
    weight: number;
    reps: number;
    estimatedOneRepMax: number;
  }> = [];
  let volume = 0;
  let durationSeconds = 0;
  let completedSets = 0;
  for (const session of ordered) {
    const date = dateKey(session.finishedAt!);
    const week = weekKey(session.finishedAt!);
    const day = calendar.get(date) || {
      date,
      workouts: 0,
      volume: 0,
      maxWeight: 0,
      records: 0,
      durationSeconds: 0,
      exercises: [],
    };
    day.workouts += 1;
    day.durationSeconds += session.durationSeconds || 0;
    durationSeconds += session.durationSeconds || 0;
    const routineName = session.routineName || "Entrenamiento libre";
    const routine = routines.get(routineName) || {
      name: routineName,
      sessions: 0,
      volume: 0,
      durationSeconds: 0,
      lastDate: date,
    };
    routine.sessions += 1;
    routine.durationSeconds += session.durationSeconds || 0;
    routine.lastDate = date > routine.lastDate ? date : routine.lastDate;
    for (const exercise of session.exercises) {
      const valid = exercise.sets.filter(validWorkingSet);
      if (!valid.length) continue;
      const key = exercise.name.trim().toLocaleLowerCase();
      const exerciseVolume = valid.reduce(
        (total, set) => total + (set.weight || 0) * (set.reps || 0),
        0,
      );
      const best = valid.reduce(
        (current, set) => {
          const e1rm = estimateOneRepMax(set.weight || 0, set.reps || 0);
          return e1rm > current.e1rm
            ? { e1rm, weight: set.weight || 0, reps: set.reps || 0 }
            : current;
        },
        { e1rm: 0, weight: 0, reps: 0 },
      );
      const item = exercises.get(key) || {
        name: exercise.name,
        muscle: exercise.muscle,
        points: [],
        maxWeight: 0,
        maxE1rm: 0,
        sets: 0,
      };
      item.points.push({
        date,
        e1rm: Math.round(best.e1rm * 10) / 10,
        volume: Math.round(exerciseVolume),
        weight: best.weight,
        reps: best.reps,
      });
      item.maxWeight = Math.max(item.maxWeight, best.weight);
      item.maxE1rm = Math.max(item.maxE1rm, best.e1rm);
      item.sets += valid.length;
      exercises.set(key, item);
      const prior = priorBest.get(key);
      if (prior && best.weight > prior.weight) {
        records.push({
          date,
          exercise: exercise.name,
          type: "WEIGHT",
          weight: best.weight,
          reps: best.reps,
          estimatedOneRepMax: Math.round(best.e1rm),
        });
        day.records += 1;
      }
      if (prior && best.e1rm > prior.e1rm + 0.01) {
        records.push({
          date,
          exercise: exercise.name,
          type: "E1RM",
          weight: best.weight,
          reps: best.reps,
          estimatedOneRepMax: Math.round(best.e1rm),
        });
        day.records += 1;
      }
      priorBest.set(key, {
        weight: Math.max(prior?.weight || 0, best.weight),
        e1rm: Math.max(prior?.e1rm || 0, best.e1rm),
      });
      const muscle = muscles.get(exercise.muscle) || {
        sets: 0,
        weeks: new Set<string>(),
        weekly: new Map<string, number>(),
      };
      muscle.sets += valid.length;
      muscle.weeks.add(week);
      muscle.weekly.set(week, (muscle.weekly.get(week) || 0) + valid.length);
      muscles.set(exercise.muscle, muscle);
      volume += exerciseVolume;
      routine.volume += exerciseVolume;
      completedSets += valid.length;
      day.volume += exerciseVolume;
      day.maxWeight = Math.max(day.maxWeight, best.weight);
      if (!day.exercises.includes(exercise.name))
        day.exercises.push(exercise.name);
    }
    routines.set(routineName, routine);
    calendar.set(date, day);
  }
  const weekSessions = new Map<string, number>();
  ordered.forEach((session) => {
    const key = weekKey(session.finishedAt!);
    weekSessions.set(key, (weekSessions.get(key) || 0) + 1);
  });
  const weeks = [...weekSessions.keys()];
  const completedWeeks = weeks.filter(
    (week) => (weekSessions.get(week) || 0) >= targetSessionsPerWeek,
  ).length;
  const currentWeek = weeks.at(-1);
  let consistencyStreak = 0;
  for (const week of [...weeks].reverse()) {
    if ((weekSessions.get(week) || 0) >= targetSessionsPerWeek)
      consistencyStreak += 1;
    else break;
  }
  const insights = [...exercises.values()]
    .flatMap((exercise) => {
      if (exercise.points.length < 2) return [];
      const first = exercise.points[0].e1rm;
      const last = exercise.points.at(-1)!.e1rm;
      const change = percent(last, first);
      if (exercise.points.length >= 6) {
        const earliest = new Date(`${exercise.points[0].date}T12:00:00Z`);
        const latest = new Date(`${exercise.points.at(-1)!.date}T12:00:00Z`);
        if (
          latest.getTime() - earliest.getTime() >= 42 * 86_400_000 &&
          change !== null &&
          Math.abs(change) <= 2
        )
          return [
            `${exercise.name}: e1RM sin cambios significativos (±2%) durante al menos 6 semanas.`,
          ];
      }
      return change !== null && Math.abs(change) >= 2
        ? [
            `${exercise.name}: e1RM ${change > 0 ? "+" : ""}${change}% en el período.`,
          ]
        : [];
    })
    .sort((a, b) => Number(b.includes("+")) - Number(a.includes("+")))
    .slice(0, 3);
  if (
    currentWeek &&
    (weekSessions.get(currentWeek) || 0) >= targetSessionsPerWeek
  )
    insights.unshift(
      `Objetivo semanal cumplido: ${weekSessions.get(currentWeek)}/${targetSessionsPerWeek} entrenamientos.`,
    );
  return {
    summary: {
      sessions: ordered.length,
      volume: Math.round(volume),
      records: records.length,
      completedSets,
      averageDurationSeconds: ordered.length
        ? Math.round(durationSeconds / ordered.length)
        : 0,
      densityPerHour: durationSeconds
        ? Math.round(volume / (durationSeconds / 3600))
        : null,
    },
    consistency: {
      targetSessionsPerWeek,
      currentWeekSessions: currentWeek ? weekSessions.get(currentWeek) || 0 : 0,
      completedWeeks,
      totalWeeks: weeks.length,
      streakWeeks: consistencyStreak,
      rate: weeks.length
        ? Math.round((completedWeeks / weeks.length) * 100)
        : 0,
    },
    calendar: [...calendar.values()].map((day) => ({
      ...day,
      volume: Math.round(day.volume),
    })),
    records: records.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 24),
    exercises: [...exercises.values()]
      .map((item) => ({
        name: item.name,
        muscle: item.muscle,
        bestWeight: item.maxWeight,
        estimatedOneRepMax: Math.round(item.maxE1rm),
        history: item.points,
        sessions: item.points.length,
        sets: item.sets,
        changePercent:
          item.points.length > 1
            ? percent(item.points.at(-1)!.e1rm, item.points[0].e1rm)
            : null,
      }))
      .sort((a, b) => b.estimatedOneRepMax - a.estimatedOneRepMax),
    muscles: [...muscles.entries()]
      .map(([name, item]) => ({
        name,
        sets: item.sets,
        frequencyPerWeek:
          Math.round((item.weeks.size / Math.max(1, weeks.length)) * 10) / 10,
        averageSetsPerWeek:
          Math.round((item.sets / Math.max(1, weeks.length)) * 10) / 10,
        weeklySets: [...item.weekly.entries()].map(([week, sets]) => ({
          week,
          sets,
        })),
      }))
      .sort((a, b) => b.sets - a.sets),
    routines: [...routines.values()]
      .map((routine) => ({
        ...routine,
        volume: Math.round(routine.volume),
        averageVolume: routine.sessions
          ? Math.round(routine.volume / routine.sessions)
          : 0,
        averageDurationSeconds: routine.sessions
          ? Math.round(routine.durationSeconds / routine.sessions)
          : 0,
      }))
      .sort((left, right) => right.sessions - left.sessions),
    insights: insights.slice(0, 4),
  };
}
