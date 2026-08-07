"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";
import type { OfflineWorkoutSession } from "@/lib/offline";
import type { CompletedWorkoutShareData } from "@/types/workout-share";
import { WorkoutSharePreview } from "./WorkoutSharePreview";

export function ShareWorkoutButton({ session, workoutName }: { session: OfflineWorkoutSession; workoutName: string }) {
  const [open, setOpen] = useState(false);
  if (session.status !== "FINISHED" || !session.finishedAt) return null;
  const workout: CompletedWorkoutShareData = { workoutName, startedAt: session.startedAt, completedAt: session.finishedAt, exercises: session.exercises.map((exercise) => ({ id: exercise.id, name: exercise.name, sets: exercise.sets.map((set) => ({ id: set.id, weight: set.weight ?? 0, reps: set.reps ?? 0, completed: set.completed })) })) };
  return <><button type="button" onClick={() => setOpen(true)} aria-label="Compartir entrenamiento terminado" className="inline-flex items-center gap-2 rounded-xl border border-[#b7ff00]/35 bg-[#b7ff00]/[.08] px-4 py-3 text-sm font-bold text-[#b7ff00]"><Share2 size={16} />Compartir entrenamiento</button>{open && <WorkoutSharePreview workout={workout} onClose={() => setOpen(false)} />}</>;
}
