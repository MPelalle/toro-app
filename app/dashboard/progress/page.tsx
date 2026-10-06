"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Flame,
  Medal,
  TrendingUp,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { BodyProgressPanel } from "@/components/progress/BodyProgressPanel";
import { WorkoutHistoryPanel } from "@/components/progress/WorkoutHistoryPanel";

type Progress = {
  summary: {
    sessions: number;
    volume: number;
    records: number;
    averageDurationSeconds: number;
    densityPerHour: number | null;
  };
  comparison: {
    sessions: number | null;
    volume: number | null;
    records: number;
  };
  consistency: {
    targetSessionsPerWeek: number;
    currentWeekSessions: number;
    completedWeeks: number;
    totalWeeks: number;
    streakWeeks: number;
    rate: number;
  };
  calendar: Array<{
    date: string;
    workouts: number;
    volume: number;
    maxWeight: number;
    records: number;
    durationSeconds: number;
    exercises: string[];
  }>;
  records: Array<{
    date: string;
    exercise: string;
    type: "WEIGHT" | "E1RM";
    estimatedOneRepMax: number;
    weight: number;
    reps: number;
  }>;
  exercises: Array<{
    name: string;
    muscle: string;
    bestWeight: number;
    estimatedOneRepMax: number;
    changePercent: number | null;
    sessions: number;
    sets: number;
    history: Array<{
      date: string;
      volume: number;
      e1rm: number;
      weight: number;
      reps: number;
    }>;
  }>;
  muscles: Array<{
    name: string;
    sets: number;
    frequencyPerWeek: number;
    averageSetsPerWeek: number;
  }>;
  routines: Array<{
    name: string;
    sessions: number;
    volume: number;
    averageVolume: number;
    averageDurationSeconds: number;
    lastDate: string;
  }>;
  insights: string[];
};

const weekdays = ["L", "M", "X", "J", "V", "S", "D"];
const wholeNumber = new Intl.NumberFormat("es-AR");

