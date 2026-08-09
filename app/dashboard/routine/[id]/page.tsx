"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Check, Dumbbell, History, Pencil, Play, Plus, Sparkles, Square, TimerReset, Trash2, Trophy, WifiOff } from "lucide-react";
import { type ChangeEvent, useEffect, useState } from "react";
import { createClientId, createWorkoutSession, getActiveWorkoutSession, getRecentWorkoutSessions, isOfflineUserReady, OfflineWorkoutSession, refreshRoutineHistory, saveWorkoutSession, setWorkoutInProgress, syncPendingSessions } from "@/lib/offline";
import { getRoutineOfflineFirst, Routine } from "@/lib/routines";
import { buildExerciseCoaching, buildSessionFeedback, type ExerciseCoaching, type PersonalRecord, type SessionFeedback } from "@/lib/training-coach";

const ShareWorkoutButton = dynamic(() => import("@/components/workout/share/ShareWorkoutButton").then((module) => module.ShareWorkoutButton), { ssr: false });

type SetKind = "WARMUP" | "NORMAL" | "DROP" | "FAILURE";
type SetPatch = { reps?: number | null; weight?: number | null; rir?: number | null; rpe?: number | null; kind?: SetKind; note?: string | null; completed?: boolean };
type WorkoutStats = { streak: number; exercises: Array<{ name: string; muscle: string; bestWeight: number; estimatedOneRepMax: number; history: Array<{ date: string; volume: number }> }>; muscles: Array<{ name: string; sets: number }> };

const setKindLabels: Record<SetKind, string> = { WARMUP: "Calentamiento", NORMAL: "Normal", DROP: "Descendente", FAILURE: "Al fallo" };

function syncCopy(session: OfflineWorkoutSession) {
  if (session.syncStatus === "synced") return "Sincronizado.";
  if (session.syncStatus === "syncing") return "Sincronizando cambios…";
  if (session.syncStatus === "failed") return "Error de sincronización. El entrenamiento sigue guardado en el dispositivo.";
  if (session.syncStatus === "conflict") return "Conflicto detectado. El entrenamiento local se conserva.";
  return "Guardado en el dispositivo. Pendiente de sincronización.";
}

