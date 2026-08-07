"use client";

import { useRef, useState } from "react";
import { Download, Share2, X } from "lucide-react";
import { exportWorkoutImage } from "@/lib/workout-share/export-workout-image";
import type { CompletedWorkoutShareData } from "@/types/workout-share";
import { WorkoutShareCard } from "./WorkoutShareCard";

export function WorkoutSharePreview({ workout, onClose }: { workout: CompletedWorkoutShareData; onClose: () => void }) {
  const exportRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState<"share" | "download" | null>(null);
  const [error, setError] = useState("");
  async function run(action: "share" | "download") {
    if (!exportRef.current) return;
    setLoading(action); setError("");
    try { await exportWorkoutImage(exportRef.current, workout.workoutName, workout.completedAt, action); } catch { setError("No pudimos generar la imagen. Intentá de nuevo."); } finally { setLoading(null); }
  }
  return <div className="fixed inset-0 z-[120] flex items-end bg-black/75 p-3 backdrop-blur-sm sm:items-center sm:justify-center" role="dialog" aria-modal="true" aria-label="Compartir entrenamiento">
    <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-[#11120f] p-4 shadow-2xl"><div className="flex items-center justify-between"><div><p className="text-lg font-semibold text-white">Compartir entrenamiento</p><p className="text-xs text-white/40">Vista previa de tu tarjeta transparente.</p></div><button type="button" onClick={onClose} aria-label="Cerrar vista previa" className="grid h-9 w-9 place-items-center rounded-full border border-white/10 text-white/60"><X size={17} /></button></div>
      <div className="mt-4 h-[400px] overflow-hidden rounded-xl border border-white/10 bg-[radial-gradient(circle_at_top,rgba(183,255,0,.12),transparent_48%),#1a1b18] p-2"><div className="origin-top-left scale-[.27]"><WorkoutShareCard workout={workout} /></div></div>
      {error && <p role="alert" className="mt-3 text-xs text-red-300">{error}</p>}
      <div className="mt-4 grid grid-cols-2 gap-3"><button type="button" onClick={() => void run("share")} disabled={loading !== null} aria-label="Compartir imagen del entrenamiento" className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#b7ff00] px-3 py-3 text-sm font-bold text-black disabled:opacity-60"><Share2 size={16} />{loading === "share" ? "Generando…" : "Compartir imagen"}</button><button type="button" onClick={() => void run("download")} disabled={loading !== null} aria-label="Descargar PNG del entrenamiento" className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/12 px-3 py-3 text-sm font-bold text-white/80 disabled:opacity-60"><Download size={16} />{loading === "download" ? "Generando…" : "Descargar PNG"}</button></div>
    </div>
    <div className="pointer-events-none fixed left-[-12000px] top-0"><WorkoutShareCard ref={exportRef} workout={workout} /></div>
  </div>;
}
