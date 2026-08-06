import { getCurrentUser } from "@/lib/auth";
import { completedOn, getHabits } from "@/lib/habits";
import DashboardOverview from "./dashboard-overview";

export default async function DashboardPage() {
  const [user, habits] = await Promise.all([getCurrentUser(), getHabits()]);
  const activeHabits = habits.filter((habit) => habit.status === "ACTIVE");
  const completed = activeHabits.filter((habit) => completedOn(habit.checkIns, new Date())).length;
  return <DashboardOverview name={user?.name || user?.username || "Campeón"} habits={{ active: activeHabits.length, completed }} />;
}
