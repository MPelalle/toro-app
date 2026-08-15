CREATE TABLE "community_profile_messages" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "author_id" UUID NOT NULL,
  "profile_user_id" UUID NOT NULL,
  "content" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "community_profile_messages_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "community_profile_messages_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "community_profile_messages_profile_user_id_fkey" FOREIGN KEY ("profile_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "community_profile_messages_profile_user_id_created_at_idx"
  ON "community_profile_messages"("profile_user_id", "created_at" DESC);

CREATE INDEX "community_profile_messages_author_id_created_at_idx"
  ON "community_profile_messages"("author_id", "created_at" DESC);
