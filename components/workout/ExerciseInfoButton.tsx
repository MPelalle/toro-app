"use client";

import Link from "next/link";
import { Activity, CalendarDays, Dumbbell, Info, LoaderCircle, Trophy, TrendingUp, UsersRound, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { getExerciseGuide } from "@/lib/exercise-guide";
import { ExerciseVideoModal } from "./ExerciseVideoModal";

type RecordSet = { weight: number; reps: number; estimatedOneRepMax: number; date: string };
type Insights = {
  personal: RecordSet | null;
  history: Array<{ id: string; date: string; weight: number; reps: number; estimatedOneRepMax: number }>;
  friendRecord: { name: string; nickname: string | null; weight: number; reps: number; estimatedOneRepMax: number } | null;
};
type ProgressPoint = { date: string; volume: number; e1rm: number; weight: number; reps: number };
type ProgressExercise = { bestWeight: number; estimatedOneRepMax: number; changePercent: number | null; history: ProgressPoint[] };

async function requestJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || "No se pudieron cargar las métricas del ejercicio.");
  return body as T;
}

function dateLabel(value: string) {
  return new Date(value).toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" });
}

export function ExerciseInfoButton({
  exerciseName,
  exerciseId,
  muscle = "grupo muscular",
  equipment = [],
  className = "",
}: {
  exerciseName: string;
  exerciseId?: string | null;
  muscle?: string;
  equipment?: string[];
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [insights, setInsights] = useState<Insights | null>(null);
  const [progress, setProgress] = useState<ProgressExercise | null>(null);
  const [completedSessions, setCompletedSessions] = useState<number | null>(null);
  const guide = getExerciseGuide(exerciseName, muscle, equipment);
  const encodedName = encodeURIComponent(exerciseName);

  const showInfo = async () => {
    setOpen(true);
    if (insights || loading) return;
    setLoading(true);
    setError("");
    try {
      const [nextInsights, progressData, completionData] = await Promise.all([
        requestJson<Insights>(`/api/exercise-insights?name=${encodedName}`),
        requestJson<{ exercises: Array<{ name: string } & ProgressExercise> }>("/api/workout-progress?range=ALL"),
        requestJson<{ completedSessions: number }>(`/api/exercise-insights/completions?name=${encodedName}`),
      ]);
      setInsights(nextInsights);
      setProgress(progressData.exercises.find((item) => item.name.toLocaleLowerCase("es") === exerciseName.toLocaleLowerCase("es")) || null);
      setCompletedSessions(completionData.completedSessions);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudieron cargar las métricas.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const history = useMemo(() => {
    const points = progress?.history.length
      ? progress.history
      : (insights?.history || []).map((point) => ({ date: point.date, volume: point.weight * point.reps, e1rm: point.estimatedOneRepMax, weight: point.weight, reps: point.reps }));
    return [...points].sort((a, b) => a.date.localeCompare(b.date));
  }, [insights, progress]);
  const personalRecord = useMemo(() => {
    const progressBest = history.reduce<ProgressPoint | null>((best, point) => !best || point.e1rm > best.e1rm ? point : best, null);
    if (progressBest) return { weight: progressBest.weight, reps: progressBest.reps, estimatedOneRepMax: progressBest.e1rm, date: progressBest.date };
    return insights?.personal || null;
  }, [history, insights]);
  const first = history[0];
  const latest = history.at(-1);
  const changePercent = first && latest && first.e1rm > 0 ? Math.round(((latest.e1rm - first.e1rm) / first.e1rm) * 100) : null;
  const chart = useMemo(() => {
    if (history.length < 2) return null;
    const values = history.map((point) => point.e1rm);
    const low = Math.min(...values);
    const high = Math.max(...values);
    const span = high - low || 1;
    const coords = history.map((point, index) => ({
      x: 8 + (index * 284) / (history.length - 1),
      y: 92 - ((point.e1rm - low) / span) * 70,
    }));
    return { line: coords.map((point) => `${point.x},${point.y}`).join(" "), area: `8,100 ${coords.map((point) => `${point.x},${point.y}`).join(" ")} 292,100`, low, high, coords };
  }, [history]);
  const friend = insights?.friendRecord;
  const friendDelta = friend && personalRecord
    ? Math.round(((personalRecord.estimatedOneRepMax - friend.estimatedOneRepMax) / friend.estimatedOneRepMax) * 100)
    : null;

  return (
    <>
      <button
        type="button"
        onClick={(event) => { event.stopPropagation(); void showInfo(); }}
        title={`Información y métricas de ${exerciseName}`}
        aria-label={`Información y métricas de ${exerciseName}`}
        className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-sky-300/20 bg-sky-300/[.05] text-sky-200 transition hover:border-sky-200/50 hover:bg-sky-200/10 ${className}`}
      >
        <Info size={16} />
      </button>
      {open && typeof document !== "undefined" && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Información y métricas de ${exerciseName}`}
          className="fixed inset-x-0 z-[100] flex items-center justify-center overflow-hidden bg-black/75 p-3 backdrop-blur-sm sm:p-5"
          style={{
            top: "max(6rem, calc(env(safe-area-inset-top) + 6rem))",
            bottom: "max(6rem, calc(env(safe-area-inset-bottom) + 6rem))",
          }}
          onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}
        >
          <section className="max-h-[68dvh] w-full max-w-2xl overflow-y-auto rounded-[24px] border border-white/10 bg-[#10110e] shadow-[0_24px_80px_rgba(0,0,0,.65)] sm:max-h-[76dvh] sm:rounded-[30px]">
            <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-white/[.08] bg-[#10110e]/95 px-4 py-3 backdrop-blur sm:px-6 sm:py-4">
              <div className="min-w-0">
                <p className="text-[10px] font-bold tracking-[.2em] text-sky-200/65">FICHA DEL EJERCICIO</p>
                <h2 className="mt-1 truncate text-xl font-semibold tracking-tight sm:text-2xl">{exerciseName}</h2>
                <p className="mt-1 text-xs text-white/40">{muscle}{equipment.length ? ` · ${equipment.join(", ")}` : ""}</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar información" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 text-white/55 hover:bg-white/10"><X size={18}/></button>
            </header>

            <div className="space-y-3 p-3 sm:space-y-5 sm:p-6">
              <section className="rounded-2xl border border-sky-200/15 bg-gradient-to-br from-sky-300/[.1] to-transparent p-3 sm:p-4">
                <p className="text-sm font-semibold">Qué trabaja</p>
                <p className="mt-1 text-sm leading-6 text-white/55">{guide.focus}</p>
                <div className="mt-4 flex flex-wrap items-center gap-3"><ExerciseVideoModal exerciseId={exerciseId} exerciseName={exerciseName} className="rounded-xl border border-sky-200/20 bg-sky-200/[.07] px-3 py-2"/></div>
              </section>

              {loading && <div className="flex items-center justify-center gap-2 py-8 text-sm text-white/45"><LoaderCircle size={17} className="animate-spin"/> Cargando tu historial y comparativas…</div>}
              {error && <p role="alert" className="rounded-xl border border-red-300/20 bg-red-300/[.06] p-3 text-sm text-red-200">{error}</p>}

              {!loading && !error && (
                <>
                  <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <Metric icon={<Trophy size={15}/>} label="PR histórico" value={personalRecord ? `${personalRecord.weight} kg` : "Sin registros"} detail={personalRecord ? `${personalRecord.reps} rep · e1RM ${Math.round(personalRecord.estimatedOneRepMax)} kg` : undefined}/>
                    <Metric icon={<CalendarDays size={15}/>} label="Veces completado" value={completedSessions === null ? "—" : String(completedSessions)} detail="sesiones finalizadas"/>
                    <Metric icon={<Dumbbell size={15}/>} label="Última carga" value={latest ? `${latest.weight} kg` : "Sin registros"} detail={latest ? `${latest.reps} rep · ${dateLabel(latest.date)}` : undefined}/>
                    <Metric icon={<TrendingUp size={15}/>} label="Progreso e1RM" value={changePercent === null ? "—" : `${changePercent > 0 ? "+" : ""}${changePercent}%`} detail="desde el primer registro"/>
                  </section>

                  <section className="rounded-2xl border border-white/[.07] bg-white/[.025] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div><p className="text-sm font-semibold">Evolución de fuerza</p><p className="mt-1 text-xs text-white/40">Estimación de fuerza máxima (e1RM) por sesión.</p></div>
                      <Activity size={17} className="text-[#b7ff00]"/>
                    </div>
                    {chart ? <>
                      <div className="mt-3 h-28 rounded-xl bg-black/15 p-2 sm:h-36">
                        <svg viewBox="0 0 300 108" role="img" aria-label="Gráfico de evolución del e1RM" className="h-full w-full overflow-visible">
                          <defs><linearGradient id="exercise-chart-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#b7ff00" stopOpacity=".28"/><stop offset="100%" stopColor="#b7ff00" stopOpacity="0"/></linearGradient></defs>
                          <polygon points={chart.area} fill="url(#exercise-chart-fill)"/>
                          <polyline points={chart.line} fill="none" stroke="#b7ff00" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                          {chart.coords.map((point, index) => <circle key={history[index].date} cx={point.x} cy={point.y} r="3.5" fill="#d7ff78" stroke="#10110e" strokeWidth="2"><title>{dateLabel(history[index].date)} · e1RM {Math.round(history[index].e1rm)} kg</title></circle>)}
                        </svg>
                      </div>
                      <div className="mt-2 flex justify-between text-[10px] text-white/35"><span>{chart.low.toFixed(1)} kg</span><span>{first ? dateLabel(first.date) : ""}</span><span>{chart.high.toFixed(1)} kg · {latest ? dateLabel(latest.date) : ""}</span></div>
                    </> : <p className="mt-4 rounded-xl bg-black/15 p-4 text-xs text-white/40">Registrá al menos dos sesiones para ver tu gráfico de evolución.</p>}
                  </section>

                  <section className="rounded-2xl border border-sky-200/15 bg-sky-200/[.04] p-4">
                    <div className="flex items-center gap-2"><UsersRound size={16} className="text-sky-200"/><p className="text-sm font-semibold">Comparación con amigos</p></div>
                    {friend ? <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
                      <div><p className="text-lg font-semibold">{friend.nickname ? `@${friend.nickname}` : friend.name}</p><p className="mt-1 text-xs text-white/45">Mejor marca registrada · {friend.weight} kg × {friend.reps} · e1RM {Math.round(friend.estimatedOneRepMax)} kg</p></div>
                      {friendDelta !== null && <span className={`rounded-xl px-3 py-2 text-sm font-bold ${friendDelta >= 0 ? "bg-[#b7ff00]/10 text-[#d7ff78]" : "bg-sky-200/10 text-sky-100"}`}>{friendDelta > 0 ? "+" : ""}{friendDelta}% e1RM</span>}
                    </div> : <p className="mt-2 text-xs leading-5 text-white/45">Todavía no hay marcas de tus amigos para este ejercicio. La comparación muestra solo registros compartidos con vos.</p>}
                    <p className="mt-3 text-[10px] leading-4 text-white/30">La comparación usa e1RM estimado y no ajusta por peso corporal ni por diferencias de equipamiento.</p>
                  </section>

                  <section className="rounded-2xl border border-white/[.07] bg-white/[.025] p-4">
                    <p className="text-sm font-semibold">Ejecución paso a paso</p>
                    <ol className="mt-3 space-y-3">{[guide.setup, guide.execution, guide.breathing].map((step, index) => <li key={step} className="flex gap-3 text-sm leading-6 text-white/60"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-[#b7ff00]/10 text-[11px] font-bold text-[#d7ff78]">{index + 1}</span><span>{step}</span></li>)}</ol>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2"><div className="rounded-xl bg-[#b7ff00]/[.045] p-3"><p className="text-[10px] font-bold uppercase tracking-[.15em] text-[#d7ff78]/70">Claves</p><ul className="mt-2 space-y-1.5">{guide.cues.map((cue) => <li key={cue} className="text-xs text-white/55">· {cue}</li>)}</ul></div><div className="rounded-xl bg-red-300/[.035] p-3"><p className="text-[10px] font-bold uppercase tracking-[.15em] text-red-200/65">Evitá</p><p className="mt-2 text-xs leading-5 text-white/55">{guide.avoid}</p></div></div>
                    <p className="mt-3 text-[10px] leading-4 text-white/30">Guía general: adaptá el rango a tu movilidad y usá una carga que puedas controlar. Si sentís dolor, detené el ejercicio.</p>
                  </section>

                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[.07] pt-4">
                    <Link href={`/dashboard/progress/${encodeURIComponent(exerciseName)}`} onClick={() => setOpen(false)} className="text-xs font-semibold text-[#b7ff00] hover:text-[#d7ff78]">Ver historial completo de progreso →</Link>
                    <button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-white/10 px-4 py-2.5 text-xs text-white/55 hover:bg-white/[.05]">Cerrar</button>
                  </div>
                </>
              )}
            </div>
          </section>
        </div>,
        document.body,
      )}
    </>
  );
}

function Metric({ icon, label, value, detail }: { icon: ReactNode; label: string; value: string; detail?: string }) {
  return <article className="min-w-0 rounded-2xl border border-white/[.07] bg-white/[.025] p-3">
    <div className="flex items-center gap-1.5 text-[#b7ff00]/80">{icon}<p className="truncate text-[10px] font-semibold text-white/45">{label}</p></div>
    <p className="mt-3 truncate text-lg font-semibold tracking-tight">{value}</p>
    {detail && <p className="mt-1 truncate text-[10px] text-white/35">{detail}</p>}
  </article>;
}
