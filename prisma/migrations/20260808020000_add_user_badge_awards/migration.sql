CREATE TABLE "user_badge_awards" (
  "user_id" UUID NOT NULL,
  "badge_id" TEXT NOT NULL,
  "tier" INTEGER NOT NULL,
  "awarded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "user_badge_awards_pkey" PRIMARY KEY ("user_id", "badge_id")
);

ALTER TABLE "user_badge_awards"
  ADD CONSTRAINT "user_badge_awards_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
