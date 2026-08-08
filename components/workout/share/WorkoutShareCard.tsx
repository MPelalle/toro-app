"use client";

import { forwardRef } from "react";
import Image from "next/image";
import { calculatePersonalRecords, calculateWorkoutDuration, calculateWorkoutVolume } from "@/lib/workout-share/calculations";
import { formatExercisePerformance } from "@/lib/workout-share/format-exercise-performance";
import { UserBadgeStrip } from "@/components/badges/UserBadges";
import type { WorkoutShareCardProps } from "@/types/workout-share";

export const WorkoutShareCard = forwardRef<HTMLDivElement, WorkoutShareCardProps>(({ workout }, ref) => {
  const exercises = workout.exercises.filter((exercise) => formatExercisePerformance(exercise.sets));
  const visibleExercises = exercises.slice(0, 8);
  const extraExercises = exercises.length - visibleExercises.length;
  const volume = calculateWorkoutVolume(workout.exercises);
  const records = calculatePersonalRecords(workout.exercises);

  return <div ref={ref} style={{ width: "1080px", background: "transparent", fontFamily: "Inter, Arial, sans-serif" }} className="p-0 text-white">
    <div className="px-6 py-8 [text-shadow:2px_3px_0_rgba(0,0,0,.7),2px_7px_16px_rgba(0,0,0,.9)]">
      <header className="flex items-start justify-between gap-6 border-b border-white/30 pb-8 [text-shadow:0_5px_16px_rgba(0,0,0,1)]"><div><p className="text-[64px] font-black leading-none tracking-[-.08em]">TORO</p><p className="mt-3 text-[15px] font-bold tracking-[.36em] text-[#b7ff00]">BUILD YOUR BEST VERSION</p>{workout.athlete && <div className="mt-4 flex items-center gap-3"><p className="text-[18px] font-bold text-white/80">{workout.athlete.displayName}</p><UserBadgeStrip badges={workout.athlete.badges} size="md" /></div>}</div><Image src="/header.png" alt="Toro" width={96} height={96} className="h-24 w-24 object-contain" /></header>
      <section className="pt-9"><p className="text-[16px] font-bold tracking-[.28em] text-white/75 [text-shadow:0_3px_10px_rgba(0,0,0,1)]">RUTINA DE HOY</p><h1 className="mt-3 text-[42px] font-black uppercase tracking-[-.045em] [text-shadow:0_6px_18px_rgba(0,0,0,.98)]">{workout.workoutName}</h1></section>
      <section className="mt-9 space-y-5">{visibleExercises.length ? visibleExercises.map((exercise) => <div key={exercise.id} className="flex items-baseline gap-4 text-[25px] font-semibold [text-shadow:0_4px_12px_rgba(0,0,0,1)]"><span className="max-w-[520px] truncate">{exercise.name}</span><span className="h-px min-w-8 flex-1 bg-white/45 shadow-[0_2px_5px_rgba(0,0,0,.9)]" /><span className="shrink-0 text-[#d8ff76]">{formatExercisePerformance(exercise.sets)}</span></div>) : <p className="text-[22px] font-semibold text-white/75">Sin series completadas</p>}{extraExercises > 0 && <p className="pt-1 text-[18px] font-bold tracking-[.18em] text-white/70">+ {extraExercises} EJERCICIOS MÁS</p>}</section>
      <section className="mt-10 grid grid-cols-3 gap-6 border-t border-white/30 pt-8 [text-shadow:0_4px_14px_rgba(0,0,0,1)]"><Summary label="VOLUMEN TOTAL" value={`${Math.round(volume).toLocaleString("es-AR")} KG`} /><Summary label="DURACIÓN" value={calculateWorkoutDuration(workout.startedAt, workout.completedAt)} />{records > 0 && <Summary label="RÉCORDS PERSONALES" value={`${records} PR`} />}</section>
      <footer className="mt-10 border-t border-white/25 pt-5 text-[13px] font-bold tracking-[.27em] text-white/75 [text-shadow:0_3px_10px_rgba(0,0,0,1)]">ENTRENAMIENTO REGISTRADO EN TORO</footer>
    </div>
  </div>;
});

WorkoutShareCard.displayName = "WorkoutShareCard";

function Summary({ label, value }: { label: string; value: string }) { return <div><p className="text-[14px] font-bold tracking-[.18em] text-white/70">{label}</p><p className="mt-2 text-[26px] font-black tracking-[-.03em] text-[#d8ff76]">{value}</p></div>; }
