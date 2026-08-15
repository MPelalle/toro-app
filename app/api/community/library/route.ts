import { getCurrentUser } from "@/lib/auth";
import { listCommunityRoutineLibrary } from "@/lib/community-routine-library";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });
  const cursor = new URL(request.url).searchParams.get("cursor");
  return Response.json(await listCommunityRoutineLibrary(user.id, cursor), { headers: { "Cache-Control": "no-store" } });
}
