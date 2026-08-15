"use client";

import { CirclePlay, X } from "lucide-react";
import { useEffect, useState } from "react";
import { findExerciseVideo } from "@/lib/exercise-videos";

type ExerciseVideoModalProps = {
  exerciseName: string;
  exerciseId?: string | null;
  videoUrl?: string | null;
  className?: string;
};

export function ExerciseVideoModal({ exerciseName, exerciseId, videoUrl, className = "" }: ExerciseVideoModalProps) {
  const [open, setOpen] = useState(false);
  const tutorial = videoUrl ? { videoUrl } : findExerciseVideo({ id: exerciseId, name: exerciseName });

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  if (!tutorial?.videoUrl) return null;
  return <><button type="button" onClick={() => setOpen(true)} className={`inline-flex items-center gap-1.5 text-xs font-bold text-[#b7ff00] hover:text-[#d7ff78] ${className}`}><CirclePlay size={14}/>Ver ejecución</button>{open && <div role="dialog" aria-modal="true" aria-label={`Ejecución de ${exerciseName}`} className="fixed inset-0 z-[80] grid place-items-center bg-black/80 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}><section className="w-full max-w-2xl overflow-hidden rounded-[28px] border border-white/10 bg-[#10110e] shadow-2xl"><header className="flex items-center justify-between gap-3 border-b border-white/[.08] px-5 py-4"><div><p className="text-[10px] font-bold tracking-[.18em] text-[#b7ff00]/70">TUTORIAL</p><h2 className="mt-1 text-lg font-semibold">{exerciseName}</h2></div><button type="button" onClick={() => setOpen(false)} aria-label="Cerrar video" className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 text-white/60 hover:bg-white/[.06]"><X size={18}/></button></header><video controls playsInline preload="metadata" className="aspect-video w-full bg-black" src={tutorial.videoUrl}><track kind="captions" /></video></section></div>}</>;
}