function secondsLabel(seconds: number) { return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`; }

function isValidNumericPatch(value: number | null | undefined, min: number, max: number, integer = false) {
  return value === undefined || value === null || (Number.isFinite(value) && value >= min && value <= max && (!integer || Number.isInteger(value)));
}

function isValidSetPatch(patch: SetPatch) {
  return isValidNumericPatch(patch.reps, 0, 100, true)
    && isValidNumericPatch(patch.weight, 0, 1_000)
    && isValidNumericPatch(patch.rir, 0, 10, true)
    && isValidNumericPatch(patch.rpe, 1, 10, true);
}

export default function RoutineDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [routine, setRoutine] = useState<Routine | null>(null); const [session, setSession] = useState<OfflineWorkoutSession | null>(null); const [history, setHistory] = useState<OfflineWorkoutSession[]>([]);
  const [offline, setOffline] = useState(false); const [error, setError] = useState(""); const [loading, setLoading] = useState(true);
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null); const [restUntil, setRestUntil] = useState<number | null>(null); const [restDuration, setRestDuration] = useState(90);
  const [stats, setStats] = useState<WorkoutStats | null>(null); const [statsRefresh, setStatsRefresh] = useState(0);

  useEffect(() => {
    let mounted = true;
    let routineRequest = 0;
    let sessionRequest = 0;
    const unavailableRoutineMessage = "Esta rutina todavía no está disponible sin conexión.";
    const identityReady = async () => isOfflineUserReady().catch(() => false);
    const applyRoutine = (routineResult: Awaited<ReturnType<typeof getRoutineOfflineFirst>>) => {
      if (!mounted) return;
      setRoutine(routineResult.routine || null);
      setOffline(routineResult.source === "cache");
      if (!routineResult.routine) setError(unavailableRoutineMessage);
      else setError((current) => current === unavailableRoutineMessage ? "" : current);
    };
    const applyActiveSession = (activeSession: OfflineWorkoutSession | undefined) => {
      if (!mounted) return;
      setSession(activeSession || null);
      setSelectedExercise((current) => activeSession?.exercises.some((exercise) => exercise.id === current) ? current : activeSession?.exercises[0]?.id || null);
    };
    const reloadRoutine = async () => {
      const request = ++routineRequest;
      if (!(await identityReady()) || !mounted || request !== routineRequest) return;
      try {
        const routineResult = await getRoutineOfflineFirst(id, (remote) => {
          if (mounted && request === routineRequest) {
            setRoutine(remote);
            setOffline(false);
            setError((current) => current === unavailableRoutineMessage ? "" : current);
          }
        });
        if (mounted && request === routineRequest) applyRoutine(routineResult);
      } catch {
        if (mounted && request === routineRequest) setError("No pudimos abrir la rutina.");
      } finally {
        if (mounted && request === routineRequest) setLoading(false);
      }
    };
    const reloadActiveSession = async () => {
      const request = ++sessionRequest;
      if (!(await identityReady()) || !mounted || request !== sessionRequest) return;
      try {
        const activeSession = await getActiveWorkoutSession(id);
        if (mounted && request === sessionRequest) applyActiveSession(activeSession);
      } catch {
        // The routine remains usable even when offline storage is unavailable.
      }
    };
    const onOfflineReadiness = () => {
      void reloadRoutine();
      void reloadActiveSession();
    };
    void reloadRoutine();
    void reloadActiveSession();
    window.addEventListener("toro-offline-readiness", onOfflineReadiness);
    return () => {
      mounted = false;
      window.removeEventListener("toro-offline-readiness", onOfflineReadiness);
    };
  }, [id]);
  useEffect(() => {
    let mounted = true;
    let historyRequest = 0;
    let remoteHistoryRequested = false;
    const identityReady = async () => isOfflineUserReady().catch(() => false);
    const reloadHistory = async () => {
      const request = ++historyRequest;
      if (!(await identityReady()) || !mounted || request !== historyRequest) return;
      try {
        const sessions = await getRecentWorkoutSessions(id, 24);
        if (mounted && request === historyRequest) setHistory(sessions);
      } catch {
        // Keep the most recent local history visible if a refresh fails.
      }
    };
    const hydrateRemoteHistory = async () => {
      if (remoteHistoryRequested || !(await identityReady()) || !mounted) return;
      remoteHistoryRequested = true;
      try {
        await refreshRoutineHistory(id);
        if (mounted) await reloadHistory();
      } catch {
        if (mounted) remoteHistoryRequested = false;
      }
    };
    const onOfflineReadiness = (event: Event) => {
      void reloadHistory();
      if ((event as CustomEvent<{ state?: string }>).detail?.state === "ready") void hydrateRemoteHistory();
    };
    void reloadHistory();
    void hydrateRemoteHistory();
    window.addEventListener("toro-offline-readiness", onOfflineReadiness);
    return () => {
      mounted = false;
      window.removeEventListener("toro-offline-readiness", onOfflineReadiness);
    };
  }, [id, statsRefresh]);
  useEffect(() => { let mounted = true; void fetch(`/api/workout-stats?routineId=${encodeURIComponent(id)}`).then((response) => response.ok ? response.json() : null).then((data: WorkoutStats | null) => { if (mounted && data) setStats(data); }).catch(() => undefined); return () => { mounted = false; }; }, [id, statsRefresh]);

  const persist = async (next: OfflineWorkoutSession) => { const saved = await saveWorkoutSession(next); setSession(saved); void syncPendingSessions(); return saved; };
  const startRest = (seconds = restDuration) => setRestUntil(() => Date.now() + Math.max(15, Math.min(600, seconds)) * 1_000);
  const start = async () => { if (!routine) return; try { const next = createWorkoutSession(routine); await persist(next); setWorkoutInProgress(true); setSelectedExercise(next.exercises[0]?.id || null); } catch { setError("No pudimos preparar el entrenamiento en este dispositivo."); } };
  const updateSet = async (exerciseId: string, setId: string, patch: SetPatch) => { if (!session) return; if (!isValidSetPatch(patch)) { setError("Revisá el valor de la serie antes de guardarlo."); return; } const next = { ...session, exercises: session.exercises.map((exercise) => exercise.id !== exerciseId ? exercise : { ...exercise, sets: exercise.sets.map((set) => set.id === setId ? { ...set, ...patch } : set) }) }; try { await persist(next); if (patch.completed !== undefined) window.dispatchEvent(new Event("toro-dashboard-stats-change")); if (patch.completed === true) startRest(); } catch { setError("El cambio no pudo guardarse localmente."); } };
  const addSet = async (exerciseId: string) => { if (!session) return; const next = { ...session, exercises: session.exercises.map((exercise) => { if (exercise.id !== exerciseId) return exercise; const last = exercise.sets.at(-1); return { ...exercise, sets: [...exercise.sets, { id: createClientId(), userId: session.userId, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), deletedAt: null, syncStatus: "pending" as const, lastSyncedAt: null, version: 1, sessionId: session.id, sessionExerciseId: exercise.id, setNumber: exercise.sets.length + 1, targetReps: last?.targetReps ?? 10, targetWeight: last?.targetWeight ?? 0, reps: last?.reps ?? null, weight: last?.weight ?? null, rir: null, rpe: null, kind: "NORMAL" as const, completed: false, note: null }] }; }) }; await persist(next); };
  const deleteSet = async (exerciseId: string, setId: string) => { if (!session) return; const exercise = session.exercises.find((item) => item.id === exerciseId); if (!exercise || exercise.sets.length <= 1) return; const next = { ...session, exercises: session.exercises.map((item) => item.id !== exerciseId ? item : { ...item, sets: item.sets.filter((set) => set.id !== setId).map((set, index) => ({ ...set, setNumber: index + 1 })) }) }; await persist(next); };
  const updateSession = async (patch: Partial<Pick<OfflineWorkoutSession, "notes" | "emotionalRating">>) => { if (session) await persist({ ...session, ...patch }); };
  const finish = async () => { if (!session) return; const finishedAt = new Date().toISOString(); try { const saved = await persist({ ...session, status: "FINISHED", finishedAt, durationSeconds: Math.max(0, Math.floor((Date.now() - new Date(session.startedAt).getTime()) / 1_000)) }); setHistory((current) => [saved, ...current.filter((item) => item.id !== saved.id)].slice(0, 24)); setWorkoutInProgress(false); setRestUntil(null); setStatsRefresh((current) => current + 1); window.dispatchEvent(new Event("toro-dashboard-stats-change")); } catch { setError("No pudimos finalizar el entrenamiento localmente."); } };

  if (loading) return <main className="min-h-dvh bg-[#090a08] px-4 pb-36 pt-28 text-white"><div className="mx-auto max-w-4xl text-sm text-white/45">Cargando rutina…</div></main>;
  if (!routine) return <main className="min-h-dvh bg-[#090a08] px-4 pb-36 pt-28 text-white"><div className="mx-auto max-w-4xl rounded-[28px] border border-white/[.08] bg-[#10110e] p-6"><p className="text-sm text-white/50">{error || "Esta rutina no existe o fue eliminada."}</p><Link href="/dashboard/routine" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#b7ff00]"><ArrowLeft size={16}/> Volver a rutinas</Link></div></main>;

  const completedSets = session?.exercises.flatMap((exercise) => exercise.sets).filter((set) => set.completed).length || 0;
  const totalSets = session?.exercises.flatMap((exercise) => exercise.sets).length || 0;
  const visibleExercises = selectedExercise ? session?.exercises.filter((exercise) => exercise.id === selectedExercise) : session?.exercises;
  const coachingByExercise = new Map<string, ExerciseCoaching>(session ? session.exercises.map((exercise) => [exercise.id, buildExerciseCoaching(history, exercise, session.id)]) : []);
  const sessionFeedback = session ? buildSessionFeedback(history, session) : null;

  return <main className="relative min-h-dvh overflow-hidden bg-[#090a08] px-4 pb-36 pt-28 text-white sm:px-8"><div className="relative mx-auto max-w-4xl"><Link href="/dashboard/routine" className="inline-flex items-center gap-2 text-xs text-white/45 hover:text-white"><ArrowLeft size={15}/> Todas las rutinas</Link><header className="mt-8 flex flex-wrap items-end justify-between gap-4"><div><p className="text-[10px] font-bold tracking-[.22em] text-[#b7ff00]/70">RUTINA ACTUAL · {routine.type.toUpperCase()}</p><h1 className="mt-2 text-3xl font-semibold tracking-[-.05em] sm:text-4xl">{routine.name}</h1><p className="mt-2 text-sm text-white/40">{routine.days.join(", ")} · Entrená incluso sin conexión.</p></div>{routine.canEdit !== false && <Link href={`/dashboard/routine/${id}/edit`} className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm text-white/65"><Pencil size={15}/> Editar rutina</Link>}</header>{offline && <p className="mt-5 inline-flex items-center gap-2 rounded-xl border border-amber-300/20 bg-amber-300/[.07] px-3 py-2 text-xs text-amber-100"><WifiOff size={14}/> Rutina disponible desde tu copia offline.</p>}{error && <p role="alert" className="mt-5 text-sm text-red-300">{error}</p>}
  {!session ? <><section className="mt-7 rounded-[30px] border border-[#b7ff00]/15 bg-[#10110e]/95 p-6 sm:p-8"><Dumbbell className="text-[#b7ff00]"/><h2 className="mt-5 text-2xl font-semibold">Listo para entrenar.</h2><p className="mt-2 max-w-lg text-sm leading-6 text-white/40">Al iniciar, la sesión se guarda primero en este dispositivo.</p><button onClick={() => void start()} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#b7ff00] px-5 py-3 text-sm font-bold text-black"><Play size={16} fill="currentColor"/> Iniciar entrenamiento</button></section><RoutinePreview routine={routine} /><ProgressPanel stats={stats} /></> : <><SessionMetrics completedSets={completedSets} totalSets={totalSets} startedAt={session.startedAt} finishedAt={session.finishedAt} restUntil={restUntil}/><p aria-live="polite" className={`mt-4 text-xs ${session.syncStatus === "failed" || session.syncStatus === "conflict" ? "text-amber-200" : "text-white/50"}`}>{syncCopy(session)}</p>
  {session.status === "FINISHED" && sessionFeedback && <WorkoutRecap feedback={sessionFeedback}/>}<ProgressPanel stats={stats} />
  <section className="mt-5 rounded-[28px] border border-white/[.08] bg-[#10110e]/95 p-4 sm:p-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-lg font-semibold">{session.status === "FINISHED" ? "Entrenamiento finalizado" : "Sesión en curso"}</p><p className="text-xs text-white/35">Cada cambio se guarda de inmediato en el dispositivo.</p></div>{session.status === "IN_PROGRESS" && <div className="flex flex-wrap items-center gap-2"><select value={restDuration} onChange={(event) => setRestDuration(Number(event.target.value))} className="rounded-xl border border-white/10 bg-black/20 px-2 py-2 text-xs text-white"><option value={60}>1:00</option><option value={90}>1:30</option><option value={120}>2:00</option><option value={180}>3:00</option></select><button onClick={() => startRest()} className="inline-flex items-center gap-2 rounded-xl border border-sky-300/25 px-3 py-2 text-xs text-sky-200"><TimerReset size={14}/> Iniciar descanso</button>{restUntil && <button onClick={() => setRestUntil(null)} className="text-xs text-white/45">Cancelar</button>}</div>}</div>
  <div className="mt-5 flex gap-2 overflow-x-auto pb-1">{session.exercises.map((exercise, index) => <button key={exercise.id} onClick={() => setSelectedExercise(exercise.id)} className={`shrink-0 rounded-full px-3 py-2 text-xs font-semibold ${selectedExercise === exercise.id ? "bg-[#b7ff00] text-black" : "bg-white/5 text-white/55"}`}>{index + 1}. {exercise.name}</button>)}</div>
  <div className="mt-5 space-y-4">{visibleExercises?.map((exercise, index) => <SessionExerciseCard key={exercise.id} exercise={exercise} index={index} status={session.status} coaching={coachingByExercise.get(exercise.id)} records={sessionFeedback?.records || []} onAddSet={addSet} onUpdateSet={updateSet} onDeleteSet={deleteSet}/>)}</div>
  <div className="mt-6 grid gap-4 border-t border-white/[.07] pt-5 sm:grid-cols-2"><label className="text-xs text-white/50">Nota del entrenamiento<textarea disabled={session.status === "FINISHED"} value={session.notes ?? ""} onChange={(event) => void updateSession({ notes: event.target.value || null })} className="input mt-2 h-24 resize-none py-3" maxLength={2000} placeholder="Cómo te sentiste, técnica, molestias…"/></label><div><p className="text-xs text-white/50">Valoración emocional</p><div className="mt-2 flex gap-2">{[1, 2, 3, 4, 5].map((rating) => <button key={rating} disabled={session.status === "FINISHED"} onClick={() => void updateSession({ emotionalRating: rating })} className={`grid h-10 w-10 place-items-center rounded-xl border text-sm ${session.emotionalRating === rating ? "border-[#b7ff00] bg-[#b7ff00] text-black" : "border-white/10 text-white/55"}`}>{rating}</button>)}</div><p className="mt-2 text-[11px] text-white/30">1 difícil · 5 excelente</p></div></div>
  <div className="mt-5 flex justify-end">{session.status === "IN_PROGRESS" && <button onClick={() => void finish()} className="inline-flex items-center gap-2 rounded-xl border border-[#b7ff00]/30 bg-[#b7ff00]/[.08] px-5 py-3 text-sm font-bold text-[#b7ff00]"><Square size={15} fill="currentColor"/> Finalizar entrenamiento</button>}{session.status === "FINISHED" && <ShareWorkoutButton session={session} workoutName={routine.name} />}</div></section></>}</div></main>;
}

function ProgressPanel({ stats }: { stats: WorkoutStats | null }) {
  if (!stats || (!stats.exercises.length && !stats.muscles.length)) return null;
  const maximumSets = Math.max(...stats.muscles.map((item) => item.sets), 1);
  return <section className="mt-7 rounded-[28px] border border-white/[.08] bg-[#10110e]/90 p-5 sm:p-6"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-[10px] font-bold tracking-[.2em] text-[#b7ff00]/70">PROGRESO</p><h2 className="mt-2 text-xl font-semibold">Tu fuerza, sin calendario.</h2></div><p className="rounded-xl border border-[#b7ff00]/20 bg-[#b7ff00]/[.06] px-3 py-2 text-xs font-semibold text-[#b7ff00]">{stats.streak} día{stats.streak === 1 ? "" : "s"} consecutivo{stats.streak === 1 ? "" : "s"}</p></div><div className="mt-5 grid gap-4 lg:grid-cols-2"><div><p className="text-xs font-semibold text-white/55">Series por músculo · últimos 7 días</p><div className="mt-3 space-y-2">{stats.muscles.map((item) => <div key={item.name} className="grid grid-cols-[96px_1fr_auto] items-center gap-2 text-xs"><span className="truncate text-white/45">{item.name}</span><span className="h-2 overflow-hidden rounded-full bg-white/[.07]"><span className="block h-full rounded-full bg-sky-300" style={{ width: `${(item.sets / maximumSets) * 100}%` }}/></span><span className="text-white/65">{item.sets}</span></div>)}</div></div><div className="space-y-3">{stats.exercises.map((exercise) => { const maximumVolume = Math.max(...exercise.history.map((point) => point.volume), 1); return <article key={exercise.name} className="rounded-xl border border-white/[.07] bg-black/15 p-3"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold">{exercise.name}</p><p className="text-[11px] text-white/40">PR {exercise.bestWeight} kg · 1RM est. {exercise.estimatedOneRepMax} kg</p></div><div className="flex h-9 items-end gap-1">{exercise.history.map((point) => <span key={`${point.date}-${point.volume}`} title={`${point.date}: ${point.volume} kg`} className="w-2 rounded-t bg-[#b7ff00]" style={{ height: `${Math.max(12, (point.volume / maximumVolume) * 36)}px` }}/>)}</div></div></article>; })}</div></div></section>;
}

function RoutinePreview({ routine }: { routine: Routine }) {
  const unassignedDayId = "__unassigned__";
  const unassignedExercises = routine.exercises.filter((exercise) => !routine.days.includes(exercise.trainingDay));
  const dayOptions = [...routine.days.map((day) => ({ id: day, label: day })), ...(unassignedExercises.length ? [{ id: unassignedDayId, label: "Sin día" }] : [])];
  const [selectedDay, setSelectedDay] = useState(() => dayOptions[0]?.id || "");
  const selectedExercises = selectedDay === unassignedDayId ? unassignedExercises : routine.exercises.filter((exercise) => exercise.trainingDay === selectedDay);

  return <><section className="mt-8 rounded-[30px] border border-white/[.08] bg-[#10110e]/95 p-5 sm:p-7"><p className="text-[10px] font-bold tracking-[.2em] text-[#b7ff00]/70">DETALLE DE LA RUTINA</p><h2 className="mt-2 text-2xl font-semibold">Consultá el plan por día.</h2><p className="mt-2 text-sm text-white/40">Elegí un día para ver solo sus ejercicios.</p><div role="tablist" aria-label="Días de entrenamiento" className="mt-6 flex gap-2 overflow-x-auto pb-1">{dayOptions.map((day) => <button key={day.id} role="tab" aria-selected={selectedDay === day.id} onClick={() => setSelectedDay(day.id)} className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition ${selectedDay === day.id ? "bg-[#b7ff00] text-black" : "bg-white/[.05] text-white/55 hover:bg-white/[.09]"}`}>{day.label}</button>)}</div></section><RoutinePreviewContent routine={{ ...routine, days: selectedDay && selectedDay !== unassignedDayId ? [selectedDay] : [], exercises: selectedExercises }} /></>;
}

