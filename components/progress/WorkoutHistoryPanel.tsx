"use client";

import { Search } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type Session = {
  id: string;
  date: string | null;
  routine: string;
  durationSeconds: number | null;
  notes: string | null;
  emotionalRating: number | null;
  exercises: Array<{
    name: string;
    muscle: string;
    sets: Array<{ weight: number | null; reps: number | null; kind: string }>;
  }>;
  volume: number;
  completedSets: number;
};
type Response = { sessions: Session[]; nextCursor: string | null };
function duration(seconds: number | null) {
  return seconds
    ? `${Math.floor(seconds / 3600)}h ${Math.round((seconds % 3600) / 60)}m`
    : "—";
}

export function WorkoutHistoryPanel() {
  const [query, setQuery] = useState("");
  const [data, setData] = useState<Response>({
    sessions: [],
    nextCursor: null,
  });
  const [selected, setSelected] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const load = useCallback(
    async (append = false, cursor?: string) => {
      setLoading(true);
      const response = await fetch(
        `/api/workout-history?q=${encodeURIComponent(query)}${cursor ? `&cursor=${cursor}` : ""}`,
      );
      if (!response.ok) throw new Error();
      const next = (await response.json()) as Response;
      setData((current) =>
        append
          ? {
              sessions: [...current.sessions, ...next.sessions],
              nextCursor: next.nextCursor,
            }
          : next,
      );
      setLoading(false);
    },
    [query],
  );
  useEffect(() => {
    const timeout = window.setTimeout(
      () => void load().catch(() => setLoading(false)),
      250,
    );
    return () => window.clearTimeout(timeout);
  }, [load]);
  return (
    <section className="mt-7 rounded-[28px] border border-white/[.08] bg-[#10110e]/95 p-5 sm:p-6">
      <p className="text-[10px] font-bold tracking-[.2em] text-[#b7ff00]/70">
        HISTORIAL COMPLETO
      </p>
      <div className="mt-4 flex items-center gap-2 rounded-xl border border-white/10 bg-black/15 px-3">
        <Search size={15} className="text-white/40" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="h-11 w-full bg-transparent text-sm outline-none"
          placeholder="Buscar rutina o ejercicio"
          aria-label="Buscar en historial"
        />
      </div>
      <div className="mt-4 space-y-2">
        {data.sessions.map((session) => (
          <button
            key={session.id}
            type="button"
            onClick={() => setSelected(session)}
            className="w-full rounded-2xl border border-white/[.07] bg-black/15 p-4 text-left hover:border-[#b7ff00]/25"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{session.routine}</p>
                <p className="mt-1 text-xs text-white/40">
                  {session.date
                    ? new Date(session.date).toLocaleDateString("es-AR")
                    : "Fecha no disponible"}{" "}
                  · {session.exercises.length} ejercicios ·{" "}
                  {session.completedSets} sets
                </p>
              </div>
              <p className="text-right text-sm font-bold text-[#d7ff78]">
                {session.volume.toLocaleString("es-AR")} kg
              </p>
            </div>
          </button>
        ))}
      </div>
      {!loading && !data.sessions.length && (
        <p className="py-8 text-center text-sm text-white/40">
          No encontramos sesiones con esos filtros.
        </p>
      )}
      {data.nextCursor && (
        <button
          type="button"
          onClick={() => void load(true, data.nextCursor || undefined)}
          className="mt-4 rounded-xl border border-white/10 px-4 py-2 text-xs font-bold text-white/65"
        >
          Cargar más
        </button>
      )}
      {selected && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Detalle de sesión"
          className="fixed inset-0 z-50 flex items-end bg-black/75 sm:items-center sm:justify-center"
        >
          <div className="max-h-[85dvh] w-full max-w-lg overflow-y-auto rounded-t-[28px] border border-white/10 bg-[#10110e] p-5 sm:rounded-[28px]">
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="float-right text-sm text-white/55"
            >
              Cerrar
            </button>
            <p className="text-[10px] font-bold tracking-[.18em] text-[#b7ff00]/70">
              SESIÓN FINALIZADA
            </p>
            <h2 className="mt-2 text-xl font-semibold">{selected.routine}</h2>
            <p className="mt-1 text-sm text-white/40">
              {selected.date &&
                new Date(selected.date).toLocaleDateString("es-AR")}{" "}
              · {duration(selected.durationSeconds)} ·{" "}
              {selected.volume.toLocaleString("es-AR")} kg
            </p>
            <div className="mt-5 space-y-3">
              {selected.exercises.map((exercise) => (
                <article
                  key={`${selected.id}-${exercise.name}`}
                  className="rounded-xl bg-black/20 p-3"
                >
                  <p className="font-semibold">{exercise.name}</p>
                  <p className="mt-1 text-xs text-white/40">
                    {exercise.sets
                      .map(
                        (set) => `${set.weight ?? "—"} kg × ${set.reps ?? "—"}`,
                      )
                      .join(" · ")}
                  </p>
                </article>
              ))}
            </div>
            {selected.notes && (
              <p className="mt-4 rounded-xl border border-white/10 p-3 text-sm text-white/65">
                {selected.notes}
              </p>
            )}
            {selected.emotionalRating && (
              <p className="mt-3 text-xs text-white/45">
                Cómo estuvo: {selected.emotionalRating}/5
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
