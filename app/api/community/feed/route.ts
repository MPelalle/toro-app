import { getCurrentUser } from "@/lib/auth";
import { listSocialFeed } from "@/lib/social-feed";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });
  const url = new URL(request.url);
  try {
    const feed = await listSocialFeed(user.id, {
      cursor: url.searchParams.get("cursor"),
      limit: url.searchParams.get("limit"),
    });
    return Response.json(feed, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "No se pudo cargar el Club." },
      { status: 400 },
    );
  }
}
