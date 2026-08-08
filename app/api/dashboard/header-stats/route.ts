import { getCurrentUser } from "@/lib/auth";
import { getDashboardHeaderStats } from "@/lib/dashboard-header";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });

  return Response.json(await getDashboardHeaderStats(user.id), {
    headers: { "Cache-Control": "no-store" },
  });
}
