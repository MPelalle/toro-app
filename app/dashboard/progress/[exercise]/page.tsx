"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Dumbbell, TrendingUp, Trophy } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type Exercise = {
  name: string;
  muscle: string;
  bestWeight: number;
  estimatedOneRepMax: number;
  changePercent: number | null;
  history: Array<{
    date: string;
    volume: number;
    e1rm: number;
    weight: number;
    reps: number;
  }>;
};
type Response = { exercises: Exercise[]; bodyWeight: number | null };
const periods = ["1M", "3M", "6M", "1Y", "ALL"] as const;

export default function ExerciseProgressPage() {
  const { exercise: encoded } = useParams<{ exercise: string }>();
  const name = decodeURIComponent(encoded);
  const [period, setPeriod] = useState<(typeof periods)[number]>("ALL");
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [bodyWeight, setBodyWeight] = useState<number | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    void fetch(`/api/workout-progress?range=${period}`)
      .then((response) =>
        response.ok ? (response.json() as Promise<Response>) : Promise.reject(),
      )
      .then((data) => {
        if (active) {
          setExercise(
            data.exercises.find(
              (item) =>
                item.name.toLocaleLowerCase() === name.toLocaleLowerCase(),
            ) || null,
          );
          setBodyWeight(data.bodyWeight);
        }
      })
      .catch(() => {
        if (active) setError("No pudimos cargar este historial.");
      });
    return () => {
      active = false;
    };
  }, [name, period]);
  const maximum = useMemo(
    () => Math.max(...(exercise?.history.map((point) => point.e1rm) || []), 1),
    [exercise],
  );
  return (
    <main className="min-h-dvh bg-[#090a08] px-4 pb-36 pt-28 text-white sm:px-8">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/dashboard/progress"
          className="inline-flex items-center gap-2 text-xs text-white/45 hover:text-white"
        >
          <ArrowLeft size={15} /> Progreso
        </Link>
        {error && (
          <p role="alert" className="mt-5 text-sm text-red-300">
            {error}
          </p>
        )}
        {!exercise && !error && (
          <p className="mt-8 text-sm text-white/45">Cargando ejercicio…</p>
        )}
        {exercise && (
          <>
            <header className="mt-8">
              <p className="text-[10px] font-bold tracking-[.22em] text-[#b7ff00]/70">
                PROGRESO POR EJERCICIO
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-[-.05em] sm:text-4xl">
                {exercise.name}
              </h1>
              <p className="mt-2 text-sm text-white/40">
                {exercise.muscle} · datos de series de trabajo completadas.
              </p>
            </header>
            <section className="mt-7 grid gap-3 sm:grid-cols-4">
              <Metric
                icon={<Trophy size={18} />}
                label="Mejor peso"
                value={`${exercise.bestWeight} kg`}
              />
              <Metric
                icon={<TrendingUp size={18} />}
                label="Mejor e1RM"
                value={`${exercise.estimatedOneRepMax} kg`}
              />
              <Metric
                icon={<Dumbbell size={18} />}
                label="Cambio"
                value={
                  exercise.changePercent === null
                    ? "—"
                    : `${exercise.changePercent > 0 ? "+" : ""}${exercise.changePercent}%`
                }
              />
              {bodyWeight && (
                <Metric
                  icon={<Dumbbell size={18} />}
                  label="e1RM / peso corporal"
                  value={`${(exercise.estimatedOneRepMax / bodyWeight).toFixed(2)}×`}
                />
              )}
            </section>
            <div className="mt-7 flex gap-2 overflow-x-auto" role="tablist">
              {periods.map((item) => (
                <button
                  key={item}
                  role="tab"
                  aria-selected={period === item}
                  type="button"
                  onClick={() => setPeriod(item)}
                  className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold ${period === item ? "bg-[#b7ff00] text-black" : "bg-white/[.06] text-white/55"}`}
                >
                  {item === "ALL" ? "TODO" : item}
                </button>
              ))}
            </div>
            <section className="mt-4 rounded-[28px] border border-white/[.08] bg-[#10110e] p-5 sm:p-6">
              <p className="text-[10px] font-bold tracking-[.18em] text-[#b7ff00]/70">
                FUERZA · e1RM
              </p>
              <div className="mt-5 flex h-40 items-end gap-2">
                {exercise.history.map((point) => (
                  <div
                    key={`${point.date}-${point.e1rm}`}
                    className="flex min-w-8 flex-1 flex-col items-center justify-end gap-2"
                  >
                    <span
                      title={`${point.date}: ${point.e1rm} kg e1RM`}
                      className="w-full rounded-t bg-sky-300/80"
                      style={{
                        height: `${Math.max(10, (point.e1rm / maximum) * 130)}px`,
                      }}
                    />
                    <span className="text-[9px] text-white/35">
                      {point.date.slice(5)}
                    </span>
                  </div>
                ))}
              </div>
            </section>
            <section className="mt-6 rounded-[28px] border border-white/[.08] bg-[#10110e] p-5 sm:p-6">
              <p className="text-[10px] font-bold tracking-[.18em] text-[#b7ff00]/70">
                VOLUMEN
              </p>
              <p className="mt-2 text-xs text-white/40">
                Volumen de sets de trabajo: peso × repeticiones; se excluyen
                calentamientos.
              </p>
              <div className="mt-5 flex h-24 items-end gap-2">
                {exercise.history.map((point) => (
                  <div
                    key={`volume-${point.date}-${point.volume}`}
                    title={`${point.date}: ${point.volume} kg`}
                    className="min-w-8 flex-1 rounded-t bg-[#b7ff00]/70"
                    style={{
                      height: `${Math.max(8, (point.volume / Math.max(...exercise.history.map((item) => item.volume), 1)) * 90)}px`,
                    }}
                  />
                ))}
              </div>
            </section>
            <section className="mt-6 rounded-[28px] border border-white/[.08] bg-[#10110e] p-5 sm:p-6">
              <p className="text-[10px] font-bold tracking-[.18em] text-[#b7ff00]/70">
                HISTORIAL
              </p>
              <div className="mt-4 space-y-2">
                {[...exercise.history].reverse().map((point) => (
                  <article
                    key={`${point.date}-${point.volume}`}
                    className="flex items-center justify-between gap-3 rounded-xl bg-black/20 p-3"
                  >
                    <div>
                      <p className="font-semibold">
                        {new Date(`${point.date}T12:00:00`).toLocaleDateString(
                          "es-AR",
                        )}
                      </p>
                      <p className="mt-1 text-xs text-white/40">
                        Mejor serie: {point.weight} kg × {point.reps} ·{" "}
                        {point.volume.toLocaleString("es-AR")} kg de volumen
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-bold text-[#b7ff00]">
                      {point.e1rm} e1RM
                    </p>
                  </article>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
function Metric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <article className="rounded-2xl border border-white/[.07] bg-white/[.025] p-4">
      <span className="text-[#b7ff00]">{icon}</span>
      <p className="mt-4 text-xl font-semibold">{value}</p>
      <p className="mt-1 text-xs text-white/40">{label}</p>
    </article>
  );
}
