"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { muscleGroups, type ExerciseOption } from "@/lib/exercise-catalog";

export function CustomExerciseForm({
  onAdd,
  compact = false,
}: {
  onAdd: (exercise: ExerciseOption) => void;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [muscleId, setMuscleId] = useState("");
  const [error, setError] = useState("");

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedName = name.trim();
    const group = muscleId === "general"
      ? { id: "general", name: "Otro / general" }
      : muscleGroups.find((item) => item.id === muscleId);
    if (!normalizedName || !group) {
      setError("Escribí el nombre y elegí un grupo muscular.");
      return;
    }
    onAdd({
      id: `custom-${globalThis.crypto.randomUUID()}`,
      name: normalizedName,
      muscle: group.name,
      muscleId: group.id,
      category: "uniarticulares",
      equipment: [],
      isCustom: true,
    });
    setName("");
    setMuscleId("");
    setError("");
    setOpen(false);
  };

  return (
    <section className={`rounded-2xl border border-dashed border-[#b7ff00]/25 bg-[#b7ff00]/[.025] ${compact ? "p-3" : "p-4"}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">¿No encontrás el ejercicio?</p>
          {!compact && <p className="mt-1 text-xs text-white/40">Agregalo a esta rutina con su grupo muscular.</p>}
        </div>
        {!open && (
          <button type="button" onClick={() => setOpen(true)} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#b7ff00]/25 px-3 py-2 text-xs font-bold text-[#d7ff78] hover:bg-[#b7ff00]/[.07]">
            <Plus size={15} /> Crear ejercicio
          </button>
        )}
      </div>
      {open && (
        <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,.8fr)_auto] sm:items-end">
          <label className="block text-xs font-medium text-white/55">
            Nombre del ejercicio
            <input autoFocus value={name} onChange={(event) => setName(event.target.value)} maxLength={100} required className="input mt-2" placeholder="Ej. Press landmine" />
          </label>
          <label className="block text-xs font-medium text-white/55">
            Grupo muscular
            <select value={muscleId} onChange={(event) => setMuscleId(event.target.value)} required className="input mt-2">
              <option value="" disabled>Elegí un grupo</option>
              {muscleGroups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
              <option value="general">Otro / general</option>
            </select>
          </label>
          <div className="flex gap-2">
            <button type="submit" className="min-h-10 flex-1 rounded-xl bg-[#b7ff00] px-4 py-2 text-xs font-bold text-black hover:bg-[#cbff55] sm:flex-none">Agregar</button>
            <button type="button" onClick={() => { setOpen(false); setError(""); }} className="min-h-10 rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-white/55 hover:bg-white/[.05]">Cancelar</button>
          </div>
          {error && <p role="alert" className="text-xs text-red-200 sm:col-span-3">{error}</p>}
        </form>
      )}
    </section>
  );
}
