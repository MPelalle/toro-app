-- DropIndex
DROP INDEX "community_profile_messages_author_id_created_at_idx";

-- DropIndex
DROP INDEX "community_profile_messages_profile_user_id_created_at_idx";

-- DropIndex
DROP INDEX "diet_weekly_check_ins_user_id_week_start_idx";

-- DropIndex
DROP INDEX "routine_plans_kind_is_published_published_at_idx";

-- DropIndex
DROP INDEX "routine_plans_user_id_active_idx";

-- DropIndex
DROP INDEX "workout_sessions_user_id_status_finished_at_idx";

-- AlterTable
ALTER TABLE "routine_exercises" ADD COLUMN     "rest_seconds" INTEGER,
ADD COLUMN     "superset_group_id" TEXT;

-- AlterTable
ALTER TABLE "workout_session_exercises" ADD COLUMN     "rest_seconds" INTEGER,
ADD COLUMN     "superset_group_id" TEXT;

-- CreateIndex
CREATE INDEX "community_profile_messages_profile_user_id_created_at_idx" ON "community_profile_messages"("profile_user_id", "created_at");

-- CreateIndex
CREATE INDEX "community_profile_messages_author_id_created_at_idx" ON "community_profile_messages"("author_id", "created_at");

-- CreateIndex
CREATE INDEX "diet_weekly_check_ins_user_id_week_start_idx" ON "diet_weekly_check_ins"("user_id", "week_start");

-- CreateIndex
CREATE INDEX "routine_plans_kind_is_published_published_at_idx" ON "routine_plans"("kind", "is_published", "published_at");

-- CreateIndex
CREATE INDEX "workout_sessions_user_id_status_finished_at_idx" ON "workout_sessions"("user_id", "status", "finished_at");
