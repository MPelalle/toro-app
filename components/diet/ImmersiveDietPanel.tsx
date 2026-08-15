"use client";

import { Activity, ArrowDown, ArrowUp, LoaderCircle, Scale, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { dietRequest, Diet } from "@/lib/diet";

const feelings = ["Excelente", "Bien", "Normal", "Baja energía", "Mucho hambre"];

function currentWeekStart() {
  const date = new Date();
  const offset = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - offset);
  return date.toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" });
}

function scoreLabel(value: number, kind: "energy" | "hunger") {
  if (kind === "energy") return ["Muy baja", "Baja", "Normal", "Buena", "Excelente"][value - 1];
  return ["Nada", "Poca", "Normal", "Alta", "Muy alta"][value - 1];
}

export function ImmersiveDietPanel({ diet, onRefresh }: { diet: Diet; onRefresh: () => Promise<void> }) {
  const [weight, setWeight] = useState(String(diet.weight));
  const [feeling, setFeeling] = useState("Normal");
  const [energy, setEnergy] = useState(3);
  const [hunger, setHunger] = useState(3);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const weekStart = currentWeekStart();
  const current = diet.weeklyCheckIns.find((item) => item.weekStart === weekStart);
  const checks = [...diet.weeklyCheckIns].reverse();
  const previous = checks.find((item) => item.weekStart !== current?.weekStart);
  const change = current && previous ? current.weight - previous.weight : null;
  const registeredDays = useMemo(() => new Set(diet.dailyLogs.filter((log) => log.date >= weekStart && log.completedMeals.length).map((log) => log.date)).size, [diet.dailyLogs, weekStart]);
  const completedMeals = useMemo(() => diet.dailyLogs.filter((log) => log.date >= weekStart).reduce((sum, log) => sum + log.completedMeals.length, 0), [diet.dailyLogs, weekStart]);
  const adherence = diet.meals.length ? Math.round((completedMeals / (diet.meals.length * 7)) * 100) : 0;

  if (!diet.immersiveMode) return null;
  const save = async () => {
    setError("");
    setSaving(true);
    try {
      await dietRequest(`/api/diets/${diet.id}/weekly-check-in`, { method: "POST", body: JSON.stringify({ weight: Number(weight), feeling, energy, hunger, note }) });
      await onRefresh();
      setNote("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo registrar la revisión.");
    } finally {
      setSaving(false);
    }
  };

  return <section className="rounded-[28px] border border-[#b7ff00]/20 bg-[#b7ff00]/[.045] p-5"><div className="flex items-start gap-3"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#b7ff00] text-black"><Sparkles size={17}/></div><div><p className="font-semibold">Seguimiento inmersivo</p><p className="mt-1 text-xs leading-5 text-white/45">Tu revisión semanal compara el progreso, cómo te sentiste y la adherencia. TORO sólo ajusta el plan cuando hay datos suficientes.</p></div></div>
    <div className="mt-5 grid grid-cols-3 gap-2"><Metric value={`${registeredDays}/7`} label="días registrados"/><Metric value={`${adherence}%`} label="adherencia semanal"/><Metric value={change === null ? "—" : `${change > 0 ? "+" : ""}${change.toFixed(1)} kg`} label="vs. semana previa"/></div>
    {current ? <div className="mt-5 rounded-2xl border border-white/[.08] bg-black/20 p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-semibold">Revisión de esta semana</p><p className="mt-1 text-xs text-white/40">{current.weight} kg · {current.feeling} · energía {current.energy}/5</p></div>{current.adjustmentKcal ? <p className="rounded-lg bg-[#b7ff00]/15 px-2 py-1 text-xs font-bold text-[#b7ff00]">{current.adjustmentKcal > 0 ? "+" : ""}{current.adjustmentKcal} kcal</p> : <p className="text-[11px] text-white/35">Sin ajuste automático</p>}</div><p className="mt-3 text-[11px] leading-5 text-white/35">{current.adjustmentKcal ? "Se ajustaron objetivos y porciones de forma gradual." : "Podés actualizar este registro si cambia cómo te sentís."}</p></div> : <><div className="mt-5 grid gap-3 sm:grid-cols-2"><label><span className="mb-1.5 block text-xs text-white/55">Peso actual (kg)</span><input className="input" type="number" min="35" max="500" step="0.1" value={weight} onChange={(event) => setWeight(event.target.value)}/></label><label><span className="mb-1.5 block text-xs text-white/55">¿Cómo te sentiste?</span><select className="input" value={feeling} onChange={(event) => setFeeling(event.target.value)}>{feelings.map((item) => <option key={item}>{item}</option>)}</select></label><Score label="Energía" icon={<Activity size={14}/>} value={energy} setValue={setEnergy} kind="energy"/><Score label="Hambre" icon={<Scale size={14}/>} value={hunger} setValue={setHunger} kind="hunger"/></div><label className="mt-3 block"><span className="mb-1.5 block text-xs text-white/55">Nota opcional</span><input className="input" maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Sueño, entrenamiento, digestión…"/></label><button disabled={saving} onClick={save} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#b7ff00] px-4 py-3 text-sm font-bold text-black disabled:opacity-55">{saving ? <LoaderCircle className="animate-spin" size={16}/> : <Sparkles size={16}/>}{saving ? "Guardando…" : "Completar revisión semanal"}</button>{error && <p className="mt-3 text-xs text-red-300">{error}</p>}</>}
    {checks.length > 0 && <div className="mt-6 border-t border-white/[.08] pt-4"><p className="text-[10px] font-bold tracking-[.16em] text-white/35">REGISTROS Y COMPARATIVAS</p><div className="mt-3 space-y-2">{checks.slice(0, 6).map((check, index) => { const prior = checks[index + 1]; const delta = prior ? check.weight - prior.weight : null; return <div key={check.id} className="flex items-center justify-between rounded-xl bg-black/15 px-3 py-2.5"><div><p className="text-xs font-semibold">{check.weight} kg · {check.feeling}</p><p className="mt-0.5 text-[10px] text-white/35">Semana del {new Date(`${check.weekStart}T12:00:00`).toLocaleDateString("es-AR")}</p></div><div className="flex items-center gap-1 text-xs text-white/55">{delta === null ? "Base" : <>{delta > 0 ? <ArrowUp size={13} className="text-amber-300"/> : <ArrowDown size={13} className="text-[#b7ff00]"/>}{delta > 0 ? "+" : ""}{delta.toFixed(1)} kg</>}</div></div>; })}</div></div>}
  </section>;
}

function Metric({ value, label }: { value: string; label: string }) { return <div className="rounded-xl bg-black/20 p-3"><p className="text-base font-semibold">{value}</p><p className="mt-1 text-[10px] leading-4 text-white/35">{label}</p></div>; }
function Score({ label, icon, value, setValue, kind }: { label: string; icon: React.ReactNode; value: number; setValue: (next: number) => void; kind: "energy" | "hunger" }) { return <div className="rounded-xl border border-white/[.08] bg-black/15 p-3"><div className="flex items-center gap-2 text-xs text-white/55">{icon}{label}</div><div className="mt-3 flex gap-1">{[1, 2, 3, 4, 5].map((item) => <button key={item} type="button" onClick={() => setValue(item)} aria-label={`${label}: ${item}`} className={`h-7 flex-1 rounded-md text-xs font-bold ${value >= item ? "bg-[#b7ff00] text-black" : "bg-white/[.07] text-white/35"}`}>{item}</button>)}</div><p className="mt-2 text-[10px] text-white/35">{scoreLabel(value, kind)}</p></div>; }
