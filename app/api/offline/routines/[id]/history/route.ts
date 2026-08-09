import { getCurrentUser } from "@/lib/auth";
import { serializeRemoteWorkoutSession } from "@/lib/offline/remote-session";
import { getPrisma } from "@/lib/prisma";
import { isUuid } from "@/lib/security";

const sessionInclude = {
  exercises: {
    orderBy: { position: "asc" as const },
    include: { sets: { orderBy: { setNumber: "asc" as const } } },
  },
};

/**
 * Downloads a bounded, user-scoped history for the routine currently open.
 * It deliberately excludes active sessions: an in-progress session remains
 * local-first and is synchronized through the normal queue.
 */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401, headers: { "Cache-Control": "no-store" } });

  const { id } = await params;
  if (!isUuid(id)) return Response.json({ error: "Rutina no encontrada" }, { status: 404, headers: { "Cache-Control": "no-store" } });

  const recentSessions = await getPrisma().workoutSession.findMany({
    where: { userId: user.id, routineId: id, status: "FINISHED" },
    include: sessionInclude,
    orderBy: { finishedAt: "desc" },
    take: 24,
  });

  return Response.json({
    routineId: id,
    recentSessions: recentSessions.map(serializeRemoteWorkoutSession),
    downloadedAt: new Date().toISOString(),
  }, { headers: { "Cache-Control": "no-store" } });
}
