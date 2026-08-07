import ToroBottomNav from "../front/components/Navbar";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import ToroHeader from "../front/components/Header";
import DashboardPageTransition from "./page-transition";
import ActivityTracker from "./activity-tracker";
import AmbientBackdrop from "../components/ambient-backdrop";
import OfflineSyncIndicator from "./offline-sync-indicator";
import OfflineIdentity from "./offline-identity";
import OfflineReadiness from "./offline-readiness";


export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="isolate min-h-dvh bg-[#090a08]">
      <AmbientBackdrop />
      <ActivityTracker />
      <OfflineIdentity user={{ id: user.id, email: user.email, name: user.name, username: user.username }} />
      <OfflineReadiness user={{ id: user.id, email: user.email, name: user.name, username: user.username }} />
      <OfflineSyncIndicator />
      <ToroHeader/>
      <main className="toro-dashboard-content relative z-10 pb-28">
        <DashboardPageTransition>{children}</DashboardPageTransition>
      </main>

      <ToroBottomNav />
    </div>
  );
}
