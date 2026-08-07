import { describe, expect, it } from "vitest";
import { calculatePersonalRecords, calculateWorkoutDuration, calculateWorkoutVolume } from "@/lib/workout-share/calculations";
import { formatExercisePerformance } from "@/lib/workout-share/format-exercise-performance";

const exercises = [{ id: "bench", name: "Press", sets: [{ id: "1", weight: 80, reps: 10, completed: true, isPersonalRecord: true }, { id: "2", weight: 80, reps: 10, completed: true }, { id: "3", weight: 80, reps: 8, completed: false }] }];

describe("resumen compartible del entrenamiento", () => {
  it("calcula volumen y récords solamente con series completas", () => {
    expect(calculateWorkoutVolume(exercises)).toBe(1600);
    expect(calculatePersonalRecords(exercises)).toBe(1);
  });
  it("formatea duración y rendimiento con repeticiones reales", () => {
    expect(calculateWorkoutDuration("2026-08-06T10:00:00.000Z", "2026-08-06T11:08:00.000Z")).toBe("1 H 08 MIN");
    expect(formatExercisePerformance(exercises[0].sets)).toBe("2 × 10");
    expect(formatExercisePerformance([{ id: "1", weight: 1, reps: 12, completed: true }, { id: "2", weight: 1, reps: 10, completed: true }])).toBe("2 series · 12 / 10 reps");
  });
});
