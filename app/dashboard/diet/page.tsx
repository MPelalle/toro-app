"use client";

import Link from "next/link";
import { Apple, ArrowRight, Flame, Plus, Scale, Target } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { dietRequest, Diet, goalLabels, today } from "@/lib/diet";

export default function DietPage() {
  const [diets, setDiets] = useState<Diet[]>([]);
  useEffect(() => { dietRequest<Diet[]>("/api/diets").then(setDiets).catch(() => setDiets([])); }, []);
  const active = diets.find((diet) => diet.active) ?? diets[0];
  const log = active?.dailyLogs.find((item) => item.date === today());
  const completed = log?.completedMeals.length ?? 0;
  const adherence = active ? Math.round((completed / active.meals.length) * 100) : 0;
  const latestWeight = active?.weightHistory.at(-1)?.weight;
  const weeklyChange = useMemo(() => {
    if (!active || active.weightHistory.length < 2) return null;
    const history = active.weightHistory;
    return history[history.length - 1].weight - history[history.length - 2].weight;
  }, [active]);

  return <main className="relative min-h-dvh overflow-hidden bg-[#090a08] px-4 pb-36 pt-28 text-white sm:px-8"><div className="pointer-events-none absolute -right-16 top-20 h-72 w-72 rounded-full bg-[#b7ff00]/[.07] blur-3xl toro-breathe"/><div className="pointer-events-none absolute -left-24 top-[30rem] h-64 w-64 rounded-full bg-sky-500/[.08] blur-3xl toro-breathe-reverse"/><div className="relative mx-auto max-w-5xl">
    <header className="flex items-end justify-between gap-4"><div><p className="text-[10px] font-bold tracking-[.22em] text-[#b7ff00]/70">NUTRICIÓN</p><h1 className="mt-2 text-4xl font-semibold tracking-[-.06em] sm:text-5xl">Tus dietas</h1><p className="mt-3 text-sm text-white/35">Planificá, registrá y ajustá tu alimentación.</p></div><Link href="/dashboard/diet/new" className="flex shrink-0 items-center gap-2 rounded-2xl bg-[#b7ff00] px-4 py-3 text-sm font-bold text-black"><Plus size={17}/> Nueva dieta</Link></header>
    <div className="mt-5"><Link href="/dashboard/community/diets/new" className="inline-flex items-center gap-2 rounded-xl border border-[#b7ff00]/30 px-4 py-3 text-sm font-semibold text-[#b7ff00]"><Target size={16}/> Asignar una dieta a alumnos</Link></div>
    {!active ? <Empty /> : <>
      <section className="mt-8 grid gap-3 sm:grid-cols-3"><Metric icon={<Flame size={18}/>} label="Objetivo diario" value={`${active.calories.toLocaleString("es-AR")} kcal`} detail={`${active.protein} g proteína`}/><Metric icon={<Target size={18}/>} label="Cumplimiento hoy" value={`${adherence}%`} detail={`${completed} de ${active.meals.length} comidas registradas`}/><Metric icon={<Scale size={18}/>} label="Peso registrado" value={latestWeight ? `${latestWeight} kg` : "Sin registro"} detail={weeklyChange === null ? "Registrá tu primer peso" : `${weeklyChange > 0 ? "+" : ""}${weeklyChange.toFixed(1)} kg vs. último registro`}/></section>
      <section className="mt-6 overflow-hidden rounded-[28px] border border-[#b7ff00]/15 bg-[#10110e] p-5 sm:p-7"><div className="flex flex-wrap items-start justify-between gap-5"><div><p className="text-[10px] font-bold tracking-[.2em] text-[#b7ff00]/70">PLAN ACTIVO</p><h2 className="mt-2 text-2xl font-semibold tracking-tight">{active.name}</h2><p className="mt-2 text-sm text-white/40">{goalLabels[active.goal]} · Gasto estimado: {active.tdee.toLocaleString("es-AR")} kcal</p></div><Link href={`/dashboard/diet/${active.id}`} className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-white/70 hover:border-[#b7ff00]/35 hover:text-[#b7ff00]">Ver seguimiento <ArrowRight size={16}/></Link></div>
        <div className="mt-7 grid gap-3 sm:grid-cols-4"><Macro label="Proteínas" value={`${active.protein} g`} color="bg-[#b7ff00]"/><Macro label="Carbohidratos" value={`${active.carbs} g`} color="bg-sky-400"/><Macro label="Grasas" value={`${active.fats} g`} color="bg-amber-300"/><Macro label="Comidas" value={`${active.meals.length} por día`} color="bg-fuchsia-400"/></div>
      </section>
      {diets.length > 1 && <section className="mt-6"><p className="mb-3 text-xs font-bold uppercase tracking-[.18em] text-white/35">Otros planes</p><div className="grid gap-3 sm:grid-cols-2">{diets.filter((diet) => diet.id !== active.id).map((diet) => <Link key={diet.id} href={`/dashboard/diet/${diet.id}`} className="rounded-2xl border border-white/[.07] bg-white/[.025] p-4 hover:border-white/15"><p className="font-semibold">{diet.name}</p><p className="mt-1 text-xs text-white/35">{diet.calories} kcal · {goalLabels[diet.goal]}</p></Link>)}</div></section>}
    </>}
  </div></main>;
}
function Empty() { return <section className="mt-8 rounded-[30px] border border-dashed border-white/10 bg-white/[.02] px-6 py-14 text-center"><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#b7ff00]/10 text-[#b7ff00]"><Apple size={25}/></div><h2 className="mt-5 text-xl font-semibold">Todavía no tenés un plan.</h2><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-white/35">Completá tus datos y obtené una estimación de calorías, macros y comidas para tu objetivo.</p><Link href="/dashboard/diet/new" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#b7ff00] px-4 py-3 text-sm font-bold text-black"><Plus size={16}/> Crear mi dieta</Link></section>; }
function Metric({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: string; detail: string }) { return <article className="rounded-2xl border border-white/[.07] bg-white/[.025] p-4"><div className="text-[#b7ff00]">{icon}</div><p className="mt-5 text-xl font-semibold">{value}</p><p className="mt-1 text-xs text-white/35">{label}</p><p className="mt-3 border-t border-white/[.06] pt-3 text-[11px] text-white/25">{detail}</p></article>; }
function Macro({ label, value, color }: { label: string; value: string; color: string }) { return <div className="rounded-2xl bg-black/20 p-4"><span className={`block h-1 w-8 rounded-full ${color}`}/><p className="mt-4 text-lg font-semibold">{value}</p><p className="mt-1 text-xs text-white/35">{label}</p></div>; }
