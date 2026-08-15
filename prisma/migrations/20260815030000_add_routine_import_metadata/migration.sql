ALTER TABLE "routine_plans"
  ADD COLUMN "imported_from_routine_id" UUID,
  ADD COLUMN "imported_from_user_id" UUID,
  ADD COLUMN "imported_from_creator_name" TEXT;

CREATE INDEX "routine_plans_imported_from_routine_id_idx" ON "routine_plans"("imported_from_routine_id");
CREATE UNIQUE INDEX "routine_plans_user_id_imported_from_routine_id_key" ON "routine_plans"("user_id", "imported_from_routine_id");
