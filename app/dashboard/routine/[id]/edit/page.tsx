"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Plus, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { deleteRoutineOfflineFirst, getRoutineOfflineFirst, Routine, updateRoutineOfflineFirst } from "@/lib/routines";
import { ExerciseVideoModal } from "@/components/workout/ExerciseVideoModal";

const daysOfWeek = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export default function EditRoutinePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [routine, setRoutine] = useState<Routine | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void getRoutineOfflineFirst(id)
      .then((result) => { if (active) setRoutine(result.routine ?? null); })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "No pudimos cargar la rutina."); });
    return () => { active = false; };
  }, [id]);

  const updateRoutine = (patch: Partial<Routine>) => setRoutine((current) => current ? { ...current, ...patch } : current);
  const updateExercise = (index: number, patch: Partial<Routine["exercises"][number]>) => setRoutine((current) => current ? { ...current, exercises: current.exercises.map((exercise, exerciseIndex) => exerciseIndex === index ? { ...exercise, ...patch } : exercise) } : current);

  const save = async () => {
    if (!routine) return;
    setError("");
    try {
      if (routine.kind === "SHARED") {
        const response = await fetch(`/api/routines/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: routine.name, type: routine.type, days: routine.days, exercises: routine.exercises }),
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.error || "No se pudieron guardar los cambios.");
      } else {
        await updateRoutineOfflineFirst(id, { name: routine.name, type: routine.type, days: routine.days, isPublished: routine.isPublished });
      }
      router.push(routine.kind === "SHARED" ? `/dashboard/community/routines/${id}` : `/dashboard/routine/${id}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudieron guardar los cambios.");
    }
  };

  const remove = async () => {
    if (!routine || !window.confirm("¿Eliminar esta rutina? Esta acción no se puede deshacer.")) return;
    try {
      await deleteRoutineOfflineFirst(id);
      router.push("/dashboard/routine");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo eliminar la rutina.");
    }
  };

  if (!routine) return <main className="min-h-dvh bg-[#090a08] px-4 pb-36 pt-28 text-white"><div className="mx-auto max-w-2xl text-sm text-white/45">{error || "Cargando rutina…"}</div></main>;
  const back = routine.kind === "SHARED" ? `/dashboard/community/routines/${id}` : `/dashboard/routine/${id}`;
  if (routine.kind === "SHARED" && routine.canEdit !== true) return <main className="min-h-dvh bg-[#090a08] px-4 pb-36 pt-28 text-white"><div className="mx-auto max-w-2xl rounded-[28px] border border-white/[.08] bg-[#10110e] p-6"><p className="text-sm leading-6 text-white/55">Esta rutina fue compartida con vos para entrenar. Solo quien la creó puede cambiar su estructura.</p><Link href={`/dashboard/routine/${id}`} className="mt-5 inline-flex text-sm font-semibold text-[#b7ff00]">Abrir rutina</Link></div></main>;

  const shared = routine.kind === "SHARED";
  const toggleDay = (day: string) => updateRoutine({ days: routine.days.includes(day) ? routine.days.filter((item) => item !== day) : [...routine.days, day] });
  const addExercise = () => updateRoutine({ exercises: [...routine.exercises, { id: `new-${Date.now()}`, name: "", muscle: "", sets: 3, reps: 10, weight: 0, technique: "Normal", completed: null, actualReps: null, note: "", trainingDay: routine.days[0] || "Lun" }] });
  const removeExercise = (index: number) => routine.exercises.length > 1 && updateRoutine({ exercises: routine.exercises.filter((_, exerciseIndex) => exerciseIndex !== index) });

  return <main className="relative min-h-dvh overflow-hidden bg-[#090a08] px-4 pb-36 pt-28 text-white sm:px-8"><div className="relative mx-auto max-w-2xl">
    <Link href={back} className="inline-flex items-center gap-2 text-xs text-white/45 hover:text-white"><ArrowLeft size={15}/> Volver a la rutina</Link>
    <header className="mt-8"><p className="text-[10px] font-bold tracking-[.22em] text-[#b7ff00]/70">{shared ? "RUTINA COMPARTIDA" : "EDICIÓN"}</p><h1 className="mt-2 text-3xl font-semibold tracking-[-.05em]">Ajustá tu rutina.</h1><p className="mt-2 text-sm text-white/40">{shared ? "Tus cambios de estructura se actualizan para el equipo; las sesiones ya hechas no se modifican." : "Personalizá el plan sin perder tu historial de entrenamiento."}</p></header>
    <section className="mt-7 rounded-[28px] border border-white/[.08] bg-[#10110e] p-5 sm:p-7">
      <label className="block"><span className="mb-2 block text-xs text-white/55">Nombre</span><input className="input" maxLength={80} value={routine.name} onChange={(event) => updateRoutine({ name: event.target.value })}/></label>
      <div className="mt-5"><p className="mb-2 text-xs text-white/55">Días</p><div className="flex flex-wrap gap-2">{daysOfWeek.map((day) => <button key={day} type="button" onClick={() => toggleDay(day)} className={`rounded-xl px-3 py-2 text-xs font-semibold ${routine.days.includes(day) ? "bg-[#b7ff00] text-black" : "border border-white/10 text-white/45"}`}>{day}</button>)}</div></div>
      {!shared && <fieldset className="mt-6 rounded-2xl border border-[#b7ff00]/15 bg-[#b7ff00]/[.045] p-4"><legend className="px-1 text-sm font-semibold">Visibilidad</legend><label className="mt-2 flex cursor-pointer items-start gap-3"><input type="radio" name="visibility" checked={routine.isPublished !== true} onChange={() => updateRoutine({ isPublished: false })} className="mt-0.5 accent-[#b7ff00]"/><span><span className="block text-sm font-semibold">Privada</span><span className="mt-1 block text-xs leading-5 text-white/45">Solo vos la ves, además de cualquier acceso específico que ya exista en rutinas compartidas.</span></span></label><label className="mt-4 flex cursor-pointer items-start gap-3"><input type="radio" name="visibility" checked={routine.isPublished === true} onChange={() => updateRoutine({ isPublished: true })} className="mt-0.5 accent-[#b7ff00]"/><span><span className="block text-sm font-semibold">Pública</span><span className="mt-1 block text-xs leading-5 text-white/45">Aparece en tu perfil, Comunidad y la Biblioteca TORO. Otros atletas pueden importar una copia personal.</span></span></label></fieldset>}
      {shared && <div className="mt-7 border-t border-white/[.07] pt-5"><div className="flex items-center justify-between"><div><p className="text-sm font-semibold">Estructura compartida</p><p className="mt-1 text-xs text-white/35">Definí ejercicios, series, repeticiones y carga objetivo.</p></div><button type="button" onClick={addExercise} className="inline-flex items-center gap-1 text-xs font-bold text-[#b7ff00]"><Plus size={15}/> Ejercicio</button></div><div className="mt-4 space-y-3">{routine.exercises.map((exercise, index) => <div key={exercise.id} className="rounded-2xl border border-white/[.07] bg-black/20 p-3"><div className="grid gap-2 sm:grid-cols-2"><input className="input" value={exercise.name} maxLength={100} onChange={(event) => updateExercise(index, { name: event.target.value })} placeholder="Ejercicio"/><input className="input" value={exercise.muscle} maxLength={60} onChange={(event) => updateExercise(index, { muscle: event.target.value })} placeholder="Músculo"/><input className="input" type="number" min={1} max={20} value={exercise.sets} onChange={(event) => updateExercise(index, { sets: Number(event.target.value) })} placeholder="Series"/><input className="input" type="number" min={1} max={100} value={exercise.reps} onChange={(event) => updateExercise(index, { reps: Number(event.target.value) })} placeholder="Repeticiones"/><input className="input" type="number" min={0} max={1000} value={exercise.weight} onChange={(event) => updateExercise(index, { weight: Number(event.target.value) })} placeholder="Peso kg"/><select className="input" value={exercise.trainingDay} onChange={(event) => updateExercise(index, { trainingDay: event.target.value })}>{routine.days.map((day) => <option key={day}>{day}</option>)}</select></div><div className="mt-2 flex flex-wrap items-center justify-between gap-3"><select className="input h-9 max-w-48 text-xs" value={exercise.technique} onChange={(event) => updateExercise(index, { technique: event.target.value })}><option>Normal</option><option>Drop-set</option><option>Rest-pause</option><option>Superserie</option><option>Tempo controlado</option></select><ExerciseVideoModal exerciseName={exercise.name}/><button type="button" disabled={routine.exercises.length === 1} onClick={() => removeExercise(index)} className="text-xs text-red-300/75 disabled:opacity-30"><Trash2 size={15}/></button></div></div>)}</div></div>}
      {error && <p role="alert" className="mt-5 text-sm text-red-300">{error}</p>}
      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-white/[.07] pt-5">{shared ? <p className="text-xs text-white/35">El plan compartido se conserva para tu equipo.</p> : <button type="button" onClick={() => void remove()} className="flex items-center gap-2 rounded-xl px-3 py-3 text-sm text-red-300/75 hover:bg-red-400/10"><Trash2 size={16}/> Eliminar rutina</button>}<button type="button" onClick={() => void save()} className="flex items-center gap-2 rounded-xl bg-[#b7ff00] px-5 py-3 text-sm font-bold text-black"><Save size={16}/> Guardar cambios</button></div>
    </section>
  </div></main>;
}
