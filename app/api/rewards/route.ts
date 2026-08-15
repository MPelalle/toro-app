import { getCurrentUser } from "@/lib/auth";
import { getToroRewards } from "@/lib/rewards";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });
  return Response.json(await getToroRewards(user.id), { headers: { "Cache-Control": "no-store" } });
}
