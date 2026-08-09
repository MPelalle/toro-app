import { getCurrentUser } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { buildWorkoutProgress } from "@/lib/workout-progress";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });

  const sessions = await getPrisma().workoutSession.findMany({
    where: { userId: user.id, status: "FINISHED" },
    orderBy: { finishedAt: "asc" },
    select: {
      id: true,
      finishedAt: true,
      exercises: {
        select: {
          name: true,
          muscle: true,
          sets: {
            select: {
              completed: true,
              reps: true,
              weight: true,
            },
          },
        },
      },
    },
  });

  return Response.json(buildWorkoutProgress(sessions), { headers: { "Cache-Control": "no-store" } });
}
