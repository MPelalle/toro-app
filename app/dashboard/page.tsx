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
  const importanceOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 } as const;
  const items = activeHabits
    .map((habit) => ({ id: habit.id, name: habit.name, completed: completedOn(habit.checkIns, new Date()), importance: habit.importance }))
    .sort((first, second) => Number(first.completed) - Number(second.completed) || importanceOrder[first.importance] - importanceOrder[second.importance] || first.name.localeCompare(second.name, "es"));
  return <DashboardOverview name={badgeProfile.displayName} badges={badgeProfile.badges} habits={{ active: activeHabits.length, completed, items }} />;
}
