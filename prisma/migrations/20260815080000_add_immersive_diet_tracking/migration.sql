ALTER TABLE "diet_plans"
  ADD COLUMN "immersive_mode" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "diet_weekly_check_ins" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "diet_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "week_start" DATE NOT NULL,
  "weight" DOUBLE PRECISION NOT NULL,
  "feeling" TEXT NOT NULL,
  "energy" INTEGER NOT NULL,
  "hunger" INTEGER NOT NULL,
  "note" TEXT,
  "adjustment_kcal" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "diet_weekly_check_ins_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "diet_weekly_check_ins_diet_id_fkey" FOREIGN KEY ("diet_id") REFERENCES "diet_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "diet_weekly_check_ins_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "diet_weekly_check_ins_diet_id_user_id_week_start_key" UNIQUE ("diet_id", "user_id", "week_start")
);

CREATE INDEX "diet_weekly_check_ins_user_id_week_start_idx"
  ON "diet_weekly_check_ins"("user_id", "week_start" DESC);
