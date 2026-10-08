import { getCurrentUser } from "@/lib/auth";
import { getDashboardData } from "@/lib/dashboard-data";
import DashboardOverview from "./dashboard-overview";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const data = await getDashboardData(user);
  return <DashboardOverview data={data} />;
}
