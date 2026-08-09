CREATE TYPE "DietKind" AS ENUM ('PERSONAL', 'SHARED');
CREATE TYPE "DietMemberRole" AS ENUM ('OWNER', 'MEMBER');

ALTER TABLE "diet_plans" ADD COLUMN "kind" "DietKind" NOT NULL DEFAULT 'PERSONAL';
ALTER TABLE "diet_plans" ADD COLUMN "updated_by_id" UUID;
ALTER TABLE "diet_plans" ADD CONSTRAINT "diet_plans_updated_by_id_fkey"
  FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "diet_plans_kind_updated_at_idx" ON "diet_plans"("kind", "updated_at");

CREATE TABLE "diet_members" (
  "diet_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "role" "DietMemberRole" NOT NULL DEFAULT 'MEMBER',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "diet_members_pkey" PRIMARY KEY ("diet_id", "user_id"),
  CONSTRAINT "diet_members_diet_id_fkey" FOREIGN KEY ("diet_id") REFERENCES "diet_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "diet_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "diet_members_user_id_created_at_idx" ON "diet_members"("user_id", "created_at");

ALTER TABLE "diet_weight_entries" ADD COLUMN "user_id" UUID;
UPDATE "diet_weight_entries" AS entry SET "user_id" = plan."user_id" FROM "diet_plans" AS plan WHERE entry."diet_id" = plan."id";
ALTER TABLE "diet_weight_entries" ALTER COLUMN "user_id" SET NOT NULL;
ALTER TABLE "diet_weight_entries" ADD CONSTRAINT "diet_weight_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "diet_weight_entries_user_id_date_idx" ON "diet_weight_entries"("user_id", "date");

ALTER TABLE "diet_daily_logs" ADD COLUMN "user_id" UUID;
UPDATE "diet_daily_logs" AS log SET "user_id" = plan."user_id" FROM "diet_plans" AS plan WHERE log."diet_id" = plan."id";
ALTER TABLE "diet_daily_logs" ALTER COLUMN "user_id" SET NOT NULL;
ALTER TABLE "diet_daily_logs" DROP CONSTRAINT IF EXISTS "diet_daily_logs_diet_id_date_key";
DROP INDEX IF EXISTS "diet_daily_logs_diet_id_date_key";
ALTER TABLE "diet_daily_logs" ADD CONSTRAINT "diet_daily_logs_diet_id_user_id_date_key" UNIQUE ("diet_id", "user_id", "date");
ALTER TABLE "diet_daily_logs" ADD CONSTRAINT "diet_daily_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "diet_daily_logs_user_id_date_idx" ON "diet_daily_logs"("user_id", "date");
