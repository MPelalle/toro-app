"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { appDateKey, dateAtNoonUTC } from "@/lib/app-date";
import { getHabit, getHabitsUser, HabitDurationValue, HabitImportanceValue, HabitStatusValue } from "@/lib/habits";
import { getPrisma } from "@/lib/prisma";
import { isValidDateKey } from "@/lib/security";

const statuses = ["ACTIVE", "PAUSED", "INACTIVE"] as const;
const importances = ["LOW", "MEDIUM", "HIGH"] as const;
const units = ["DAYS", "MONTHS"] as const;

function readHabitForm(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  const icon = String(formData.get("icon") || "Target").trim();
  const notes = String(formData.get("notes") || "").trim() || null;
  const importance = String(formData.get("importance") || "MEDIUM") as HabitImportanceValue;
  const status = String(formData.get("status") || "ACTIVE") as HabitStatusValue;
  const durationUnit = String(formData.get("durationUnit") || "DAYS") as HabitDurationValue;
  const durationValue = Math.max(1, Number(formData.get("durationValue")) || 1);

  if (!name || name.length > 120) throw new Error("El nombre debe tener entre 1 y 120 caracteres.");
  if (!statuses.includes(status) || !importances.includes(importance) || !units.includes(durationUnit)) {
    throw new Error("Los datos del hábito no son válidos.");
  }

  return { name, icon: icon.slice(0, 50), notes, importance, status, durationUnit, durationValue };
}

function getEndDate(startsAt: Date, durationValue: number, durationUnit: HabitDurationValue) {
  const endsAt = new Date(startsAt);
  if (durationUnit === "DAYS") endsAt.setUTCDate(endsAt.getUTCDate() + durationValue);
  else endsAt.setUTCMonth(endsAt.getUTCMonth() + durationValue);
  return endsAt;
}

export async function createHabit(formData: FormData) {
  const prisma = getPrisma();
  const user = await getHabitsUser();
  const values = readHabitForm(formData);
  const startsAt = dateAtNoonUTC(appDateKey());
  const habit = await prisma.habit.create({ data: { ...values, startsAt, endsAt: getEndDate(startsAt, values.durationValue, values.durationUnit), userId: user.id } });
  revalidatePath("/dashboard/habits");
  redirect(`/dashboard/habits/${habit.id}`);
}

export async function updateHabit(id: string, formData: FormData) {
  const habit = await getHabit(id);
  if (!habit) throw new Error("Hábito no encontrado.");
  const values = readHabitForm(formData);
  await getPrisma().habit.update({ where: { id }, data: { ...values, endsAt: getEndDate(habit.startsAt, values.durationValue, values.durationUnit) } });
  revalidatePath("/dashboard/habits");
  revalidatePath(`/dashboard/habits/${id}`);
  redirect(`/dashboard/habits/${id}`);
}

export async function deleteHabit(id: string) {
  const habit = await getHabit(id);
  if (!habit) throw new Error("Hábito no encontrado.");
  await getPrisma().habit.delete({ where: { id } });
  revalidatePath("/dashboard/habits");
  redirect("/dashboard/habits");
}

export async function toggleHabitCheckIn(id: string, completedAt: string) {
  const habit = await getHabit(id);
  if (!habit || habit.status !== "ACTIVE") throw new Error("No se puede completar este hábito.");
  if (!isValidDateKey(completedAt)) throw new Error("Fecha no válida.");

  const date = new Date(`${completedAt}T12:00:00.000Z`);
  const today = appDateKey();
  const startsAt = appDateKey(habit.startsAt);
  if (completedAt > today || completedAt < startsAt || (habit.endsAt && completedAt > appDateKey(habit.endsAt))) {
    throw new Error("El registro debe estar dentro del período activo del hábito.");
  }
  if (Number.isNaN(date.getTime())) throw new Error("Fecha no válida.");
  const prisma = getPrisma();
  const existing = await prisma.habitCheckIn.findUnique({ where: { habitId_completedAt: { habitId: id, completedAt: date } } });

  if (existing) await prisma.habitCheckIn.update({ where: { id: existing.id }, data: { completed: !existing.completed } });
  else await prisma.habitCheckIn.create({ data: { habitId: id, completedAt: date, completed: true } });

  revalidatePath("/dashboard/habits");
  revalidatePath(`/dashboard/habits/${id}`);
  revalidatePath("/dashboard");
}

export async function saveHabitDayComment(id: string, completedAt: string, comment: string) {
  const habit = await getHabit(id);
  if (!habit) throw new Error("Hábito no encontrado.");
  if (!isValidDateKey(completedAt)) throw new Error("Fecha no válida.");
  const date = new Date(`${completedAt}T12:00:00.000Z`);
  const today = appDateKey();
  if (completedAt > today || completedAt < appDateKey(habit.startsAt) || (habit.endsAt && completedAt > appDateKey(habit.endsAt))) {
    throw new Error("El comentario debe estar dentro del período activo del hábito.");
  }

  const cleanComment = comment.trim();
  if (cleanComment.length > 1000) throw new Error("El comentario no puede superar los 1000 caracteres.");
  const prisma = getPrisma();
  const existing = await prisma.habitCheckIn.findUnique({ where: { habitId_completedAt: { habitId: id, completedAt: date } } });

  if (existing) await prisma.habitCheckIn.update({ where: { id: existing.id }, data: { comment: cleanComment || null } });
  else if (cleanComment) await prisma.habitCheckIn.create({ data: { habitId: id, completedAt: date, completed: false, comment: cleanComment } });

  revalidatePath("/dashboard/habits");
  revalidatePath(`/dashboard/habits/${id}`);
}
