CREATE TYPE "SocialNotificationType" AS ENUM ('REPOST', 'ROUTINE_SAVED');

CREATE TABLE "social_reposts" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "original_author_id" UUID NOT NULL,
  "original_type" TEXT NOT NULL,
  "original_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "social_reposts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "social_reposts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "social_reposts_original_author_id_fkey" FOREIGN KEY ("original_author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "social_reposts_user_id_original_type_original_id_key" ON "social_reposts"("user_id", "original_type", "original_id");
CREATE INDEX "social_reposts_user_id_created_at_idx" ON "social_reposts"("user_id", "created_at");
CREATE INDEX "social_reposts_original_author_id_created_at_idx" ON "social_reposts"("original_author_id", "created_at");

CREATE TABLE "social_notifications" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "actor_id" UUID NOT NULL,
  "type" "SocialNotificationType" NOT NULL,
  "target_type" TEXT NOT NULL,
  "target_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "read_at" TIMESTAMP(3),
  CONSTRAINT "social_notifications_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "social_notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "social_notifications_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "social_notifications_user_id_actor_id_type_target_id_key" ON "social_notifications"("user_id", "actor_id", "type", "target_id");
CREATE INDEX "social_notifications_user_id_read_at_created_at_idx" ON "social_notifications"("user_id", "read_at", "created_at");
