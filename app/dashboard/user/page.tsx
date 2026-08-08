import { getCurrentUser } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { getUserBadgeProfile } from "@/lib/user-badges";
import UserPanel from "./user-panel";

export default async function UserPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const displayName = user.name || user.username || "Usuario";
  const [habitCompletions, dietLogs, badgeProfile] = await Promise.all([
    getPrisma().habitCheckIn.count({ where: { habit: { userId: user.id }, completed: true } }),
    getPrisma().dietDailyLog.count({ where: { diet: { userId: user.id } } }),
    getUserBadgeProfile(user.id, displayName),
  ]);
  return <UserPanel user={{ name: badgeProfile.displayName, email: user.email || "", nickname: user.nickname || user.username || "", avatarUrl: user.avatarUrl, createdAt: user.createdAt.toISOString() }} badges={badgeProfile.badges} stats={{ logins: user.loginCount, seconds: user.appSeconds, habitCompletions, dietLogs }} />;
}
