import { estimateOneRepMax } from "./workout-progress";
import { appDateKey } from "./app-date";

/**
 * Datos mínimos para generar indicaciones de entrenamiento. Son deliberadamente
 * estructurales para que el mismo cálculo funcione con sesiones del servidor y
 * con las copias guardadas en IndexedDB.
 */
export type TrainingCoachSet = {
  setNumber?: number;
  completed: boolean;
  weight: number | null;
  reps: number | null;
  rir?: number | null;
  rpe?: number | null;
  kind?: string | null;
  targetWeight?: number | null;
  targetReps?: number | null;
};

export type TrainingCoachExercise = {
  name: string;
  muscle?: string;
  targetWeight?: number | null;
  targetReps?: number | null;
  targetSets?: number | null;
  sets: TrainingCoachSet[];
};

export type TrainingCoachSession = {
  id: string;
  finishedAt: Date | string | null;
  updatedAt?: Date | string;
  startedAt?: Date | string;
  exercises: TrainingCoachExercise[];
};

export type ExerciseReference = {
  date: string;
  completedSets: number;
  volume: number;
  bestWeight: number;
  bestReps: number;
  estimatedOneRepMax: number;
};

export type ProgressionRecommendation = {
  mode: "start" | "increase" | "repeat" | "build-reps";
  targetWeight: number;
  targetReps: number;
  message: string;
};

export type ExerciseCoaching = {
  name: string;
  reference: ExerciseReference | null;
  recommendation: ProgressionRecommendation;
};

export type PersonalRecord = {
  exercise: string;
  setNumber: number;
  weight: number;
  reps: number;
  estimatedOneRepMax: number;
  previousEstimatedOneRepMax: number;
};

export type SessionFeedback = {
  completedSets: number;
  completedExercises: number;
  volume: number;
  records: PersonalRecord[];
  message: string;
};

const RECORD_EPSILON = 0.01;

function number(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : 0;
}

function positiveNumber(value: number | null | undefined) {
  const result = number(value);
  return result > 0 ? result : 0;
}

function dateValue(session: TrainingCoachSession) {
  return session.finishedAt || session.updatedAt || session.startedAt || "";
}

