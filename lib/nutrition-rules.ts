import type { DietGoal, Sex } from "@/lib/diet-types";

export const NUTRITION_RULES = {
  adultMinimumCalories: { male: 1500, female: 1200 },
  minorMinimumCalories: 1800,
  minorAge: 18,
  weeklyAdjustmentKcal: 100,
} as const;

export function isMinorNutritionProfile(age: number) {
  return age < NUTRITION_RULES.minorAge;
}

export function minimumCaloriesFor(age: number, sex: Sex) {
  return isMinorNutritionProfile(age)
    ? NUTRITION_RULES.minorMinimumCalories
    : NUTRITION_RULES.adultMinimumCalories[sex];
}

export function initialCalorieAdjustment(age: number, goal: DietGoal) {
  // TORO does not prescribe a deficit/surplus to minors. Their plan starts at
  // estimated maintenance and should be reviewed with a qualified professional.
  if (isMinorNutritionProfile(age)) return 0;
  return goal === "lose" ? -450 : goal === "gain" ? 300 : 0;
}

export function weeklyAdjustmentFor(input: {
  age: number;
  goal: string;
  previousWeight: number;
  weight: number;
  currentCalories: number;
  sex: Sex;
  hasEnoughAdherence: boolean;
}) {
  if (isMinorNutritionProfile(input.age) || !input.hasEnoughAdherence) return 0;
  const change = input.weight - input.previousWeight;
  const rate = change / input.previousWeight;
  const requested = input.goal === "lose"
    ? rate >= -0.001 ? -NUTRITION_RULES.weeklyAdjustmentKcal : rate < -0.0125 ? NUTRITION_RULES.weeklyAdjustmentKcal : 0
    : input.goal === "gain"
      ? rate <= 0.001 ? NUTRITION_RULES.weeklyAdjustmentKcal : rate > 0.0075 ? -NUTRITION_RULES.weeklyAdjustmentKcal : 0
      : Math.abs(rate) > 0.004 ? (change > 0 ? -NUTRITION_RULES.weeklyAdjustmentKcal : NUTRITION_RULES.weeklyAdjustmentKcal) : 0;
  return requested && input.currentCalories + requested >= minimumCaloriesFor(input.age, input.sex) ? requested : 0;
}
