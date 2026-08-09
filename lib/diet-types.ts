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

export type Food = {
  id: string;
  name: string;
  serving: string;
  unit: string;
  kcal: number;
  protein: number;
  carbs: number;
  fats: number;
  group: string;
};

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
  kind?: "PERSONAL" | "SHARED";
  canEdit?: boolean;
};