function dateTimestamp(value: Date | string) {
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function dateKey(value: Date | string) {
  return dateTimestamp(value) ? appDateKey(value) : "";
}

function formatWeight(weight: number) {
  return Number.isInteger(weight) ? String(weight) : weight.toFixed(1).replace(".0", "");
}

function roundToAvailablePlate(weight: number) {
  return Math.round(weight * 2) / 2;
}

function suggestedIncrement(weight: number) {
  return weight < 20 ? 1 : 2.5;
}

function isWarmup(set: TrainingCoachSet) {
  return set.kind?.toUpperCase() === "WARMUP";
}

export function normalizeExerciseName(name: string) {
  return name.trim().replace(/\s+/g, " ").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase();
}

export function completedWorkingSets(sets: TrainingCoachSet[]) {
  return sets.filter((set) => set.completed && !isWarmup(set) && positiveNumber(set.reps) > 0 && (set.weight !== null || set.targetWeight === 0));
}

function referenceFromSets(date: string, sets: TrainingCoachSet[]): ExerciseReference | null {
  const completed = completedWorkingSets(sets);
  if (!completed.length) return null;

  const bestSet = completed.reduce((best, set) => {
    const weight = number(set.weight);
    const reps = number(set.reps);
    const estimated = estimateOneRepMax(weight, reps);
    return estimated > best.estimatedOneRepMax || (estimated === best.estimatedOneRepMax && (weight > best.weight || (weight === best.weight && reps > best.reps)))
      ? { weight, reps, estimatedOneRepMax: estimated }
      : best;
  }, { weight: 0, reps: 0, estimatedOneRepMax: 0 });

  return {
    date,
    completedSets: completed.length,
    volume: Math.round(completed.reduce((total, set) => total + number(set.weight) * number(set.reps), 0)),
    bestWeight: bestSet.weight,
    bestReps: bestSet.reps,
    estimatedOneRepMax: Math.round(bestSet.estimatedOneRepMax * 10) / 10,
  };
}

function historyForExercise(history: TrainingCoachSession[], exerciseName: string, currentSessionId?: string) {
  const key = normalizeExerciseName(exerciseName);
  return history
    .filter((session) => session.id !== currentSessionId && Boolean(session.finishedAt))
    .sort((left, right) => dateTimestamp(dateValue(left) as Date | string) - dateTimestamp(dateValue(right) as Date | string) || left.id.localeCompare(right.id))
    .flatMap((session) => {
      const date = dateKey(dateValue(session) as Date | string);
      const sets = session.exercises
        .filter((exercise) => normalizeExerciseName(exercise.name) === key)
        .flatMap((exercise) => exercise.sets);
      const reference = referenceFromSets(date, sets);
      return reference ? [reference] : [];
    });
}

function latestWorkingSetsForExercise(history: TrainingCoachSession[], exerciseName: string, currentSessionId?: string) {
  const key = normalizeExerciseName(exerciseName);
  const ordered = history
    .filter((session) => session.id !== currentSessionId && Boolean(session.finishedAt))
    .sort((left, right) => dateTimestamp(dateValue(right) as Date | string) - dateTimestamp(dateValue(left) as Date | string) || right.id.localeCompare(left.id));

  for (const session of ordered) {
    const completed = completedWorkingSets(session.exercises
      .filter((exercise) => normalizeExerciseName(exercise.name) === key)
      .flatMap((exercise) => exercise.sets));
    if (completed.length) return completed;
  }
  return [];
}

function targetsFor(exercise: TrainingCoachExercise) {
  const setTarget = exercise.sets.find((set) => positiveNumber(set.targetReps) > 0 || positiveNumber(set.targetWeight) > 0);
  return {
    weight: positiveNumber(exercise.targetWeight) || positiveNumber(setTarget?.targetWeight),
    reps: positiveNumber(exercise.targetReps) || positiveNumber(setTarget?.targetReps),
  };
}

function recommendationFor(exercise: TrainingCoachExercise, reference: ExerciseReference | null, lastWorkingSets: TrainingCoachSet[]): ProgressionRecommendation {
  const targets = targetsFor(exercise);
  const targetReps = targets.reps || 8;
  const targetWeight = targets.weight;

  if (!reference) {
    return {
      mode: "start",
      targetWeight,
      targetReps,
      message: targetWeight > 0
        ? `Empezá con ${formatWeight(targetWeight)} kg × ${targetReps} reps y dejá 1–2 reps en reserva.`
        : `Buscá ${targetReps} reps con técnica sólida y dejá 1–2 reps en reserva.`,
    };
  }

  if (targetWeight <= 0) {
    return {
      mode: "build-reps",
      targetWeight: 0,
      targetReps,
      message: `Tu última referencia fue ${reference.bestReps} reps. Buscá ${targetReps} reps con técnica sólida.`,
    };
  }

  const targetSets = lastWorkingSets.filter((set) => number(set.weight) >= targetWeight && number(set.reps) >= targetReps);
  const workingWeight = targetSets.length ? Math.max(...targetSets.map((set) => number(set.weight))) : targetWeight;
  const workingSets = targetSets.filter((set) => number(set.weight) === workingWeight);
  const workingReps = Math.max(...workingSets.map((set) => number(set.reps)), 0);
  const hasHeadroom = workingSets.some((set) => number(set.rir) >= 2 || (number(set.rpe) > 0 && number(set.rpe) <= 8) || number(set.reps) >= targetReps + 2);

  // El RIR/RPE es opcional. Sin esa referencia solo se sugiere aumentar cuando
  // la misma carga superó el objetivo por dos o más repeticiones.
  if (targetSets.length && hasHeadroom) {
    const nextWeight = roundToAvailablePlate(workingWeight + suggestedIncrement(workingWeight));
    return {
      mode: "increase",
      targetWeight: nextWeight,
      targetReps,
      message: `Venís de ${formatWeight(workingWeight)} kg × ${workingReps}. Probá ${formatWeight(nextWeight)} kg × ${targetReps} reps.`,
    };
  }

  if (!targetSets.length) {
    return {
      mode: "build-reps",
      targetWeight,
      targetReps,
      message: `Mantené ${formatWeight(targetWeight)} kg y buscá ${targetReps} reps antes de subir carga.`,
    };
  }

  return {
    mode: "repeat",
    targetWeight: workingWeight,
    targetReps,
    message: `Repetí ${formatWeight(workingWeight)} kg × ${targetReps} reps para consolidar la carga.`,
  };
}

export function buildExerciseCoaching(history: TrainingCoachSession[], exercise: TrainingCoachExercise, currentSessionId?: string): ExerciseCoaching {
  const references = historyForExercise(history, exercise.name, currentSessionId);
  const lastWorkingSets = latestWorkingSetsForExercise(history, exercise.name, currentSessionId);
  const reference = references.at(-1) || null;

  return {
    name: exercise.name,
    reference,
    recommendation: recommendationFor(exercise, reference, lastWorkingSets),
  };
}

export function buildSessionFeedback(history: TrainingCoachSession[], current: TrainingCoachSession): SessionFeedback {
  const priorSessions = history.filter((session) => session.id !== current.id);
  const records: PersonalRecord[] = [];
  let completedSets = 0;
  let completedExercises = 0;
  let volume = 0;

  for (const exercise of current.exercises) {
    const completed = completedWorkingSets(exercise.sets);
    if (!completed.length) continue;
    completedExercises += 1;
    completedSets += completed.length;
    volume += completed.reduce((total, set) => total + number(set.weight) * number(set.reps), 0);

    const references = historyForExercise(priorSessions, exercise.name);
    const priorBest = Math.max(...references.map((item) => item.estimatedOneRepMax), 0);
    if (!priorBest) continue;

    const recordSet = completed
      .map((set, index) => ({ set, setNumber: set.setNumber || index + 1, estimatedOneRepMax: estimateOneRepMax(number(set.weight), number(set.reps)) }))
      .filter((item) => item.estimatedOneRepMax > priorBest + RECORD_EPSILON)
      .sort((left, right) => right.estimatedOneRepMax - left.estimatedOneRepMax || number(right.set.weight) - number(left.set.weight))[0];

    if (recordSet) {
      records.push({
        exercise: exercise.name,
        setNumber: recordSet.setNumber,
        weight: number(recordSet.set.weight),
        reps: number(recordSet.set.reps),
        estimatedOneRepMax: Math.round(recordSet.estimatedOneRepMax),
        previousEstimatedOneRepMax: Math.round(priorBest),
      });
    }
  }

  const message = records.length
    ? `${records.length} récord ${records.length === 1 ? "nuevo" : "nuevos"} estimado${records.length === 1 ? "" : "s"}. Gran sesión.`
    : completedSets
      ? "Sesión guardada. Priorizá técnica sólida antes de perseguir más carga."
      : "Marcá las series completadas para registrar tu próxima referencia.";

  return { completedSets, completedExercises, volume: Math.round(volume), records, message };
}
