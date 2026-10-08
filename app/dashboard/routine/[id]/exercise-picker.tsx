"use client";

import { Plus, Search, X } from "lucide-react";
import { useState } from "react";
import { exerciseOptions, muscleGroups, type ExerciseOption } from "@/lib/exercise-catalog";

export default function ExercisePicker({
  title,
  onSelect,
  onClose,
}: {
  title: string;
  onSelect: (exercise: ExerciseOption) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [muscle, setMuscle] = useState("all");
  const normalized = query.trim().toLocaleLowerCase("es");
  const exercises = exerciseOptions.filter(
    (exercise) =>
      (muscle === "all" || exercise.muscleId === muscle) &&
      (!normalized ||
        exercise.name.toLocaleLowerCase("es").includes(normalized) ||
        exercise.muscle.toLocaleLowerCase("es").includes(normalized)),
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-end bg-black/70 p-0 sm:items-center sm:justify-center sm:p-6"
    >
      <section className="max-h-[88dvh] w-full overflow-hidden rounded-t-[28px] border border-white/10 bg-[#10110e] shadow-2xl sm:max-w-xl sm:rounded-[28px]">
        <header className="flex items-center justify-between border-b border-white/[.07] p-4">
          <div>
            <p className="text-sm font-semibold">{title}</p>
            <p className="mt-1 text-xs text-white/40">No modifica la rutina original.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-11 w-11 place-items-center rounded-xl text-white/65 hover:bg-white/10"
            aria-label="Cerrar selector"
          >
            <X size={19} />
          </button>
        </header>
        <div className="p-4">
          <label className="relative block">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/35"
            />
            <input
              autoFocus
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="input pl-10"
              placeholder="Buscar ejercicio o músculo"
            />
          </label>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {[
              { id: "all", name: "Todos" },
              ...muscleGroups.map((group) => ({ id: group.id, name: group.name })),
            ].map((group) => (
              <button
                key={group.id}
                type="button"
                onClick={() => setMuscle(group.id)}
                className={`shrink-0 rounded-full px-3 py-2 text-xs font-semibold ${muscle === group.id ? "bg-[#b7ff00] text-black" : "bg-white/[.06] text-white/55"}`}
              >
                {group.name}
              </button>
            ))}
          </div>
        </div>
        <div className="max-h-[52dvh] overflow-y-auto px-4 pb-5">
          {exercises.length ? (
            exercises.map((exercise) => (
              <button
                key={exercise.id}
                type="button"
                onClick={() => onSelect(exercise)}
                className="flex min-h-14 w-full items-center justify-between gap-3 border-b border-white/[.07] py-3 text-left"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{exercise.name}</span>
                  <span className="mt-1 block text-xs text-white/40">{exercise.muscle}</span>
                </span>
                <Plus size={17} className="shrink-0 text-[#b7ff00]" />
              </button>
            ))
          ) : (
            <p className="py-10 text-center text-sm text-white/40">
              No encontramos ejercicios con esos filtros.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
