import { describe, expect, it } from "vitest";
import { isWorkoutEmotionalState } from "@/lib/workout-session-feedback";

describe("estados emocionales post-entreno", () => {
  it("acepta únicamente los estados que puede guardar una sesión", () => {
    expect(isWorkoutEmotionalState("POWERFUL")).toBe(true);
    expect(isWorkoutEmotionalState("RECOVERING")).toBe(true);
    expect(isWorkoutEmotionalState("anything-else")).toBe(false);
    expect(isWorkoutEmotionalState(null)).toBe(false);
  });
});
