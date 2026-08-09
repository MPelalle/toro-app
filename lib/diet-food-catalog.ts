import type { Food } from "@/lib/diet-types";

export type FoodGoal = "deficit" | "mantenimiento" | "superavit";
export type FoodPriceTier = "bajo" | "medio" | "alto";

export type FoodGroup = {
  id: string;
  name: string;
  foods: Array<{
    id: string;
    name: string;
    unit: string;
    nutritionPer100: { kcal: number; protein: number; carbs: number; fat: number };
    recommendedFor: FoodGoal[];
    priceTier: FoodPriceTier;
  }>;
};

export const foodGroups = [
  {
    "id": "carnes_rojas",
    "name": "Carnes rojas",
    "foods": [
      {
        "id": "carne_picada_magra",
        "name": "Carne picada magra",
        "unit": "g",
        "nutritionPer100": {
          "kcal": 170,
          "protein": 26,
          "carbs": 0,
          "fat": 7
        },
        "recommendedFor": [
          "deficit",
          "mantenimiento",
          "superavit"
        ],
        "priceTier": "medio"
      },
      {
        "id": "nalga",
        "name": "Nalga",
        "unit": "g",
        "nutritionPer100": {
          "kcal": 165,
          "protein": 29,
          "carbs": 0,
          "fat": 5
        },
        "recommendedFor": [
          "deficit",
          "mantenimiento",
          "superavit"
        ],
        "priceTier": "medio"
      },
      {
        "id": "bola_de_lomo",
        "name": "Bola de lomo",
        "unit": "g",
        "nutritionPer100": {
          "kcal": 170,
          "protein": 28,
          "carbs": 0,
          "fat": 6
        },
        "recommendedFor": [
          "deficit",
          "mantenimiento",
          "superavit"
        ],
        "priceTier": "medio"
      },
      {
        "id": "cuadrada",
        "name": "Cuadrada",
        "unit": "g",
        "nutritionPer100": {
          "kcal": 175,
          "protein": 27,
          "carbs": 0,
          "fat": 7
        },
        "recommendedFor": [
          "deficit",
          "mantenimiento",
          "superavit"
        ],
        "priceTier": "medio"
      },
      {
        "id": "cuadril",
        "name": "Cuadril",
        "unit": "g",
        "nutritionPer100": {
          "kcal": 200,
          "protein": 27,
          "carbs": 0,
          "fat": 10
        },
        "recommendedFor": [
          "mantenimiento",
          "superavit"
        ],
        "priceTier": "medio"
      },
      {
        "id": "roast_beef",
        "name": "Roast beef",
        "unit": "g",
        "nutritionPer100": {
          "kcal": 215,
          "protein": 26,
          "carbs": 0,
          "fat": 12
        },
        "recommendedFor": [
          "mantenimiento",
          "superavit"
        ],
        "priceTier": "medio"
      },
      {
        "id": "paleta_vacuna",
        "name": "Paleta vacuna",
        "unit": "g",
        "nutritionPer100": {
          "kcal": 190,
          "protein": 27,
          "carbs": 0,
          "fat": 9
        },
        "recommendedFor": [
          "deficit",
          "mantenimiento",
          "superavit"
        ],
        "priceTier": "medio"
      },
      {
        "id": "peceto",
        "name": "Peceto",
        "unit": "g",
        "nutritionPer100": {
          "kcal": 160,
          "protein": 29,
          "carbs": 0,
          "fat": 4
        },
        "recommendedFor": [
          "deficit",
          "mantenimiento",
          "superavit"
        ],
        "priceTier": "medio"
      },
      {
        "id": "higado_vacuno",
        "name": "Hígado vacuno",
        "unit": "g",
        "nutritionPer100": {
          "kcal": 135,
          "protein": 20,
          "carbs": 4,
          "fat": 4
        },
        "recommendedFor": [
          "deficit",
          "mantenimiento",
          "superavit"
        ],
        "priceTier": "bajo"
      }
    ]
  },
  {
    "id": "pollo_pavo_cerdo",
    "name": "Pollo y cerdo",
    "foods": [
      {
        "id": "pechuga_pollo",
        "name": "Pechuga de pollo",
        "unit": "g",
        "nutritionPer100": {
          "kcal": 165,
          "protein": 31,
          "carbs": 0,
          "fat": 4
        },
        "recommendedFor": [
          "deficit",
          "mantenimiento",
          "superavit"
        ],
        "priceTier": "medio"
      },
      {
        "id": "pata_muslo_sin_piel",
        "name": "Pata muslo de pollo sin piel",
        "unit": "g",
        "nutritionPer100": {
          "kcal": 180,
          "protein": 26,
          "carbs": 0,
          "fat": 8
        },
        "recommendedFor": [
          "deficit",
          "mantenimiento",
          "superavit"
        ],
        "priceTier": "bajo"
      },
      {
        "id": "pata_muslo_con_piel",
        "name": "Pata muslo de pollo con piel",
        "unit": "g",
        "nutritionPer100": {
          "kcal": 220,
          "protein": 24,
          "carbs": 0,
          "fat": 14
        },
        "recommendedFor": [
          "mantenimiento",
          "superavit"
        ],
        "priceTier": "bajo"
      },
      {
        "id": "suprema_pollo",
        "name": "Suprema de pollo",
        "unit": "g",
        "nutritionPer100": {
          "kcal": 165,
          "protein": 31,
          "carbs": 0,
          "fat": 4
        },
        "recommendedFor": [
          "deficit",
          "mantenimiento",
          "superavit"
        ],
        "priceTier": "medio"
      },
      {
        "id": "bondiola_cerdo",
        "name": "Bondiola de cerdo",
        "unit": "g",
        "nutritionPer100": {
          "kcal": 260,
          "protein": 24,
          "carbs": 0,
          "fat": 18
        },
        "recommendedFor": [
          "mantenimiento",
          "superavit"
        ],
        "priceTier": "medio"
      },
      {
        "id": "carré_cerdo",
        "name": "Carré de cerdo",
        "unit": "g",
        "nutritionPer100": {
          "kcal": 190,
          "protein": 27,
          "carbs": 0,
          "fat": 9
        },
        "recommendedFor": [
          "deficit",
          "mantenimiento",
          "superavit"
        ],
        "priceTier": "medio"
      }
    ]
  },
  {
    "id": "pescados",
    "name": "Pescados y conservas",
    "foods": [
      {
        "id": "atun_agua",
        "name": "Atún al natural",
        "unit": "g",
        "nutritionPer100": {
          "kcal": 115,
          "protein": 25,
          "carbs": 0,
          "fat": 1
        },
        "recommendedFor": [
          "deficit",
          "mantenimiento",
          "superavit"
        ],
        "priceTier": "medio"
      },
      {
        "id": "atun_aceite",
        "name": "Atún en aceite escurrido",
        "unit": "g",
        "nutritionPer100": {
          "kcal": 190,
          "protein": 26,
          "carbs": 0,
          "fat": 9
        },
        "recommendedFor": [
          "mantenimiento",
          "superavit"
        ],
        "priceTier": "medio"
      },
      {
        "id": "merluza",
        "name": "Filet de merluza",
        "unit": "g",
        "nutritionPer100": {
          "kcal": 95,
          "protein": 20,
          "carbs": 0,
          "fat": 2
        },
        "recommendedFor": [
          "deficit",
          "mantenimiento",
          "superavit"
        ],
        "priceTier": "medio"
      },
      {
        "id": "caballa_lata",
        "name": "Caballa en lata",
        "unit": "g",
        "nutritionPer100": {
          "kcal": 205,
          "protein": 24,
          "carbs": 0,
          "fat": 12
        },
        "recommendedFor": [
          "mantenimiento",
          "superavit"
        ],
        "priceTier": "medio"
      },
      {
        "id": "sardinas_lata",
        "name": "Sardinas en lata",
        "unit": "g",
        "nutritionPer100": {
          "kcal": 200,
          "protein": 24,
          "carbs": 0,
          "fat": 11
        },
        "recommendedFor": [
          "mantenimiento",
          "superavit"
        ],
        "priceTier": "medio"
      }
    ]
  },
  {
    "id": "huevos",
    "name": "Huevos",
    "foods": [
      {
        "id": "huevo_entero",
        "name": "Huevo entero",
        "unit": "g",
        "nutritionPer100": {
          "kcal": 143,
          "protein": 13,
          "carbs": 1,
          "fat": 10
        },
        "recommendedFor": [
          "deficit",
          "mantenimiento",
          "superavit"
        ],
        "priceTier": "bajo"
      },
      {
        "id": "clara_huevo",
        "name": "Clara de huevo",
        "unit": "g",
        "nutritionPer100": {
          "kcal": 52,
          "protein": 11,
          "carbs": 1,
          "fat": 0
        },
        "recommendedFor": [
          "deficit",
          "mantenimiento",
          "superavit"
        ],
        "priceTier": "bajo"
      }
    ]
  },
  {
    "id": "lacteos",
    "name": "Lácteos",
    "foods": [
      {
        "id": "leche_descremada",
        "name": "Leche descremada",
        "unit": "ml",
        "nutritionPer100": {
          "kcal": 35,
          "protein": 3.4,
          "carbs": 5,
          "fat": 0.3
        },
        "recommendedFor": [
          "deficit",
          "mantenimiento",
          "superavit"
        ],
        "priceTier": "bajo"
      },
      {
        "id": "leche_entera",
        "name": "Leche entera",
        "unit": "ml",
        "nutritionPer100": {
          "kcal": 61,
          "protein": 3.2,
          "carbs": 4.8,
          "fat": 3.3
        },
        "recommendedFor": [
          "mantenimiento",
          "superavit"
        ],
        "priceTier": "bajo"
      },
      {
        "id": "yogur_descremado",
        "name": "Yogur descremado",
        "unit": "g",
        "nutritionPer100": {
          "kcal": 55,
          "protein": 4,
          "carbs": 8,
          "fat": 1
        },
        "recommendedFor": [
          "deficit",
          "mantenimiento"
        ],
        "priceTier": "medio"
      },
      {
        "id": "yogur_entero",
        "name": "Yogur entero",
        "unit": "g",
        "nutritionPer100": {
          "kcal": 75,
          "protein": 4,
          "carbs": 9,
          "fat": 3
        },
        "recommendedFor": [
          "mantenimiento",
          "superavit"
        ],
        "priceTier": "medio"
      },
      {
        "id": "queso_cremoso",
        "name": "Queso cremoso",
        "unit": "g",
        "nutritionPer100": {
          "kcal": 300,
          "protein": 20,
          "carbs": 3,
          "fat": 23
        },
        "recommendedFor": [
          "mantenimiento",
          "superavit"
        ],
        "priceTier": "medio"
      },
      {
        "id": "queso_port_salut_light",
        "name": "Queso port salut light",
        "unit": "g",
        "nutritionPer100": {
          "kcal": 210,
          "protein": 25,
          "carbs": 3,
          "fat": 11
        },
        "recommendedFor": [
          "deficit",
          "mantenimiento",
          "superavit"
        ],
        "priceTier": "medio"
      },
      {
        "id": "queso_untable_light",
        "name": "Queso untable light",
        "unit": "g",
        "nutritionPer100": {
          "kcal": 145,
          "protein": 8,
          "carbs": 5,
          "fat": 10
        },
        "recommendedFor": [
          "deficit",
          "mantenimiento"
        ],
        "priceTier": "medio"
      },
      {
        "id": "ricota_magra",
        "name": "Ricota magra",
        "unit": "g",
        "nutritionPer100": {
          "kcal": 140,
          "protein": 12,
          "carbs": 4,
          "fat": 8
        },
        "recommendedFor": [
          "deficit",
          "mantenimiento",
          "superavit"
        ],
        "priceTier": "medio"
      }
    ]
  },
  {
    "id": "arroz_pastas_cereales",
    "name": "Arroz, pastas y cereales",
    "foods": [
      {
        "id": "arroz_blanco_cocido",
        "name": "Arroz blanco cocido",
        "unit": "g",
        "nutritionPer100": {
          "kcal": 130,
          "protein": 2.7,
          "carbs": 28,
          "fat": 0.3
        },
        "recommendedFor": [
          "deficit",
          "mantenimiento",
          "superavit"
        ],
        "priceTier": "bajo"
      },
      {
        "id": "arroz_integral_cocido",
        "name": "Arroz integral cocido",
        "unit": "g",
        "nutritionPer100": {
          "kcal": 123,
          "protein": 2.7,
          "carbs": 26,
          "fat": 1
        },
        "recommendedFor": [
          "deficit",
          "mantenimiento",
          "superavit"
        ],
        "priceTier": "bajo"
      },
      {
        "id": "fideos_cocidos",
        "name": "Fideos cocidos",
        "unit": "g",
        "nutritionPer100": {
          "kcal": 155,
          "protein": 5.5,
          "carbs": 31,
          "fat": 1
        },
        "recommendedFor": [
          "mantenimiento",
          "superavit"
        ],
        "priceTier": "bajo"
      },
      {
        "id": "fideos_integrales_cocidos",
        "name": "Fideos integrales cocidos",
        "unit": "g",
        "nutritionPer100": {
          "kcal": 150,
          "protein": 6,
          "carbs": 30,
          "fat": 1.5
        },
        "recommendedFor": [
          "deficit",
          "mantenimiento",
          "superavit"
        ],
        "priceTier": "medio"
      },
      {
        "id": "avena",
        "name": "Avena arrollada",
        "unit": "g",
        "nutritionPer100": {
          "kcal": 380,
          "protein": 13,
          "carbs": 68,
          "fat": 7
        },
        "recommendedFor": [
          "mantenimiento",
          "superavit"
        ],
        "priceTier": "bajo"
      },
      {
        "id": "polenta_cocida",
        "name": "Polenta cocida",
        "unit": "g",
        "nutritionPer100": {
          "kcal": 85,
          "protein": 2,
          "carbs": 18,
          "fat": 0.5
        },
        "recommendedFor": [
          "deficit",
          "mantenimiento",
          "superavit"
        ],
        "priceTier": "bajo"
      },
      {
        "id": "maiz_choclo",
        "name": "Choclo",
        "unit": "g",
        "nutritionPer100": {
          "kcal": 96,
          "protein": 3.4,
          "carbs": 21,
          "fat": 1.5
        },
        "recommendedFor": [
          "deficit",
          "mantenimiento",
          "superavit"
        ],
        "priceTier": "bajo"
      }
    ]
  },
  {
    "id": "papas_batatas",
    "name": "Papa, batata y similares",
    "foods": [
      {
        "id": "papa_hervida",
        "name": "Papa hervida",
        "unit": "g",
        "nutritionPer100": {
          "kcal": 87,
          "protein": 2,
          "carbs": 20,
          "fat": 0.1
        },
        "recommendedFor": [
          "deficit",
          "mantenimiento",
          "superavit"
        ],
        "priceTier": "bajo"
      },
      {
        "id": "papa_horno",
        "name": "Papa al horno sin aceite",
        "unit": "g",
        "nutritionPer100": {
          "kcal": 93,
          "protein": 2.5,
          "carbs": 21,
          "fat": 0.2
        },
        "recommendedFor": [
          "deficit",
          "mantenimiento",
          "superavit"
        ],
        "priceTier": "bajo"
      },
      {
        "id": "batata_hervida",
        "name": "Batata hervida",
        "unit": "g",
        "nutritionPer100": {
          "kcal": 86,
          "protein": 1.6,
          "carbs": 20,
          "fat": 0.1
        },
        "recommendedFor": [
          "deficit",
          "mantenimiento",
          "superavit"
        ],
        "priceTier": "bajo"
      },
      {
        "id": "zapallo",
        "name": "Zapallo",
        "unit": "g",
        "nutritionPer100": {
          "kcal": 35,
          "protein": 1,
          "carbs": 8,
          "fat": 0.1
        },
        "recommendedFor": [
          "deficit",
          "mantenimiento"
        ],
        "priceTier": "bajo"
      },
      {
        "id": "calabaza",
        "name": "Calabaza",
        "unit": "g",
        "nutritionPer100": {
          "kcal": 40,
          "protein": 1,
          "carbs": 10,
          "fat": 0.1
        },
        "recommendedFor": [
          "deficit",
          "mantenimiento"
        ],
        "priceTier": "bajo"
      }
    ]
  },
  {
    "id": "panificados",
    "name": "Panificados y similares",
    "foods": [
      {
        "id": "pan_integral",
        "name": "Pan integral",
        "unit": "g",
        "nutritionPer100": {
          "kcal": 250,
          "protein": 9,
          "carbs": 45,
          "fat": 4
        },
        "recommendedFor": [
          "deficit",
          "mantenimiento",
          "superavit"
        ],
        "priceTier": "medio"
      },
      {
        "id": "pan_blanco",
        "name": "Pan blanco",
        "unit": "g",
        "nutritionPer100": {
          "kcal": 265,
          "protein": 8,
          "carbs": 50,
          "fat": 3
        },
        "recommendedFor": [
          "mantenimiento",
          "superavit"
        ],
        "priceTier": "bajo"
      },
      {
        "id": "pan_lactal",
        "name": "Pan lactal",
        "unit": "g",
        "nutritionPer100": {
          "kcal": 260,
          "protein": 8,
          "carbs": 48,
          "fat": 4
        },
        "recommendedFor": [
          "mantenimiento",
          "superavit"
        ],
        "priceTier": "medio"
      },
      {
        "id": "tortilla_trigo",
        "name": "Tortilla de trigo",
        "unit": "g",
        "nutritionPer100": {
          "kcal": 300,
          "protein": 8,
          "carbs": 50,
          "fat": 8
        },
        "recommendedFor": [
          "mantenimiento",
          "superavit"
        ],
        "priceTier": "medio"
      },
      {
        "id": "galletas_arroz",
        "name": "Galletas de arroz",
        "unit": "g",
        "nutritionPer100": {
          "kcal": 380,
          "protein": 8,
          "carbs": 81,
          "fat": 3
        },
        "recommendedFor": [
          "deficit",
          "mantenimiento",
          "superavit"
        ],
        "priceTier": "medio"
      }
    ]
  },
  {
    "id": "legumbres",
    "name": "Legumbres",
    "foods": [
      {
        "id": "lentejas_cocidas",
        "name": "Lentejas cocidas",
        "unit": "g",
        "nutritionPer100": {
          "kcal": 116,
          "protein": 9,
          "carbs": 20,
          "fat": 0.4
        },
        "recommendedFor": [
          "deficit",
          "mantenimiento",
          "superavit"
        ],
        "priceTier": "bajo"
      },
      {
        "id": "garbanzos_cocidos",
        "name": "Garbanzos cocidos",
        "unit": "g",
        "nutritionPer100": {
          "kcal": 164,
          "protein": 9,
          "carbs": 27,
          "fat": 2.6
        },
        "recommendedFor": [
          "deficit",
          "mantenimiento",
          "superavit"
        ],
        "priceTier": "bajo"
      },
      {
        "id": "porotos_cocidos",
        "name": "Porotos cocidos",
        "unit": "g",
        "nutritionPer100": {
          "kcal": 127,
          "protein": 9,
          "carbs": 23,
          "fat": 0.5
        },
        "recommendedFor": [
          "deficit",
          "mantenimiento",
          "superavit"
        ],
        "priceTier": "bajo"
      },
      {
        "id": "arvejas_cocidas",
        "name": "Arvejas cocidas",
        "unit": "g",
        "nutritionPer100": {
          "kcal": 84,
          "protein": 5,
          "carbs": 15,
          "fat": 0.4
        },
        "recommendedFor": [
          "deficit",
          "mantenimiento",
          "superavit"
        ],
        "priceTier": "bajo"
      }
    ]
  },
  {
    "id": "frutas",
    "name": "Frutas",
    "foods": [
      {
        "id": "banana",
        "name": "Banana",
        "unit": "g",
        "nutritionPer100": {
          "kcal": 89,
          "protein": 1.1,
          "carbs": 23,
          "fat": 0.3
        },
        "recommendedFor": [
          "deficit",
          "mantenimiento",
          "superavit"
        ],
        "priceTier": "bajo"
      },
      {
        "id": "manzana",
        "name": "Manzana",
        "unit": "g",
        "nutritionPer100": {
          "kcal": 52,
          "protein": 0.3,
          "carbs": 14,
          "fat": 0.2
        },
        "recommendedFor": [
          "deficit",
          "mantenimiento"
        ],
        "priceTier": "bajo"
      },
      {
        "id": "naranja",
        "name": "Naranja",
        "unit": "g",
        "nutritionPer100": {
          "kcal": 47,
          "protein": 0.9,
          "carbs": 12,
          "fat": 0.1
        },
        "recommendedFor": [
          "deficit",
          "mantenimiento"
        ],
        "priceTier": "bajo"
      },
      {
        "id": "mandarina",
        "name": "Mandarina",
        "unit": "g",
        "nutritionPer100": {
          "kcal": 53,
          "protein": 0.8,
          "carbs": 13,
          "fat": 0.3
        },
        "recommendedFor": [
          "deficit",
          "mantenimiento"
        ],
        "priceTier": "bajo"
      },
      {
        "id": "pera",
        "name": "Pera",
        "unit": "g",
        "nutritionPer100": {
          "kcal": 57,
          "protein": 0.4,
          "carbs": 15,
          "fat": 0.1
        },
        "recommendedFor": [
          "deficit",
          "mantenimiento"
        ],
        "priceTier": "bajo"
      },
      {
        "id": "durazno",
        "name": "Durazno",
        "unit": "g",
        "nutritionPer100": {
          "kcal": 39,
          "protein": 0.9,
          "carbs": 10,
          "fat": 0.3
        },
        "recommendedFor": [
          "deficit",
          "mantenimiento"
        ],
        "priceTier": "medio"
      },
      {
        "id": "frutilla",
        "name": "Frutilla",
        "unit": "g",
        "nutritionPer100": {
          "kcal": 32,
          "protein": 0.7,
          "carbs": 8,
          "fat": 0.3
        },
        "recommendedFor": [
          "deficit",
          "mantenimiento"
        ],
        "priceTier": "medio"
      },
      {
        "id": "uva",
        "name": "Uva",
        "unit": "g",
        "nutritionPer100": {
          "kcal": 69,
          "protein": 0.7,
          "carbs": 18,
          "fat": 0.2
        },
        "recommendedFor": [
          "mantenimiento",
          "superavit"
        ],
        "priceTier": "medio"
      },
      {
        "id": "melon",
        "name": "Melón",
        "unit": "g",
        "nutritionPer100": {
          "kcal": 34,
          "protein": 0.8,
          "carbs": 8,
          "fat": 0.2
        },
        "recommendedFor": [
          "deficit",
          "mantenimiento"
        ],
        "priceTier": "medio"
      },
      {
        "id": "sandia",
        "name": "Sandía",
        "unit": "g",
        "nutritionPer100": {
          "kcal": 30,
          "protein": 0.6,
          "carbs": 8,
          "fat": 0.2
        },
        "recommendedFor": [
          "deficit",
          "mantenimiento"
        ],
        "priceTier": "medio"
      }
    ]
  },
  {
    "id": "verduras",
    "name": "Verduras y hortalizas",
    "foods": [
      {
        "id": "lechuga",
        "name": "Lechuga",
        "unit": "g",
        "nutritionPer100": {
          "kcal": 15,
          "protein": 1.4,
          "carbs": 3,
          "fat": 0.2
        },
        "recommendedFor": [
          "deficit",
          "mantenimiento"
        ],
        "priceTier": "bajo"
      },
      {
        "id": "tomate",
        "name": "Tomate",
        "unit": "g",
        "nutritionPer100": {
          "kcal": 18,
          "protein": 0.9,
          "carbs": 3.9,
          "fat": 0.2
        },
        "recommendedFor": [
          "deficit",
          "mantenimiento"
        ],
        "priceTier": "bajo"
      },
      {
        "id": "cebolla",
        "name": "Cebolla",
        "unit": "g",
        "nutritionPer100": {
          "kcal": 40,
          "protein": 1.1,
          "carbs": 9.3,
          "fat": 0.1
        },
        "recommendedFor": [
          "deficit",
          "mantenimiento",
          "superavit"
        ],
        "priceTier": "bajo"
      },
      {
        "id": "zanahoria",
        "name": "Zanahoria",
        "unit": "g",
        "nutritionPer100": {
          "kcal": 41,
          "protein": 0.9,
          "carbs": 10,
          "fat": 0.2
        },
        "recommendedFor": [
          "deficit",
          "mantenimiento"
        ],
        "priceTier": "bajo"
      },
      {
        "id": "pepino",
        "name": "Pepino",
        "unit": "g",
        "nutritionPer100": {
          "kcal": 15,
          "protein": 0.7,
          "carbs": 3.6,
          "fat": 0.1
        },
        "recommendedFor": [
          "deficit",
          "mantenimiento"
        ],
        "priceTier": "bajo"
      },
      {
        "id": "morron",
        "name": "Morrón",
        "unit": "g",
        "nutritionPer100": {
          "kcal": 31,
          "protein": 1,
          "carbs": 6,
          "fat": 0.3
        },
        "recommendedFor": [
          "deficit",
          "mantenimiento"
        ],
        "priceTier": "medio"
      },
      {
        "id": "brocoli",
        "name": "Brócoli",
        "unit": "g",
        "nutritionPer100": {
          "kcal": 34,
          "protein": 2.8,
          "carbs": 7,
          "fat": 0.4
        },
        "recommendedFor": [
          "deficit",
          "mantenimiento"
        ],
        "priceTier": "medio"
      },
      {
        "id": "coliflor",
        "name": "Coliflor",
        "unit": "g",
        "nutritionPer100": {
          "kcal": 25,
          "protein": 1.9,
          "carbs": 5,
          "fat": 0.3
        },
        "recommendedFor": [
          "deficit",
          "mantenimiento"
        ],
        "priceTier": "medio"
      },
      {
        "id": "espinaca",
        "name": "Espinaca",
        "unit": "g",
        "nutritionPer100": {
          "kcal": 23,
          "protein": 2.9,
          "carbs": 3.6,
          "fat": 0.4
        },
        "recommendedFor": [
          "deficit",
          "mantenimiento"
        ],
        "priceTier": "medio"
      },
      {
        "id": "acelga",
        "name": "Acelga",
        "unit": "g",
        "nutritionPer100": {
          "kcal": 19,
          "protein": 1.8,
          "carbs": 3.7,
          "fat": 0.2
        },
        "recommendedFor": [
          "deficit",
          "mantenimiento"
        ],
        "priceTier": "bajo"
      },
      {
        "id": "zapallito",
        "name": "Zapallito",
        "unit": "g",
        "nutritionPer100": {
          "kcal": 20,
          "protein": 1.5,
          "carbs": 4,
          "fat": 0.2
        },
        "recommendedFor": [
          "deficit",
          "mantenimiento"
        ],
        "priceTier": "bajo"
      },
      {
        "id": "berenjena",
        "name": "Berenjena",
        "unit": "g",
        "nutritionPer100": {
          "kcal": 25,
          "protein": 1,
          "carbs": 6,
          "fat": 0.2
        },
        "recommendedFor": [
          "deficit",
          "mantenimiento"
        ],
        "priceTier": "bajo"
      },
      {
        "id": "repollo",
        "name": "Repollo",
        "unit": "g",
        "nutritionPer100": {
          "kcal": 25,
          "protein": 1.3,
          "carbs": 6,
          "fat": 0.1
        },
        "recommendedFor": [
          "deficit",
          "mantenimiento"
        ],
        "priceTier": "bajo"
      },
      {
        "id": "chauchas",
        "name": "Chauchas",
        "unit": "g",
        "nutritionPer100": {
          "kcal": 31,
          "protein": 1.8,
          "carbs": 7,
          "fat": 0.2
        },
        "recommendedFor": [
          "deficit",
          "mantenimiento"
        ],
        "priceTier": "medio"
      }
    ]
  },
  {
    "id": "grasas_saludables",
    "name": "Grasas y alimentos densos en energía",
    "foods": [
      {
        "id": "aceite_oliva",
        "name": "Aceite de oliva",
        "unit": "ml",
        "nutritionPer100": {
          "kcal": 884,
          "protein": 0,
          "carbs": 0,
          "fat": 100
        },
        "recommendedFor": [
          "mantenimiento",
          "superavit"
        ],
        "priceTier": "medio"
      },
      {
        "id": "aceite_girasol",
        "name": "Aceite de girasol",
        "unit": "ml",
        "nutritionPer100": {
          "kcal": 884,
          "protein": 0,
          "carbs": 0,
          "fat": 100
        },
        "recommendedFor": [
          "mantenimiento",
          "superavit"
        ],
        "priceTier": "bajo"
      },
      {
        "id": "palta",
        "name": "Palta",
        "unit": "g",
        "nutritionPer100": {
          "kcal": 160,
          "protein": 2,
          "carbs": 9,
          "fat": 15
        },
        "recommendedFor": [
          "mantenimiento",
          "superavit"
        ],
        "priceTier": "medio"
      },
      {
        "id": "mani",
        "name": "Maní",
        "unit": "g",
        "nutritionPer100": {
          "kcal": 567,
          "protein": 26,
          "carbs": 16,
          "fat": 49
        },
        "recommendedFor": [
          "mantenimiento",
          "superavit"
        ],
        "priceTier": "bajo"
      },
      {
        "id": "pasta_mani",
        "name": "Pasta de maní",
        "unit": "g",
        "nutritionPer100": {
          "kcal": 590,
          "protein": 25,
          "carbs": 20,
          "fat": 50
        },
        "recommendedFor": [
          "mantenimiento",
          "superavit"
        ],
        "priceTier": "medio"
      },
      {
        "id": "nueces",
        "name": "Nueces",
        "unit": "g",
        "nutritionPer100": {
          "kcal": 650,
          "protein": 15,
          "carbs": 14,
          "fat": 65
        },
        "recommendedFor": [
          "mantenimiento",
          "superavit"
        ],
        "priceTier": "medio"
      },
      {
        "id": "semillas_girasol",
        "name": "Semillas de girasol",
        "unit": "g",
        "nutritionPer100": {
          "kcal": 585,
          "protein": 21,
          "carbs": 20,
          "fat": 51
        },
        "recommendedFor": [
          "mantenimiento",
          "superavit"
        ],
        "priceTier": "medio"
      }
    ]
  },
  {
    "id": "extras_entrenamiento",
    "name": "Extras comunes en dietas deportivas",
    "foods": [
      {
        "id": "mermelada",
        "name": "Mermelada",
        "unit": "g",
        "nutritionPer100": {
          "kcal": 250,
          "protein": 0.4,
          "carbs": 65,
          "fat": 0.1
        },
        "recommendedFor": [
          "mantenimiento",
          "superavit"
        ],
        "priceTier": "bajo"
      },
      {
        "id": "mermelada_light",
        "name": "Mermelada light",
        "unit": "g",
        "nutritionPer100": {
          "kcal": 100,
          "protein": 0.3,
          "carbs": 25,
          "fat": 0.1
        },
        "recommendedFor": [
          "deficit",
          "mantenimiento"
        ],
        "priceTier": "medio"
      },
      {
        "id": "miel",
        "name": "Miel",
        "unit": "g",
        "nutritionPer100": {
          "kcal": 304,
          "protein": 0.3,
          "carbs": 82,
          "fat": 0
        },
        "recommendedFor": [
          "mantenimiento",
          "superavit"
        ],
        "priceTier": "medio"
      },
      {
        "id": "cacao_amargo",
        "name": "Cacao amargo",
        "unit": "g",
        "nutritionPer100": {
          "kcal": 230,
          "protein": 20,
          "carbs": 58,
          "fat": 14
        },
        "recommendedFor": [
          "deficit",
          "mantenimiento",
          "superavit"
        ],
        "priceTier": "medio"
      },
      {
        "id": "gelatina_light",
        "name": "Gelatina sin azúcar",
        "unit": "g",
        "nutritionPer100": {
          "kcal": 20,
          "protein": 4,
          "carbs": 1,
          "fat": 0
        },
        "recommendedFor": [
          "deficit"
        ],
        "priceTier": "bajo"
      },
      {
        "id": "cafe_sin_azucar",
        "name": "Café sin azúcar",
        "unit": "ml",
        "nutritionPer100": {
          "kcal": 2,
          "protein": 0.1,
          "carbs": 0,
          "fat": 0
        },
        "recommendedFor": [
          "deficit",
          "mantenimiento",
          "superavit"
        ],
        "priceTier": "bajo"
      }
    ]
  }
] as const satisfies readonly FoodGroup[];

export const dietFoodOptions = foodGroups.flatMap((group) =>
  group.foods.map((food) => ({
    ...food,
    nutritionPer100: { ...food.nutritionPer100 },
    recommendedFor: [...food.recommendedFor],
    group: group.name,
    groupId: group.id,
  })),
);

export const foodCatalog: Food[] = dietFoodOptions.map((food) => ({
  id: food.id,
  name: food.name,
  serving: `100 ${food.unit}`,
  unit: food.unit,
  kcal: food.nutritionPer100.kcal,
  protein: food.nutritionPer100.protein,
  carbs: food.nutritionPer100.carbs,
  fats: food.nutritionPer100.fat,
  group: food.group,
}));
