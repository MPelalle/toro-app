CREATE TYPE "WorkoutSessionStatus" AS ENUM ('IN_PROGRESS', 'FINISHED');

CREATE TABLE "workout_sessions" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "routine_id" UUID NOT NULL,
  "status" "WorkoutSessionStatus" NOT NULL DEFAULT 'IN_PROGRESS',
  "started_at" TIMESTAMP(3) NOT NULL,
  "finished_at" TIMESTAMP(3),
  "client_updated_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "workout_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "workout_session_exercises" (
  "id" UUID NOT NULL,
  "session_id" UUID NOT NULL,
  "routine_exercise_id" UUID NOT NULL,
  "position" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "muscle" TEXT NOT NULL,
  CONSTRAINT "workout_session_exercises_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "workout_sets" (
  "id" UUID NOT NULL,
  "session_exercise_id" UUID NOT NULL,
  "set_number" INTEGER NOT NULL,
  "target_reps" INTEGER NOT NULL,
  "target_weight" DOUBLE PRECISION NOT NULL,
  "reps" INTEGER,
  "weight" DOUBLE PRECISION,
  "completed" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "workout_sets_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "workout_sessions_user_id_routine_id_status_idx" ON "workout_sessions"("user_id", "routine_id", "status");
CREATE INDEX "workout_sessions_user_id_client_updated_at_idx" ON "workout_sessions"("user_id", "client_updated_at");
CREATE UNIQUE INDEX "workout_session_exercises_session_id_position_key" ON "workout_session_exercises"("session_id", "position");
CREATE INDEX "workout_session_exercises_session_id_idx" ON "workout_session_exercises"("session_id");
CREATE UNIQUE INDEX "workout_sets_session_exercise_id_set_number_key" ON "workout_sets"("session_exercise_id", "set_number");
CREATE INDEX "workout_sets_session_exercise_id_idx" ON "workout_sets"("session_exercise_id");
ALTER TABLE "workout_sessions" ADD CONSTRAINT "workout_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workout_sessions" ADD CONSTRAINT "workout_sessions_routine_id_fkey" FOREIGN KEY ("routine_id") REFERENCES "routine_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workout_session_exercises" ADD CONSTRAINT "workout_session_exercises_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "workout_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workout_sets" ADD CONSTRAINT "workout_sets_session_exercise_id_fkey" FOREIGN KEY ("session_exercise_id") REFERENCES "workout_session_exercises"("id") ON DELETE CASCADE ON UPDATE CASCADE;
