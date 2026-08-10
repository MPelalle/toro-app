"use client";

import Link from "next/link";
import { Apple, ArrowRight, Check, CheckCircle2, Dumbbell, Play, Plus, TrendingUp, UsersRound } from "lucide-react";
import { useEffect, useState } from "react";
import { APP_TIME_ZONE, appCalendarDate, appDateKey } from "@/lib/app-date";
import { dietRequest, Diet, type DailyDietLog, today } from "@/lib/diet";
import { getActiveWorkoutSession, getRecentWorkoutSessions, isOfflineUserReady } from "@/lib/offline";
import { getRoutinesOfflineFirst, Routine } from "@/lib/routines";
import { UserBadgeStrip } from "@/components/badges/UserBadges";
import type { UserBadge } from "@/lib/badges";
import { CheckInButton } from "./habits/check-in-button";

const weekdays = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const trainingDays = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

type CommunityOverview = {
  friends: Array<{ id: string; name: string; nickname: string | null; presence: "TRAINING" | "ONLINE" | "OFFLINE" }>;
  routines: Array<{ id: string; name: string; exerciseCount: number; canReview: boolean; members: Array<{ id: string; name: string }> }>;
};

type HabitPlanItem = {
  id: string;
  name: string;
  completed: boolean;
  importance: "LOW" | "MEDIUM" | "HIGH";
};

type HabitsSummary = {
  active: number;
  completed: number;
  items: HabitPlanItem[];
};

type TrainingPlan = {
  routine?: Routine;
  todayScheduled: boolean;
  plannedDay: string;
  exercises: Routine["exercises"];
  totalSets: number;
};

