import { getCurrentUser } from "@/lib/auth";
import { getCommunityProfile } from "@/lib/community";

export async function GET(_: Request, ctx: { params: Promise<{ nickname: string }> }) {
  const viewer = await getCurrentUser();
  if (!viewer) return Response.json({ error: "No autorizado" }, { status: 401 });
  const { nickname } = await ctx.params;
  const profile = await getCommunityProfile(viewer.id, nickname);
  return profile
    ? Response.json(profile, { headers: { "Cache-Control": "no-store" } })
    : Response.json({ error: "Perfil no encontrado o no disponible." }, { status: 404, headers: { "Cache-Control": "no-store" } });
}
