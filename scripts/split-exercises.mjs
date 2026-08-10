import sharp from "sharp";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = path.resolve(__dirname, "..");

const JSON_PATH = path.join(
  ROOT,
  "ejercicios_por_grupo_muscular.json"
);

const GRIDS_DIR = path.join(
  ROOT,
  "public",
  "exercises",
  "grids"
);

const OUTPUT_DIR = path.join(
  ROOT,
  "public",
  "exercises"
);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const OUTPUT_SIZE = 256;

const COLUMNS = 4;

/**
 * Detecta el verde lima de las líneas.
 */
function isLime(r, g, b) {
  return (
    g > 90 &&
    g > r * 1.12 &&
    g > b * 1.5 &&
    r > 35 &&
    b < 120
  );
}

/**
 * Agrupa píxeles consecutivos en una sola línea/banda.
 */
function groupBands(values, maxGap = 3) {
  if (!values.length) return [];

  const groups = [];
  let current = [values[0]];

  for (let i = 1; i < values.length; i++) {
    const value = values[i];

    if (value - current[current.length - 1] <= maxGap) {
      current.push(value);
    } else {
      groups.push(current);
      current = [value];
    }
  }

  groups.push(current);

  return groups.map((group) => ({
    start: group[0],
    end: group[group.length - 1],
    center: Math.round(
      group.reduce((sum, value) => sum + value, 0) /
        group.length
    ),
  }));
}

/**
 * Detecta los 8 bordes verticales y
 * los 8 bordes horizontales reales.
 */
async function detectGrid(imagePath) {
  const { data, info } = await sharp(imagePath)
    .removeAlpha()
    .raw()
    .toBuffer({
      resolveWithObject: true,
    });

  const {
    width,
    height,
    channels,
  } = info;

  const verticalScores =
    new Array(width).fill(0);

  const horizontalScores =
    new Array(height).fill(0);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index =
        (y * width + x) * channels;

      const r = data[index];
      const g = data[index + 1];
      const b = data[index + 2];

      if (isLime(r, g, b)) {
        verticalScores[x]++;
        horizontalScores[y]++;
      }
    }
  }

  /**
   * Las líneas verticales de cada celda
   * recorren una parte importante del póster.
   */
  const verticalThreshold =
    height * 0.42;

  /**
   * Las líneas horizontales atraviesan
   * casi todo el ancho.
   */
  const horizontalThreshold =
    width * 0.58;

  const verticalPixels = [];

  for (let x = 0; x < width; x++) {
    if (
      verticalScores[x] >
      verticalThreshold
    ) {
      verticalPixels.push(x);
    }
  }

  const horizontalPixels = [];

  for (let y = 0; y < height; y++) {
    /**
     * Ignoramos líneas decorativas del título.
     */
    if (
      y > height * 0.085 &&
      horizontalScores[y] >
        horizontalThreshold
    ) {
      horizontalPixels.push(y);
    }
  }

  let verticalBands =
    groupBands(verticalPixels);

  let horizontalBands =
    groupBands(horizontalPixels);

  /**
   * Eliminamos cualquier detección pegada
   * a los bordes exteriores.
   */
  verticalBands =
    verticalBands.filter(
      (band) =>
        band.center >
          width * 0.005 &&
        band.center <
          width * 0.995
    );

  /**
   * Queremos exactamente:
   *
   * 8 verticales
   * 8 horizontales
   *
   * Cada celda tiene:
   * borde izquierdo + borde derecho.
   */
  if (
    verticalBands.length !== 8 ||
    horizontalBands.length !== 8
  ) {
    console.log(
      "Verticales detectadas:",
      verticalBands
    );

    console.log(
      "Horizontales detectadas:",
      horizontalBands
    );

    throw new Error(
      `
No pude detectar correctamente la grilla.

Archivo:
${imagePath}

Esperaba:
8 bandas verticales
8 bandas horizontales

Encontré:
${verticalBands.length} verticales
${horizontalBands.length} horizontales
`
    );
  }

  return {
    width,
    height,
    verticalBands,
    horizontalBands,
  };
}

/**
 * Mantiene exactamente el orden
 * que ya tiene tu JSON.
 */
function getExercises(group) {
  return [
    ...(group.exercises
      ?.multiarticulares ?? []),

    ...(group.exercises
      ?.uniarticulares ?? []),
  ];
}

/**
 * Recorta una celda real.
 */