function dateFromKey(value: string) {
  return new Date(`${value}T12:00:00`);
}
function keyFor(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function monthLabel(date: Date) {
  return new Intl.DateTimeFormat("es-AR", {
    month: "long",
    year: "numeric",
  }).format(date);
}
function dayLabel(value: string) {
  return new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(dateFromKey(value));
}

export default function ProgressPage() {
  const [progress, setProgress] = useState<Progress | null>(null);
  const [error, setError] = useState("");
  const [month, setMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [range, setRange] = useState<"1M" | "3M" | "6M" | "1Y" | "ALL">("3M");

  useEffect(() => {
    let active = true;
    void fetch(`/api/workout-progress?range=${range}`)
      .then((response) =>
        response.ok ? (response.json() as Promise<Progress>) : Promise.reject(),
      )
      .then((data) => {
        if (active) {
          setProgress(data);
          setSelectedDate(data.calendar.at(-1)?.date || null);
        }
      })
      .catch(() => {
        if (active)
          setError("No pudimos cargar tu historial de entrenamiento.");
      });
    return () => {
      active = false;
    };
  }, [range]);

  const byDate = useMemo(
    () => new Map(progress?.calendar.map((day) => [day.date, day]) || []),
    [progress],
  );
  const calendarDays = useMemo(() => {
    const firstWeekday = (month.getDay() + 6) % 7;
    const last = new Date(
      month.getFullYear(),
      month.getMonth() + 1,
      0,
    ).getDate();
    return Array.from({ length: firstWeekday + last }, (_, index) =>
      index < firstWeekday
        ? null
        : new Date(
            month.getFullYear(),
            month.getMonth(),
            index - firstWeekday + 1,
          ),
    );
  }, [month]);
  const selected = selectedDate ? byDate.get(selectedDate) : undefined;
  const monthDays =
    progress?.calendar.filter(
      (day) =>
        dateFromKey(day.date).getFullYear() === month.getFullYear() &&
        dateFromKey(day.date).getMonth() === month.getMonth(),
    ) || [];
  const monthVolume = monthDays.reduce((total, day) => total + day.volume, 0);
  const monthRecords = monthDays.reduce((total, day) => total + day.records, 0);
  const previousMonthDays =
    progress?.calendar.filter(
      (day) =>
        dateFromKey(day.date).getFullYear() ===
          new Date(
            month.getFullYear(),
            month.getMonth() - 1,
            1,
          ).getFullYear() &&
        dateFromKey(day.date).getMonth() ===
          new Date(month.getFullYear(), month.getMonth() - 1, 1).getMonth(),
    ) || [];
  const previousMonthVolume = previousMonthDays.reduce(
    (total, day) => total + day.volume,
    0,
  );

  return (
    <main className="relative min-h-dvh overflow-hidden bg-[#090a08] px-4 pb-36 pt-28 text-white sm:px-8">
      <div className="pointer-events-none absolute -right-24 top-20 h-80 w-80 rounded-full bg-sky-400/[.08] blur-3xl toro-breathe" />
      <div className="pointer-events-none absolute -left-24 top-[30rem] h-80 w-80 rounded-full bg-fuchsia-500/[.07] blur-3xl toro-breathe-reverse" />
      <div className="relative mx-auto max-w-5xl">
        <Link
          href="/dashboard/routine"
          className="inline-flex items-center gap-2 text-xs text-white/45 hover:text-white"
        >
          <ArrowLeft size={15} /> Entrenamiento
        </Link>
        <header className="mt-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold tracking-[.22em] text-[#b7ff00]/70">
              PROGRESO
            </p>
            <h1 className="mt-2 text-4xl font-semibold tracking-[-.06em] sm:text-5xl">
              Tu fuerza deja huella.
            </h1>
            <p className="mt-3 max-w-xl text-sm text-white/40">
              Cada sesión terminada alimenta tu calendario, volumen y récords
              personales estimados.
            </p>
          </div>
          <Link
            href="/dashboard/routine"
            className="inline-flex items-center gap-2 rounded-xl bg-[#b7ff00] px-4 py-3 text-sm font-bold text-black"
          >
            <Dumbbell size={16} /> Entrenar
          </Link>
        </header>

        {error && (
          <p
            role="alert"
            className="mt-6 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-200"
          >
            {error}
          </p>
        )}
        {!progress && !error && (
          <p className="mt-8 text-sm text-white/45">Cargando tu progreso…</p>
        )}
        {progress && (
          <>
            {!progress.summary.sessions ? (
              <Empty />
            ) : (
              <>
                <div
                  className="mt-7 flex gap-2 overflow-x-auto pb-1"
                  role="tablist"
                  aria-label="Período de progreso"
                >
                  {(["1M", "3M", "6M", "1Y", "ALL"] as const).map((item) => (
                    <button
                      key={item}
                      role="tab"
                      type="button"
                      onClick={() => setRange(item)}
                      aria-selected={range === item}
                      className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold ${range === item ? "bg-[#b7ff00] text-black" : "bg-white/[.06] text-white/55"}`}
                    >
                      {item === "ALL" ? "TODO" : item}
                    </button>
                  ))}
                </div>
                <section className="mt-4 grid gap-3 sm:grid-cols-4">
                  <Metric
                    icon={<Dumbbell size={18} />}
                    value={String(progress.summary.sessions)}
                    label="Entrenamientos"
                    detail={
                      progress.comparison.sessions === null
                        ? undefined
                        : `${progress.comparison.sessions > 0 ? "+" : ""}${progress.comparison.sessions}% vs. período anterior`
                    }
                  />
                  <Metric
                    icon={<TrendingUp size={18} />}
                    value={`${wholeNumber.format(progress.summary.volume)} kg`}
                    label="Volumen registrado"
                    detail={
                      progress.comparison.volume === null
                        ? undefined
                        : `${progress.comparison.volume > 0 ? "+" : ""}${progress.comparison.volume}% vs. período anterior`
                    }
                  />
                  <Metric
                    icon={<Medal size={18} />}
                    value={String(progress.summary.records)}
                    label="PR del período"
                    detail={
                      progress.comparison.records
                        ? `${progress.comparison.records > 0 ? "+" : ""}${progress.comparison.records} vs. período anterior`
                        : undefined
                    }
                  />
                  <Metric
                    icon={<Flame size={18} />}
                    value={`${progress.consistency.currentWeekSessions}/${progress.consistency.targetSessionsPerWeek}`}
                    label="Objetivo semanal"
                  />
                </section>
                <section className="mt-6 grid gap-3 lg:grid-cols-[1.2fr_.8fr]">
                  <div className="rounded-[28px] border border-[#b7ff00]/15 bg-[#b7ff00]/[.045] p-5">
                    <p className="text-[10px] font-bold tracking-[.2em] text-[#b7ff00]/70">
                      LO MÁS IMPORTANTE
                    </p>
                    <div className="mt-4 space-y-2">
                      {progress.insights.length ? (
                        progress.insights.map((insight) => (
                          <p
                            key={insight}
                            className="rounded-xl bg-black/15 px-3 py-2.5 text-sm text-white/75"
                          >
                            {insight}
                          </p>
                        ))
                      ) : (
                        <p className="text-sm text-white/45">
                          Completá más sesiones para empezar a ver cambios de
                          fuerza y consistencia.
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="rounded-[28px] border border-white/[.08] bg-[#10110e]/95 p-5">
                    <p className="text-[10px] font-bold tracking-[.2em] text-white/45">
                      CONSISTENCIA
                    </p>
                    <p className="mt-3 text-3xl font-semibold">
                      {progress.consistency.rate}%
                    </p>
                    <p className="mt-1 text-sm text-white/45">
                      {progress.consistency.completedWeeks}/
                      {progress.consistency.totalWeeks} semanas cumpliendo tu
                      objetivo.
                    </p>
                    <p className="mt-3 text-xs text-[#d7ff78]">
                      {progress.consistency.streakWeeks
                        ? `${progress.consistency.streakWeeks} semana${progress.consistency.streakWeeks === 1 ? "" : "s"} consecutiva${progress.consistency.streakWeeks === 1 ? "" : "s"}.`
                        : "Aún no hay una racha semanal."}
                    </p>
                  </div>
                </section>
                <section className="mt-7 rounded-[28px] border border-[#b7ff00]/15 bg-[#b7ff00]/[.045] p-5 sm:p-6">
                  <p className="text-[10px] font-bold tracking-[.2em] text-[#b7ff00]/70">
                    RESUMEN MENSUAL
                  </p>
                  <h2 className="mt-2 text-xl font-semibold capitalize">
                    {monthLabel(month)}
                  </h2>
                  <div className="mt-5 grid gap-3 sm:grid-cols-4">
                    <Detail
                      label="Entrenamientos"
                      value={String(
                        monthDays.reduce(
                          (total, day) => total + day.workouts,
                          0,
                        ),
                      )}
                    />
                    <Detail
                      label="Volumen"
                      value={`${wholeNumber.format(monthVolume)} kg`}
                    />
                    <Detail label="PR" value={String(monthRecords)} />
                    <Detail
                      label="Músculo más trabajado"
                      value={progress.muscles[0]?.name || "—"}
                    />
                  </div>
                  {previousMonthDays.length > 0 && (
                    <p className="mt-4 text-xs text-white/45">
                      {previousMonthVolume === 0
                        ? "Sin volumen registrado el mes anterior."
                        : `${previousMonthVolume < monthVolume ? "+" : ""}${Math.round(((monthVolume - previousMonthVolume) / previousMonthVolume) * 100)}% de volumen registrado vs. el mes anterior.`}
                    </p>
                  )}
                </section>
                <section className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(240px,.8fr)]">
                  <div className="rounded-[28px] border border-white/[.08] bg-[#10110e]/95 p-5 sm:p-6">
                    <div className="flex items-center justify-between gap-3">
                      <button
                        type="button"
                        aria-label="Mes anterior"
                        onClick={() =>
                          setMonth(
                            (value) =>
                              new Date(
                                value.getFullYear(),
                                value.getMonth() - 1,
                                1,
                              ),
                          )
                        }
                        className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 text-white/60"
                      >
                        <ChevronLeft size={17} />
                      </button>
                      <div className="text-center">
                        <p className="capitalize text-lg font-semibold">
                          {monthLabel(month)}
                        </p>
                        <p className="mt-1 text-[11px] text-white/35">
                          {wholeNumber.format(monthVolume)} kg de volumen
                        </p>
                      </div>
                      <button
                        type="button"
                        aria-label="Mes siguiente"
                        disabled={
                          month.getFullYear() === new Date().getFullYear() &&
                          month.getMonth() === new Date().getMonth()
                        }
                        onClick={() =>
                          setMonth(
                            (value) =>
                              new Date(
                                value.getFullYear(),
                                value.getMonth() + 1,
                                1,
                              ),
                          )
                        }
                        className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 text-white/60 disabled:opacity-30"
                      >
                        <ChevronRight size={17} />
                      </button>
                    </div>
                    <div className="mt-7 grid grid-cols-7 gap-1.5">
                      {weekdays.map((day) => (
                        <span
                          key={day}
                          className="text-center text-[10px] font-bold text-white/30"
                        >
                          {day}
                        </span>
                      ))}
                      {calendarDays.map((date, index) => {
                        if (!date) return <span key={`space-${index}`} />;
                        const key = keyFor(date);
                        const data = byDate.get(key);
                        const selected = selectedDate === key;
                        const today = key === keyFor(new Date());
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => data && setSelectedDate(key)}
                            disabled={!data}
                            className={`relative min-h-14 rounded-xl border p-1 text-left transition ${data ? "border-[#b7ff00]/20 bg-[#b7ff00]/[.07] hover:bg-[#b7ff00]/[.13]" : "border-transparent bg-white/[.015] text-white/25"} ${selected ? "ring-1 ring-[#b7ff00]" : ""}`}
                          >
                            <span
                              className={`block text-[10px] font-semibold ${today ? "text-[#b7ff00]" : ""}`}
                            >
                              {date.getDate()}
                            </span>
                            {data && (
                              <>
                                <span className="mt-1 block truncate text-[10px] font-bold text-white">
                                  {wholeNumber.format(data.maxWeight)} kg
                                </span>
                                <span className="block truncate text-[9px] text-white/35">
                                  {wholeNumber.format(data.volume)} vol.
                                </span>
                                {data.records > 0 && (
                                  <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-[#b7ff00] text-[8px] font-black text-black">
                                    {data.records}
                                  </span>
                                )}
                              </>
                            )}
                          </button>
                        );
                      })}
                    </div>
                    <div className="mt-5 flex items-center gap-3 border-t border-white/[.07] pt-4 text-[11px] text-white/35">
                      <span className="h-2.5 w-2.5 rounded-sm bg-[#b7ff00]/40" />{" "}
                      Día entrenado{" "}
                      <span className="ml-2 grid h-4 w-4 place-items-center rounded-full bg-[#b7ff00] text-[8px] font-black text-black">
                        1
                      </span>{" "}
                      PR estimado
                    </div>
                  </div>
                  <aside className="rounded-[28px] border border-[#b7ff00]/15 bg-[#b7ff00]/[.045] p-5 sm:p-6">
                    {selected ? (
                      <>
                        <p className="text-[10px] font-bold tracking-[.18em] text-[#b7ff00]/70">
                          SESIÓN SELECCIONADA
                        </p>
                        <h2 className="mt-2 capitalize text-xl font-semibold">
                          {dayLabel(selected.date)}
                        </h2>
                        <div className="mt-5 grid gap-3">
                          <Detail
                            label="Volumen levantado"
                            value={`${wholeNumber.format(selected.volume)} kg`}
                          />
                          <Detail
                            label="Peso más alto"
                            value={`${wholeNumber.format(selected.maxWeight)} kg`}
                          />
                          <Detail
                            label="Entrenamientos"
                            value={String(selected.workouts)}
                          />
                          {selected.records > 0 && (
                            <Detail
                              label="Nuevos récords"
                              value={`${selected.records} PR`}
                              accent
                            />
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        <Flame className="text-[#b7ff00]" />
                        <p className="mt-4 font-semibold">
                          Elegí un día entrenado.
                        </p>
                        <p className="mt-2 text-sm leading-6 text-white/40">
                          Vas a ver el volumen y el peso más alto que
                          registraste esa jornada.
                        </p>
                      </>
                    )}
                  </aside>
                </section>
                <section className="mt-7 grid gap-6 lg:grid-cols-2">
                  <div className="rounded-[28px] border border-white/[.08] bg-[#10110e]/95 p-5 sm:p-6">
                    <p className="text-[10px] font-bold tracking-[.2em] text-[#b7ff00]/70">
                      RÉCORDS PERSONALES
                    </p>
                    <h2 className="mt-2 text-xl font-semibold">
                      Más fuerte que tu mejor marca.
                    </h2>
                    <p className="mt-2 text-xs leading-5 text-white/40">
                      Se excluyen series de calentamiento. Peso y e1RM se
                      muestran por separado.
                    </p>
                    <div className="mt-5 space-y-3">
                      {progress.records.length ? (
                        progress.records.slice(0, 5).map((record) => (
                          <article
                            key={`${record.date}-${record.exercise}-${record.type}`}
                            className="flex items-center justify-between gap-3 rounded-2xl border border-[#b7ff00]/15 bg-[#b7ff00]/[.05] p-4"
                          >
                            <div>
                              <p className="font-semibold">{record.exercise}</p>
                              <p className="mt-1 text-xs text-white/40">
                                {record.weight} kg × {record.reps} reps ·{" "}
                                {dateFromKey(record.date).toLocaleDateString(
                                  "es-AR",
                                )}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-[#b7ff00]">
                                {record.type === "WEIGHT"
                                  ? `${record.weight} kg`
                                  : `${record.estimatedOneRepMax} kg`}
                              </p>
                              <p className="text-[10px] font-bold tracking-wide text-[#b7ff00]/65">
                                PR {record.type === "WEIGHT" ? "PESO" : "e1RM"}
                              </p>
                            </div>
                          </article>
                        ))
                      ) : (
                        <p className="rounded-2xl border border-dashed border-white/10 p-4 text-sm leading-6 text-white/35">
                          Terminá más sesiones del mismo ejercicio. Cuando
                          superes tu mejor marca, Toro lo mostrará acá.
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="rounded-[28px] border border-white/[.08] bg-[#10110e]/95 p-5 sm:p-6">
                    <p className="text-[10px] font-bold tracking-[.2em] text-[#b7ff00]/70">
                      MEJORES LEVANTAMIENTOS
                    </p>
                    <h2 className="mt-2 text-xl font-semibold">
                      Historial por ejercicio.
                    </h2>
                    <div className="mt-5 space-y-3">
                      {progress.exercises.slice(0, 5).map((exercise) => {
                        const maximum = Math.max(
                          ...exercise.history.map((item) => item.e1rm),
                          1,
                        );
                        return (
                          <Link
                            href={`/dashboard/progress/${encodeURIComponent(exercise.name)}`}
                            key={exercise.name}
                            className="block rounded-2xl border border-white/[.07] bg-black/15 p-4 hover:border-[#b7ff00]/30"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-semibold">{exercise.name}</p>
                                <p className="mt-1 text-xs text-white/40">
                                  {exercise.muscle} · mejor peso{" "}
                                  {exercise.bestWeight} kg
                                </p>
                              </div>
                              <p className="text-right text-lg font-bold text-[#b7ff00]">
                                {exercise.estimatedOneRepMax}
                                <span className="ml-1 text-[10px] text-[#b7ff00]/65">
                                  e1RM
                                </span>
                              </p>
                            </div>
                            <div className="mt-4 flex h-9 items-end gap-1">
                              {exercise.history.map((item) => (
                                <span
                                  key={`${item.date}-${item.volume}`}
                                  title={`${item.date}: ${item.e1rm} kg e1RM`}
                                  className="min-w-2 flex-1 rounded-t bg-sky-300/70"
                                  style={{
                                    height: `${Math.max(8, (item.e1rm / maximum) * 36)}px`,
                                  }}
                                />
                              ))}
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </section>
                <section className="mt-7 rounded-[28px] border border-white/[.08] bg-[#10110e]/95 p-5 sm:p-6">
                  <p className="text-[10px] font-bold tracking-[.2em] text-[#b7ff00]/70">
                    DISTRIBUCIÓN DE SETS
                  </p>
                  <h2 className="mt-2 text-xl font-semibold">
                    Trabajo por músculo.
                  </h2>
                  <p className="mt-2 text-xs text-white/40">
                    Sets de trabajo completados por grupo primario; no son una
                    estimación de hipertrofia.
                  </p>
                  <div className="mt-5 space-y-3">
                    {progress.muscles.map((muscle) => {
                      const maximum = Math.max(
                        ...progress.muscles.map((item) => item.sets),
                        1,
                      );
                      return (
                        <div
                          key={muscle.name}
                          className="grid grid-cols-[100px_1fr_auto] items-center gap-3"
                        >
                          <div>
                            <p className="truncate text-sm font-semibold">
                              {muscle.name}
                            </p>
                            <p className="text-[10px] text-white/35">
                              {muscle.averageSetsPerWeek}/sem ·{" "}
                              {muscle.frequencyPerWeek}×
                            </p>
                          </div>
                          <span className="h-2 overflow-hidden rounded-full bg-white/[.07]">
                            <span
                              className="block h-full rounded-full bg-sky-300"
                              style={{
                                width: `${(muscle.sets / maximum) * 100}%`,
                              }}
                            />
                          </span>
                          <span className="text-xs font-semibold text-white/70">
                            {muscle.sets}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </section>
                <section className="mt-7 grid gap-6 lg:grid-cols-2">
                  <article className="rounded-[28px] border border-white/[.08] bg-[#10110e]/95 p-5 sm:p-6">
                    <p className="text-[10px] font-bold tracking-[.2em] text-[#b7ff00]/70">
                      MÁS REALIZADOS
                    </p>
                    <p className="mt-2 text-sm text-white/40">
                      Ejercicios priorizados en sesiones reales.
                    </p>
                    <div className="mt-4 space-y-2">
                      {progress.exercises
                        .slice()
                        .sort((a, b) => b.sessions - a.sessions)
                        .slice(0, 5)
                        .map((exercise) => (
                          <Link
                            key={exercise.name}
                            href={`/dashboard/progress/${encodeURIComponent(exercise.name)}`}
                            className="flex items-center justify-between rounded-xl bg-black/15 p-3"
                          >
                            <span>
                              <span className="block font-semibold">
                                {exercise.name}
                              </span>
                              <span className="text-xs text-white/40">
                                {exercise.sessions} sesiones · {exercise.sets}{" "}
                                sets
                              </span>
                            </span>
                            <span className="text-xs font-bold text-[#d7ff78]">
                              Ver
                            </span>
                          </Link>
                        ))}
                    </div>
                  </article>
                  <article className="rounded-[28px] border border-white/[.08] bg-[#10110e]/95 p-5 sm:p-6">
                    <p className="text-[10px] font-bold tracking-[.2em] text-[#b7ff00]/70">
                      RUTINAS
                    </p>
                    <p className="mt-2 text-sm text-white/40">
                      Contexto de ejecución, no una puntuación.
                    </p>
                    <div className="mt-4 space-y-2">
                      {progress.routines.slice(0, 5).map((routine) => (
                        <div
                          key={routine.name}
                          className="rounded-xl bg-black/15 p-3"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-semibold">{routine.name}</p>
                            <p className="text-xs text-[#d7ff78]">
                              {routine.sessions} veces
                            </p>
                          </div>
                          <p className="mt-1 text-xs text-white/40">
                            {wholeNumber.format(routine.averageVolume)} kg
                            promedio · última vez{" "}
                            {new Date(
                              `${routine.lastDate}T12:00:00`,
                            ).toLocaleDateString("es-AR")}
                          </p>
                        </div>
                      ))}
                    </div>
                  </article>
                </section>
                <BodyProgressPanel />
                <WorkoutHistoryPanel />
              </>
            )}
          </>
        )}
      </div>
    </main>
  );
}

function Metric({
  icon,
  value,
  label,
  detail,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  detail?: string;
}) {
  return (
    <article className="rounded-2xl border border-white/[.07] bg-white/[.025] p-4">
      <div className="text-[#b7ff00]">{icon}</div>
      <p className="mt-5 text-2xl font-semibold tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-white/35">{label}</p>
      {detail && <p className="mt-2 text-[10px] text-[#d7ff78]">{detail}</p>}
    </article>
  );
}
function Detail({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl border border-white/[.07] bg-black/15 p-3">
      <p className="text-[10px] font-bold tracking-[.14em] text-white/35">
        {label.toUpperCase()}
      </p>
      <p
        className={`mt-1 text-lg font-semibold ${accent ? "text-[#b7ff00]" : ""}`}
      >
        {value}
      </p>
    </div>
  );
}
function Empty() {
  return (
    <section className="mt-8 rounded-[30px] border border-dashed border-white/10 bg-white/[.02] px-6 py-14 text-center">
      <Dumbbell className="mx-auto text-[#b7ff00]" />
      <h2 className="mt-5 text-xl font-semibold">
        Tu progreso empieza con la primera sesión.
      </h2>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-white/35">
        Terminá un entrenamiento para registrar el peso levantado, volumen y
        futuros récords estimados.
      </p>
      <Link
        href="/dashboard/routine"
        className="mt-6 inline-flex rounded-xl bg-[#b7ff00] px-4 py-3 text-sm font-bold text-black"
      >
        Abrir rutinas
      </Link>
    </section>
  );
}
