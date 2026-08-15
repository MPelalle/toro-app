ALTER TABLE "users" ADD COLUMN "bio" TEXT;

ALTER TABLE "routine_plans" ADD COLUMN "is_published" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "routine_plans" ADD COLUMN "published_at" TIMESTAMP(3);
CREATE INDEX "routine_plans_user_id_is_published_published_at_idx"
  ON "routine_plans"("user_id", "is_published", "published_at");

CREATE TABLE "community_statuses" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "content" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "community_statuses_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "community_statuses_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "community_statuses_user_id_created_at_idx"
  ON "community_statuses"("user_id", "created_at");
