import { describe, expect, it } from "vitest";
import { buildExerciseCoaching, buildSessionFeedback, normalizeExerciseName } from "@/lib/training-coach";

const press = (sets: Array<{ completed: boolean; weight: number | null; reps: number | null; rir?: number | null; rpe?: number | null; kind?: string | null; setNumber?: number }>) => ({
  name: "Press banca",
  muscle: "Pecho",
  targetWeight: 80,
  targetReps: 8,
  sets,
});

describe("asistente de progresión", () => {
  it("normaliza nombres para conservar referencias aunque cambie la tilde", () => {
    expect(normalizeExerciseName("  Press  Bánca ")).toBe("press banca");
  });

  it("muestra el último desempeño y recomienda una subida conservadora cuando hubo margen", () => {
    const history = [{
      id: "previous",
      finishedAt: "2026-08-01T12:00:00.000Z",
      exercises: [press([{ completed: true, weight: 80, reps: 8, rir: 3 }])],
    }];

    const coaching = buildExerciseCoaching(history, press([]));

    expect(coaching.reference).toMatchObject({ date: "2026-08-01", bestWeight: 80, bestReps: 8, estimatedOneRepMax: 101.3 });
    expect(coaching.recommendation).toMatchObject({ mode: "increase", targetWeight: 82.5, targetReps: 8 });
  });

  it("pide consolidar repeticiones antes de subir si el objetivo no se completó", () => {
    const history = [{
      id: "previous",
      finishedAt: "2026-08-01T12:00:00.000Z",
      exercises: [press([{ completed: true, weight: 80, reps: 6 }])],
    }];

    const coaching = buildExerciseCoaching(history, press([]));

    expect(coaching.recommendation).toMatchObject({ mode: "build-reps", targetWeight: 80, targetReps: 8 });
  });

  it("mantiene una referencia de repeticiones para ejercicios sin carga registrada", () => {
    const history = [{
      id: "previous",
      finishedAt: "2026-08-01T12:00:00.000Z",
      exercises: [{ name: "Flexiones", targetWeight: 0, targetReps: 15, sets: [{ completed: true, weight: 0, reps: 15 }] }],
    }];
    const exercise = { name: "Flexiones", targetWeight: 0, targetReps: 18, sets: [] };

    const coaching = buildExerciseCoaching(history, exercise);

    expect(coaching.reference).toMatchObject({ bestWeight: 0, bestReps: 15 });
    expect(coaching.recommendation).toMatchObject({ mode: "build-reps", targetWeight: 0, targetReps: 18 });
    expect(buildSessionFeedback([], { id: "current", finishedAt: "2026-08-03T12:00:00.000Z", exercises: [{ ...exercise, sets: [{ completed: true, weight: 0, reps: 18 }] }] })).toMatchObject({ completedSets: 1, completedExercises: 1, volume: 0 });
  });

  it("evalúa la progresión en una misma serie y no combina el mejor peso con otras reps", () => {
    const history = [{
      id: "previous",
      finishedAt: "2026-08-01T12:00:00.000Z",
      exercises: [press([
        { completed: true, weight: 80, reps: 8 },
        { completed: true, weight: 100, reps: 3 },
      ])],
    }];

    const coaching = buildExerciseCoaching(history, press([]));

    expect(coaching.reference).toMatchObject({ bestWeight: 100, bestReps: 3 });
    expect(coaching.recommendation).toMatchObject({ mode: "repeat", targetWeight: 80, targetReps: 8 });
  });

  it("ignora calentamientos para la referencia y detecta un PR contra el historial previo", () => {
    const history = [{
      id: "previous",
      finishedAt: "2026-08-01T12:00:00.000Z",
      exercises: [press([
        { completed: true, weight: 100, reps: 10, kind: "WARMUP" },
        { completed: true, weight: 80, reps: 8, setNumber: 2 },
      ])],
    }];
    const current = {
      id: "current",
      finishedAt: "2026-08-03T12:00:00.000Z",
      exercises: [press([{ completed: true, weight: 85, reps: 8, setNumber: 1 }])],
    };

    const coaching = buildExerciseCoaching(history, press([]));
    const feedback = buildSessionFeedback(history, current);

    expect(coaching.reference).toMatchObject({ bestWeight: 80, volume: 640 });
    expect(feedback).toMatchObject({ completedSets: 1, completedExercises: 1, volume: 680 });
    expect(feedback.records).toEqual([expect.objectContaining({ exercise: "Press banca", setNumber: 1, weight: 85, reps: 8, estimatedOneRepMax: 108, previousEstimatedOneRepMax: 101 })]);
  });

  it("no llama PR al primer registro de un ejercicio", () => {
    const current = {
      id: "first",
      finishedAt: "2026-08-03T12:00:00.000Z",
      exercises: [press([{ completed: true, weight: 85, reps: 8 }])],
    };

    expect(buildSessionFeedback([], current).records).toEqual([]);
  });
});
