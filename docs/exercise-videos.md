# Videos de ejecución

No hace falta modificar componentes ni agregar condiciones por nombre. Para publicar un tutorial:

1. Copiá el archivo, por ejemplo, a `public/exercise-videos/press-banca.mp4`.
2. Agregá una entrada en `lib/exercise-videos.ts`:

```ts
export const exerciseVideos = [
  { name: "Press banca con barra", videoUrl: "/exercise-videos/press-banca.mp4" },
] as const satisfies readonly ExerciseVideo[];
```

El `id` del catálogo es opcional, pero puede usarse para evitar ambigüedades:

```ts
{ id: "press_banca_barra", name: "Press banca con barra", videoUrl: "/exercise-videos/press-banca.mp4" }
```

TORO muestra automáticamente **Ver ejecución** en el constructor, el entrenamiento, los editores compatibles y los detalles de la biblioteca. Si no existe una entrada, no muestra botón.
