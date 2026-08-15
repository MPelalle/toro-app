CREATE INDEX "routine_plans_kind_is_published_published_at_idx"
  ON "routine_plans"("kind", "is_published", "published_at" DESC);

CREATE INDEX "workout_sessions_user_id_status_finished_at_idx"
  ON "workout_sessions"("user_id", "status", "finished_at" DESC);
