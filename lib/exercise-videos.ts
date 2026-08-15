export type ExerciseVideo = {
  /** Optional: use it when the catalog ID is known. Name matching also works. */
  id?: string;
  name: string;
  videoUrl: string;
};

/**
 * Administración de tutoriales: agregá solamente `{ name, videoUrl }`.
 * Ejemplo: `{ name: "Press banca con barra", videoUrl: "/exercise-videos/press-banca.mp4" }`.
 */
export const exerciseVideos = [] as const satisfies readonly ExerciseVideo[];

function normalized(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().replace(/\s+/g, " ").toLocaleLowerCase("es");
}

export function findExerciseVideo(input: { id?: string | null; name: string }, catalog: readonly ExerciseVideo[] = exerciseVideos) {
  if (input.id) {
    const byId = catalog.find((video) => video.id === input.id);
    if (byId) return byId;
  }
  const name = normalized(input.name);
  return catalog.find((video) => normalized(video.name) === name);
}
