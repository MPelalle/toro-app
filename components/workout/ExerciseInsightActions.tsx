"use client";

import Link from "next/link";
import { History, Trophy, UsersRound, X } from "lucide-react";
import { useState } from "react";
import { ExerciseVideoModal } from "./ExerciseVideoModal";

type Insights = {
  personal: { weight: number; reps: number; estimatedOneRepMax: number; date: string } | null;
  history: Array<{ id: string; date: string; weight: number; reps: number; estimatedOneRepMax: number }>;
  friendRecord: { name: string; nickname: string | null; weight: number; reps: number; estimatedOneRepMax: number } | null;
};

function stamp(value: string) {
  return new Date(value).toLocaleDateString("es-AR", { day: "numeric", month: "short" });
}

/** Acciones compactas: dejan los datos profundos a un toque de distancia y no
 * recargan cada tarjeta de serie con texto. */
export function ExerciseInsightActions({
  exerciseName,
  exerciseId,
}: {
  exerciseName: string;
  exerciseId?: string | null;
}) {
  const [open, setOpen] = useState<"personal" | "friends" | null>(null);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const show = async (view: "personal" | "friends") => {
    setOpen(view);
    if (insights || loading) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/exercise-insights?name=${encodeURIComponent(exerciseName)}`, { cache: "no-store" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "No pudimos cargar las marcas.");
      setInsights(body as Insights);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No pudimos cargar las marcas.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => void show("personal")}
          title="Ver récord personal"
          aria-label={`Ver récord personal de ${exerciseName}`}
          className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#b7ff00]/20 px-2 text-[11px] font-bold text-[#d7ff78] hover:bg-[#b7ff00]/10"
        >
          <Trophy size={13} /> RP
        </button>
        <Link
          href={`/dashboard/progress/${encodeURIComponent(exerciseName)}`}
          title="Ver historial de sesiones"
          aria-label={`Ver historial de ${exerciseName}`}
          className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 text-white/55 hover:border-white/25 hover:text-white"
        >
          <History size={14} />
        </Link>
        <button
          type="button"
          onClick={() => void show("friends")}
          title="Ver récord de amigos"
          aria-label={`Ver récord de amigos en ${exerciseName}`}
          className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 text-white/55 hover:border-sky-300/35 hover:text-sky-200"
        >
          <UsersRound size={14} />
        </button>
        <ExerciseVideoModal exerciseId={exerciseId} exerciseName={exerciseName} />
      </div>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Marcas de ${exerciseName}`}
          className="fixed inset-0 z-[80] grid place-items-center bg-black/80 p-4 backdrop-blur-sm"
          onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(null); }}
        >
          <section className="w-full max-w-md rounded-[28px] border border-white/10 bg-[#10110e] p-5 shadow-2xl">
            <header className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold tracking-[.18em] text-[#b7ff00]/70">{open === "personal" ? "RÉCORD PERSONAL" : "RÉCORD DE AMIGOS"}</p>
                <h2 className="mt-1 text-xl font-semibold">{exerciseName}</h2>
              </div>
              <button type="button" onClick={() => setOpen(null)} aria-label="Cerrar" className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 text-white/60 hover:bg-white/[.06]"><X size={18} /></button>
            </header>
            {loading && <p className="mt-8 text-sm text-white/45">Cargando marcas…</p>}
            {error && <p role="alert" className="mt-6 text-sm text-red-300">{error}</p>}
            {!loading && !error && open === "personal" && (
              <>
                {insights?.personal ? (
                  <div className="mt-6 rounded-2xl border border-[#b7ff00]/20 bg-[#b7ff00]/[.06] p-4"><p className="text-2xl font-semibold text-[#d7ff78]">{insights.personal.weight} kg × {insights.personal.reps}</p><p className="mt-1 text-xs text-white/45">e1RM {insights.personal.estimatedOneRepMax} kg · {stamp(insights.personal.date)}</p></div>
                ) : <p className="mt-6 rounded-2xl bg-black/20 p-4 text-sm text-white/45">Completá tu primera serie para crear un récord.</p>}
                <div className="mt-5"><p className="text-[10px] font-bold tracking-[.16em] text-white/35">ÚLTIMAS SESIONES</p>{insights?.history.length ? <div className="mt-3 space-y-2">{insights.history.slice(0, 4).map((item) => <div key={item.id} className="flex items-center justify-between rounded-xl bg-black/20 px-3 py-2 text-xs"><span className="text-white/45">{stamp(item.date)}</span><span className="font-semibold">{item.weight} kg × {item.reps}</span><span className="text-[#b7ff00]">{item.estimatedOneRepMax} e1RM</span></div>)}</div> : null}</div>
              </>
            )}
            {!loading && !error && open === "friends" && (
              insights?.friendRecord ? <div className="mt-6 rounded-2xl border border-sky-300/20 bg-sky-300/[.06] p-4"><p className="font-semibold">{insights.friendRecord.nickname ? `@${insights.friendRecord.nickname}` : insights.friendRecord.name}</p><p className="mt-2 text-2xl font-semibold text-sky-100">{insights.friendRecord.weight} kg × {insights.friendRecord.reps}</p><p className="mt-1 text-xs text-white/45">e1RM {insights.friendRecord.estimatedOneRepMax} kg</p></div> : <p className="mt-6 rounded-2xl bg-black/20 p-4 text-sm text-white/45">Todavía no hay marcas de tus amigos en este ejercicio.</p>
            )}
          </section>
        </div>
      )}
    </>
  );
}
