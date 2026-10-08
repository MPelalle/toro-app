CREATE TYPE "TrainingFolderKind" AS ENUM ('PLAN', 'MESOCYCLE', 'SIX_MONTH_CYCLE');

CREATE TABLE "training_folders" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "kind" "TrainingFolderKind" NOT NULL DEFAULT 'PLAN',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "training_folders_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "routine_plans" ADD COLUMN "training_folder_id" UUID;
ALTER TABLE "training_folders" ADD CONSTRAINT "training_folders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "routine_plans" ADD CONSTRAINT "routine_plans_training_folder_id_fkey" FOREIGN KEY ("training_folder_id") REFERENCES "training_folders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "training_folders_user_id_updated_at_idx" ON "training_folders"("user_id", "updated_at");
CREATE INDEX "routine_plans_training_folder_id_idx" ON "routine_plans"("training_folder_id");
