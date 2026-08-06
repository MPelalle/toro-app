CREATE TABLE "diet_plans" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "user_id" UUID NOT NULL,
  "name" TEXT NOT NULL, "sex" TEXT NOT NULL, "age" INTEGER NOT NULL, "weight" DOUBLE PRECISION NOT NULL,
  "height" DOUBLE PRECISION NOT NULL, "activity" DOUBLE PRECISION NOT NULL, "activity_label" TEXT NOT NULL,
  "goal" TEXT NOT NULL, "meals_per_day" INTEGER NOT NULL, "calories" INTEGER NOT NULL, "tdee" INTEGER NOT NULL,
  "protein" INTEGER NOT NULL, "carbs" INTEGER NOT NULL, "fats" INTEGER NOT NULL, "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "diet_plans_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "diet_meals" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "diet_id" UUID NOT NULL, "position" INTEGER NOT NULL,
  "name" TEXT NOT NULL, "time" TEXT NOT NULL, "kcal" INTEGER NOT NULL, "protein" INTEGER NOT NULL,
  "carbs" INTEGER NOT NULL, "fats" INTEGER NOT NULL, "foods" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "diet_meals_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "diet_weight_entries" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "diet_id" UUID NOT NULL, "date" DATE NOT NULL,
  "weight" DOUBLE PRECISION NOT NULL, "note" TEXT, "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "diet_weight_entries_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "diet_daily_logs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "diet_id" UUID NOT NULL, "date" DATE NOT NULL,
  "completed_meal_ids" JSONB NOT NULL, "comment" TEXT, "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL, CONSTRAINT "diet_daily_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "diet_plans_user_id_active_idx" ON "diet_plans"("user_id", "active");
CREATE INDEX "diet_plans_user_id_created_at_idx" ON "diet_plans"("user_id", "created_at");
CREATE UNIQUE INDEX "diet_meals_diet_id_position_key" ON "diet_meals"("diet_id", "position");
CREATE INDEX "diet_weight_entries_diet_id_date_idx" ON "diet_weight_entries"("diet_id", "date");
CREATE UNIQUE INDEX "diet_daily_logs_diet_id_date_key" ON "diet_daily_logs"("diet_id", "date");
ALTER TABLE "diet_plans" ADD CONSTRAINT "diet_plans_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "diet_meals" ADD CONSTRAINT "diet_meals_diet_id_fkey" FOREIGN KEY ("diet_id") REFERENCES "diet_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "diet_weight_entries" ADD CONSTRAINT "diet_weight_entries_diet_id_fkey" FOREIGN KEY ("diet_id") REFERENCES "diet_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "diet_daily_logs" ADD CONSTRAINT "diet_daily_logs_diet_id_fkey" FOREIGN KEY ("diet_id") REFERENCES "diet_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
