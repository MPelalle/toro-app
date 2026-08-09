"use client";

import Link from "next/link";
import { Apple, ArrowRight, CheckCircle2, Dumbbell, Plus, TrendingUp, UsersRound } from "lucide-react";
import { useEffect, useState } from "react";
import { dietRequest, Diet, today } from "@/lib/diet";
import { getRoutinesOfflineFirst, Routine } from "@/lib/routines";
import { UserBadgeStrip } from "@/components/badges/UserBadges";
import type { UserBadge } from "@/lib/badges";

const weekdays = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const trainingDays = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

type CommunityOverview = {
  friends: Array<{ id: string; name: string; nickname: string | null; presence: "TRAINING" | "ONLINE" | "OFFLINE" }>;
  routines: Array<{ id: string; name: string; type: string; exerciseCount: number; canReview: boolean; members: Array<{ id: string; name: string }> }>;
};

function normal(value: string) { return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase(); }
function dayMatches(value: string, day: string) { return normal(value).startsWith(normal(day)); }

export default function DashboardOverview({ name, badges, habits }: { name: string; badges: UserBadge[]; habits: { active: number; completed: number } }) {
  const [diet, setDiet] = useState<Diet | null>(null);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [community, setCommunity] = useState<CommunityOverview | null>(null);

  useEffect(() => {
    void dietRequest<Diet[]>("/api/diets").then((items) => setDiet(items.find((item) => item.active) || items[0] || null)).catch(() => null);
    void getRoutinesOfflineFirst(setRoutines).then((result) => setRoutines(result.routines)).catch(() => null);
    void fetch("/api/community", { cache: "no-store" })
      .then((response) => response.ok ? response.json() as Promise<CommunityOverview> : null)
      .then((data) => setCommunity(data || { friends: [], routines: [] }))
      .catch(() => setCommunity({ friends: [], routines: [] }));
  }, []);

  const dietLog = diet?.dailyLogs.find((item) => item.date === today());
  const mealsDone = dietLog?.completedMeals.length || 0;
  const routine = routines.find((item) => item.active) || routines[0];
  const date = new Intl.DateTimeFormat("es-AR", { weekday: "long", day: "numeric", month: "long" }).format(new Date());

  return <main className="relative min-h-dvh overflow-hidden bg-[#090a08] px-4 pb-36 pt-28 text-white sm:px-8">
    <div className="pointer-events-none absolute -right-24 top-16 h-80 w-80 rounded-full bg-sky-400/9 blur-3xl toro-breathe" />
    <div className="pointer-events-none absolute -left-24 top-112 h-80 w-80 rounded-full bg-fuchsia-500/[.07] blur-3xl toro-breathe-reverse" />
    <div className="relative mx-auto max-w-5xl">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-[10px] font-bold tracking-[.22em] text-[#b7ff00]/70">PANEL DE HOY</p><div className="mt-2 flex flex-wrap items-center gap-3"><h1 className="text-4xl font-semibold tracking-[-.06em] sm:text-5xl">Hola, {name}.</h1><UserBadgeStrip badges={badges} size="md" /></div><p className="mt-3 capitalize text-sm text-white/40">{date}. Un paso a la vez, pero con intención.</p></div>
        <Link href="/dashboard/diet/new" className="inline-flex items-center gap-2 rounded-2xl bg-[#b7ff00] px-4 py-3 text-sm font-bold text-black"><Plus size={17}/> Nuevo plan</Link>
      </header>

      <section className="mt-8 grid gap-4 lg:grid-cols-3">
        <OverviewCard icon={<Apple/>} eyebrow="Nutrición" title={diet ? diet.name : "Tu alimentación"} value={diet ? `${mealsDone}/${diet.meals.length}` : "Sin plan"} detail={diet ? `${diet.calories.toLocaleString("es-AR")} kcal objetivo · ${mealsDone === diet.meals.length ? "Día completo" : "Comidas registradas"}` : "Creá un plan adaptado a tus objetivos."} href={diet ? `/dashboard/diet/${diet.id}` : "/dashboard/diet/new"} color="lime"/>
        <OverviewCard icon={<Dumbbell/>} eyebrow="Entrenamiento" title={routine ? routine.name : "Tu entrenamiento"} value={routine ? `${routine.days.length} días` : "Sin rutina"} detail={routine ? `${routine.exercises.length} ejercicios disponibles · abrí el plan de hoy` : "Armá una rutina para empezar."} href="/dashboard/routine" color="sky"/>
        <OverviewCard icon={<CheckCircle2/>} eyebrow="Hábitos" title={habits.active ? "Constancia diaria" : "Tus hábitos"} value={habits.active ? `${habits.completed}/${habits.active}` : "Sin hábitos"} detail={habits.active ? "Hábitos completados hoy" : "Creá tu primer hábito y seguí tu progreso."} href="/dashboard/habits" color="violet"/>
      </section>

      <TodayPlan routine={routine}/>

      <section className="mt-6 rounded-[30px] border border-white/8 bg-[#10110e]/90 p-5 shadow-[0_24px_80px_rgba(0,0,0,.2)] sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-[10px] font-bold tracking-[.2em] text-[#b7ff00]/70">PRÓXIMO PASO</p><h2 className="mt-2 text-2xl font-semibold tracking-tight">{diet && mealsDone < diet.meals.length ? "Registrá tu próxima comida" : habits.active && habits.completed < habits.active ? "Marcá un hábito para hoy" : routine ? "Abrí tu rutina activa" : "Elegí por dónde empezar"}</h2><p className="mt-2 text-sm text-white/40">El panel se actualiza con tu información real para que siempre sepas qué sigue.</p></div><Link href={diet && mealsDone < diet.meals.length ? `/dashboard/diet/${diet.id}` : habits.active && habits.completed < habits.active ? "/dashboard/habits" : "/dashboard/routine"} className="inline-flex items-center gap-2 rounded-xl border border-[#b7ff00]/30 bg-[#b7ff00]/8 px-4 py-3 text-sm font-semibold text-[#b7ff00] hover:bg-[#b7ff00] hover:text-black">Continuar <ArrowRight size={14}/></Link></div>
      </section>

      <CommunitySummary community={community}/>
    </div>
  </main>;
}

function TodayPlan({ routine }: { routine?: Routine }) {
  if (!routine) return null;
  const today = weekdays[new Date().getDay()];
  const todayScheduled = routine.days.some((day) => dayMatches(day, today));
  const todayIndex = trainingDays.indexOf(today);
  const nextDay = trainingDays.slice(todayIndex + 1).concat(trainingDays.slice(0, todayIndex + 1)).find((day) => routine.days.some((item) => dayMatches(item, day))) || routine.days[0];
  const plannedDay = todayScheduled ? today : nextDay;
  const exercises = routine.exercises.filter((exercise) => dayMatches(exercise.trainingDay, plannedDay));
  return <section className="mt-6 rounded-[30px] border border-sky-300/15 bg-sky-300/[.045] p-5 sm:p-7"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-[10px] font-bold tracking-[.2em] text-sky-200/70">PLAN DE ENTRENAMIENTO</p><h2 className="mt-2 text-2xl font-semibold tracking-tight">{todayScheduled ? `Hoy toca ${routine.name}.` : `Próximo entrenamiento: ${plannedDay}.`}</h2><p className="mt-2 text-sm text-white/45">{exercises.length ? `${exercises.length} ejercicios · ${exercises.slice(0, 3).map((exercise) => exercise.name).join(" · ")}${exercises.length > 3 ? "…" : ""}` : `${routine.exercises.length} ejercicios en ${routine.name}.`}</p></div><div className="flex flex-wrap gap-2"><Link href={`/dashboard/routine/${routine.id}`} className="inline-flex items-center gap-2 rounded-xl bg-sky-300 px-4 py-3 text-sm font-bold text-black"><Dumbbell size={16}/> {todayScheduled ? "Iniciar" : "Ver rutina"}</Link><Link href="/dashboard/progress" className="inline-flex items-center gap-2 rounded-xl border border-sky-200/25 px-4 py-3 text-sm font-semibold text-sky-100"><TrendingUp size={16}/> Progreso</Link></div></div></section>;
}

function CommunitySummary({ community }: { community: CommunityOverview | null }) {
  const connected = community?.friends.filter((friend) => friend.presence !== "OFFLINE") || [];
  const routines = community?.routines || [];
  return <section className="mt-6 rounded-[30px] border border-white/8 bg-[#10110e]/90 p-5 sm:p-7"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-[10px] font-bold tracking-[.2em] text-[#b7ff00]/70">COMUNIDAD</p><h2 className="mt-2 text-2xl font-semibold tracking-tight">Tu equipo en TORO</h2></div><Link href="/dashboard/community" className="inline-flex items-center gap-2 text-sm font-semibold text-[#b7ff00]">Ver comunidad <ArrowRight size={15}/></Link></div>{!community ? <p className="mt-5 text-sm text-white/40">Cargando tu comunidad…</p> : <div className="mt-5 grid gap-4 lg:grid-cols-2"><article className="rounded-2xl border border-white/[.07] bg-black/15 p-4"><div className="flex items-center gap-2 text-sky-200"><UsersRound size={17}/><p className="text-sm font-semibold">Amigos conectados</p></div>{!community.friends.length ? <p className="mt-4 text-sm leading-6 text-white/40">Todavía no tenés amigos. Cuando los agregues, acá vas a ver quién está conectado.</p> : !connected.length ? <p className="mt-4 text-sm leading-6 text-white/40">No hay amigos conectados ahora.</p> : <div className="mt-4 space-y-2">{connected.slice(0, 3).map((friend) => <div key={friend.id} className="flex items-center justify-between rounded-xl bg-white/[.04] px-3 py-2"><span className="text-sm font-semibold">{friend.name}</span><span className={`text-xs font-semibold ${friend.presence === "TRAINING" ? "text-[#b7ff00]" : "text-sky-200"}`}>{friend.presence === "TRAINING" ? "Entrenando" : "En línea"}</span></div>)}</div>}</article><article className="rounded-2xl border border-white/[.07] bg-black/15 p-4"><div className="flex items-center gap-2 text-[#b7ff00]"><Dumbbell size={17}/><p className="text-sm font-semibold">Rutinas compartidas</p></div>{!routines.length ? <p className="mt-4 text-sm leading-6 text-white/40">No hay rutinas compartidas todavía.</p> : <div className="mt-4 space-y-2">{routines.slice(0, 3).map((routine) => <Link key={routine.id} href={routine.canReview ? `/dashboard/community/routines/${routine.id}` : `/dashboard/routine/${routine.id}`} className="flex items-center justify-between gap-3 rounded-xl bg-white/[.04] px-3 py-2 transition hover:bg-white/[.08]"><span className="min-w-0"><span className="block truncate text-sm font-semibold">{routine.name}</span><span className="block text-xs text-white/40">{routine.exerciseCount} ejercicios · {routine.type}</span></span><ArrowRight size={15} className="shrink-0 text-[#b7ff00]"/></Link>)}</div>}</article></div>}</section>;
}

function OverviewCard({ icon, eyebrow, title, value, detail, href, color }: { icon: React.ReactNode; eyebrow: string; title: string; value: string; detail: string; href: string; color: "lime" | "sky" | "violet" }) { const styles = { lime: "text-[#b7ff00] border-[#b7ff00]/20 bg-[#b7ff00]/[.06]", sky: "text-sky-300 border-sky-400/20 bg-sky-400/[.06]", violet: "text-fuchsia-300 border-fuchsia-400/20 bg-fuchsia-400/[.06]" }[color]; return <Link href={href} className="group relative overflow-hidden rounded-[28px] border border-white/8 bg-[#10110e]/90 p-5 transition hover:-translate-y-1 hover:border-white/15"><div className={`grid h-10 w-10 place-items-center rounded-xl border ${styles}`}>{icon}</div><p className="mt-6 text-[10px] font-bold tracking-[.18em] text-white/35">{eyebrow}</p><div className="mt-2 flex items-end justify-between gap-2"><h2 className="text-xl font-semibold tracking-tight">{title}</h2><span className="text-2xl font-semibold tracking-[-.06em]">{value}</span></div><p className="mt-3 border-t border-white/6 pt-3 text-xs leading-5 text-white/38">{detail}</p><span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-white/60 group-hover:text-white">Ver detalle <ArrowRight size={14}/></span></Link>; }
