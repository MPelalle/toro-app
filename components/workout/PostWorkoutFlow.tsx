"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, MessageSquare, Sparkles, Trophy, X } from "lucide-react";
import type { OfflineWorkoutSession } from "@/lib/offline";
import { calculateWorkoutDuration } from "@/lib/workout-share/calculations";
import { WORKOUT_EMOTIONAL_STATES, type WorkoutEmotionalState } from "@/lib/workout-session-feedback";
import type { SessionFeedback } from "@/lib/training-coach";
import { ShareWorkoutButton } from "./share/ShareWorkoutButton";

type Step = 1 | 2 | 3;
type FeedbackPatch = Pick<OfflineWorkoutSession, "notes" | "emotionalRating" | "emotionalState">;

export function PostWorkoutFlow({ session, workoutName, feedback, onSaveFeedback, onClose }: { session: OfflineWorkoutSession; workoutName: string; feedback: SessionFeedback; onSaveFeedback: (patch: FeedbackPatch) => Promise<void>; onClose: () => void }) {
  const [step, setStep] = useState<Step>(1);
  const [rating, setRating] = useState(session.emotionalRating);
  const [emotionalState, setEmotionalState] = useState<WorkoutEmotionalState | null>(session.emotionalState ?? null);
  const [notes, setNotes] = useState(session.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const completedAt = session.finishedAt || session.startedAt;

  async function saveAndContinue() {
    setSaving(true);
    setError("");
    try {
      await onSaveFeedback({
        emotionalRating: rating,
        emotionalState,
        notes: notes.trim() || null,
      });
      setStep(3);
    } catch {
      setError("No pudimos guardar tu valoración. Podés intentarlo de nuevo o cerrar el resumen: tu entrenamiento ya quedó registrado.");
    } finally {
      setSaving(false);
    }
  }

  const modal = <div className="fixed inset-0 z-[110] flex items-end overflow-y-auto bg-black/80 px-3 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-3 backdrop-blur-sm sm:items-center sm:justify-center sm:p-5" role="dialog" aria-modal="true" aria-label="Resumen post-entreno">
    <div className="w-full max-w-xl rounded-[30px] border border-white/10 bg-[#11120f] p-4 shadow-2xl sm:p-6">
      <header className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-bold tracking-[.22em] text-[#b7ff00]/70">POST-ENTRENO · PASO {step} DE 3</p><h2 className="mt-2 text-xl font-semibold text-white">{step === 1 ? "Tu entrenamiento está listo" : step === 2 ? "¿Cómo te sentiste?" : "Compartí tu progreso"}</h2></div><button type="button" onClick={onClose} aria-label="Cerrar resumen post-entreno" className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/10 text-white/60 hover:text-white"><X size={17} /></button></header>
      <div className="mt-4 flex gap-2" aria-hidden="true">{([1, 2, 3] as const).map((item) => <span key={item} className={`h-1 flex-1 rounded-full ${item <= step ? "bg-[#b7ff00]" : "bg-white/10"}`} />)}</div>

      {step === 1 && <section className="mt-6"><div className="rounded-2xl border border-[#b7ff00]/15 bg-[#b7ff00]/[.055] p-4"><div className="flex items-start gap-3"><Sparkles className="mt-0.5 shrink-0 text-[#b7ff00]" size={19} /><div><p className="text-xs font-bold tracking-[.16em] text-[#b7ff00]/70">RESUMEN</p><h3 className="mt-1 text-lg font-semibold text-white">{workoutName}</h3><p className="mt-1 text-xs text-white/45">Entrenamiento registrado correctamente.</p></div></div><div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4"><Metric value={calculateWorkoutDuration(session.startedAt, completedAt)} label="Duración" /><Metric value={String(feedback.volume.toLocaleString("es-AR"))} label="kg volumen" /><Metric value={String(feedback.completedExercises)} label="Ejercicios" /><Metric value={String(feedback.completedSets)} label="Series" /></div></div>
        {feedback.records.length > 0 && <div className="mt-4"><p className="text-xs font-semibold text-white/65">Récords personales</p><div className="mt-2 space-y-2">{feedback.records.map((record) => <p key={`${record.exercise}-${record.setNumber}`} className="flex items-center justify-between gap-3 rounded-xl border border-[#b7ff00]/15 bg-black/15 px-3 py-2 text-xs"><span className="inline-flex min-w-0 items-center gap-2 font-semibold text-white"><Trophy size={14} className="shrink-0 text-[#b7ff00]" /><span className="truncate">{record.exercise}</span></span><span className="shrink-0 text-[#d7ff78]">{record.weight} kg × {record.reps}</span></p>)}</div></div>}
        <p className="mt-4 text-sm leading-6 text-white/55">{feedback.message}</p>
        <div className="mt-6 flex justify-end"><button type="button" onClick={() => setStep(2)} className="inline-flex items-center gap-2 rounded-xl bg-[#b7ff00] px-4 py-3 text-sm font-bold text-black">Valorar sesión <ChevronRight size={16} /></button></div>
      </section>}

      {step === 2 && <section className="mt-6"><p className="text-sm text-white/55">Tu comentario es opcional y queda asociado a esta misma sesión.</p><div className="mt-5"><p className="text-xs font-semibold text-white/65">Valoración de la sesión</p><div className="mt-2 flex flex-wrap gap-2">{[1, 2, 3, 4, 5].map((value) => <button key={value} type="button" onClick={() => setRating(value)} aria-pressed={rating === value} className={`grid h-11 w-11 place-items-center rounded-xl border text-sm font-bold transition ${rating === value ? "border-[#b7ff00] bg-[#b7ff00] text-black" : "border-white/10 text-white/55 hover:border-white/30"}`}>{value}</button>)}</div><p className="mt-2 text-[11px] text-white/35">1 difícil · 5 excelente</p></div><div className="mt-5"><p className="text-xs font-semibold text-white/65">Sensación</p><div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">{WORKOUT_EMOTIONAL_STATES.map((state) => <button key={state.value} type="button" onClick={() => setEmotionalState((current) => current === state.value ? null : state.value)} aria-pressed={emotionalState === state.value} className={`rounded-xl border px-3 py-3 text-left text-xs transition ${emotionalState === state.value ? "border-[#b7ff00]/70 bg-[#b7ff00]/[.12] text-white" : "border-white/10 bg-white/[.025] text-white/55 hover:border-white/30"}`}><span className="mr-2" aria-hidden="true">{state.icon}</span>{state.label}</button>)}</div></div><label className="mt-5 block text-xs font-semibold text-white/65"><span className="inline-flex items-center gap-2"><MessageSquare size={14} /> Comentario opcional</span><textarea value={notes} onChange={(event) => setNotes(event.target.value)} className="input mt-2 h-24 resize-none py-3" maxLength={280} placeholder="¿Qué salió bien hoy?" /><span className="mt-1 block text-right text-[11px] font-normal text-white/30">{notes.length}/280</span></label>{error && <p role="alert" className="mt-3 text-xs text-red-300">{error}</p>}<div className="mt-5 flex flex-wrap justify-between gap-3"><button type="button" onClick={() => setStep(1)} className="inline-flex items-center gap-1 text-sm font-semibold text-white/50 hover:text-white"><ChevronLeft size={16} /> Resumen</button><button type="button" onClick={() => void saveAndContinue()} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-[#b7ff00] px-4 py-3 text-sm font-bold text-black disabled:opacity-60">{saving ? "Guardando…" : "Continuar"} <ChevronRight size={16} /></button></div></section>}

      {step === 3 && <section className="mt-6"><p className="text-sm leading-6 text-white/55">Tu tarjeta ya incluye los datos de esta sesión. Podés compartirla, descargarla o terminar sin hacer nada más.</p><div className="mt-4"><ShareWorkoutButton session={session} workoutName={workoutName} embedded /></div><div className="mt-5 flex flex-wrap justify-between gap-3"><button type="button" onClick={() => setStep(2)} className="inline-flex items-center gap-1 text-sm font-semibold text-white/50 hover:text-white"><ChevronLeft size={16} /> Valoración</button><button type="button" onClick={onClose} className="rounded-xl border border-white/12 px-4 py-3 text-sm font-bold text-white/80">Terminar</button></div></section>}
    </div>
  </div>;

  return typeof document === "undefined" ? null : createPortal(modal, document.body);
}

function Metric({ value, label }: { value: string; label: string }) {
  return <div className="rounded-xl bg-black/20 px-2 py-3 text-center"><p className="text-base font-semibold text-white">{value}</p><p className="mt-1 text-[10px] text-white/40">{label}</p></div>;
}
