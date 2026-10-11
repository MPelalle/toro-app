"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Check, ChevronRight, MessageSquare, Pencil, Plus, Scale, ShoppingCart, Package, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ImmersiveDietPanel } from "@/components/diet/ImmersiveDietPanel";
import { DailyDietLog, dietRequest, Diet, goalLabels, today } from "@/lib/diet";
import type { DietPantryItem, DietShoppingItem } from "@/lib/diet-types";
import { shoppingAfterStock, weeklyShopping } from "@/lib/diet-pantry";

const weekdays = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
function weekdayIndex(date: string) { return (new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7; }

export default function DietDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [diet, setDiet] = useState<Diet | null>(null);
  const [weight, setWeight] = useState("");
  const [note, setNote] = useState("");
  const [selectedDay, setSelectedDay] = useState(weekdayIndex(today()));
  const [pantry, setPantry] = useState<DietPantryItem[]>([]);
  const [shopping, setShopping] = useState<DietShoppingItem[]>([]);
  const [pantryName, setPantryName] = useState("");
  const [pantryQuantity, setPantryQuantity] = useState("");
  const [pantryUnit, setPantryUnit] = useState("");
  const [editingPantryId, setEditingPantryId] = useState<string | null>(null);
  const [pantryError, setPantryError] = useState("");
  const dietId = diet?.id;
  const refreshDiet = useCallback(async () => {
    const next = await dietRequest<Diet>(`/api/diets/${id}`);
    setDiet(next);
  }, [id]);

  useEffect(() => { let current = true; void dietRequest<Diet>(`/api/diets/${id}`).then((next) => { if (current) setDiet(next); }).catch(() => router.replace("/dashboard/diet")); return () => { current = false; }; }, [id, router]);
  useEffect(() => { if (!dietId) return; void dietRequest<{ pantry: DietPantryItem[]; shopping: DietShoppingItem[] }>(`/api/diets/${dietId}/pantry`).then((result) => { setPantry(result.pantry); setShopping(result.shopping); }).catch((error: unknown) => setPantryError(error instanceof Error ? error.message : "No se pudo cargar la alacena.")); }, [dietId]);
  const log = useMemo(() => diet?.dailyLogs.find((item) => item.date === today()) ?? { date: today(), completedMeals: [], comment: "" }, [diet]);

  const updateLog = async (nextLog: DailyDietLog) => {
    if (!diet) return;
    setDiet({ ...diet, dailyLogs: [...diet.dailyLogs.filter((item) => item.date !== nextLog.date), nextLog] });
    try { await dietRequest(`/api/diets/${diet.id}/log`, { method: "POST", body: JSON.stringify(nextLog) }); }
    catch { await refreshDiet(); }
  };
  const toggleMeal = (mealId: string) => {
    if (!diet) return;
    const completedMeals = log.completedMeals.includes(mealId) ? log.completedMeals.filter((item) => item !== mealId) : [...log.completedMeals, mealId];
    void updateLog({ ...log, completedMeals });
  };
  const addWeight = async () => {
    if (!diet || !Number(weight)) return;
    try {
      const entry = await dietRequest<{ id: string; date: string; weight: number; note?: string }>(`/api/diets/${diet.id}/weight`, { method: "POST", body: JSON.stringify({ date: today(), weight: Number(weight), note }) });
      setDiet({ ...diet, weightHistory: [...diet.weightHistory, entry] });
      setWeight(""); setNote("");
    } catch { /* preserve the form for retry */ }
  };

  if (!diet) return null;
  const completed = log.completedMeals.length;
  const doneKcal = diet.meals.filter((meal) => log.completedMeals.includes(meal.id)).reduce((sum, meal) => sum + meal.kcal, 0);
  const entries = [...diet.weightHistory].reverse();
  const todaysMeals = diet.meals.filter((meal) => (meal.dayOfWeek ?? 0) === selectedDay);
  const canCheckDay = selectedDay === weekdayIndex(today());
  const changePantry = async (kind: "pantry" | "shopping", items: Array<DietPantryItem | DietShoppingItem>) => {
    setPantryError("");
    try {
      const result = await dietRequest<{ pantry: DietPantryItem[]; shopping: DietShoppingItem[] }>(`/api/diets/${diet.id}/pantry`, { method: "PUT", body: JSON.stringify({ [kind]: items }) });
      setPantry(result.pantry); setShopping(result.shopping);
    } catch (error) { setPantryError(error instanceof Error ? error.message : "No se pudo guardar la alacena."); }
  };
  const addPantryItem = () => {
    const name = pantryName.trim(); const quantity = Number(pantryQuantity);
    if (!name || !Number.isFinite(quantity) || quantity < 0) { setPantryError("Ingresá un alimento y una cantidad válida."); return; }
    const item = { id: editingPantryId || crypto.randomUUID(), name, quantity, unit: pantryUnit.trim() };
    const next = editingPantryId ? pantry.map((row) => row.id === editingPantryId ? item : row) : [...pantry, item];
    void changePantry("pantry", next);
    setPantryName(""); setPantryQuantity(""); setPantryUnit("");
    setEditingPantryId(null);
  };
  const generateShopping = () => {
    const generated = shoppingAfterStock(weeklyShopping(diet.meals), pantry, shopping);
    void changePantry("shopping", generated);
  };
  const weeklyRecords = new Map<string, { id: string; weekStart: string; weight: number; note: string; feeling: string }>();
  for (const entry of diet.weightHistory) {
    const date = new Date(`${entry.date}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
    const weekStart = date.toISOString().slice(0, 10);
    const previous = weeklyRecords.get(weekStart);
    if (!previous || entry.date >= previous.weekStart) weeklyRecords.set(weekStart, {
      id: previous?.id || entry.id, weekStart, weight: entry.weight, note: entry.note || previous?.note || "", feeling: previous?.feeling || "",
    });
  }
  for (const entry of diet.weeklyCheckIns) weeklyRecords.set(entry.weekStart, {
    id: entry.id, weekStart: entry.weekStart, weight: entry.weight, note: entry.note || "", feeling: entry.feeling,
  });
  const weeklyWeight = [...weeklyRecords.values()].sort((a, b) => b.weekStart.localeCompare(a.weekStart));

  return <main className="min-h-dvh bg-[#090a08] px-4 pb-36 pt-28 text-white sm:px-8"><div className="mx-auto max-w-5xl">
    <Link href="/dashboard/diet" className="inline-flex items-center gap-2 text-xs text-white/45 hover:text-white"><ArrowLeft size={15}/> Todas las dietas</Link>
    <header className="mt-8 flex flex-wrap items-end justify-between gap-4"><div><p className="text-[10px] font-bold tracking-[.22em] text-[#b7ff00]/70">PLAN ACTIVO · {goalLabels[diet.goal].toUpperCase()}</p><h1 className="mt-2 text-3xl font-semibold tracking-[-.05em] sm:text-4xl">{diet.name}</h1><p className="mt-2 text-sm text-white/40">{diet.calories.toLocaleString("es-AR")} kcal al día · {diet.mealsPerDay} comidas diarias · menú semanal · Gasto estimado: {diet.tdee} kcal</p></div>{diet.canEdit && <Link href={`/dashboard/diet/${diet.id}/edit`} className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm text-white/65 hover:bg-white/5"><Pencil size={15}/> Editar dieta</Link>}</header>
    <section className="mt-7 grid gap-3 sm:grid-cols-3"><Small value={`${doneKcal.toLocaleString("es-AR")} / ${diet.calories.toLocaleString("es-AR")}`} label="kcal registradas hoy"/><Small value={`${completed}/${todaysMeals.length}`} label="comidas cumplidas hoy"/><Small value={`${todaysMeals.length ? Math.round((completed / todaysMeals.length) * 100) : 0}%`} label="adherencia del día"/></section>
    <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_.7fr]">
      <section className="rounded-[28px] border border-white/[.08] bg-[#10110e] p-4 sm:p-6"><div><p className="text-lg font-semibold">Plan semanal</p><p className="mt-1 text-xs text-white/35">{canCheckDay ? "Marcá cada comida al completarla y dejá una nota diaria." : "Podés consultar las comidas programadas de cada día; el registro se habilita el día correspondiente."}</p></div><div className="mt-4 flex gap-2 overflow-x-auto pb-2">{weekdays.map((day, index) => { const count = diet.meals.filter((meal) => (meal.dayOfWeek ?? 0) === index).length; return <button key={day} onClick={() => setSelectedDay(index)} className={`shrink-0 rounded-xl px-3 py-2.5 text-xs font-semibold ${selectedDay === index ? "bg-[#b7ff00] text-black" : "border border-white/10 text-white/55"}`}>{day}<span className="ml-1 opacity-60">{count}</span></button>; })}</div><p className="mt-4 text-sm font-semibold">Comidas del {weekdays[selectedDay].toLocaleLowerCase("es")}</p><div className="mt-3 space-y-3">{todaysMeals.map((meal, index) => { const done = log.completedMeals.includes(meal.id); return <article key={meal.id} className={`rounded-2xl border p-4 transition ${done ? "border-[#b7ff00]/25 bg-[#b7ff00]/[.055]" : "border-white/[.07] bg-black/15"}`}><div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2"><span className="text-[10px] font-bold text-[#b7ff00]/70">{String(index + 1).padStart(2, "0")}</span><p className="font-semibold">{meal.name}</p><span className="text-xs text-white/30">{meal.time}</span></div><p className="mt-2 text-xs text-white/45">{meal.foods.join(" · ")}</p><p className="mt-2 text-[11px] text-white/30">{meal.kcal} kcal · P {meal.protein}g · C {meal.carbs}g · G {meal.fats}g</p></div><button disabled={!canCheckDay} onClick={() => toggleMeal(meal.id)} className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl border transition disabled:cursor-not-allowed disabled:opacity-30 ${done ? "border-[#b7ff00] bg-[#b7ff00] text-black" : "border-white/10 text-white/35 hover:border-[#b7ff00]/40"}`} aria-label={`Marcar ${meal.name}`}><Check size={17}/></button></div></article>; })}</div><div className="mt-5 border-t border-white/[.07] pt-5"><label className="relative block"><MessageSquare size={14} className="absolute left-3 top-3 text-white/30"/><input className="input pl-8" value={log.comment} onChange={(event) => updateLog({ ...log, comment: event.target.value })} placeholder="¿Cómo te sentiste hoy? Dejá una nota..."/></label></div></section>
      <aside className="space-y-5">{diet.immersiveMode ? <ImmersiveDietPanel diet={diet} onRefresh={refreshDiet}/> : <WeightHistory entries={entries} weight={weight} note={note} setWeight={setWeight} setNote={setNote} onSave={addWeight}/>}<section className="rounded-[24px] border border-[#b7ff00]/12 bg-[#b7ff00]/[.035] p-5"><p className="text-[10px] font-bold tracking-[.18em] text-[#b7ff00]/70">MACROS DIARIOS</p><div className="mt-4 grid grid-cols-3 gap-2"><Small value={`${diet.protein}g`} label="Proteína"/><Small value={`${diet.carbs}g`} label="Carbos"/><Small value={`${diet.fats}g`} label="Grasas"/></div></section></aside>
    </div>
    <section className="mt-6 grid gap-5 lg:grid-cols-2">
      <section className="rounded-[28px] border border-white/[.08] bg-[#10110e] p-5"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><ShoppingCart size={18} className="text-[#b7ff00]"/><div><p className="font-semibold">Alacena · lista semanal</p><p className="mt-1 text-xs text-white/35">Cantidades calculadas para cubrir los siete días.</p></div></div><button onClick={generateShopping} className="rounded-xl border border-[#b7ff00]/30 px-3 py-2 text-xs font-semibold text-[#b7ff00]">Generar lista</button></div><div className="mt-4 space-y-2">{shopping.map((item) => <label key={`${item.name}:${item.unit}`} className="flex items-center gap-3 rounded-xl bg-black/15 px-3 py-2.5 text-sm"><input type="checkbox" checked={item.checked} onChange={(event) => void changePantry("shopping", shopping.map((row) => row.name === item.name && row.unit === item.unit ? { ...row, checked: event.target.checked } : row))} className="accent-[#b7ff00]"/><span className={`flex-1 ${item.checked ? "text-white/35 line-through" : "text-white/75"}`}>{item.name}</span><span className="text-xs text-white/45">{item.quantity} {item.unit}</span></label>)}{!shopping.length && <p className="rounded-xl bg-black/15 p-4 text-xs text-white/35">{pantry.length ? "Tu stock alcanza para cubrir las compras de esta semana." : "Generá la lista para ver qué comprar para tu semana."}</p>}</div></section>
      <section className="rounded-[28px] border border-white/[.08] bg-[#10110e] p-5"><div className="flex items-center gap-2"><Package size={18} className="text-[#b7ff00]"/><div><p className="font-semibold">Mi stock (opcional)</p><p className="mt-1 text-xs text-white/35">Cargá lo que ya tenés para descontarlo de la lista.</p></div></div><div className="mt-4 grid grid-cols-2 gap-2"><input className="input col-span-2" value={pantryName} onChange={(event) => setPantryName(event.target.value)} placeholder="Alimento · ej. Pollo"/><input className="input" type="number" min="0" step="0.1" value={pantryQuantity} onChange={(event) => setPantryQuantity(event.target.value)} placeholder="Cantidad"/><input className="input" value={pantryUnit} onChange={(event) => setPantryUnit(event.target.value)} placeholder="Unidad · g, unidades"/><button onClick={addPantryItem} className="col-span-2 rounded-xl bg-[#b7ff00] px-4 py-3 text-xs font-bold text-black">{editingPantryId ? "Guardar cambios" : "Agregar a mi stock"}</button></div><div className="mt-4 space-y-2">{pantry.map((item) => <div key={item.id} className="flex items-center gap-3 rounded-xl bg-black/15 px-3 py-2.5 text-sm"><span className="flex-1 text-white/75">{item.name}</span><span className="text-xs text-white/45">{item.quantity} {item.unit}</span><button aria-label={`Editar ${item.name} del stock`} onClick={() => { setEditingPantryId(item.id); setPantryName(item.name); setPantryQuantity(String(item.quantity)); setPantryUnit(item.unit); }} className="text-white/35 hover:text-[#b7ff00]"><Pencil size={15}/></button><button aria-label={`Eliminar ${item.name} del stock`} onClick={() => void changePantry("pantry", pantry.filter((row) => row.id !== item.id))} className="text-white/35 hover:text-red-300"><Trash2 size={15}/></button></div>)}{!pantry.length && <p className="text-xs text-white/30">Tu stock es opcional; agregá los productos que ya tenés.</p>}</div>{pantryError && <p role="alert" className="mt-3 text-xs text-red-300">{pantryError}</p>}</section>
    </section>
    <section className="mt-6 rounded-[28px] border border-white/[.08] bg-[#10110e] p-5"><p className="font-semibold">Anotaciones de la dieta</p>{diet.canEdit ? <><textarea className="input mt-3 min-h-24 resize-y" value={diet.notes || ""} onChange={(event) => setDiet({ ...diet, notes: event.target.value })} maxLength={5000} placeholder="Preferencias, indicaciones o recordatorios..."/><button onClick={() => void dietRequest(`/api/diets/${diet.id}`, { method: "PUT", body: JSON.stringify({ name: diet.name, goal: diet.goal, active: diet.active, notes: diet.notes || "", meals: diet.meals }) }).then(refreshDiet).catch((error: unknown) => setPantryError(error instanceof Error ? error.message : "No se pudieron guardar las anotaciones."))} className="mt-3 rounded-xl border border-white/10 px-4 py-2.5 text-xs font-semibold text-white/70">Guardar anotaciones</button></> : <p className="mt-3 whitespace-pre-wrap text-sm text-white/60">{diet.notes || "Sin anotaciones."}</p>}{pantryError && <p role="alert" className="mt-2 text-xs text-red-300">{pantryError}</p>}</section>
    <section className="mt-6 rounded-[28px] border border-white/[.08] bg-[#10110e] p-5"><p className="font-semibold">Análisis semanal · peso esperado vs. real</p><p className="mt-1 text-xs text-white/35">Compará el cambio real con la tendencia estimada de 0,5 % del peso semanal hacia tu objetivo. Agregá comentarios en cada pesaje.</p><div className="mt-4 space-y-2">{weeklyWeight.map((entry, index) => { const previous = weeklyWeight[index + 1]; const actualDelta = previous ? entry.weight - previous.weight : null; const expectedDelta = previous ? (diet.goal === "lose" ? -1 : diet.goal === "gain" ? 1 : 0) * Math.max(0.1, previous.weight * 0.005) : null; return <div key={entry.id} className="grid gap-2 rounded-xl bg-black/15 p-4 sm:grid-cols-4"><p className="text-xs text-white/65">Semana del {new Date(`${entry.weekStart}T12:00:00`).toLocaleDateString("es-AR")}</p><p className="text-xs text-white/65">Real: {entry.weight} kg{actualDelta === null ? "" : ` (${actualDelta > 0 ? "+" : ""}${actualDelta.toFixed(1)})`}</p><p className="text-xs text-white/45">Esperado: {previous && expectedDelta !== null ? `${(previous.weight + expectedDelta).toFixed(1)} kg (${expectedDelta > 0 ? "+" : ""}${expectedDelta.toFixed(1)})` : "Base"}</p><p className="text-xs text-white/35">{entry.note || entry.feeling}</p></div>; })}{!weeklyWeight.length && <p className="mt-3 text-xs text-white/35">El análisis se completa al registrar tu revisión semanal.</p>}</div></section>
  </div></main>;
}