async function cropExercise({
  inputPath,
  outputPath,
  column,
  row,
  verticalBands,
  horizontalBands,
}) {
  const leftBand =
    verticalBands[column * 2];

  const rightBand =
    verticalBands[column * 2 + 1];

  const topBand =
    horizontalBands[row * 2];

  const bottomBand =
    horizontalBands[row * 2 + 1];

  const BORDER_PADDING = 5;

  const left =
    leftBand.end + BORDER_PADDING;

  const right =
    rightBand.start - BORDER_PADDING;

  let top =
    topBand.end + BORDER_PADDING;

  const bottom =
    bottomBand.start - BORDER_PADDING;

  let width =
    right - left;

  let height =
    bottom - top;

  /**
   * Quitamos la mayor parte del encabezado
   * del ejercicio.
   *
   * Número + nombre.
   */
  const HEADER_CUT =
    Math.round(height * 0.20);

  top += HEADER_CUT;
  height -= HEADER_CUT;

  if (
    width <= 0 ||
    height <= 0
  ) {
    throw new Error(
      `Crop inválido: ${outputPath}`
    );
  }

  /**
   * Primero recortamos la celda.
   */
  const croppedBuffer =
    await sharp(inputPath)
      .extract({
        left: Math.round(left),
        top: Math.round(top),
        width: Math.round(width),
        height: Math.round(height),
      })
      .toBuffer();

  /**
   * Ahora viene la parte importante:
   *
   * trim() elimina automáticamente
   * todo el fondo negro sobrante.
   */
  const trimmedBuffer =
    await sharp(croppedBuffer)
      .trim({
        background: {
          r: 0,
          g: 0,
          b: 0,
        },
        threshold: 18,
      })
      .toBuffer();

  /**
   * Ponemos el ejercicio dentro de
   * una caja de 236x236.
   *
   * Eso hace que el culturista ocupe
   * casi toda la thumbnail.
   */
  const normalizedBuffer =
    await sharp(trimmedBuffer)
      .resize(236, 236, {
        fit: "contain",

        background: {
          r: 16,
          g: 17,
          b: 14,
          alpha: 1,
        },
      })
      .toBuffer();

  /**
   * Agregamos solamente 10px de aire
   * alrededor.
   *
   * Resultado final:
   *
   * 256 x 256
   */
  await sharp(normalizedBuffer)
    .extend({
      top: 10,
      bottom: 10,
      left: 10,
      right: 10,

      background: {
        r: 16,
        g: 17,
        b: 14,
        alpha: 1,
      },
    })
    .webp({
      quality: 90,
    })
    .toFile(outputPath);
}

async function processGroup(group) {
  const muscleId = group.id;

  const inputPath = path.join(
    GRIDS_DIR,
    `${muscleId}.png`
  );

  const outputFolder = path.join(
    OUTPUT_DIR,
    muscleId
  );

  try {
    await fs.access(inputPath);
  } catch {
    console.log(
      `⚠️ No encontré ${muscleId}.png`
    );

    return 0;
  }

  await fs.mkdir(
    outputFolder,
    {
      recursive: true,
    }
  );

  console.log(
    `\n🔍 Analizando ${muscleId.toUpperCase()}`
  );

  const grid =
    await detectGrid(inputPath);

  console.log(
    "   Verticales:",
    grid.verticalBands.map(
      (band) => band.center
    )
  );

  console.log(
    "   Horizontales:",
    grid.horizontalBands.map(
      (band) => band.center
    )
  );

  const exercises =
    getExercises(group);

  for (
    let index = 0;
    index < exercises.length;
    index++
  ) {
    const exercise =
      exercises[index];

    const column =
      index % COLUMNS;

    const row =
      Math.floor(index / COLUMNS);

    const outputPath =
      path.join(
        outputFolder,
        `${exercise.id}.webp`
      );

    await cropExercise({
      inputPath,
      outputPath,
      column,
      row,

      verticalBands:
        grid.verticalBands,

      horizontalBands:
        grid.horizontalBands,
    });

    console.log(
      `   ✓ ${exercise.id}.webp`
    );
  }

  console.log(
    `✅ ${muscleId.toUpperCase()} listo`
  );

  return exercises.length;
}

async function main() {
  console.log(`
===================================
 TORO EXERCISE IMAGE IMPORTER V2
===================================
`);

  const raw =
    await fs.readFile(
      JSON_PATH,
      "utf8"
    );

  const json =
    JSON.parse(raw);

  if (
    !Array.isArray(
      json.muscleGroups
    )
  ) {
    throw new Error(
      "muscleGroups no existe en el JSON."
    );
  }

  let total = 0;

  for (
    const group of
    json.muscleGroups
  ) {
    total +=
      await processGroup(group);
  }

  console.log(`
===================================
 ✅ TERMINADO

 ${total} ejercicios procesados

 256 x 256
 WebP

 public/exercises/
===================================
`);
}

main().catch((error) => {
  console.error(
    "\n❌ ERROR\n"
  );

  console.error(error);

  process.exit(1);
});