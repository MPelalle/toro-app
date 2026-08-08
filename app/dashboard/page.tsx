import { getCurrentUser } from "@/lib/auth";
import { completedOn, getHabits } from "@/lib/habits";
import { getUserBadgeProfile } from "@/lib/user-badges";
import DashboardOverview from "./dashboard-overview";

export default async function DashboardPage() {
  const [user, habits] = await Promise.all([getCurrentUser(), getHabits()]);
  if (!user) return null;
  const badgeProfile = await getUserBadgeProfile(user.id, user.name || user.username || "Campeón");
  const activeHabits = habits.filter((habit) => habit.status === "ACTIVE");
  const completed = activeHabits.filter((habit) => completedOn(habit.checkIns, new Date())).length;
  return <DashboardOverview name={badgeProfile.displayName} badges={badgeProfile.badges} habits={{ active: activeHabits.length, completed }} />;
}
