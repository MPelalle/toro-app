-- CreateEnum
CREATE TYPE "SocialActivityType" AS ENUM ('WORKOUT_COMPLETED', 'ROUTINE_PUBLISHED', 'STATUS', 'REPOST');

-- CreateEnum
CREATE TYPE "SocialReportReason" AS ENUM ('SPAM', 'HARASSMENT', 'INAPPROPRIATE', 'OTHER');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "SocialNotificationType" ADD VALUE 'ACTIVITY_LIKED';
ALTER TYPE "SocialNotificationType" ADD VALUE 'ACTIVITY_COMMENTED';
ALTER TYPE "SocialNotificationType" ADD VALUE 'FRIEND_ACCEPTED';

-- CreateTable
CREATE TABLE "social_activities" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "actor_user_id" UUID NOT NULL,
    "type" "SocialActivityType" NOT NULL,
    "workout_session_id" UUID,
    "routine_id" UUID,
    "status_id" UUID,
    "original_activity_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "social_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_activity_reactions" (
    "activity_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "social_activity_reactions_pkey" PRIMARY KEY ("activity_id","user_id")
);

-- CreateTable
CREATE TABLE "social_activity_comments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "activity_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "social_activity_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_blocks" (
    "blocker_id" UUID NOT NULL,
    "blocked_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "social_blocks_pkey" PRIMARY KEY ("blocker_id","blocked_id")
);

-- CreateTable
CREATE TABLE "social_reports" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "reporter_id" UUID NOT NULL,
    "target_user_id" UUID,
    "activity_id" UUID,
    "reason" "SocialReportReason" NOT NULL,
    "detail" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "social_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "social_activities_workout_session_id_key" ON "social_activities"("workout_session_id");

-- CreateIndex
CREATE UNIQUE INDEX "social_activities_status_id_key" ON "social_activities"("status_id");

-- CreateIndex
CREATE INDEX "social_activities_actor_user_id_created_at_idx" ON "social_activities"("actor_user_id", "created_at");

-- CreateIndex
CREATE INDEX "social_activities_created_at_id_idx" ON "social_activities"("created_at", "id");

-- CreateIndex
CREATE INDEX "social_activity_reactions_user_id_created_at_idx" ON "social_activity_reactions"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "social_activity_comments_activity_id_created_at_idx" ON "social_activity_comments"("activity_id", "created_at");

-- CreateIndex
CREATE INDEX "social_activity_comments_user_id_created_at_idx" ON "social_activity_comments"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "social_blocks_blocked_id_idx" ON "social_blocks"("blocked_id");

-- CreateIndex
CREATE INDEX "social_reports_target_user_id_created_at_idx" ON "social_reports"("target_user_id", "created_at");

-- CreateIndex
CREATE INDEX "social_reports_activity_id_created_at_idx" ON "social_reports"("activity_id", "created_at");

-- AddForeignKey
ALTER TABLE "social_activities" ADD CONSTRAINT "social_activities_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_activities" ADD CONSTRAINT "social_activities_workout_session_id_fkey" FOREIGN KEY ("workout_session_id") REFERENCES "workout_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_activities" ADD CONSTRAINT "social_activities_routine_id_fkey" FOREIGN KEY ("routine_id") REFERENCES "routine_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_activities" ADD CONSTRAINT "social_activities_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "community_statuses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_activities" ADD CONSTRAINT "social_activities_original_activity_id_fkey" FOREIGN KEY ("original_activity_id") REFERENCES "social_activities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_activity_reactions" ADD CONSTRAINT "social_activity_reactions_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "social_activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_activity_reactions" ADD CONSTRAINT "social_activity_reactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_activity_comments" ADD CONSTRAINT "social_activity_comments_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "social_activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_activity_comments" ADD CONSTRAINT "social_activity_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_blocks" ADD CONSTRAINT "social_blocks_blocker_id_fkey" FOREIGN KEY ("blocker_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_blocks" ADD CONSTRAINT "social_blocks_blocked_id_fkey" FOREIGN KEY ("blocked_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_reports" ADD CONSTRAINT "social_reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_reports" ADD CONSTRAINT "social_reports_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "social_activities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
