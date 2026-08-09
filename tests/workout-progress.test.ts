import { describe, expect, it } from "vitest";
import { buildWorkoutProgress, estimateOneRepMax } from "@/lib/workout-progress";

describe("progreso de entrenamiento", () => {
  it("estima el 1RM con la fórmula de Epley", () => {
    expect(estimateOneRepMax(100, 5)).toBeCloseTo(116.67, 2);
  });

  it("resume volumen por día y detecta un nuevo récord solo frente a historial previo", () => {
    const progress = buildWorkoutProgress([
      { id: "1", finishedAt: "2026-08-01T12:00:00.000Z", exercises: [{ name: "Press banca", muscle: "Pecho", sets: [{ completed: true, weight: 80, reps: 8 }] }] },
      { id: "2", finishedAt: "2026-08-03T12:00:00.000Z", exercises: [{ name: "Press banca", muscle: "Pecho", sets: [{ completed: true, weight: 85, reps: 8 }, { completed: false, weight: 100, reps: 1 }] }] },
    ]);

    expect(progress.summary).toMatchObject({ sessions: 2, volume: 1320, records: 1 });
    expect(progress.calendar).toEqual(expect.arrayContaining([expect.objectContaining({ date: "2026-08-03", volume: 680, maxWeight: 85, records: 1 })]));
    expect(progress.records[0]).toMatchObject({ exercise: "Press banca", estimatedOneRepMax: 108, weight: 85, reps: 8 });
    expect(progress.exercises[0]).toMatchObject({ bestWeight: 85, estimatedOneRepMax: 108 });
  });
});
