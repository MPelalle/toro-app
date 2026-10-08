import { getCurrentUser } from "@/lib/auth";
import { getCachedToroRewards } from "@/lib/rewards";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });
  return Response.json(await getCachedToroRewards(user.id), { headers: { "Cache-Control": "no-store" } });
}
