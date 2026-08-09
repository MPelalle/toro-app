// Compatibility barrel for the lightweight diet domain. Keep the food catalog
// in its own module so dashboard and diet-detail routes do not load it.
export type { DailyDietLog, Diet, DietGoal, DietMeal, Food, Sex, WeightEntry } from "@/lib/diet-types";
export { activityLevels, calculateDiet, dietStorageKey, getDiets, goalLabels, saveDiets, today } from "@/lib/diet-utils";
export { dietRequest } from "@/lib/diet-request";
