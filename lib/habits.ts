import "server-only";

import { getCurrentUser } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";

export type HabitStatusValue = "ACTIVE" | "PAUSED" | "INACTIVE";
export type HabitImportanceValue = "LOW" | "MEDIUM" | "HIGH";
export type HabitDurationValue = "DAYS" | "MONTHS";
export type HabitWithCheckIns = Awaited<ReturnType<typeof getHabits>>[number];

export async function getHabitsUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("No autorizado");
  return user;
}

export async function getHabits() {
  const prisma = getPrisma();
  const user = await getHabitsUser();
  return prisma.habit.findMany({ where: { userId: user.id }, include: { checkIns: { orderBy: { completedAt: "asc" } } }, orderBy: [{ status: "asc" }, { createdAt: "desc" }] });
}

export async function getHabit(id: string) {
  const prisma = getPrisma();
  const user = await getHabitsUser();
  return prisma.habit.findFirst({ where: { id, userId: user.id }, include: { checkIns: { orderBy: { completedAt: "desc" } } } });
}

export function startOfWeek(date: Date) { const result = new Date(date); const day = result.getDay() || 7; result.setHours(0, 0, 0, 0); result.setDate(result.getDate() - day + 1); return result; }
export function dateForWeekday(index: number) { const date = startOfWeek(new Date()); date.setDate(date.getDate() + index); return date; }
export function dateKey(date: Date) { return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-"); }
export function dateFromKey(key: string) { const [year, month, day] = key.split("-").map(Number); return new Date(year, month - 1, day, 12); }
export function checkInKey(checkIn: { completedAt: Date }) { return checkIn.completedAt.toISOString().slice(0, 10); }
export function completedOn(checkIns: { completedAt: Date; completed?: boolean }[], date: Date) { const key = dateKey(date); return checkIns.some((checkIn) => checkIn.completed !== false && checkInKey(checkIn) === key); }
export function currentStreak(checkIns: { completedAt: Date; completed?: boolean }[], today = new Date()) { const completed = new Set(checkIns.filter((checkIn) => checkIn.completed !== false).map(checkInKey)); const cursor = new Date(today); cursor.setHours(0, 0, 0, 0); if (!completed.has(dateKey(cursor))) cursor.setDate(cursor.getDate() - 1); let streak = 0; while (completed.has(dateKey(cursor))) { streak += 1; cursor.setDate(cursor.getDate() - 1); } return streak; }
export function daysBetween(start: Date, end: Date) { const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime(); const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime(); return Math.round((endDay - startDay) / 86_400_000); }
export function formatHabitStatus(status: HabitStatusValue) { return { ACTIVE: "Activo", PAUSED: "Pausado", INACTIVE: "Inactivo" }[status]; }
export function formatImportance(importance: HabitImportanceValue) { return { HIGH: "Alta", MEDIUM: "Media", LOW: "Baja" }[importance]; }