function WeightHistory({ entries, weight, note, setWeight, setNote, onSave }: { entries: Diet["weightHistory"]; weight: string; note: string; setWeight: (value: string) => void; setNote: (value: string) => void; onSave: () => void }) {
  return <section className="rounded-[28px] border border-white/[.08] bg-[#10110e] p-5"><div className="flex items-center gap-2"><Scale size={17} className="text-[#b7ff00]"/><p className="font-semibold">Evolución de peso</p></div><p className="mt-2 text-xs text-white/35">Registrá un pesaje cuando lo necesites.</p><div className="mt-4 grid gap-2"><input className="input" type="number" step="0.1" value={weight} onChange={(event) => setWeight(event.target.value)} placeholder="Peso actual en kg"/><input className="input" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Comentario opcional"/><button onClick={onSave} className="flex items-center justify-center gap-2 rounded-xl bg-[#b7ff00] px-4 py-3 text-xs font-bold text-black"><Plus size={15}/> Registrar pesaje</button></div><div className="mt-5 space-y-2">{entries.slice(0, 6).map((entry, index) => <div key={entry.id} className="flex items-center justify-between rounded-xl bg-black/15 px-3 py-2.5"><div><p className="text-xs font-semibold">{entry.weight} kg</p><p className="mt-0.5 text-[10px] text-white/30">{new Date(`${entry.date}T12:00:00`).toLocaleDateString("es-AR")}{entry.note ? ` · ${entry.note}` : ""}</p></div>{index < entries.length - 1 && <ChevronRight size={14} className="text-white/20"/>}</div>)}</div></section>;
}
function Small({ value, label }: { value: string; label: string }) { return <div className="rounded-2xl border border-white/[.07] bg-white/[.025] p-4"><p className="text-lg font-semibold">{value}</p><p className="mt-1 text-[11px] text-white/35">{label}</p></div>; }
