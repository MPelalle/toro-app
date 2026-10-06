-- Una publicación de rutina debe ser idempotente, incluso si dos requests
-- concurrentes intentan publicarla al mismo tiempo.
CREATE UNIQUE INDEX "social_activities_routine_id_type_key"
ON "social_activities"("routine_id", "type");
