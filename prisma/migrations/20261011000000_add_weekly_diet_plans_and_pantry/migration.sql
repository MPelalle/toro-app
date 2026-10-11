ALTER TABLE "diet_plans" ADD COLUMN "notes" TEXT;
ALTER TABLE "diet_meals" ADD COLUMN "day_of_week" INTEGER NOT NULL DEFAULT 0;

DROP INDEX "diet_meals_diet_id_position_key";

INSERT INTO "diet_meals" (
  "id", "diet_id", "day_of_week", "position", "name", "time",
  "kcal", "protein", "carbs", "fats", "foods", "created_at"
)
SELECT
  gen_random_uuid(), meal."diet_id", day."day_of_week", meal."position", meal."name", meal."time",
  meal."kcal", meal."protein", meal."carbs", meal."fats", meal."foods", meal."created_at"
FROM "diet_meals" AS meal
CROSS JOIN generate_series(1, 6) AS day("day_of_week");

UPDATE "diet_daily_logs" AS log
SET "completed_meal_ids" = COALESCE((
  SELECT jsonb_agg(COALESCE(clone."id"::text, completed."meal_id"))
  FROM jsonb_array_elements_text(log."completed_meal_ids") AS completed("meal_id")
  LEFT JOIN "diet_meals" AS original ON original."id"::text = completed."meal_id"
  LEFT JOIN "diet_meals" AS clone
    ON clone."diet_id" = original."diet_id"
    AND clone."position" = original."position"
    AND clone."day_of_week" = ((EXTRACT(DOW FROM log."date")::INTEGER + 6) % 7)
), '[]'::jsonb);

CREATE UNIQUE INDEX "diet_meals_diet_id_day_of_week_position_key"
ON "diet_meals"("diet_id", "day_of_week", "position");

CREATE TABLE "diet_pantry_items" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "diet_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "unit" TEXT NOT NULL DEFAULT '',
  "is_shopping" BOOLEAN NOT NULL DEFAULT false,
  "checked" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "diet_pantry_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "diet_pantry_items_diet_id_user_id_name_unit_is_shopping_key"
ON "diet_pantry_items"("diet_id", "user_id", "name", "unit", "is_shopping");
CREATE INDEX "diet_pantry_items_user_id_diet_id_is_shopping_idx"
ON "diet_pantry_items"("user_id", "diet_id", "is_shopping");

ALTER TABLE "diet_pantry_items"
ADD CONSTRAINT "diet_pantry_items_diet_id_fkey"
FOREIGN KEY ("diet_id") REFERENCES "diet_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "diet_pantry_items"
ADD CONSTRAINT "diet_pantry_items_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
