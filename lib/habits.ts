import "server-only";

import { appCalendarDate, appDateKey, dateAtNoonUTC, storedDateKey } from "@/lib/app-date";
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

export function startOfWeek(date: Date) { const result = appCalendarDate(date); const day = result.getUTCDay() || 7; result.setUTCDate(result.getUTCDate() - day + 1); return result; }
export function dateForWeekday(index: number) { const date = startOfWeek(new Date()); date.setUTCDate(date.getUTCDate() + index); return date; }
export function dateKey(date: Date) { return appDateKey(date); }
export function dateFromKey(key: string) { return dateAtNoonUTC(key); }
export function checkInKey(checkIn: { completedAt: Date }) { return storedDateKey(checkIn.completedAt); }
export function completedOn(checkIns: { completedAt: Date; completed?: boolean }[], date: Date) { const key = dateKey(date); return checkIns.some((checkIn) => checkIn.completed !== false && checkInKey(checkIn) === key); }
export function currentStreak(checkIns: { completedAt: Date; completed?: boolean }[], today = new Date()) { const completed = new Set(checkIns.filter((checkIn) => checkIn.completed !== false).map(checkInKey)); const cursor = appCalendarDate(today); if (!completed.has(storedDateKey(cursor))) cursor.setUTCDate(cursor.getUTCDate() - 1); let streak = 0; while (completed.has(storedDateKey(cursor))) { streak += 1; cursor.setUTCDate(cursor.getUTCDate() - 1); } return streak; }
export function daysBetween(start: Date, end: Date) { return Math.round((appCalendarDate(end).getTime() - appCalendarDate(start).getTime()) / 86_400_000); }
export function formatHabitStatus(status: HabitStatusValue) { return { ACTIVE: "Activo", PAUSED: "Pausado", INACTIVE: "Inactivo" }[status]; }
export function formatImportance(importance: HabitImportanceValue) { return { HIGH: "Alta", MEDIUM: "Media", LOW: "Baja" }[importance]; }
