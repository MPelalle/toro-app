export type ExerciseGuide = {
  focus: string;
  setup: string;
  execution: string;
  breathing: string;
  cues: string[];
  avoid: string;
};

const guides: Array<{ pattern: RegExp; guide: ExerciseGuide }> = [
  {
    pattern: /sentadilla|prensa|hack|zancada|estocada|split_squat|búlgar/i,
    guide: {
      focus: "Cuádriceps y glúteos, con el tronco estabilizado.",
      setup: "Afirmá los pies al ancho de hombros y mantené toda la planta apoyada. Elegí una profundidad que puedas controlar.",
      execution: "Flexioná caderas y rodillas siguiendo la dirección de los pies. Descendé sin perder el apoyo y empujá el suelo para volver.",
      breathing: "Tomá aire antes de bajar y soltalo al superar la parte más exigente de la subida.",
      cues: ["Rodillas alineadas con los pies", "Peso repartido en toda la planta", "Descenso controlado"],
      avoid: "No rebotes abajo ni dejes que las rodillas colapsen hacia adentro.",
    },
  },
  {
    pattern: /peso_muerto|peso muerto|rumano|buenos_d[ií]as|hip_thrust|puente_gl[uú]teo/i,
    guide: {
      focus: "Cadena posterior: glúteos e isquiotibiales, con el tronco firme.",
      setup: "Plantá los pies con estabilidad, activá el abdomen y mantené la carga cerca del cuerpo.",
      execution: "Llevá la cadera hacia atrás con una leve flexión de rodillas. Bajá hasta donde conserves la espalda estable y extendé la cadera para subir.",
      breathing: "Inhalá y afirmá el abdomen antes de descender; exhalá al completar la extensión.",
      cues: ["La cadera inicia el movimiento", "Carga cerca del cuerpo", "Columna estable"],
      avoid: "No redondees la espalda ni conviertas la bisagra de cadera en una sentadilla.",
    },
  },
  {
    pattern: /press|flexiones|fondos/i,
    guide: {
      focus: "Pectorales, hombros y tríceps; el énfasis cambia según el ángulo y el agarre.",
      setup: "Afirmá los pies y la espalda. Colocá manos y muñecas alineadas con el recorrido de la carga.",
      execution: "Bajá con control hasta un rango cómodo y empujá sin perder la posición de hombros ni arquear la zona lumbar.",
      breathing: "Inhalá al bajar y exhalá al empujar.",
      cues: ["Muñecas firmes", "Hombros estables", "Repeticiones controladas"],
      avoid: "No rebotes en el fondo ni bloquees los hombros hacia adelante.",
    },
  },
  {
    pattern: /remo|jal[oó]n|dominada|pullover/i,
    guide: {
      focus: "Espalda y flexores del codo; mantené el tronco estable durante el tirón.",
      setup: "Afirmá el torso y empezá con los hombros relajados, sin encorvar la espalda.",
      execution: "Llevá los codos hacia el cuerpo y acercá la carga con control. Volvé a extender los brazos sin perder tensión.",
      breathing: "Exhalá al tirar e inhalá al regresar.",
      cues: ["Iniciá con los codos", "Pecho estable", "Regreso lento"],
      avoid: "No uses impulso del tronco ni eleves los hombros hacia las orejas.",
    },
  },
  {
    pattern: /curl/i,
    guide: {
      focus: "Flexores del codo, principalmente bíceps.",
      setup: "Mantené los codos cerca del torso y el cuerpo estable.",
      execution: "Flexioná el codo para elevar la carga sin mover el hombro; bajá hasta extender de forma cómoda.",
      breathing: "Exhalá al levantar e inhalá al bajar.",
      cues: ["Codos quietos", "Sin balanceo", "Controlá la fase de bajada"],
      avoid: "No impulses con la espalda ni acortes el recorrido para mover más peso.",
    },
  },
  {
    pattern: /extensi[oó]n|patada|pushdown|jal[oó]n.*tr[ií]ceps/i,
    guide: {
      focus: "Tríceps, con el movimiento concentrado en el codo.",
      setup: "Estabilizá el hombro y colocá el codo en una posición cómoda y firme.",
      execution: "Extendé el codo contra la resistencia y volvé lentamente sin perder la postura.",
      breathing: "Exhalá al extender e inhalá al regresar.",
      cues: ["Hombro estable", "Codo controlado", "Recorrido sin dolor"],
      avoid: "No balancees el brazo ni fuerces el bloqueo articular.",
    },
  },
  {
    pattern: /elevaci[oó]n|apertura|cruce|pec_deck|face_pull/i,
    guide: {
      focus: "Trabajo de aislamiento para el grupo muscular indicado en la ficha.",
      setup: "Acomodá el asiento o la posición inicial para que la articulación trabaje en un rango cómodo.",
      execution: "Mové la carga con control desde la articulación objetivo y regresá despacio, evitando compensaciones.",
      breathing: "Exhalá en la parte activa e inhalá al volver.",
      cues: ["Carga moderada", "Control en ambos sentidos", "Postura estable"],
      avoid: "No uses impulso ni fuerces un rango que cause molestias.",
    },
  },
];

export function getExerciseGuide(exerciseName: string, muscle: string, equipment: string[] = []): ExerciseGuide {
  return guides.find((item) => item.pattern.test(exerciseName))?.guide || {
    focus: `Trabajo orientado a ${muscle.toLocaleLowerCase("es")}.`,
    setup: `Prepará ${equipment.length ? equipment.join(", ") : "el equipo indicado"} y adoptá una posición estable antes de iniciar.`,
    execution: "Mové la carga con un recorrido cómodo y controlado; mantené el grupo objetivo trabajando y regresá lentamente a la posición inicial.",
    breathing: "Exhalá durante la parte más exigente e inhalá al volver.",
    cues: ["Postura estable", "Recorrido controlado", "Usá una carga que puedas dominar"],
    avoid: "No sacrifiques la técnica para mover más peso; detené el ejercicio si aparece dolor.",
  };
}
