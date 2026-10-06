-- CreateEnum
CREATE TYPE "ProgressPhotoView" AS ENUM ('FRONT', 'SIDE', 'BACK', 'OTHER');

-- CreateTable
CREATE TABLE "body_measurements" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'cm',
    "waist" DOUBLE PRECISION,
    "chest" DOUBLE PRECISION,
    "arm" DOUBLE PRECISION,
    "thigh" DOUBLE PRECISION,
    "hip" DOUBLE PRECISION,
    "calf" DOUBLE PRECISION,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "body_measurements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "progress_photos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "object_path" TEXT NOT NULL,
    "view" "ProgressPhotoView" NOT NULL DEFAULT 'OTHER',
    "date" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "progress_photos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "body_measurements_user_id_date_idx" ON "body_measurements"("user_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "body_measurements_user_id_date_key" ON "body_measurements"("user_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "progress_photos_object_path_key" ON "progress_photos"("object_path");

-- CreateIndex
CREATE INDEX "progress_photos_user_id_date_idx" ON "progress_photos"("user_id", "date");

-- AddForeignKey
ALTER TABLE "body_measurements" ADD CONSTRAINT "body_measurements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "progress_photos" ADD CONSTRAINT "progress_photos_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
