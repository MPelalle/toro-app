CREATE TABLE "app_daily_visits" (
  "user_id" UUID NOT NULL,
  "date" DATE NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "app_daily_visits_pkey" PRIMARY KEY ("user_id", "date")
);

ALTER TABLE "app_daily_visits"
  ADD CONSTRAINT "app_daily_visits_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
