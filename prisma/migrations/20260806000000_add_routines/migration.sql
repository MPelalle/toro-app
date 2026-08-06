CREATE TABLE "routine_plans" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "days" JSONB NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "routine_plans_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "routine_exercises" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "routine_id" UUID NOT NULL,
  "position" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "muscle" TEXT NOT NULL,
  "sets" INTEGER NOT NULL,
  "reps" INTEGER NOT NULL,
  "weight" DOUBLE PRECISION NOT NULL,
  "technique" TEXT NOT NULL,
  "training_day" TEXT NOT NULL,
  "completed" BOOLEAN DEFAULT false,
  "actual_reps" INTEGER,
  "note" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "routine_exercises_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "routine_plans_user_id_active_idx" ON "routine_plans"("user_id", "active");
CREATE INDEX "routine_plans_user_id_created_at_idx" ON "routine_plans"("user_id", "created_at");
CREATE UNIQUE INDEX "routine_exercises_routine_id_position_key" ON "routine_exercises"("routine_id", "position");
CREATE INDEX "routine_exercises_routine_id_idx" ON "routine_exercises"("routine_id");
ALTER TABLE "routine_plans" ADD CONSTRAINT "routine_plans_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "routine_exercises" ADD CONSTRAINT "routine_exercises_routine_id_fkey" FOREIGN KEY ("routine_id") REFERENCES "routine_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
