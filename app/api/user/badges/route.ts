import { getCurrentUser } from "@/lib/auth";
import { getUserBadgeProfile } from "@/lib/user-badges";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });

  return Response.json(await getUserBadgeProfile(user.id, user.name || user.username || "Atleta Toro"), {
    headers: { "Cache-Control": "no-store" },
  });
}
