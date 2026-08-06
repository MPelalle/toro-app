ALTER TABLE "workout_sessions"
  ADD COLUMN "duration_seconds" INTEGER,
  ADD COLUMN "notes" TEXT,
  ADD COLUMN "emotional_rating" INTEGER;

ALTER TABLE "workout_sets"
  ADD COLUMN "rir" INTEGER,
  ADD COLUMN "rpe" INTEGER,
  ADD COLUMN "note" TEXT;
