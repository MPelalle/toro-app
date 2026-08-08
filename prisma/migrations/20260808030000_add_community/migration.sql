-- Community: public nicknames, canonical friendships and shared routine members.
-- Nullable nickname preserves existing accounts; username is used when available.
ALTER TABLE "users" ADD COLUMN "nickname" TEXT;
UPDATE "users" AS candidate
SET "nickname" = LOWER(candidate."username")
WHERE candidate."username" IS NOT NULL
  AND candidate."nickname" IS NULL
  -- If legacy usernames only differ by case, preserve the first one and leave
  -- the other account nullable so it can choose a compliant nickname later.
  AND NOT EXISTS (
    SELECT 1 FROM "users" AS other
    WHERE other."id" < candidate."id"
      AND LOWER(other."username") = LOWER(candidate."username")
  );

CREATE UNIQUE INDEX "users_nickname_key" ON "users"("nickname");
CREATE UNIQUE INDEX "users_nickname_lower_key" ON "users"(LOWER("nickname")) WHERE "nickname" IS NOT NULL;

CREATE TYPE "FriendshipStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED');
CREATE TYPE "RoutineKind" AS ENUM ('PERSONAL', 'SHARED');
CREATE TYPE "RoutineMemberRole" AS ENUM ('OWNER', 'MEMBER');

ALTER TABLE "routine_plans" ADD COLUMN "kind" "RoutineKind" NOT NULL DEFAULT 'PERSONAL';
ALTER TABLE "routine_plans" ADD COLUMN "updated_by_id" UUID;
ALTER TABLE "routine_plans" ADD CONSTRAINT "routine_plans_updated_by_id_fkey"
  FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "routine_plans_user_id_kind_active_idx" ON "routine_plans"("user_id", "kind", "active");
CREATE INDEX "routine_plans_kind_updated_at_idx" ON "routine_plans"("kind", "updated_at");

CREATE TABLE "friendships" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "requester_id" UUID NOT NULL,
  "addressee_id" UUID NOT NULL,
  "user_a_id" UUID NOT NULL,
  "user_b_id" UUID NOT NULL,
  "status" "FriendshipStatus" NOT NULL DEFAULT 'PENDING',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "friendships_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "friendships_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "friendships_addressee_id_fkey" FOREIGN KEY ("addressee_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "friendships_pair_check" CHECK ("user_a_id" < "user_b_id")
);
CREATE UNIQUE INDEX "friendships_user_a_id_user_b_id_key" ON "friendships"("user_a_id", "user_b_id");
CREATE INDEX "friendships_requester_id_status_idx" ON "friendships"("requester_id", "status");
CREATE INDEX "friendships_addressee_id_status_idx" ON "friendships"("addressee_id", "status");

CREATE TABLE "routine_members" (
  "routine_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "role" "RoutineMemberRole" NOT NULL DEFAULT 'MEMBER',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "routine_members_pkey" PRIMARY KEY ("routine_id", "user_id"),
  CONSTRAINT "routine_members_routine_id_fkey" FOREIGN KEY ("routine_id") REFERENCES "routine_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "routine_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "routine_members_user_id_created_at_idx" ON "routine_members"("user_id", "created_at");
