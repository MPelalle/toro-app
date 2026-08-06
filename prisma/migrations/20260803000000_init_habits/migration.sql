CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE "HabitStatus" AS ENUM ('ACTIVE', 'PAUSED', 'INACTIVE');
CREATE TYPE "HabitImportance" AS ENUM ('LOW', 'MEDIUM', 'HIGH');
CREATE TYPE "HabitDurationUnit" AS ENUM ('DAYS', 'MONTHS');

CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT,
    "name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "habits" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT 'CircleCheck',
    "importance" "HabitImportance" NOT NULL DEFAULT 'MEDIUM',
    "duration_value" INTEGER NOT NULL DEFAULT 30,
    "duration_unit" "HabitDurationUnit" NOT NULL DEFAULT 'DAYS',
    "status" "HabitStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "starts_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ends_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "habits_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "habit_check_ins" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "habit_id" UUID NOT NULL,
    "completed_at" DATE NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT true,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "habit_check_ins_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "habit_check_ins_habit_id_completed_at_key" ON "habit_check_ins"("habit_id", "completed_at");
CREATE INDEX "habits_user_id_status_idx" ON "habits"("user_id", "status");
CREATE INDEX "habits_user_id_created_at_idx" ON "habits"("user_id", "created_at");
CREATE INDEX "habit_check_ins_completed_at_idx" ON "habit_check_ins"("completed_at");

ALTER TABLE "habits" ADD CONSTRAINT "habits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "habit_check_ins" ADD CONSTRAINT "habit_check_ins_habit_id_fkey" FOREIGN KEY ("habit_id") REFERENCES "habits"("id") ON DELETE CASCADE ON UPDATE CASCADE;
