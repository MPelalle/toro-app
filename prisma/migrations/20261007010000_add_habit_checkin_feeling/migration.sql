CREATE TYPE "HabitFeeling" AS ENUM ('VERY_DIFFICULT', 'DIFFICULT', 'NEUTRAL', 'EASY', 'VERY_EASY');

ALTER TABLE "habit_check_ins" ADD COLUMN "feeling" "HabitFeeling";
