"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";
import type { OfflineWorkoutSession } from "@/lib/offline";
import type { UserBadge } from "@/lib/badges";
import type { CompletedWorkoutShareData } from "@/types/workout-share";
import { WorkoutSharePreview } from "./WorkoutSharePreview";

type Athlete = { displayName: string; badges: UserBadge[] };

export function ShareWorkoutButton({ session, workoutName }: { session: OfflineWorkoutSession; workoutName: string }) {
  const [open, setOpen] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [athlete, setAthlete] = useState<Athlete>({ displayName: "Atleta TORO", badges: [] });

  if (session.status !== "FINISHED" || !session.finishedAt) return null;

  const workout: CompletedWorkoutShareData = {
    workoutName,
    startedAt: session.startedAt,
    completedAt: session.finishedAt,
    athlete,
    exercises: session.exercises.map((exercise) => ({
      id: exercise.id,
      name: exercise.name,
      sets: exercise.sets.map((set) => ({ id: set.id, weight: set.weight ?? 0, reps: set.reps ?? 0, completed: set.completed })),
    })),
  };

  async function openPreview() {
    setLoadingProfile(true);
    try {
      const response = await fetch("/api/user/badges", { cache: "no-store" });
      if (response.ok) setAthlete(await response.json() as Athlete);
    } catch {
      // The workout can still be shared offline, without the remote badge snapshot.
    } finally {
      setLoadingProfile(false);
      setOpen(true);
    }
  }

  return <><button type="button" onClick={() => void openPreview()} disabled={loadingProfile} aria-label="Compartir entrenamiento terminado" className="inline-flex items-center gap-2 rounded-xl border border-[#b7ff00]/35 bg-[#b7ff00]/[.08] px-4 py-3 text-sm font-bold text-[#b7ff00] disabled:opacity-50"><Share2 size={16} />{loadingProfile ? "Preparando insignias…" : "Compartir entrenamiento"}</button>{open && <WorkoutSharePreview workout={workout} onClose={() => setOpen(false)} />}</>;
}