function normal(value: string) {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

function dayMatches(value: string, day: string) {
  return normal(value).startsWith(normal(day));
}

function getTrainingPlan(routine?: Routine): TrainingPlan {
  const currentDay = weekdays[appCalendarDate().getUTCDay()];
  if (!routine) return { routine, todayScheduled: false, plannedDay: currentDay, exercises: [], totalSets: 0 };

  const todayScheduled = routine.days.some((day) => dayMatches(day, currentDay));
  const todayIndex = trainingDays.indexOf(currentDay);
  const nextDay = trainingDays
    .slice(todayIndex + 1)
    .concat(trainingDays.slice(0, todayIndex + 1))
    .find((day) => routine.days.some((item) => dayMatches(item, day))) || routine.days[0] || currentDay;
  const plannedDay = todayScheduled ? currentDay : nextDay;
  const exercises = routine.exercises.filter((exercise) => dayMatches(exercise.trainingDay, plannedDay));

  return {
    routine,
    todayScheduled,
    plannedDay,
    exercises,
    totalSets: exercises.reduce((total, exercise) => total + exercise.sets, 0),
  };
}

export default function DashboardOverview({ name, badges, habits }: { name: string; badges: UserBadge[]; habits: HabitsSummary }) {
  const [diet, setDiet] = useState<Diet | null>(null);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [community, setCommunity] = useState<CommunityOverview | null>(null);
  const [dietReady, setDietReady] = useState(false);
  const [routinesReady, setRoutinesReady] = useState(false);
  const [mealPending, setMealPending] = useState<string | null>(null);
  const [mealError, setMealError] = useState("");
  const [activeSessionRoutineId, setActiveSessionRoutineId] = useState<string | null>(null);
  const [completedWorkoutRoutineId, setCompletedWorkoutRoutineId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    let routinesRequest = 0;
    const updateRoutines = (items: Routine[]) => {
      if (mounted) setRoutines(items);
    };
    const refreshRoutines = async () => {
      const request = ++routinesRequest;
      if (!(await isOfflineUserReady().catch(() => false)) || !mounted || request !== routinesRequest) return;
      try {
        const result = await getRoutinesOfflineFirst((items) => {
          if (mounted && request === routinesRequest) updateRoutines(items);
        });
        if (mounted && request === routinesRequest) updateRoutines(result.routines);
      } catch {
        // The empty state remains available if local storage and the network both fail.
      } finally {
        if (mounted && request === routinesRequest) setRoutinesReady(true);
      }
    };
    const onOfflineReadiness = (event: Event) => {
      if ((event as CustomEvent<{ state?: string }>).detail?.state === "ready") void refreshRoutines();
    };

    window.addEventListener("toro-offline-readiness", onOfflineReadiness);
    void dietRequest<Diet[]>("/api/diets")
      .then((items) => {
        if (mounted) setDiet(items.find((item) => item.active) || items[0] || null);
      })
      .catch(() => undefined)
      .finally(() => {
        if (mounted) setDietReady(true);
      });
    void refreshRoutines();
    void fetch("/api/community", { cache: "no-store" })
      .then((response) => response.ok ? response.json() as Promise<CommunityOverview> : null)
      .then((data) => {
        if (mounted) setCommunity(data || { friends: [], routines: [] });
      })
      .catch(() => {
        if (mounted) setCommunity({ friends: [], routines: [] });
      });

    return () => {
      mounted = false;
      routinesRequest += 1;
      window.removeEventListener("toro-offline-readiness", onOfflineReadiness);
    };
  }, []);

  const routine = routines.find((item) => item.active) || routines[0];
  const routineId = routine?.id;
  const activeSession = activeSessionRoutineId === routineId;
  const trainingCompleted = completedWorkoutRoutineId === routineId;

  useEffect(() => {
    if (!routineId) return;

    let mounted = true;
    let requestVersion = 0;
    const refreshTrainingStatus = async () => {
      if (!(await isOfflineUserReady().catch(() => false))) return;
      const version = ++requestVersion;
      try {
        const [session, recentSessions] = await Promise.all([getActiveWorkoutSession(routineId), getRecentWorkoutSessions(routineId, 1)]);
        if (!mounted || version !== requestVersion) return;
        setActiveSessionRoutineId(session ? routineId : null);
        setCompletedWorkoutRoutineId(recentSessions.some((item) => item.finishedAt && appDateKey(item.finishedAt) === appDateKey()) ? routineId : null);
      } catch {
        if (!mounted || version !== requestVersion) return;
        setActiveSessionRoutineId(null);
        setCompletedWorkoutRoutineId(null);
      }
    };
    const onOfflineReadiness = (event: Event) => {
      if ((event as CustomEvent<{ state?: string }>).detail?.state === "ready") void refreshTrainingStatus();
    };
    const onWorkoutStatus = () => void refreshTrainingStatus();

    void refreshTrainingStatus();
    window.addEventListener("toro-workout-status-change", onWorkoutStatus);
    window.addEventListener("toro-offline-readiness", onOfflineReadiness);
    return () => {
      mounted = false;
      requestVersion += 1;
      window.removeEventListener("toro-workout-status-change", onWorkoutStatus);
      window.removeEventListener("toro-offline-readiness", onOfflineReadiness);
    };
  }, [routineId]);

  const dietLog = diet?.dailyLogs.find((item) => item.date === today());
  const mealsDone = dietLog?.completedMeals.length || 0;
  const date = new Intl.DateTimeFormat("es-AR", { timeZone: APP_TIME_ZONE, weekday: "long", day: "numeric", month: "long" }).format(new Date());

  const completeNextMeal = async () => {
    if (!diet || mealPending) return;
    const dateKey = today();
    const currentLog = diet.dailyLogs.find((item) => item.date === dateKey) || { date: dateKey, completedMeals: [], comment: "" };
    const nextMeal = diet.meals.find((meal) => !currentLog.completedMeals.includes(meal.id));
    if (!nextMeal) return;

    const previousDiet = diet;
    const nextLog: DailyDietLog = { ...currentLog, completedMeals: [...currentLog.completedMeals, nextMeal.id] };
    setMealPending(nextMeal.id);
    setMealError("");
    setDiet({ ...diet, dailyLogs: [...diet.dailyLogs.filter((item) => item.date !== dateKey), nextLog] });

    try {
      const saved = await dietRequest<DailyDietLog>(`/api/diets/${diet.id}/log`, { method: "POST", body: JSON.stringify(nextLog) });
      setDiet((current) => current?.id === diet.id ? { ...current, dailyLogs: [...current.dailyLogs.filter((item) => item.date !== saved.date), saved] } : current);
      window.dispatchEvent(new Event("toro-dashboard-stats-change"));
    } catch {
      setDiet(previousDiet);
      setMealError("No pudimos registrar la comida. Probá de nuevo.");
    } finally {
      setMealPending(null);
    }
  };

  return (
    <main className="relative min-h-dvh overflow-hidden bg-[#090a08] px-4 pb-36 pt-28 text-white sm:px-8">
      <div className="pointer-events-none absolute -right-24 top-16 h-80 w-80 rounded-full bg-sky-400/9 blur-3xl toro-breathe" />
      <div className="pointer-events-none absolute -left-24 top-112 h-80 w-80 rounded-full bg-fuchsia-500/[.07] blur-3xl toro-breathe-reverse" />
      <div className="relative mx-auto max-w-5xl">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold tracking-[.22em] text-[#b7ff00]/70">PANEL DE HOY</p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <h1 className="text-4xl font-semibold tracking-[-.06em] sm:text-5xl">Hola, {name}.</h1>
              <UserBadgeStrip badges={badges} size="md" />
            </div>
            <p className="mt-3 capitalize text-sm text-white/40">{date}. Un paso a la vez, pero con intención.</p>
          </div>
          <Link href="/dashboard/diet/new" className="inline-flex items-center gap-2 rounded-2xl bg-[#b7ff00] px-4 py-3 text-sm font-bold text-black">
            <Plus size={17} /> Nuevo plan
          </Link>
        </header>

        <TodayPlan
          routine={routine}
          diet={diet}
          habits={habits}
          activeSession={activeSession}
          trainingCompleted={trainingCompleted}
          mealsDone={mealsDone}
          mealPending={mealPending}
          mealError={mealError}
          routineLoading={!routinesReady}
          dietLoading={!dietReady}
          onCompleteNextMeal={completeNextMeal}
        />

        <section className="mt-6 grid gap-4 lg:grid-cols-3">
          <OverviewCard
            icon={<Apple />}
            eyebrow="Nutrición"
            title={dietReady ? diet ? diet.name : "Tu alimentación" : "Cargando plan"}
            value={dietReady ? diet ? `${mealsDone}/${diet.meals.length}` : "Sin plan" : "…"}
            detail={dietReady ? diet ? `${diet.calories.toLocaleString("es-AR")} kcal objetivo · ${mealsDone === diet.meals.length ? "Día completo" : "Comidas registradas"}` : "Creá un plan adaptado a tus objetivos." : "Preparando tu seguimiento de comidas."}
            href={diet ? `/dashboard/diet/${diet.id}` : "/dashboard/diet/new"}
            color="lime"
          />
          <OverviewCard
            icon={<Dumbbell />}
            eyebrow="Entrenamiento"
            title={routinesReady ? routine ? routine.name : "Tu entrenamiento" : "Cargando rutina"}
            value={routinesReady ? routine ? `${routine.days.length} días` : "Sin rutina" : "…"}
            detail={routinesReady ? routine ? `${routine.exercises.length} ejercicios disponibles · abrí el plan de hoy` : "Armá una rutina para empezar." : "Recuperando tu rutina, incluso sin conexión."}
            href={routine ? `/dashboard/routine/${routine.id}` : "/dashboard/routine/new"}
            color="sky"
          />
          <OverviewCard
            icon={<CheckCircle2 />}
            eyebrow="Hábitos"
            title={habits.active ? "Constancia diaria" : "Tus hábitos"}
            value={habits.active ? `${habits.completed}/${habits.active}` : "Sin hábitos"}
            detail={habits.active ? "Hábitos completados hoy" : "Creá tu primer hábito y seguí tu progreso."}
            href="/dashboard/habits"
            color="violet"
          />
        </section>

        <CommunitySummary community={community} />
      </div>
    </main>
  );
}

function TodayPlan({
  routine,
  diet,
  habits,
  activeSession,
  trainingCompleted,
  mealsDone,
  mealPending,
  mealError,
  routineLoading,
  dietLoading,
  onCompleteNextMeal,
}: {
  routine?: Routine;
  diet: Diet | null;
  habits: HabitsSummary;
  activeSession: boolean;
  trainingCompleted: boolean;
  mealsDone: number;
  mealPending: string | null;
  mealError: string;
  routineLoading: boolean;
  dietLoading: boolean;
  onCompleteNextMeal: () => Promise<void>;
}) {
  const training = getTrainingPlan(routine);
  const dietLog = diet?.dailyLogs.find((item) => item.date === today());
  const nextMeal = diet?.meals.find((meal) => !dietLog?.completedMeals.includes(meal.id));
  const nextHabit = habits.items.find((habit) => !habit.completed);
  const trackedActions = (diet?.meals.length || 0) + habits.active + (training.todayScheduled ? 1 : 0);
  const completedActions = mealsDone + habits.completed + (training.todayScheduled && trainingCompleted ? 1 : 0);
  const completionRate = trackedActions ? Math.round((completedActions / trackedActions) * 100) : 0;

  return (
    <section className="mt-6 overflow-hidden rounded-[30px] border border-[#b7ff00]/18 bg-[#10110e]/95 shadow-[0_24px_80px_rgba(0,0,0,.2)]">
      <div className="border-b border-white/[.07] px-5 py-5 sm:px-7 sm:py-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold tracking-[.2em] text-[#b7ff00]/70">PLAN DE HOY</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">Menos vueltas. Esta es tu próxima jugada.</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/42">Entrená, registrá tu comida y sostené tus hábitos desde un mismo lugar.</p>
          </div>
          {trackedActions > 0 && (
            <div className="min-w-32 rounded-2xl border border-white/[.08] bg-black/20 px-4 py-3 text-right">
              <p className="text-[10px] font-bold tracking-[.14em] text-white/35">SEGUIMIENTO</p>
              <p className="mt-1 text-xl font-semibold text-[#b7ff00]">{completionRate}%</p>
              <p className="text-[11px] text-white/38">{completedActions}/{trackedActions} acciones</p>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-px bg-white/[.07] lg:grid-cols-3">
        <PlanTraining training={training} activeSession={activeSession} completed={trainingCompleted} loading={routineLoading} />
        <PlanNutrition diet={diet} mealsDone={mealsDone} nextMeal={nextMeal} mealPending={mealPending} loading={dietLoading} onCompleteNextMeal={onCompleteNextMeal} />
        <PlanHabits habits={habits} nextHabit={nextHabit} />
      </div>

      {mealError && <p role="alert" className="border-t border-red-300/15 bg-red-300/[.06] px-5 py-3 text-sm text-red-100 sm:px-7">{mealError}</p>}
    </section>
  );
}

function PlanTraining({ training, activeSession, completed, loading }: { training: TrainingPlan; activeSession: boolean; completed: boolean; loading: boolean }) {
  if (loading) {
    return (
      <article className="bg-[#10110e] p-5 sm:p-6">
        <PlanKicker index="01" icon={<Dumbbell size={17} />} label="Entrenamiento" color="sky" />
        <h3 className="mt-5 text-xl font-semibold">Preparando tu entrenamiento.</h3>
        <p className="mt-2 min-h-12 text-sm leading-6 text-white/42">Recuperamos tu rutina para que puedas empezar incluso sin conexión.</p>
        <span className="mt-6 inline-flex rounded-xl border border-sky-300/20 px-4 py-3 text-sm font-semibold text-sky-100/65">Cargando rutina…</span>
      </article>
    );
  }

  if (!training.routine) {
    return (
      <article className="bg-[#10110e] p-5 sm:p-6">
        <PlanKicker index="01" icon={<Dumbbell size={17} />} label="Entrenamiento" color="sky" />
        <h3 className="mt-5 text-xl font-semibold">Armá tu entrenamiento.</h3>
        <p className="mt-2 min-h-12 text-sm leading-6 text-white/42">Una rutina activa convierte este panel en una guía real para cada día.</p>
        <Link href="/dashboard/routine/new" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-sky-300 px-4 py-3 text-sm font-bold text-black">
          <Plus size={16} /> Crear rutina
        </Link>
      </article>
    );
  }

  const exerciseNames = training.exercises.slice(0, 2).map((exercise) => exercise.name).join(" · ");
  const title = activeSession
    ? "Tu sesión está en marcha."
    : completed && training.todayScheduled
      ? "Entrenamiento completado."
      : training.todayScheduled
      ? `Hoy toca ${training.routine.name}.`
      : `Próximo entrenamiento: ${training.plannedDay}.`;
  const action = activeSession ? "Continuar sesión" : completed && training.todayScheduled ? "Ver progreso" : training.todayScheduled ? "Iniciar ahora" : "Preparar sesión";
  const href = completed && training.todayScheduled ? "/dashboard/progress" : `/dashboard/routine/${training.routine.id}`;

  return (
    <article className="relative overflow-hidden bg-[#10110e] p-5 sm:p-6">
      <div className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-sky-300/[.09] blur-3xl" />
      <PlanKicker index="01" icon={<Dumbbell size={17} />} label="Entrenamiento" color="sky" />
      <h3 className="relative mt-5 text-xl font-semibold">{title}</h3>
      <p className="relative mt-2 min-h-12 text-sm leading-6 text-white/42">
        {completed && training.todayScheduled
          ? "La sesión de hoy quedó guardada. Mirá tu progreso o prepará el próximo desafío."
          : training.exercises.length
          ? `${training.exercises.length} ejercicios · ${training.totalSets} series${exerciseNames ? ` · ${exerciseNames}${training.exercises.length > 2 ? "…" : ""}` : ""}`
          : `${training.routine.exercises.length} ejercicios disponibles en tu rutina.`}
      </p>
      <Link href={href} className="relative mt-6 inline-flex items-center gap-2 rounded-xl bg-sky-300 px-4 py-3 text-sm font-bold text-black">
        {completed && training.todayScheduled && !activeSession ? <TrendingUp size={15} /> : <Play size={15} fill="currentColor" />} {action}
      </Link>
      <Link href={completed && training.todayScheduled ? `/dashboard/routine/${training.routine.id}` : "/dashboard/progress"} className="relative ml-3 inline-flex items-center gap-1 text-xs font-semibold text-sky-100/75 hover:text-sky-100">
        {completed && training.todayScheduled ? <Dumbbell size={14} /> : <TrendingUp size={14} />} {completed && training.todayScheduled ? "Abrir rutina" : "Progreso"}
      </Link>
    </article>
  );
}

function PlanNutrition({
  diet,
  mealsDone,
  nextMeal,
  mealPending,
  loading,
  onCompleteNextMeal,
}: {
  diet: Diet | null;
  mealsDone: number;
  nextMeal?: Diet["meals"][number];
  mealPending: string | null;
  loading: boolean;
  onCompleteNextMeal: () => Promise<void>;
}) {
  if (loading) {
    return (
      <article className="bg-[#10110e] p-5 sm:p-6">
        <PlanKicker index="02" icon={<Apple size={17} />} label="Nutrición" color="lime" />
        <h3 className="mt-5 text-xl font-semibold">Preparando tu comida.</h3>
        <p className="mt-2 min-h-12 text-sm leading-6 text-white/42">Buscamos el plan y el registro de hoy para mostrarte la siguiente acción.</p>
        <span className="mt-6 inline-flex rounded-xl border border-[#b7ff00]/20 px-4 py-3 text-sm font-semibold text-[#b7ff00]/65">Cargando plan…</span>
      </article>
    );
  }

  if (!diet) {
    return (
      <article className="bg-[#10110e] p-5 sm:p-6">
        <PlanKicker index="02" icon={<Apple size={17} />} label="Nutrición" color="lime" />
        <h3 className="mt-5 text-xl font-semibold">Dale dirección a tu comida.</h3>
        <p className="mt-2 min-h-12 text-sm leading-6 text-white/42">Creá un plan para ver la próxima comida y tu objetivo diario acá.</p>
        <Link href="/dashboard/diet/new" className="mt-6 inline-flex items-center gap-2 rounded-xl border border-[#b7ff00]/30 bg-[#b7ff00]/8 px-4 py-3 text-sm font-semibold text-[#b7ff00] hover:bg-[#b7ff00] hover:text-black">
          <Plus size={16} /> Crear plan
        </Link>
      </article>
    );
  }

  const complete = !nextMeal;
  return (
    <article className="bg-[#10110e] p-5 sm:p-6">
      <PlanKicker index="02" icon={<Apple size={17} />} label="Nutrición" color="lime" />
      <h3 className="mt-5 text-xl font-semibold">{complete ? "Nutrición al día." : nextMeal.name}</h3>
      <p className="mt-2 min-h-12 text-sm leading-6 text-white/42">
        {complete
          ? `Completaste tus ${diet.meals.length} comidas de hoy. Buen trabajo.`
          : `${nextMeal.time} · ${nextMeal.kcal.toLocaleString("es-AR")} kcal · ${mealsDone}/${diet.meals.length} comidas registradas.`}
      </p>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        {nextMeal ? (
          <button type="button" disabled={Boolean(mealPending)} onClick={() => void onCompleteNextMeal()} className="inline-flex items-center gap-2 rounded-xl bg-[#b7ff00] px-4 py-3 text-sm font-bold text-black transition hover:bg-[#c8ff46] disabled:cursor-wait disabled:opacity-65">
            <Check size={16} strokeWidth={3} /> {mealPending === nextMeal.id ? "Guardando…" : "Marcar comida"}
          </button>
        ) : (
          <span className="inline-flex items-center gap-2 rounded-xl border border-[#b7ff00]/25 bg-[#b7ff00]/[.07] px-4 py-3 text-sm font-semibold text-[#b7ff00]"><CheckCircle2 size={16} /> Todo registrado</span>
        )}
        <Link href={`/dashboard/diet/${diet.id}`} className="inline-flex items-center gap-1 text-xs font-semibold text-white/55 hover:text-white">
          Ver plan <ArrowRight size={14} />
        </Link>
      </div>
    </article>
  );
}

function PlanHabits({ habits, nextHabit }: { habits: HabitsSummary; nextHabit?: HabitPlanItem }) {
  if (!habits.active) {
    return (
      <article className="bg-[#10110e] p-5 sm:p-6">
        <PlanKicker index="03" icon={<CheckCircle2 size={17} />} label="Hábitos" color="violet" />
        <h3 className="mt-5 text-xl font-semibold">Construí tu sistema.</h3>
        <p className="mt-2 min-h-12 text-sm leading-6 text-white/42">Sumá un hábito diario para mantener lo importante visible y medible.</p>
        <Link href="/dashboard/habits/new" className="mt-6 inline-flex items-center gap-2 rounded-xl border border-fuchsia-300/30 bg-fuchsia-300/[.07] px-4 py-3 text-sm font-semibold text-fuchsia-100 hover:bg-fuchsia-300 hover:text-black">
          <Plus size={16} /> Crear hábito
        </Link>
      </article>
    );
  }

  const allComplete = !nextHabit;
  return (
    <article className="bg-[#10110e] p-5 sm:p-6">
      <PlanKicker index="03" icon={<CheckCircle2 size={17} />} label="Hábitos" color="violet" />
      <h3 className="mt-5 text-xl font-semibold">{allComplete ? "Hábitos al día." : nextHabit.name}</h3>
      <p className="mt-2 min-h-12 text-sm leading-6 text-white/42">
        {allComplete ? `Completaste tus ${habits.active} hábitos activos. Sostené el ritmo.` : `${habits.completed}/${habits.active} completados hoy${nextHabit.importance === "HIGH" ? " · prioridad alta" : ""}.`}
      </p>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        {nextHabit ? <CheckInButton id={nextHabit.id} status="ACTIVE" done={false} compact /> : <span className="grid h-9 w-9 place-items-center rounded-xl bg-fuchsia-300 text-black"><Check size={16} strokeWidth={3} /></span>}
        <Link href={nextHabit ? `/dashboard/habits/${nextHabit.id}` : "/dashboard/habits"} className="inline-flex items-center gap-1 text-xs font-semibold text-fuchsia-100/80 hover:text-fuchsia-100">
          {nextHabit ? "Marcar y ver detalle" : "Ver hábitos"} <ArrowRight size={14} />
        </Link>
      </div>
    </article>
  );
}

function PlanKicker({ index, icon, label, color }: { index: string; icon: React.ReactNode; label: string; color: "lime" | "sky" | "violet" }) {
  const styles = {
    lime: "border-[#b7ff00]/20 bg-[#b7ff00]/[.07] text-[#b7ff00]",
    sky: "border-sky-300/20 bg-sky-300/[.07] text-sky-200",
    violet: "border-fuchsia-300/20 bg-fuchsia-300/[.07] text-fuchsia-200",
  }[color];

  return (
    <div className="flex items-center justify-between gap-3">
      <div className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1.5 text-[10px] font-bold tracking-[.14em] ${styles}`}>
        {icon} {label.toUpperCase()}
      </div>
      <span className="text-xs font-bold text-white/22">{index}</span>
    </div>
  );
}

function CommunitySummary({ community }: { community: CommunityOverview | null }) {
  const connected = community?.friends.filter((friend) => friend.presence !== "OFFLINE") || [];
  const routines = community?.routines || [];
  return (
    <section className="mt-6 rounded-[30px] border border-white/8 bg-[#10110e]/90 p-5 sm:p-7">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold tracking-[.2em] text-[#b7ff00]/70">COMUNIDAD</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">Tu equipo en TORO</h2>
        </div>
        <Link href="/dashboard/community" className="inline-flex items-center gap-2 text-sm font-semibold text-[#b7ff00]">Ver comunidad <ArrowRight size={15} /></Link>
      </div>
      {!community ? <p className="mt-5 text-sm text-white/40">Cargando tu comunidad…</p> : (
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <article className="rounded-2xl border border-white/[.07] bg-black/15 p-4">
            <div className="flex items-center gap-2 text-sky-200"><UsersRound size={17} /><p className="text-sm font-semibold">Amigos conectados</p></div>
            {!community.friends.length ? <p className="mt-4 text-sm leading-6 text-white/40">Todavía no tenés amigos. Cuando los agregues, acá vas a ver quién está conectado.</p> : !connected.length ? <p className="mt-4 text-sm leading-6 text-white/40">No hay amigos conectados ahora.</p> : (
              <div className="mt-4 space-y-2">
                {connected.slice(0, 3).map((friend) => <div key={friend.id} className="flex items-center justify-between rounded-xl bg-white/[.04] px-3 py-2"><span className="text-sm font-semibold">{friend.name}</span><span className={`text-xs font-semibold ${friend.presence === "TRAINING" ? "text-[#b7ff00]" : "text-sky-200"}`}>{friend.presence === "TRAINING" ? "Entrenando" : "En línea"}</span></div>)}
              </div>
            )}
          </article>
          <article className="rounded-2xl border border-white/[.07] bg-black/15 p-4">
            <div className="flex items-center gap-2 text-[#b7ff00]"><Dumbbell size={17} /><p className="text-sm font-semibold">Rutinas compartidas</p></div>
            {!routines.length ? <p className="mt-4 text-sm leading-6 text-white/40">No hay rutinas compartidas todavía.</p> : (
              <div className="mt-4 space-y-2">
                {routines.slice(0, 3).map((routine) => <Link key={routine.id} href={routine.canReview ? `/dashboard/community/routines/${routine.id}` : `/dashboard/routine/${routine.id}`} className="flex items-center justify-between gap-3 rounded-xl bg-white/[.04] px-3 py-2 transition hover:bg-white/[.08]"><span className="min-w-0"><span className="block truncate text-sm font-semibold">{routine.name}</span><span className="block text-xs text-white/40">{routine.exerciseCount} ejercicio{routine.exerciseCount === 1 ? "" : "s"}</span></span><ArrowRight size={15} className="shrink-0 text-[#b7ff00]" /></Link>)}
              </div>
            )}
          </article>
        </div>
      )}
    </section>
  );
}

function OverviewCard({ icon, eyebrow, title, value, detail, href, color }: { icon: React.ReactNode; eyebrow: string; title: string; value: string; detail: string; href: string; color: "lime" | "sky" | "violet" }) {
  const styles = {
    lime: "text-[#b7ff00] border-[#b7ff00]/20 bg-[#b7ff00]/[.06]",
    sky: "text-sky-300 border-sky-400/20 bg-sky-400/[.06]",
    violet: "text-fuchsia-300 border-fuchsia-400/20 bg-fuchsia-400/[.06]",
  }[color];

  return (
    <Link href={href} className="group relative overflow-hidden rounded-[28px] border border-white/8 bg-[#10110e]/90 p-5 transition hover:-translate-y-1 hover:border-white/15">
      <div className={`grid h-10 w-10 place-items-center rounded-xl border ${styles}`}>{icon}</div>
      <p className="mt-6 text-[10px] font-bold tracking-[.18em] text-white/35">{eyebrow}</p>
      <div className="mt-2 flex items-end justify-between gap-2"><h2 className="text-xl font-semibold tracking-tight">{title}</h2><span className="text-2xl font-semibold tracking-[-.06em]">{value}</span></div>
      <p className="mt-3 border-t border-white/6 pt-3 text-xs leading-5 text-white/38">{detail}</p>
      <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-white/60 group-hover:text-white">Ver detalle <ArrowRight size={14} /></span>
    </Link>
  );
}
