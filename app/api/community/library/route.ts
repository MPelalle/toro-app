import { getCurrentUser } from "@/lib/auth";
import { listCommunityRoutineLibrary } from "@/lib/community-routine-library";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });
  const params = new URL(request.url).searchParams;
  const rawDays = params.get("days");
  const parsedDays = rawDays === null || rawDays === "" ? null : Number(rawDays);
  const rawSort = params.get("sort");
  return Response.json(await listCommunityRoutineLibrary(user.id, {
    cursor: params.get("cursor"),
    query: params.get("q"),
    type: params.get("type"),
    days: Number.isInteger(parsedDays) ? parsedDays : null,
    sort: rawSort === "popular" || rawSort === "recent" ? rawSort : null,
  }), { headers: { "Cache-Control": "no-store" } });
}
