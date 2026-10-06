-- DropForeignKey
ALTER TABLE "workout_sessions" DROP CONSTRAINT "workout_sessions_routine_id_fkey";

-- AlterTable
ALTER TABLE "workout_session_exercises" ALTER COLUMN "routine_exercise_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "workout_sessions" ALTER COLUMN "routine_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "workout_sessions" ADD CONSTRAINT "workout_sessions_routine_id_fkey" FOREIGN KEY ("routine_id") REFERENCES "routine_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;
