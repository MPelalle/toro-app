import { createSharedDiet, listSharedDiets } from "@/lib/community";
import { getCurrentUser } from "@/lib/auth";
import { hasTrustedOrigin, isUuid, originError } from "@/lib/security";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });
  const diets = await listSharedDiets(user.id);
  return Response.json(diets.map((diet) => ({ id: diet.id, name: diet.name, calories: diet.calories, goal: diet.goal, mealCount: diet.meals.length, updatedAt: diet.updatedAt.toISOString(), members: diet.members.map((member) => ({ id: member.userId, name: member.user.name || member.user.nickname || "Atleta", nickname: member.user.nickname, avatarUrl: member.user.avatarUrl })) })), { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return originError();
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });
  const body = await request.json().catch(() => null);
  const sourceDietId = String(body?.sourceDietId || "");
  const friendIds: string[] = Array.isArray(body?.friendIds) ? body.friendIds.map(String) : [];
  if (!isUuid(sourceDietId) || !friendIds.length || friendIds.length > 5 || friendIds.some((id) => !isUuid(id))) return Response.json({ error: "Elegí una dieta y entre 1 y 5 alumnos válidos." }, { status: 400 });
  try { const diet = await createSharedDiet(user.id, sourceDietId, friendIds, typeof body?.name === "string" ? body.name : undefined); return Response.json({ id: diet.id }, { status: 201 }); }
  catch (error) { return Response.json({ error: error instanceof Error ? error.message : "No se pudo crear la dieta compartida." }, { status: 400 }); }
}
