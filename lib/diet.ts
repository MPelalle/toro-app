import { dietFoodOptions } from "@/lib/diet-food-catalog";

export type DietGoal = "lose" | "maintain" | "gain";
export type Sex = "male" | "female";

export type DietMeal = {
  id: string;
  name: string;
  time: string;
  kcal: number;
  protein: number;
  carbs: number;
  fats: number;
  foods: string[];
};

export type Food = { id: string; name: string; serving: string; kcal: number; protein: number; carbs: number; fats: number; group: string };

export const foodCatalog: Food[] = dietFoodOptions.map((food) => ({
  id: food.id,
  name: food.name,
  serving: `100 ${food.unit}`,
  kcal: food.nutritionPer100.kcal,
  protein: food.nutritionPer100.protein,
  carbs: food.nutritionPer100.carbs,
  fats: food.nutritionPer100.fat,
  group: food.group,
}));

export type WeightEntry = { id: string; date: string; weight: number; note?: string };
export type DailyDietLog = { date: string; completedMeals: string[]; comment: string };

export type Diet = {
  id: string;
  name: string;
  sex: Sex;
  age: number;
  weight: number;
  height: number;
  activity: number;
  activityLabel: string;
  goal: DietGoal;
  mealsPerDay: number;
  calories: number;
  tdee: number;
  protein: number;
  carbs: number;
  fats: number;
  meals: DietMeal[];
  weightHistory: WeightEntry[];
  dailyLogs: DailyDietLog[];
  createdAt: string;
  active: boolean;
};

export const goalLabels: Record<DietGoal, string> = {
  lose: "Bajar de peso",
  maintain: "Mantener peso",
  gain: "Subir de peso",
};

export const activityLevels = [
  { value: 1.2, label: "Sedentario · poco o ningún ejercicio" },
  { value: 1.375, label: "Ligero · 1 a 3 días por semana" },
  { value: 1.55, label: "Moderado · 3 a 5 días por semana" },
  { value: 1.725, label: "Alto · 6 a 7 días por semana" },
  { value: 1.9, label: "Muy alto · entrenamiento intenso o físico" },
];

const round = (value: number, step = 1) => Math.round(value / step) * step;

export function calculateDiet(input: {
  sex: Sex; age: number; weight: number; height: number; activity: number; goal: DietGoal; mealsPerDay: number;
}) {
  const { sex, age, weight, height, activity, goal, mealsPerDay } = input;
  const bmr = 10 * weight + 6.25 * height - 5 * age + (sex === "male" ? 5 : -161);
  const tdee = round(bmr * activity, 5);
  const adjustment = goal === "lose" ? -450 : goal === "gain" ? 300 : 0;
  const calories = Math.max(1200, round(tdee + adjustment, 5));
  const protein = round(weight * (goal === "lose" ? 2 : 1.8), 5);
  const fats = round(Math.max(weight * 0.8, (calories * 0.25) / 9), 5);
  const carbs = round(Math.max(0, (calories - protein * 4 - fats * 9) / 4), 5);
  return { tdee, calories, protein, fats, carbs, meals: makeMeals({ calories, protein, carbs, fats, mealsPerDay }) };
}

function makeMeals(totals: { calories: number; protein: number; carbs: number; fats: number; mealsPerDay: number }): DietMeal[] {
  const names = ["Desayuno", "Media mañana", "Almuerzo", "Merienda", "Cena", "Colación nocturna"];
  const times = ["08:00", "11:00", "13:30", "17:00", "20:30", "22:30"];
  const foods = [
    ["Avena con yogur griego y banana", "Café o infusión sin azúcar"],
    ["Tostadas integrales con queso untable", "Fruta de estación"],
    ["Pechuga de pollo, arroz y vegetales", "Aceite de oliva o palta"],
    ["Yogur alto en proteína con frutos rojos", "Puñado de nueces"],
    ["Carne magra o legumbres con papa", "Ensalada variada"],
    ["Requesón o yogur natural", "Fruta o cereal integral"],
  ];
  const ratios = totals.mealsPerDay === 3 ? [0.3, 0.4, 0.3] : totals.mealsPerDay === 4 ? [0.25, 0.25, 0.3, 0.2] : [0.22, 0.1, 0.25, 0.13, 0.23, 0.07];
  return Array.from({ length: totals.mealsPerDay }, (_, index) => ({
    id: `meal-${index + 1}`,
    name: names[index], time: times[index],
    kcal: round(totals.calories * ratios[index], 5),
    protein: round(totals.protein * ratios[index]),
    carbs: round(totals.carbs * ratios[index]),
    fats: round(totals.fats * ratios[index]),
    foods: foods[index],
  }));
}

export const dietStorageKey = "toro-diets";

export function getDiets(): Diet[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(dietStorageKey) || "[]") as Diet[]; } catch { return []; }
}

export function saveDiets(diets: Diet[]) {
  localStorage.setItem(dietStorageKey, JSON.stringify(diets));
}

export function today() { return new Date().toISOString().slice(0, 10); }

export async function dietRequest<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...options, headers: { "Content-Type": "application/json", ...(options?.headers || {}) } });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error || "No se pudo guardar el plan.");
  }
  return response.json() as Promise<T>;
}
