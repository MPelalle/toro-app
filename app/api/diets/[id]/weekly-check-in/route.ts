import { getCurrentUser } from "@/lib/auth";
import { DIET_FEELINGS, saveImmersiveDietCheckIn } from "@/lib/diet-immersive";
import { hasTrustedOrigin, isUuid, originError } from "@/lib/security";

function bad(error: string, status = 400) {
  return Response.json({ error }, { status });
}

export async function POST(request: Request, ctx: RouteContext<"/api/diets/[id]/weekly-check-in">) {
  if (!hasTrustedOrigin(request)) return originError();
  const user = await getCurrentUser();
  if (!user) return bad("No autorizado", 401);
  const { id } = await ctx.params;
  if (!isUuid(id)) return bad("Dieta no encontrada", 404);

  const body = await request.json().catch(() => null);
  const weight = Number(body?.weight);
  const energy = Number(body?.energy);
  const hunger = Number(body?.hunger);
  const feeling = typeof body?.feeling === "string" ? body.feeling : "";
  const note = typeof body?.note === "string" ? body.note.trim() : "";
  if (!Number.isFinite(weight) || weight < 35 || weight > 500) return bad("Ingresá un peso válido.");
  if (!DIET_FEELINGS.includes(feeling as (typeof DIET_FEELINGS)[number])) return bad("Elegí cómo te sentiste esta semana.");
  if (!Number.isInteger(energy) || energy < 1 || energy > 5 || !Number.isInteger(hunger) || hunger < 1 || hunger > 5) return bad("Revisá energía y hambre.");
  if (note.length > 500) return bad("El comentario puede tener hasta 500 caracteres.");

  try {
    const checkIn = await saveImmersiveDietCheckIn(user.id, id, { weight, feeling: feeling as (typeof DIET_FEELINGS)[number], energy, hunger, note });
    return Response.json({ ...checkIn, weekStart: checkIn.weekStart.toISOString().slice(0, 10) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo guardar la revisión semanal.";
    return bad(message, message.includes("sólo") ? 403 : 400);
  }
}
