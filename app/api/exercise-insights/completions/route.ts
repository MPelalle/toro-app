import { getCurrentUser } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });

  const name = (new URL(request.url).searchParams.get("name") || "").trim();
  if (!name || name.length > 100) return Response.json({ error: "Ejercicio inválido" }, { status: 400 });

  const completedSessions = await getPrisma().workoutSession.count({
    where: {
      userId: user.id,
      status: "FINISHED",
      exercises: { some: { name: { equals: name, mode: "insensitive" } } },
    },
  });
  return Response.json(
    { completedSessions },
    { headers: { "Cache-Control": "no-store" } },
  );
}
