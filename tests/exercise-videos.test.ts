import { describe, expect, it } from "vitest";
import { findExerciseVideo } from "@/lib/exercise-videos";

const catalog = [{ name: "Press banca con barra", videoUrl: "/exercise-videos/press-banca.mp4" }, { id: "sentadilla_barra", name: "Sentadilla con barra", videoUrl: "/exercise-videos/sentadilla.mp4" }] as const;

describe("catálogo de videos de ejercicios", () => {
  it("resuelve tutoriales por nombre sin exigir cambios de componentes", () => {
    expect(findExerciseVideo({ name: "PRESS BÁNCA CON BARRA" }, catalog)?.videoUrl).toBe("/exercise-videos/press-banca.mp4");
  });

  it("prioriza el ID del catálogo cuando está disponible", () => {
    expect(findExerciseVideo({ id: "sentadilla_barra", name: "Otro nombre" }, catalog)?.videoUrl).toBe("/exercise-videos/sentadilla.mp4");
  });
});
