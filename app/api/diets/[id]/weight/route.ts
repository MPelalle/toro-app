import { getCurrentUser } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { hasTrustedOrigin, isUuid, isValidDateKey, originError } from "@/lib/security";

export async function POST(request: Request, ctx: RouteContext<"/api/diets/[id]/weight">) {
  if (!hasTrustedOrigin(request)) return originError();
  const { id } = await ctx.params;
  if (!isUuid(id)) return Response.json({ error: "Plan no encontrado" }, { status: 404 });
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });
  const diet = await getPrisma().dietPlan.findFirst({ where: { id, userId: user.id } });
  if (!diet) return Response.json({ error: "Plan no encontrado" }, { status: 404 });
  const body = await request.json().catch(() => null);
  const weight = Number(body?.weight); const date = String(body?.date || ""); const note = String(body?.note || "").trim();
  const today = new Date().toISOString().slice(0, 10);
  if (!body || !Number.isFinite(weight) || weight < 25 || weight > 500 || !isValidDateKey(date) || date > today || note.length > 500) return Response.json({ error: "Pesaje inválido" }, { status: 400 });
  const entry = await getPrisma().dietWeightEntry.create({ data: { dietId: id, date: new Date(`${date}T12:00:00.000Z`), weight, note: note || null } });
  return Response.json({ ...entry, date });
}
