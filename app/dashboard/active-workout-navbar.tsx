"use client";

import { ArrowUp, Check, Clock3, Dumbbell } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  getAnyActiveWorkoutSession,
  isOfflineUserReady,
  saveWorkoutSession,
  setWorkoutInProgress,
  type OfflineWorkoutSession,
} from "@/lib/offline";

function elapsedLabel(startedAt: string, now: number) {
  const seconds = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000));
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

/**
 * Control de sesión que permanece disponible al navegar por el dashboard.
 * La sesión vive en IndexedDB, así que también se recupera al volver a abrir
 * la app sin depender de que la página de la rutina siga montada.
 */
export default function ActiveWorkoutNavbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<OfflineWorkoutSession | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [saving, setSaving] = useState(false);

  const refresh = async () => {
    if (!(await isOfflineUserReady().catch(() => false))) return;
    const next = await getAnyActiveWorkoutSession().catch(() => undefined);
    setSession(next || null);
    setWorkoutInProgress(Boolean(next));
  };

  useEffect(() => {
    const initial = window.setTimeout(() => void refresh());
    const onChange = () => void refresh();
    const onVisibility = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    window.addEventListener("toro-offline-readiness", onChange);
    window.addEventListener("toro-workout-session-change", onChange);
    window.addEventListener("focus", onChange);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearTimeout(initial);
      window.removeEventListener("toro-offline-readiness", onChange);
      window.removeEventListener("toro-workout-session-change", onChange);
      window.removeEventListener("focus", onChange);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  useEffect(() => {
    if (!session) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [session]);

  const next = (() => {
    if (!session) return null;
    for (const exercise of [...session.exercises].sort((a, b) => a.position - b.position)) {
      const set = [...exercise.sets]
        .sort((a, b) => a.setNumber - b.setNumber)
        .find((item) => !item.completed);
      if (set) return { exercise, set };
    }
    return null;
  })();

  const completeNextSet = async () => {
    if (!session || !next || saving) return;
    setSaving(true);
    try {
      const updated = await saveWorkoutSession({
        ...session,
        exercises: session.exercises.map((exercise) =>
          exercise.id !== next.exercise.id
            ? exercise
            : {
                ...exercise,
                sets: exercise.sets.map((set) =>
                  set.id === next.set.id ? { ...set, completed: true } : set,
                ),
              },
        ),
      });
      setSession(updated);
      window.dispatchEvent(new Event("toro-dashboard-stats-change"));
    } finally {
      setSaving(false);
    }
  };

  const openCurrentExercise = () => {
    if (!next || !session) return;
    const element = document.getElementById(`exercise-${next.exercise.id}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    router.push(`/dashboard/routine/${session.routineId || "free"}#exercise-${next.exercise.id}`);
  };

  if (!session) return null;
  const completed = session.exercises.flatMap((exercise) => exercise.sets).filter((set) => set.completed).length;
  const total = session.exercises.flatMap((exercise) => exercise.sets).length;
  const isRoutinePage = pathname === `/dashboard/routine/${session.routineId || "free"}`;

  // Dentro del panel de la rutina ya están el registro y los controles completos.
  // La barra flotante sólo acompaña la navegación fuera de ese contexto.
  if (isRoutinePage) return null;

  return (
    <aside
      aria-label="Entrenamiento en curso"
      className="fixed inset-x-3 bottom-24 z-[60] mx-auto max-w-2xl rounded-2xl border border-[#b7ff00]/30 bg-[#12150e]/95 p-3 shadow-[0_18px_50px_rgba(0,0,0,.55)] backdrop-blur-xl sm:bottom-6 sm:left-auto sm:right-6 sm:w-[min(34rem,calc(100%-3rem))]"
    >
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#b7ff00]/12 text-[#b7ff00]">
          <Dumbbell size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[10px] font-bold tracking-[.14em] text-[#b7ff00]/75">
            <span>EN CURSO</span>
            <span className="inline-flex items-center gap-1 text-white/45"><Clock3 size={12} />{elapsedLabel(session.startedAt, now)}</span>
            <span className="text-white/35">{completed}/{total || 0}</span>
          </div>
          {next ? (
            <p className="mt-1 truncate text-sm font-semibold text-white">
              {next.exercise.name} <span className="font-normal text-white/45">· serie {next.set.setNumber} · {next.set.reps ?? next.set.targetReps} reps</span>
            </p>
          ) : (
            <p className="mt-1 text-sm font-semibold text-white">Todas las series completadas</p>
          )}
        </div>
        {next && (
          <button
            type="button"
            onClick={openCurrentExercise}
            aria-label={isRoutinePage ? "Ir al ejercicio actual" : "Abrir el ejercicio actual"}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 text-white/70 hover:border-[#b7ff00]/40 hover:text-[#b7ff00]"
          >
            <ArrowUp size={18} />
          </button>
        )}
      </div>
      {next && (
        <button
          type="button"
          onClick={() => void completeNextSet()}
          disabled={saving}
          className="mt-3 flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#b7ff00] px-4 py-2 text-xs font-black text-black transition hover:bg-[#d7ff78] disabled:opacity-60"
        >
          <Check size={15} /> {saving ? "Guardando…" : "Completar y calcular lo siguiente"}
        </button>
      )}
    </aside>
  );
}
