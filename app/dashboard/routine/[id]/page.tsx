import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { isUuid } from "@/lib/security";
import type { Routine } from "@/lib/routines";
import RoutineDetailClient from "./routine-client";

export default async function RoutineDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (id === "free") return <RoutineDetailClient id={id} initialRoutine={null} />;
  if (!isUuid(id)) notFound();

  const user = await getCurrentUser();
  if (!user) notFound();

  const plan = await getPrisma().routinePlan.findFirst({
    where: {
      id,
      OR: [
        { userId: user.id, kind: "PERSONAL" },
        { kind: "SHARED", members: { some: { userId: user.id } } },
      ],
    },
    select: {
      id: true,
      userId: true,
      kind: true,
      name: true,
      notes: true,
      type: true,
      days: true,
      active: true,
      isPublished: true,
      publishedAt: true,
      createdAt: true,
      exercises: {
        orderBy: { position: "asc" },
        select: {
          id: true,
          catalogExerciseId: true,
          name: true,
          muscle: true,
          sets: true,
          reps: true,
          weight: true,
          technique: true,
          restSeconds: true,
          supersetGroupId: true,
          completed: true,
          actualReps: true,
          note: true,
          trainingDay: true,
        },
      },
    },
  });
  if (!plan) notFound();

  const routine: Routine = {
    id: plan.id,
    name: plan.name,
    notes: plan.notes || "",
    type: plan.type,
    kind: plan.kind,
    canEdit: plan.userId === user.id,
    days: Array.isArray(plan.days) ? plan.days.map(String) : [],
    active: plan.active,
    isPublished: plan.isPublished,
    publishedAt: plan.publishedAt?.toISOString() ?? null,
    createdAt: plan.createdAt.toISOString(),
    exercises: plan.exercises.map((exercise) => ({
      ...exercise,
      completed: exercise.completed ?? null,
      actualReps: exercise.actualReps ?? null,
      note: exercise.note || "",
    })),
  };

  return <RoutineDetailClient id={id} initialRoutine={routine} />;
}