function RoutinePreviewContent({ routine }: { routine: Routine }) {
  const days = routine.days.map((day) => ({ day, exercises: routine.exercises.filter((exercise) => exercise.trainingDay === day) }));
  const withoutDay = routine.exercises.filter((exercise) => !routine.days.includes(exercise.trainingDay));
  return <section className="mt-8 rounded-[30px] border border-white/[.08] bg-[#10110e]/95 p-5 sm:p-7"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-[10px] font-bold tracking-[.2em] text-[#b7ff00]/70">DETALLE DE LA RUTINA</p><h2 className="mt-2 text-2xl font-semibold">Leé el plan antes de empezar.</h2><p className="mt-2 text-sm text-white/40">{routine.exercises.length} ejercicios · {routine.days.length} días programados</p></div></div><div className="mt-6 space-y-5">{days.map(({ day, exercises }) => <div key={day}><div className="flex items-center gap-3"><p className="text-sm font-bold text-[#b7ff00]">{day}</p><span className="h-px flex-1 bg-white/[.07]"/><span className="text-xs text-white/35">{exercises.length} ejercicio{exercises.length === 1 ? "" : "s"}</span></div>{exercises.length ? <div className="mt-3 grid gap-3 sm:grid-cols-2">{exercises.map((exercise, index) => <article key={exercise.id} className="rounded-2xl border border-white/[.07] bg-black/15 p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold text-[#b7ff00]/70">{String(index + 1).padStart(2, "0")}</p><h3 className="mt-1 font-semibold">{exercise.name}</h3><p className="mt-1 text-xs text-white/40">{exercise.muscle}</p></div><p className="shrink-0 rounded-lg bg-white/[.05] px-2 py-1 text-xs font-semibold text-white/70">{exercise.weight} kg</p></div><div className="mt-4 flex flex-wrap gap-2 text-xs"><span className="rounded-lg bg-white/[.05] px-2 py-1 text-white/60">{exercise.sets} series</span><span className="rounded-lg bg-white/[.05] px-2 py-1 text-white/60">{exercise.reps} reps</span><span className="rounded-lg bg-white/[.05] px-2 py-1 text-white/60">{exercise.technique}</span></div>{exercise.note && <p className="mt-3 border-t border-white/[.06] pt-3 text-xs leading-5 text-white/40">{exercise.note}</p>}</article>)}</div> : <p className="mt-3 rounded-xl bg-black/15 px-3 py-3 text-xs text-white/35">No hay ejercicios asignados para este día.</p>}</div>)}{withoutDay.length ? <div><p className="text-xs font-semibold text-white/50">Sin día específico</p><div className="mt-3 grid gap-3 sm:grid-cols-2">{withoutDay.map((exercise) => <article key={exercise.id} className="rounded-2xl border border-white/[.07] bg-black/15 p-4"><p className="font-semibold">{exercise.name}</p><p className="mt-1 text-xs text-white/40">{exercise.muscle} · {exercise.sets} series × {exercise.reps} reps · {exercise.weight} kg</p></article>)}</div></div> : null}</div></section>;
}

function ExerciseCoachCard({ coaching }: { coaching: ExerciseCoaching }) {
  const reference = coaching.reference;
  return <aside className="mt-4 rounded-xl border border-sky-300/15 bg-sky-300/[.045] p-3"><div className="flex gap-3"><History className="mt-0.5 shrink-0 text-sky-200" size={15}/><div className="min-w-0"><p className="text-[10px] font-bold tracking-[.16em] text-sky-100/65">ASISTENTE DE PROGRESIÓN</p>{reference ? <p className="mt-1 text-xs text-white/60">Última vez: <span className="font-semibold text-white">{reference.bestWeight} kg × {reference.bestReps}</span> · {reference.completedSets} serie{reference.completedSets === 1 ? "" : "s"} · {reference.date}</p> : <p className="mt-1 text-xs text-white/50">Sin una sesión anterior registrada para este ejercicio.</p>}<p className="mt-2 text-xs leading-5 text-sky-100">{coaching.recommendation.message}</p></div></div></aside>;
}

function SessionExerciseCard({ exercise, index, status, coaching, records, onAddSet, onUpdateSet, onDeleteSet }: { exercise: OfflineWorkoutSession["exercises"][number]; index: number; status: OfflineWorkoutSession["status"]; coaching: ExerciseCoaching | undefined; records: PersonalRecord[]; onAddSet: (exerciseId: string) => Promise<void>; onUpdateSet: (exerciseId: string, setId: string, patch: SetPatch) => Promise<void>; onDeleteSet: (exerciseId: string, setId: string) => Promise<void> }) {
  return <article className="rounded-2xl border border-white/[.07] bg-black/15 p-4"><div className="flex items-center justify-between"><div><p className="font-semibold">{index + 1}. {exercise.name}</p><p className="text-xs text-white/35">{exercise.muscle}</p></div>{status === "IN_PROGRESS" && <button onClick={() => void onAddSet(exercise.id)} className="inline-flex items-center gap-1 text-xs font-bold text-[#b7ff00]"><Plus size={14}/> Serie</button>}</div>{coaching && <ExerciseCoachCard coaching={coaching}/>}<div className="mt-4 space-y-3">{exercise.sets.map((set) => { const record = records.find((item) => item.exercise === exercise.name && item.setNumber === set.setNumber); return <div key={set.id} className="rounded-xl bg-white/[.035] p-3"><div className="grid grid-cols-[auto_1fr_1fr_auto] gap-2"><span className="grid h-9 w-9 place-items-center rounded-lg bg-white/[.05] text-xs font-bold">{set.setNumber}</span><NumberInput disabled={status === "FINISHED"} value={set.reps} min={0} max={100} integer placeholder={`${set.targetReps} reps`} onChange={(reps) => void onUpdateSet(exercise.id, set.id, { reps })}/><NumberInput disabled={status === "FINISHED"} value={set.weight} min={0} max={1_000} placeholder={`${set.targetWeight} kg`} onChange={(weight) => void onUpdateSet(exercise.id, set.id, { weight })}/><button disabled={status === "FINISHED"} onClick={() => void onUpdateSet(exercise.id, set.id, { completed: !set.completed })} className={`grid h-9 w-9 place-items-center rounded-lg border ${set.completed ? "border-[#b7ff00]/45 bg-[#b7ff00] text-black" : "border-white/10 text-white/40"}`}><Check size={15}/></button></div>{record && <p className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-[#b7ff00]/20 bg-[#b7ff00]/[.08] px-2 py-1 text-[11px] font-semibold text-[#d7ff78]"><Trophy size={12}/> PR estimado · {record.estimatedOneRepMax} kg e1RM</p>}<div className="mt-2 grid grid-cols-4 gap-2"><NumberInput disabled={status === "FINISHED"} value={set.rir} min={0} max={10} integer placeholder="RIR" onChange={(rir) => void onUpdateSet(exercise.id, set.id, { rir })}/><NumberInput disabled={status === "FINISHED"} value={set.rpe} min={1} max={10} integer placeholder="RPE" onChange={(rpe) => void onUpdateSet(exercise.id, set.id, { rpe })}/><select disabled={status === "FINISHED"} value={set.kind || "NORMAL"} onChange={(event) => void onUpdateSet(exercise.id, set.id, { kind: event.target.value as SetKind })} className="input h-9 px-2 text-xs"><option value="NORMAL">Normal</option><option value="WARMUP">Calentar</option><option value="DROP">Drop</option><option value="FAILURE">Fallo</option></select><button disabled={status === "FINISHED" || exercise.sets.length <= 1} onClick={() => void onDeleteSet(exercise.id, set.id)} className="rounded-lg border border-white/10 text-xs text-white/50 disabled:opacity-30"><Trash2 className="mx-auto" size={14}/></button></div><input disabled={status === "FINISHED"} value={set.note ?? ""} onChange={(event) => void onUpdateSet(exercise.id, set.id, { note: event.target.value || null })} className="input mt-2 h-9" maxLength={500} placeholder={`Nota de la serie · ${setKindLabels[set.kind || "NORMAL"]}`}/></div>; })}</div></article>;
}

function WorkoutRecap({ feedback }: { feedback: SessionFeedback }) {
  return <section className="mt-5 rounded-[28px] border border-[#b7ff00]/20 bg-[#b7ff00]/[.055] p-5 sm:p-6"><div className="flex items-start gap-3"><Sparkles className="mt-0.5 text-[#b7ff00]" size={19}/><div><p className="text-[10px] font-bold tracking-[.18em] text-[#b7ff00]/70">RESUMEN POST-ENTRENO</p><h2 className="mt-1 text-xl font-semibold">Sesión guardada.</h2><p className="mt-2 text-sm text-white/55">{feedback.message}</p></div></div><div className="mt-5 grid grid-cols-3 gap-2 text-center"><div className="rounded-xl bg-black/15 px-2 py-3"><p className="text-lg font-semibold">{feedback.completedSets}</p><p className="text-[10px] text-white/40">Series</p></div><div className="rounded-xl bg-black/15 px-2 py-3"><p className="text-lg font-semibold">{feedback.completedExercises}</p><p className="text-[10px] text-white/40">Ejercicios</p></div><div className="rounded-xl bg-black/15 px-2 py-3"><p className="text-lg font-semibold">{feedback.volume}</p><p className="text-[10px] text-white/40">kg volumen</p></div></div>{feedback.records.length > 0 && <div className="mt-4 space-y-2">{feedback.records.map((record) => <p key={`${record.exercise}-${record.setNumber}`} className="flex items-center justify-between gap-3 rounded-xl border border-[#b7ff00]/15 bg-black/15 px-3 py-2 text-xs"><span className="inline-flex min-w-0 items-center gap-2 font-semibold text-white"><Trophy size={14} className="shrink-0 text-[#b7ff00]"/><span className="truncate">{record.exercise}</span></span><span className="shrink-0 text-[#d7ff78]">{record.weight} kg × {record.reps}</span></p>)}</div>}</section>;
}

function NumberInput({ value, min, max, integer = false, placeholder, disabled, onChange }: { value: number | null; min: number; max: number; integer?: boolean; placeholder: string; disabled: boolean; onChange: (value: number | null) => void }) { const handleChange = (event: ChangeEvent<HTMLInputElement>) => { if (event.target.value === "") { onChange(null); return; } const next = Number(event.target.value); if (!Number.isFinite(next) || next < min || next > max || (integer && !Number.isInteger(next))) return; onChange(next); }; return <input disabled={disabled} value={value ?? ""} onChange={handleChange} className="input h-9 px-2 text-center" min={min} max={max} step={integer ? 1 : "any"} inputMode={integer ? "numeric" : "decimal"} type="number" placeholder={placeholder}/>; }
function SessionMetrics({ completedSets, totalSets, startedAt, finishedAt, restUntil }: { completedSets: number; totalSets: number; startedAt: string; finishedAt: string | null; restUntil: number | null }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (finishedAt && !restUntil) return;
    const tick = () => setNow(Date.now());
    tick();
    const timer = window.setInterval(tick, 1_000);
    return () => window.clearInterval(timer);
  }, [finishedAt, restUntil]);
  const elapsed = Math.max(0, Math.floor(((finishedAt ? new Date(finishedAt).getTime() : now) - new Date(startedAt).getTime()) / 1_000));
  const restSeconds = restUntil ? Math.max(0, Math.ceil((restUntil - now) / 1_000)) : 0;
  return <section className="mt-7 grid gap-3 sm:grid-cols-3"><Metric value={`${completedSets}/${totalSets}`} label="Series"/><Metric value={secondsLabel(elapsed)} label="Duración"/><Metric value={restUntil ? secondsLabel(restSeconds) : "—"} label="Descanso"/></section>;
}
function Metric({ value, label }: { value: string; label: string }) { return <div className="rounded-2xl border border-white/[.07] bg-white/[.03] p-4"><p className="text-xl font-semibold">{value}</p><p className="mt-1 text-xs text-white/35">{label}</p></div>; }
