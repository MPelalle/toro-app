import { findExerciseVideo } from "@/lib/exercise-videos";

export type ExerciseCategory = "multiarticulares" | "uniarticulares";

export type MuscleGroup = {
  id: string;
  name: string;
  exercises: Record<ExerciseCategory, readonly { id: string; name: string; equipment: readonly string[] }[]>;
};

export type ExerciseOption = {
  id: string;
  name: string;
  muscle: string;
  muscleId: string;
  category: ExerciseCategory;
  equipment: string[];
  videoUrl?: string;
};


export const muscleGroups = [
  {
    "id": "pecho",
    "name": "Pecho",
    "exercises": {
      "multiarticulares": [
        {
          "id": "press_banca_barra",
          "name": "Press banca con barra",
          "equipment": [
            "barra",
            "banco"
          ]
        },
        {
          "id": "press_banca_mancuernas",
          "name": "Press banca con mancuernas",
          "equipment": [
            "mancuernas",
            "banco"
          ]
        },
        {
          "id": "press_inclinado_barra",
          "name": "Press inclinado con barra",
          "equipment": [
            "barra",
            "banco inclinado"
          ]
        },
        {
          "id": "press_inclinado_mancuernas",
          "name": "Press inclinado con mancuernas",
          "equipment": [
            "mancuernas",
            "banco inclinado"
          ]
        },
        {
          "id": "press_declinado_barra",
          "name": "Press declinado con barra",
          "equipment": [
            "barra",
            "banco declinado"
          ]
        },
        {
          "id": "press_pecho_maquina",
          "name": "Press de pecho en máquina",
          "equipment": [
            "máquina"
          ]
        },
        {
          "id": "fondos_pecho",
          "name": "Fondos enfocados en pecho",
          "equipment": [
            "paralelas"
          ]
        },
        {
          "id": "flexiones",
          "name": "Flexiones",
          "equipment": [
            "peso corporal"
          ]
        },
        {
          "id": "flexiones_lastradas",
          "name": "Flexiones lastradas",
          "equipment": [
            "peso corporal",
            "lastre"
          ]
        }
      ],
      "uniarticulares": [
        {
          "id": "aperturas_mancuernas",
          "name": "Aperturas con mancuernas",
          "equipment": [
            "mancuernas",
            "banco"
          ]
        },
        {
          "id": "aperturas_inclinadas_mancuernas",
          "name": "Aperturas inclinadas con mancuernas",
          "equipment": [
            "mancuernas",
            "banco inclinado"
          ]
        },
        {
          "id": "cruce_poleas",
          "name": "Cruce de poleas",
          "equipment": [
            "poleas"
          ]
        },
        {
          "id": "cruce_poleas_alto_bajo",
          "name": "Cruce de poleas de arriba hacia abajo",
          "equipment": [
            "poleas"
          ]
        },
        {
          "id": "cruce_poleas_bajo_alto",
          "name": "Cruce de poleas de abajo hacia arriba",
          "equipment": [
            "poleas"
          ]
        },
        {
          "id": "pec_deck",
          "name": "Pec deck / contractor de pecho",
          "equipment": [
            "máquina"
          ]
        }
      ]
    }
  },
  {
    "id": "espalda",
    "name": "Espalda",
    "exercises": {
      "multiarticulares": [
        {
          "id": "dominadas_pronas",
          "name": "Dominadas pronas",
          "equipment": [
            "barra fija"
          ]
        },
        {
          "id": "dominadas_supinas",
          "name": "Dominadas supinas",
          "equipment": [
            "barra fija"
          ]
        },
        {
          "id": "jalon_pecho",
          "name": "Jalón al pecho",
          "equipment": [
            "polea"
          ]
        },
        {
          "id": "jalon_agarre_neutro",
          "name": "Jalón con agarre neutro",
          "equipment": [
            "polea"
          ]
        },
        {
          "id": "remo_barra",
          "name": "Remo con barra",
          "equipment": [
            "barra"
          ]
        },
        {
          "id": "remo_pendlay",
          "name": "Remo Pendlay",
          "equipment": [
            "barra"
          ]
        },
        {
          "id": "remo_mancuerna",
          "name": "Remo con mancuerna a una mano",
          "equipment": [
            "mancuerna",
            "banco"
          ]
        },
        {
          "id": "remo_t_bar",
          "name": "Remo T-Bar",
          "equipment": [
            "barra T",
            "discos"
          ]
        },
        {
          "id": "remo_polea_baja",
          "name": "Remo en polea baja",
          "equipment": [
            "polea"
          ]
        },
        {
          "id": "remo_maquina",
          "name": "Remo en máquina",
          "equipment": [
            "máquina"
          ]
        },
        {
          "id": "peso_muerto_convencional",
          "name": "Peso muerto convencional",
          "equipment": [
            "barra",
            "discos"
          ]
        },
        {
          "id": "rack_pull",
          "name": "Rack pull",
          "equipment": [
            "barra",
            "rack"
          ]
        }
      ],
      "uniarticulares": [
        {
          "id": "pullover_polea",
          "name": "Pullover en polea",
          "equipment": [
            "polea"
          ]
        },
        {
          "id": "pullover_mancuerna",
          "name": "Pullover con mancuerna",
          "equipment": [
            "mancuerna",
            "banco"
          ]
        },
        {
          "id": "pullover_maquina",
          "name": "Pullover en máquina",
          "equipment": [
            "máquina"
          ]
        }
      ]
    }
  },
  {
    "id": "hombros",
    "name": "Hombros",
    "exercises": {
      "multiarticulares": [
        {
          "id": "press_militar_barra",
          "name": "Press militar con barra",
          "equipment": [
            "barra"
          ]
        },
        {
          "id": "press_hombros_mancuernas",
          "name": "Press de hombros con mancuernas",
          "equipment": [
            "mancuernas"
          ]
        },
        {
          "id": "press_arnold",
          "name": "Press Arnold",
          "equipment": [
            "mancuernas"
          ]
        },
        {
          "id": "press_hombros_maquina",
          "name": "Press de hombros en máquina",
          "equipment": [
            "máquina"
          ]
        },
        {
          "id": "push_press",
          "name": "Push press",
          "equipment": [
            "barra"
          ]
        }
      ],
      "uniarticulares": [
        {
          "id": "elevaciones_laterales_mancuernas",
          "name": "Elevaciones laterales con mancuernas",
          "equipment": [
            "mancuernas"
          ]
        },
        {
          "id": "elevaciones_laterales_polea",
          "name": "Elevaciones laterales en polea",
          "equipment": [
            "polea"
          ]
        },
        {
          "id": "elevaciones_laterales_maquina",
          "name": "Elevaciones laterales en máquina",
          "equipment": [
            "máquina"
          ]
        },
        {
          "id": "elevaciones_frontales_mancuernas",
          "name": "Elevaciones frontales con mancuernas",
          "equipment": [
            "mancuernas"
          ]
        },
        {
          "id": "elevaciones_frontales_polea",
          "name": "Elevaciones frontales en polea",
          "equipment": [
            "polea"
          ]
        },
        {
          "id": "pajaros_mancuernas",
          "name": "Pájaros / elevaciones posteriores con mancuernas",
          "equipment": [
            "mancuernas"
          ]
        },
        {
          "id": "reverse_pec_deck",
          "name": "Reverse pec deck",
          "equipment": [
            "máquina"
          ]
        },
        {
          "id": "face_pull",
          "name": "Face pull",
          "equipment": [
            "polea",
            "cuerda"
          ]
        }
      ]
    }
  },
  {
    "id": "biceps",
    "name": "Bíceps",
    "exercises": {
      "multiarticulares": [
        {
          "id": "dominadas_supinas_biceps",
          "name": "Dominadas supinas",
          "equipment": [
            "barra fija"
          ]
        },
        {
          "id": "remo_supino",
          "name": "Remo con agarre supino",
          "equipment": [
            "barra"
          ]
        }
      ],
      "uniarticulares": [
        {
          "id": "curl_barra",
          "name": "Curl con barra",
          "equipment": [
            "barra"
          ]
        },
        {
          "id": "curl_barra_ez",
          "name": "Curl con barra EZ",
          "equipment": [
            "barra EZ"
          ]
        },
        {
          "id": "curl_mancuernas",
          "name": "Curl con mancuernas",
          "equipment": [
            "mancuernas"
          ]
        },
        {
          "id": "curl_alternado",
          "name": "Curl alternado con mancuernas",
          "equipment": [
            "mancuernas"
          ]
        },
        {
          "id": "curl_martillo",
          "name": "Curl martillo",
          "equipment": [
            "mancuernas"
          ]
        },
        {
          "id": "curl_inclinado",
          "name": "Curl inclinado con mancuernas",
          "equipment": [
            "mancuernas",
            "banco inclinado"
          ]
        },
        {
          "id": "curl_predicador",
          "name": "Curl predicador",
          "equipment": [
            "barra EZ",
            "banco predicador"
          ]
        },
        {
          "id": "curl_polea",
          "name": "Curl en polea",
          "equipment": [
            "polea"
          ]
        },
        {
          "id": "curl_bayesiano",
          "name": "Curl bayesiano",
          "equipment": [
            "polea"
          ]
        },
        {
          "id": "curl_concentrado",
          "name": "Curl concentrado",
          "equipment": [
            "mancuerna"
          ]
        }
      ]
    }
  },
  {
    "id": "triceps",
    "name": "Tríceps",
    "exercises": {
      "multiarticulares": [
        {
          "id": "press_banca_cerrado",
          "name": "Press banca con agarre cerrado",
          "equipment": [
            "barra",
            "banco"
          ]
        },
        {
          "id": "fondos_triceps",
          "name": "Fondos enfocados en tríceps",
          "equipment": [
            "paralelas"
          ]
        },
        {
          "id": "flexiones_diamante",
          "name": "Flexiones diamante",
          "equipment": [
            "peso corporal"
          ]
        }
      ],
      "uniarticulares": [
        {
          "id": "extension_triceps_polea",
          "name": "Extensión de tríceps en polea",
          "equipment": [
            "polea"
          ]
        },
        {
          "id": "extension_triceps_cuerda",
          "name": "Extensión de tríceps con cuerda",
          "equipment": [
            "polea",
            "cuerda"
          ]
        },
        {
          "id": "extension_triceps_unilateral",
          "name": "Extensión unilateral de tríceps en polea",
          "equipment": [
            "polea"
          ]
        },
        {
          "id": "press_frances_barra_ez",
          "name": "Press francés con barra EZ",
          "equipment": [
            "barra EZ",
            "banco"
          ]
        },
        {
          "id": "extension_triceps_sobre_cabeza",
          "name": "Extensión de tríceps sobre la cabeza",
          "equipment": [
            "mancuerna"
          ]
        },
        {
          "id": "extension_triceps_overhead_polea",
          "name": "Extensión de tríceps overhead en polea",
          "equipment": [
            "polea",
            "cuerda"
          ]
        },
        {
          "id": "patada_triceps",
          "name": "Patada de tríceps",
          "equipment": [
            "mancuerna"
          ]
        }
      ]
    }
  },
  {
    "id": "cuadriceps",
    "name": "Cuádriceps",
    "exercises": {
      "multiarticulares": [
        {
          "id": "sentadilla_barra",
          "name": "Sentadilla con barra",
          "equipment": [
            "barra",
            "rack"
          ]
        },
        {
          "id": "sentadilla_frontal",
          "name": "Sentadilla frontal",
          "equipment": [
            "barra",
            "rack"
          ]
        },
        {
          "id": "sentadilla_hack",
          "name": "Hack squat",
          "equipment": [
            "máquina"
          ]
        },
        {
          "id": "sentadilla_pendular",
          "name": "Sentadilla pendular",
          "equipment": [
            "máquina"
          ]
        },
        {
          "id": "sentadilla_smith",
          "name": "Sentadilla en Smith",
          "equipment": [
            "smith"
          ]
        },
        {
          "id": "prensa_45",
          "name": "Prensa 45°",
          "equipment": [
            "prensa"
          ]
        },
        {
          "id": "prensa_horizontal",
          "name": "Prensa horizontal",
          "equipment": [
            "prensa"
          ]
        },
        {
          "id": "zancadas",
          "name": "Zancadas",
          "equipment": [
            "peso corporal",
            "mancuernas"
          ]
        },
        {
          "id": "bulgaras",
          "name": "Sentadilla búlgara",
          "equipment": [
            "mancuernas",
            "banco"
          ]
        },
        {
          "id": "step_up",
          "name": "Step-up",
          "equipment": [
            "cajón",
            "mancuernas"
          ]
        },
        {
          "id": "sissy_squat",
          "name": "Sissy squat",
          "equipment": [
            "peso corporal"
          ]
        }
      ],
      "uniarticulares": [
        {
          "id": "extension_cuadriceps",
          "name": "Extensión de cuádriceps",
          "equipment": [
            "máquina"
          ]
        }
      ]
    }
  },
  {
    "id": "isquiotibiales",
    "name": "Isquiotibiales",
    "exercises": {
      "multiarticulares": [
        {
          "id": "peso_muerto_rumano",
          "name": "Peso muerto rumano",
          "equipment": [
            "barra"
          ]
        },
        {
          "id": "peso_muerto_rumano_mancuernas",
          "name": "Peso muerto rumano con mancuernas",
          "equipment": [
            "mancuernas"
          ]
        },
        {
          "id": "peso_muerto_piernas_rigidas",
          "name": "Peso muerto con piernas rígidas",
          "equipment": [
            "barra"
          ]
        },
        {
          "id": "good_morning",
          "name": "Buenos días",
          "equipment": [
            "barra"
          ]
        },
        {
          "id": "glute_ham_raise",
          "name": "Glute ham raise",
          "equipment": [
            "máquina GHD"
          ]
        }
      ],
      "uniarticulares": [
        {
          "id": "curl_femoral_tumbado",
          "name": "Curl femoral tumbado",
          "equipment": [
            "máquina"
          ]
        },
        {
          "id": "curl_femoral_sentado",
          "name": "Curl femoral sentado",
          "equipment": [
            "máquina"
          ]
        },
        {
          "id": "curl_femoral_de_pie",
          "name": "Curl femoral de pie",
          "equipment": [
            "máquina"
          ]
        },
        {
          "id": "curl_femoral_unilateral",
          "name": "Curl femoral unilateral",
          "equipment": [
            "máquina"
          ]
        }
      ]
    }
  },
  {
    "id": "gluteos",
    "name": "Glúteos",
    "exercises": {
      "multiarticulares": [
        {
          "id": "hip_thrust_barra",
          "name": "Hip thrust con barra",
          "equipment": [
            "barra",
            "banco"
          ]
        },
        {
          "id": "hip_thrust_maquina",
          "name": "Hip thrust en máquina",
          "equipment": [
            "máquina"
          ]
        },
        {
          "id": "puente_gluteos",
          "name": "Puente de glúteos",
          "equipment": [
            "peso corporal",
            "barra"
          ]
        },
        {
          "id": "sentadilla_profunda",
          "name": "Sentadilla profunda",
          "equipment": [
            "barra"
          ]
        },
        {
          "id": "sentadilla_bulgara_gluteo",
          "name": "Sentadilla búlgara enfocada en glúteo",
          "equipment": [
            "mancuernas",
            "banco"
          ]
        },
        {
          "id": "zancada_atras",
          "name": "Zancada hacia atrás",
          "equipment": [
            "mancuernas"
          ]
        },
        {
          "id": "peso_muerto_sumo",
          "name": "Peso muerto sumo",
          "equipment": [
            "barra"
          ]
        }
      ],
      "uniarticulares": [
        {
          "id": "patada_gluteo_polea",
          "name": "Patada de glúteo en polea",
          "equipment": [
            "polea"
          ]
        },
        {
          "id": "abduccion_cadera_maquina",
          "name": "Abducción de cadera en máquina",
          "equipment": [
            "máquina"
          ]
        },
        {
          "id": "abduccion_cadera_polea",
          "name": "Abducción de cadera en polea",
          "equipment": [
            "polea"
          ]
        }
      ]
    }
  },
  {
    "id": "aductores",
    "name": "Aductores",
    "exercises": {
      "multiarticulares": [
        {
          "id": "sentadilla_sumo",
          "name": "Sentadilla sumo",
          "equipment": [
            "mancuerna",
            "barra"
          ]
        },
        {
          "id": "peso_muerto_sumo_aductores",
          "name": "Peso muerto sumo",
          "equipment": [
            "barra"
          ]
        },
        {
          "id": "zancada_lateral",
          "name": "Zancada lateral",
          "equipment": [
            "peso corporal",
            "mancuernas"
          ]
        }
      ],
      "uniarticulares": [
        {
          "id": "aduccion_cadera_maquina",
          "name": "Aducción de cadera en máquina",
          "equipment": [
            "máquina"
          ]
        },
        {
          "id": "aduccion_cadera_polea",
          "name": "Aducción de cadera en polea",
          "equipment": [
            "polea"
          ]
        }
      ]
    }
  },
  {
    "id": "pantorrillas",
    "name": "Pantorrillas",
    "exercises": {
      "multiarticulares": [],
      "uniarticulares": [
        {
          "id": "gemelos_de_pie",
          "name": "Elevación de gemelos de pie",
          "equipment": [
            "máquina",
            "peso corporal"
          ]
        },
        {
          "id": "gemelos_sentado",
          "name": "Elevación de gemelos sentado",
          "equipment": [
            "máquina"
          ]
        },
        {
          "id": "gemelos_prensa",
          "name": "Elevación de gemelos en prensa",
          "equipment": [
            "prensa"
          ]
        },
        {
          "id": "gemelos_smith",
          "name": "Elevación de gemelos en Smith",
          "equipment": [
            "smith"
          ]
        },
        {
          "id": "gemelos_unilateral",
          "name": "Elevación de gemelos unilateral",
          "equipment": [
            "peso corporal",
            "mancuerna"
          ]
        }
      ]
    }
  },
  {
    "id": "trapecios",
    "name": "Trapecios",
    "exercises": {
      "multiarticulares": [
        {
          "id": "peso_muerto_trapecio",
          "name": "Peso muerto",
          "equipment": [
            "barra"
          ]
        },
        {
          "id": "remo_vertical",
          "name": "Remo vertical",
          "equipment": [
            "barra",
            "barra EZ"
          ]
        },
        {
          "id": "farmer_walk",
          "name": "Farmer's walk",
          "equipment": [
            "mancuernas",
            "kettlebells"
          ]
        }
      ],
      "uniarticulares": [
        {
          "id": "encogimientos_barra",
          "name": "Encogimientos con barra",
          "equipment": [
            "barra"
          ]
        },
        {
          "id": "encogimientos_mancuernas",
          "name": "Encogimientos con mancuernas",
          "equipment": [
            "mancuernas"
          ]
        },
        {
          "id": "encogimientos_maquina",
          "name": "Encogimientos en máquina",
          "equipment": [
            "máquina"
          ]
        }
      ]
    }
  },
  {
    "id": "antebrazos",
    "name": "Antebrazos",
    "exercises": {
      "multiarticulares": [
        {
          "id": "farmer_walk_antebrazo",
          "name": "Farmer's walk",
          "equipment": [
            "mancuernas",
            "kettlebells"
          ]
        },
        {
          "id": "dead_hang",
          "name": "Dead hang / suspensión en barra",
          "equipment": [
            "barra fija"
          ]
        }
      ],
      "uniarticulares": [
        {
          "id": "curl_muneca_barra",
          "name": "Curl de muñeca con barra",
          "equipment": [
            "barra"
          ]
        },
        {
          "id": "curl_muneca_inverso",
          "name": "Curl de muñeca inverso",
          "equipment": [
            "barra"
          ]
        },
        {
          "id": "curl_inverso_barra",
          "name": "Curl inverso con barra",
          "equipment": [
            "barra",
            "barra EZ"
          ]
        },
        {
          "id": "curl_martillo_antebrazo",
          "name": "Curl martillo",
          "equipment": [
            "mancuernas"
          ]
        },
        {
          "id": "pronacion_supinacion_mancuerna",
          "name": "Pronación y supinación de antebrazo",
          "equipment": [
            "mancuerna"
          ]
        }
      ]
    }
  },
  {
    "id": "abdomen",
    "name": "Abdomen / Core",
    "exercises": {
      "multiarticulares": [
        {
          "id": "ab_wheel",
          "name": "Rueda abdominal",
          "equipment": [
            "rueda abdominal"
          ]
        },
        {
          "id": "elevacion_piernas_colgado",
          "name": "Elevación de piernas colgado",
          "equipment": [
            "barra fija"
          ]
        },
        {
          "id": "toes_to_bar",
          "name": "Toes to bar",
          "equipment": [
            "barra fija"
          ]
        },
        {
          "id": "plancha",
          "name": "Plancha abdominal",
          "equipment": [
            "peso corporal"
          ]
        },
        {
          "id": "plancha_lateral",
          "name": "Plancha lateral",
          "equipment": [
            "peso corporal"
          ]
        },
        {
          "id": "pallof_press",
          "name": "Pallof press",
          "equipment": [
            "polea",
            "banda"
          ]
        }
      ],
      "uniarticulares": [
        {
          "id": "crunch",
          "name": "Crunch abdominal",
          "equipment": [
            "peso corporal"
          ]
        },
        {
          "id": "crunch_polea",
          "name": "Crunch en polea",
          "equipment": [
            "polea"
          ]
        },
        {
          "id": "crunch_maquina",
          "name": "Crunch en máquina",
          "equipment": [
            "máquina"
          ]
        },
        {
          "id": "reverse_crunch",
          "name": "Crunch inverso",
          "equipment": [
            "peso corporal"
          ]
        }
      ]
    }
  },
  {
    "id": "lumbar",
    "name": "Lumbar / Erectores espinales",
    "exercises": {
      "multiarticulares": [
        {
          "id": "peso_muerto_lumbar",
          "name": "Peso muerto convencional",
          "equipment": [
            "barra"
          ]
        },
        {
          "id": "peso_muerto_rumano_lumbar",
          "name": "Peso muerto rumano",
          "equipment": [
            "barra"
          ]
        },
        {
          "id": "good_morning_lumbar",
          "name": "Buenos días",
          "equipment": [
            "barra"
          ]
        }
      ],
      "uniarticulares": [
        {
          "id": "hiperextensiones",
          "name": "Hiperextensiones lumbares",
          "equipment": [
            "banco romano"
          ]
        },
        {
          "id": "extension_lumbar_maquina",
          "name": "Extensión lumbar en máquina",
          "equipment": [
            "máquina"
          ]
        }
      ]
    }
  },
  {
    "id": "cuerpo_completo",
    "name": "Cuerpo completo",
    "exercises": {
      "multiarticulares": [
        {
          "id": "clean_and_press",
          "name": "Clean and press",
          "equipment": [
            "barra"
          ]
        },
        {
          "id": "power_clean",
          "name": "Power clean",
          "equipment": [
            "barra"
          ]
        },
        {
          "id": "thruster",
          "name": "Thruster",
          "equipment": [
            "barra",
            "mancuernas"
          ]
        },
        {
          "id": "burpees",
          "name": "Burpees",
          "equipment": [
            "peso corporal"
          ]
        },
        {
          "id": "kettlebell_swing",
          "name": "Kettlebell swing",
          "equipment": [
            "kettlebell"
          ]
        }
      ],
      "uniarticulares": []
    }
  }
] as const satisfies readonly MuscleGroup[];

export const exerciseOptions: ExerciseOption[] = muscleGroups.flatMap((group) =>
  (Object.entries(group.exercises) as [ExerciseCategory, readonly { id: string; name: string; equipment: readonly string[] }[]][]).flatMap(([category, exercises]) =>
    exercises.map((exercise) => ({
      ...exercise,
      videoUrl: findExerciseVideo(exercise)?.videoUrl,
      equipment: [...exercise.equipment],
      muscle: group.name,
      muscleId: group.id,
      category,
    })),
  ),
);
