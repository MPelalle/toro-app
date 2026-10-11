"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { dietRequest, Diet, DietGoal, goalLabels } from "@/lib/diet";

const weekdays = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

export default function EditDietPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [diet, setDiet] = useState<Diet | null>(null);
  const [activeDay, setActiveDay] = useState(0);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    dietRequest<Diet>(`/api/diets/${id}`).then(setDiet).catch(() => router.replace("/dashboard/diet"));
  }, [id, router]);

  const save = async () => {
    if (!diet) return;
    setSaving(true);
    setError("");
    try {
      await dietRequest(`/api/diets/${id}`, {
        method: "PUT",
        body: JSON.stringify({ name: diet.name, goal: diet.goal, active: diet.active, notes: diet.notes || "", meals: diet.meals }),
      });
      router.push(`/dashboard/diet/${id}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudieron guardar los cambios.");
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!diet || !window.confirm("¿Eliminar esta dieta y todo su seguimiento?")) return;
    try {
      await dietRequest(`/api/diets/${id}`, { method: "DELETE" });
      router.push("/dashboard/diet");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo eliminar la dieta.");
    }
  };

  if (!diet) return null;
  if (!diet.canEdit) return <main className="min-h-dvh bg-[#090a08] px-4 pb-36 pt-28 text-white"><div className="mx-auto max-w-2xl"><p className="text-sm text-white/55">Solo quien creó la dieta puede editarla.</p><Link href={`/dashboard/diet/${id}`} className="mt-4 inline-flex items-center gap-2 text-xs text-[#b7ff00]"><ArrowLeft size={15}/> Volver a la dieta</Link></div></main>;

  const dayMeals = diet.meals.filter((meal) => (meal.dayOfWeek ?? 0) === activeDay);
  return <main className="min-h-dvh bg-[#090a08] px-4 pb-36 pt-28 text-white sm:px-8"><div className="mx-auto max-w-3xl">
    <Link href={`/dashboard/diet/${id}`} className="inline-flex items-center gap-2 text-xs text-white/45 hover:text-white"><ArrowLeft size={15}/> Volver a la dieta</Link>
    <header className="mt-8"><p className="text-[10px] font-bold tracking-[.22em] text-[#b7ff00]/70">EDICIÓN</p><h1 className="mt-2 text-3xl font-semibold tracking-[-.05em]">Ajustá tu plan.</h1></header>
    <section className="mt-7 rounded-[28px] border border-white/[.08] bg-[#10110e] p-5 sm:p-7">
      <label className="block"><span className="mb-2 block text-xs text-white/55">Nombre del plan</span><input className="input" value={diet.name} onChange={(event) => setDiet({ ...diet, name: event.target.value })}/></label>
      <label className="mt-5 block"><span className="mb-2 block text-xs text-white/55">Objetivo</span><select className="input" value={diet.goal} onChange={(event) => setDiet({ ...diet, goal: event.target.value as DietGoal })}>{(Object.keys(goalLabels) as DietGoal[]).map((goal) => <option key={goal} value={goal}>{goalLabels[goal]}</option>)}</select></label>
      <label className="mt-5 block"><span className="mb-2 block text-xs text-white/55">Estado</span><select className="input" value={diet.active ? "active" : "paused"} onChange={(event) => setDiet({ ...diet, active: event.target.value === "active" })}><option value="active">Plan activo</option><option value="paused">Plan pausado</option></select></label>
      <div className="mt-7 border-t border-white/[.07] pt-6"><p className="font-semibold">Menú semanal</p><p className="mt-1 text-xs text-white/35">Editá el nombre, horario y alimentos de cada comida.</p>
        <div className="mt-4 flex gap-2 overflow-x-auto pb-2">{weekdays.map((day, index) => <button key={day} onClick={() => setActiveDay(index)} className={`shrink-0 rounded-xl px-3 py-2.5 text-xs font-semibold ${activeDay === index ? "bg-[#b7ff00] text-black" : "border border-white/10 text-white/55"}`}>{day}</button>)}</div>
        <div className="mt-3 space-y-3">{dayMeals.map((meal) => <article key={meal.id} className="rounded-2xl border border-white/[.07] bg-black/15 p-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_8rem]"><label><span className="mb-1.5 block text-[11px] text-white/40">Comida</span><input className="input" value={meal.name} onChange={(event) => setDiet({ ...diet, meals: diet.meals.map((item) => item.id === meal.id ? { ...item, name: event.target.value } : item) })}/></label><label><span className="mb-1.5 block text-[11px] text-white/40">Horario</span><input className="input" type="time" value={meal.time} onChange={(event) => setDiet({ ...diet, meals: diet.meals.map((item) => item.id === meal.id ? { ...item, time: event.target.value } : item) })}/></label></div>
          <label className="mt-3 block"><span className="mb-1.5 block text-[11px] text-white/40">Alimentos (uno por línea)</span><textarea className="input min-h-20 resize-y" value={meal.foods.join("\n")} onChange={(event) => setDiet({ ...diet, meals: diet.meals.map((item) => item.id === meal.id ? { ...item, foods: event.target.value.split("\n").filter((food) => food.trim()).map((food) => food.trim()) } : item) })}/></label>
        </article>)}</div>
      </div>
      <label className="mt-6 block border-t border-white/[.07] pt-6"><span className="mb-2 block text-xs text-white/55">Anotaciones de la dieta</span><textarea className="input min-h-24 resize-y" maxLength={5000} value={diet.notes || ""} onChange={(event) => setDiet({ ...diet, notes: event.target.value })} placeholder="Preferencias, indicaciones o recordatorios..."/></label>
      <div className="mt-7 rounded-2xl border border-white/[.06] bg-black/15 p-4 text-xs leading-5 text-white/40">Para recalcular calorías o macros según nuevos datos, creá un plan nuevo. Así se preserva el historial de esta dieta.</div>
      {error && <p role="alert" className="mt-4 text-sm text-red-300">{error}</p>}
      <div className="mt-8 flex items-center justify-between border-t border-white/[.07] pt-5"><button onClick={remove} className="flex items-center gap-2 rounded-xl px-3 py-3 text-sm text-red-300/75 hover:bg-red-400/10"><Trash2 size={16}/> Eliminar</button><button disabled={saving} onClick={save} className="flex items-center gap-2 rounded-xl bg-[#b7ff00] px-5 py-3 text-sm font-bold text-black disabled:opacity-50"><Save size={16}/> {saving ? "Guardando…" : "Guardar cambios"}</button></div>
    </section>
  </div></main>;
}
