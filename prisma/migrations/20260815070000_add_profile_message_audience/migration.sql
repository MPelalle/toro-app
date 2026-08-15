CREATE TYPE "ProfileMessageAudience" AS ENUM ('FRIENDS', 'ANYONE');

ALTER TABLE "users"
  ADD COLUMN "profile_message_audience" "ProfileMessageAudience" NOT NULL DEFAULT 'FRIENDS';
