import { getCurrentUser } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import UserPanel from "./user-panel";

export default async function UserPage() {
  const user = await getCurrentUser(); if (!user) return null;
  const [habitCompletions, dietLogs] = await Promise.all([getPrisma().habitCheckIn.count({ where: { habit: { userId: user.id }, completed: true } }), getPrisma().dietDailyLog.count({ where: { diet: { userId: user.id } } })]);
  return <UserPanel user={{ name: user.name || user.username || "Usuario", email: user.email || "", avatarUrl: user.avatarUrl || "", createdAt: user.createdAt.toISOString() }} stats={{ logins: user.loginCount, seconds: user.appSeconds, habitCompletions, dietLogs }} />;
}
