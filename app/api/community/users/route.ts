import { getCurrentUser } from "@/lib/auth";
import { searchUserByNickname } from "@/lib/community";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });
  const nickname = new URL(request.url).searchParams.get("nickname") || "";
  const result = await searchUserByNickname(user.id, nickname);
  return Response.json({ user: result }, { headers: { "Cache-Control": "no-store" } });
}
