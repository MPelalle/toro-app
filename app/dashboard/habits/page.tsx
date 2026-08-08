
import Link from "next/link";
import {
  CalendarDays,
  ChevronRight,
  CircleCheck,
  Flame,
  Plus,
  Target,
  TrendingUp,
} from "lucide-react";

import {
  completedOn,
  currentStreak,
  dateForWeekday,
  dateKey,
  daysBetween,
  getHabits,
  startOfWeek,
} from "@/lib/habits";

import { CheckInButton } from "./check-in-button";

const days = ["L", "M", "X", "J", "V", "S", "D"];

export const dynamic = "force-dynamic";

export default async function HabitsPage() {
  const habits = await getHabits();

  const active = habits.filter(
    (habit) => habit.status === "ACTIVE"
  );

  const today = new Date();

  today.setHours(0, 0, 0, 0);

  const week = days.map((_, index) =>
    dateForWeekday(index)
  );

  /*
   * ============================================================
   * GLOBAL METRICS
   * ============================================================
   */

  const eligible = active.flatMap((habit) =>
    week
      .filter((date) =>
        isAvailableOn(habit, date, today)
      )
      .map((date) => ({
        habit,
        date,
      }))
  );

  const completed = eligible.filter(
    ({ habit, date }) =>
      completedOn(habit.checkIns, date)
  ).length;

  const rate = eligible.length
    ? Math.round(
        (completed / eligible.length) * 100
      )
    : 0;

  const currentStreakValue = Math.max(
    0,
    ...active.map((habit) =>
      currentStreak(habit.checkIns, today)
    )
  );

  const best = [...active].sort(
    (a, b) =>
      currentStreak(b.checkIns, today) -
      currentStreak(a.checkIns, today)
  )[0];

  const weekStart = startOfWeek(
    new Date()
  ).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "short",
  });

  /*
   * ============================================================
   * WEEK ANALYSIS
   * ============================================================
   */

  const byDay = week.map((date) => {
    const available = active.filter((habit) =>
      isAvailableOn(habit, date, today)
    );

    const completedCount = available.filter(
      (habit) =>
        completedOn(habit.checkIns, date)
    ).length;

    return {
      available: available.length,
      completed: completedCount,
    };
  });

  const previousByDay = week.map((date) => {
    const previousDate = new Date(date);

    previousDate.setDate(
      previousDate.getDate() - 7
    );

    const available = active.filter((habit) =>
      isAvailableOn(
        habit,
        previousDate,
        today
      )
    );

    const completedCount = available.filter(
      (habit) =>
        completedOn(
          habit.checkIns,
          previousDate
        )
    ).length;

    return {
      available: available.length,
      completed: completedCount,
    };
  });

  return (
    <main className="relative min-h-dvh overflow-hidden bg-[#070807] text-white">
  {/* ============================================================
      LIVING AMBIENT BACKGROUND
  ============================================================ */}

  {/* Base atmospheric gradient */}
  <div
    className="
      pointer-events-none
      fixed
      inset-0
      -z-10
      bg-[radial-gradient(circle_at_50%_-10%,rgba(163,255,18,.075),transparent_38%),radial-gradient(circle_at_0%_55%,rgba(163,255,18,.025),transparent_30%),radial-gradient(circle_at_100%_80%,rgba(255,255,255,.018),transparent_35%)]
    "
  />

  {/* Living lime light */}
  <div
    className="
      pointer-events-none
      fixed
      -left-48
      -top-40
      -z-10
      h-130
      w-130
      rounded-full
      bg-[#a3ff12]/4.5
      blur-[140px]
    "
  />

  {/* Secondary moving light */}
  <div
    className="
      pointer-events-none
      fixed
      -bottom-64
      -right-56
      -z-10
      h-150
      w-150
      rounded-full
      bg-[#a3ff12]/2.5
      blur-[160px]
    "
  />

  {/* Soft central light */}
  <div
    className="
      pointer-events-none
      fixed
      left-1/2
      top-[35%]
      -z-10
      h-125
      w-125
      -translate-x-1/2
      rounded-full
      bg-white/[0.012]
      blur-[150px]
    "
  />

  {/* Subtle grain */}
  <div
    className="
      pointer-events-none
      fixed
      inset-0
      -z-10
      opacity-[0.018]
      mix-blend-overlay
    "
    style={{
      backgroundImage:
        "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.7'/%3E%3C/svg%3E\")",
    }}
  />

  {/* Top atmospheric glow */}
  <div
    className="
      pointer-events-none
      fixed
      inset-x-0
      top-0
      -z-10
      h-105
      bg-[radial-gradient(ellipse_at_top,rgba(163,255,18,.055),transparent_68%)]
    "
  />

      <div className="relative mx-auto max-w-3xl px-4 pb-16 pt-6 sm:px-6 sm:pt-10">

        {/* ======================================================
            HEADER
        ====================================================== */}
        <header className="flex items-center justify-between mt-25">
          

          <div>
  <div className="flex items-center gap-2.5">
    <span
      className="
        h-1.5
        w-1.5
        rounded-full
        bg-[#a3ff12]
        shadow-[0_0_12px_rgba(163,255,18,.65)]
      "
    />

    <p
      className="
        text-[10px]
        font-semibold
        uppercase
        tracking-[.24em]
        text-[#a3ff12]/75
      "
    >
      Tu constancia
    </p>
  </div>

  <h1
    className="
      mt-2
      text-[38px]
      font-semibold
      leading-none
      tracking-[-.055em]
      text-white
      sm:text-[44px]
    "
  >
    Hábitos
  </h1>

  <div className="mt-3 flex items-center gap-2">
    <div className="h-px w-5 bg-[#a3ff12]/40" />

    <p className="text-[12px] font-medium tracking-[-.01em] text-white/30">
      Semana del {weekStart}
    </p>
  </div>
</div>

          <Link
            href="/dashboard/habits/new"
            className="
              grid h-11 w-11 place-items-center
              rounded-full
              bg-[#a3ff12]
              text-black
              shadow-[0_8px_30px_rgba(163,255,18,.12)]
              transition-all
              hover:scale-105
              hover:bg-[#b7ff45]
              active:scale-95
            "
            aria-label="Nuevo hábito"
          >
            <Plus
              className="h-5 w-5"
              strokeWidth={2.5}
            />
          </Link>

        </header>


        {/* ======================================================
            NIVEL 1 — HÁBITOS
        ====================================================== */}

        <section className="mt-9">

          <div className="mb-4 flex items-end justify-between">

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[.18em] text-white/25">
                Hoy
              </p>

              <h2 className="mt-1 text-xl font-semibold tracking-tight">
                Tus hábitos
              </h2>
            </div>

            <span className="text-xs text-white/30">
              {completed}/{eligible.length}
            </span>

          </div>


          {habits.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-2">

              {habits.map((habit) => (
                <HabitRow
                  key={habit.id}
                  habit={habit}
                  today={today}
                />
              ))}

            </div>
          )}

        </section>


        {/* ======================================================
            NIVEL 2 — RESUMEN
        ====================================================== */}

        <section className="mt-12">

          <SectionHeader
            eyebrow="Resumen"
            title="Tu progreso"
          />


          {/* MAIN PROGRESS */}

          <div
            className="
              mt-4 overflow-hidden
              rounded-[28px]
              border border-white/6
              bg-white/[.035]
              p-5 sm:p-6
            "
          >

            <div className="flex items-center justify-between">

              <div>

                <p className="text-sm font-medium text-white/55">
                  Cumplimiento semanal
                </p>

                <p className="mt-1 text-4xl font-semibold tracking-[-.04em]">
                  {rate}%
                </p>

              </div>

              <div
                className="
                  grid h-14 w-14 place-items-center
                  rounded-full
                  bg-[#a3ff12]/10
                  text-[#a3ff12]
                "
              >
                <Target className="h-6 w-6" />
              </div>

            </div>


            <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/6">

              <div
                className="h-full rounded-full bg-[#a3ff12] transition-all"
                style={{
                  width: `${rate}%`,
                }}
              />

            </div>


            <p className="mt-3 text-xs text-white/30">
              {completed} de {eligible.length} acciones completadas
            </p>

          </div>


          {/* SMALL METRICS */}

          <div className="mt-2 grid grid-cols-2 gap-2">

            <Metric
              icon={<Flame />}
              label="Racha"
              value={`${currentStreakValue} días`}
              detail="actual"
            />

            <Metric
              icon={<TrendingUp />}
              label="Mejor hábito"
              value={
                best?.name || "—"
              }
              detail={
                best
                  ? `${currentStreak(
                      best.checkIns,
                      today
                    )} días`
                  : "Sin datos"
              }
            />

          </div>

        </section>


        {/* ======================================================
            NIVEL 3 — SEMANA
        ====================================================== */}

        <section className="mt-12">

          <SectionHeader
            eyebrow="Actividad"
            title="Esta semana"
          />


          <div
            className="
              mt-4 rounded-[28px]
              border border-white/6
              bg-white/[.035]
              p-5
            "
          >

            <div className="flex items-center justify-between">

              <div>

                <p className="text-sm font-medium">
                  Rendimiento diario
                </p>

                <p className="mt-1 text-xs text-white/30">
                  Comparación de actividad
                </p>

              </div>

              <CalendarDays className="h-4 w-4 text-white/25" />

            </div>


            <div className="mt-7 flex h-44 items-end gap-2 sm:gap-3">

              {byDay.map(
                (
                  { available, completed: count },
                  index
                ) => {

                  const dayRate = available
                    ? Math.round(
                        (count / available) * 100
                      )
                    : 0;

                  const future =
                    week[index] > today;

                  return (
                    <div
                      key={days[index]}
                      className="
                        flex h-full flex-1
                        flex-col justify-end
                        gap-2
                      "
                    >

                      <span className="text-center text-[10px] text-white/30">
                        {future
                          ? "—"
                          : `${dayRate}%`}
                      </span>


                      <div
                        className="
                          relative h-full
                          overflow-hidden
                          rounded-full
                          bg-white/4.5
                        "
                      >

                        <div
                          className="
                            absolute inset-x-0 bottom-0
                            rounded-full
                            bg-[#a3ff12]
                            transition-all
                          "
                          style={{
                            height: future
                              ? "0%"
                              : `${Math.max(
                                  dayRate,
                                  5
                                )}%`,
                          }}
                        />

                      </div>


                      <span className="text-center text-[10px] font-semibold text-white/30">
                        {days[index]}
                      </span>

                    </div>
                  );
                }
              )}

            </div>

          </div>

        </section>


        {/* ======================================================
            NIVEL 4 — INSIGHT
        ====================================================== */}

        <section className="mt-12">

          <SectionHeader
            eyebrow="Insight"
            title="Tu tendencia"
          />


          <div
            className="
              mt-4 rounded-[28px]
              border border-[#a3ff12]/10
              bg-[#a3ff12]/4.5
              p-5
            "
          >

            <div className="flex items-start gap-4">

              <div
                className="
                  grid h-11 w-11 shrink-0
                  place-items-center
                  rounded-2xl
                  bg-[#a3ff12]/10
                  text-[#a3ff12]
                "
              >
                <CircleCheck className="h-5 w-5" />
              </div>


              <div>

                <h3 className="font-semibold">
                  {rate >= 85
                    ? "Excelente ritmo"
                    : "Seguí avanzando"}
                </h3>

                <p className="mt-1.5 text-sm leading-6 text-white/45">
                  {rate >= 85
                    ? "Estás por encima de tu objetivo semanal. Mantené la constancia."
                    : "No necesitás perfección. Una acción completada hoy es suficiente para mantener el impulso."}
                </p>

              </div>

            </div>


            {/* WEEK COMPARISON */}

            <div className="mt-5 border-t border-white/6 pt-5">

              <p className="text-[10px] font-semibold uppercase tracking-[.16em] text-white/25">
                vs. semana anterior
              </p>


              <div className="mt-4 grid grid-cols-7 gap-1">

                {byDay.map(
                  (current, index) => {

                    const prior =
                      previousByDay[index];

                    const currentRate =
                      current.available
                        ? Math.round(
                            (current.completed /
                              current.available) *
                              100
                          )
                        : 0;

                    const priorRate =
                      prior.available
                        ? Math.round(
                            (prior.completed /
                              prior.available) *
                              100
                          )
                        : 0;

                    const difference =
                      currentRate -
                      priorRate;

                    return (
                      <div
                        key={days[index]}
                        className="text-center"
                      >

                        <p className="text-[9px] text-white/25">
                          {days[index]}
                        </p>

                        <p
                          className={`
                            mt-1 text-[11px] font-semibold
                            ${
                              difference > 0
                                ? "text-[#a3ff12]"
                                : difference < 0
                                  ? "text-orange-300"
                                  : "text-white/35"
                            }
                          `}
                        >
                          {week[index] > today
                            ? "—"
                            : `${
                                difference > 0
                                  ? "+"
                                  : ""
                              }${difference}%`}
                        </p>

                      </div>
                    );
                  }
                )}

              </div>

            </div>

          </div>

        </section>

      </div>
      
    </main>
  );
}


/*
|--------------------------------------------------------------------------
| HABIT ROW
|--------------------------------------------------------------------------
*/

function HabitRow({
  habit,
  today,
}: {
  habit: Awaited<
    ReturnType<typeof getHabits>
  >[number];
  today: Date;
}) {

  const week = days.map((_, index) =>
    dateForWeekday(index)
  );

  const streak = currentStreak(
    habit.checkIns,
    today
  );

  const totalDays = habit.endsAt
    ? Math.max(
        1,
        daysBetween(
          habit.startsAt,
          habit.endsAt
        )
      )
    : habit.durationValue;

  const elapsed = Math.max(
    0,
    Math.min(
      totalDays,
      daysBetween(
        habit.startsAt,
        today
      )
    )
  );

  const progress = Math.min(
    100,
    Math.round(
      (elapsed / totalDays) * 100
    )
  );

  const availableToday =
    isAvailableOn(
      habit,
      today,
      today
    );

  const completedToday =
    completedOn(
      habit.checkIns,
      today
    );

  return (
    <article
      className="
        group
        rounded-3xl
        border border-white/5.5
        bg-white/[.035]
        p-4
        transition-all
        hover:border-white/10
        hover:bg-white/4.5
      "
    >

      <div className="flex items-center gap-3">

        {/* CHECK */}

        <CheckInButton
          id={habit.id}
          status={
            availableToday
              ? habit.status
              : "PAUSED"
          }
          done={completedToday}
        />


        {/* CONTENT */}

        <div className="min-w-0 flex-1">

          <div className="flex items-center gap-2">

            <Link
              href={`/dashboard/habits/${habit.id}`}
              className="
                truncate
                font-semibold
                tracking-tight
                transition-colors
                hover:text-[#b7ff45]
              "
            >
              {habit.name}
            </Link>

            {completedToday && (
              <span
                className="
                  shrink-0
                  rounded-full
                  bg-[#a3ff12]/10
                  px-2 py-0.5
                  text-[9px]
                  font-semibold
                  text-[#a3ff12]
                "
              >
                HOY
              </span>
            )}

          </div>


          <div className="mt-1 flex items-center gap-2">

            <span className="text-xs text-white/30">
              {streak
                ? `${streak} días de racha`
                : "Empezá hoy"}
            </span>

            <span className="text-white/10">
              ·
            </span>

            <span className="text-xs text-white/30">
              {progress}%
            </span>

          </div>

        </div>


        {/* ARROW */}

        <Link
          href={`/dashboard/habits/${habit.id}`}
          className="
            grid h-9 w-9 shrink-0
            place-items-center
            rounded-full
            text-white/20
            transition-all
            group-hover:bg-white/6
            group-hover:text-white/50
          "
          aria-label={`Ver ${habit.name}`}
        >
          <ChevronRight className="h-4 w-4" />
        </Link>

      </div>


      {/* WEEK */}

      <div className="mt-4 border-t border-white/4.5 pt-3">

        <div className="flex items-center justify-between gap-2">

          {week.map(
            (date, index) => {

              const key =
                dateKey(date);

              const unavailable =
                !isAvailableOn(
                  habit,
                  date,
                  today
                );

              const completed =
                completedOn(
                  habit.checkIns,
                  date
                );

              const isToday =
                dateKey(date) ===
                dateKey(today);

              return (
                <div
                  key={key}
                  className="
                    flex flex-1
                    flex-col items-center
                    gap-1.5
                  "
                >

                  <span
                    className={`
                      text-[9px]
                      font-semibold
                      ${
                        isToday
                          ? "text-[#a3ff12]"
                          : "text-white/20"
                      }
                    `}
                  >
                    {days[index]}
                  </span>


                  <div
                    className={`
                      h-2 w-2
                      rounded-full
                      transition-all
                      ${
                        unavailable
                          ? "bg-white/4"
                          : completed
                            ? "bg-[#a3ff12] shadow-[0_0_8px_rgba(163,255,18,.35)]"
                            : "bg-white/12"
                      }
                    `}
                  />

                </div>
              );
            }
          )}

        </div>


        {/* PROGRESS */}

        <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/5">

          <div
            className="h-full rounded-full bg-[#a3ff12]/70"
            style={{
              width: `${progress}%`,
            }}
          />

        </div>

      </div>

    </article>
  );
}


/*
|--------------------------------------------------------------------------
| METRIC
|--------------------------------------------------------------------------
*/

function Metric({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
}) {

  return (
    <div
      className="
        rounded-3xl
        border border-white/5.5
        bg-white/3
        p-4
      "
    >

      <div className="flex items-center justify-between">

        <p className="text-[10px] font-semibold uppercase tracking-[.15em] text-white/25">
          {label}
        </p>

        <span className="text-[#a3ff12]/70">
          {icon}
        </span>

      </div>


      <p className="mt-4 truncate text-xl font-semibold tracking-tight">
        {value}
      </p>

      <p className="mt-1 truncate text-xs text-white/25">
        {detail}
      </p>

    </div>
  );
}


/*
|--------------------------------------------------------------------------
| SECTION HEADER
|--------------------------------------------------------------------------
*/

function SectionHeader({
  eyebrow,
  title,
}: {
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="relative">
      {/* Eyebrow */}

      <div className="flex items-center gap-2.5">
        <span
          className="
            h-1.5
            w-1.5
            rounded-full
            bg-[#a3ff12]/70
            shadow-[0_0_10px_rgba(163,255,18,.35)]
          "
        />

        <p
          className="
            text-[9px]
            font-bold
            uppercase
            tracking-[.24em]
            text-white/30
          "
        >
          {eyebrow}
        </p>
      </div>

      {/* Title */}

      <h2
        className="
          mt-2
          text-[25px]
          font-semibold
          leading-none
          tracking-[-.045em]
          text-white
          sm:text-[27px]
        "
      >
        {title}
      </h2>

      {/* Tiny atmospheric accent */}

      <div
        className="
          mt-3
          h-px
          w-8
          bg-linear-to-r
          from-[#a3ff12]/50
          to-transparent
        "
      />
    </div>
  );
}


/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

function isAvailableOn(
  habit: Awaited<
    ReturnType<typeof getHabits>
  >[number],
  date: Date,
  today: Date
) {

  return (
    date <= today &&
    dateKey(date) >=
      dateKey(habit.startsAt) &&
    (!habit.endsAt ||
      dateKey(date) <=
        dateKey(habit.endsAt))
  );
}


function EmptyState() {

  return (
    <div
      className="
        rounded-[28px]
        border border-dashed
        border-white/10
        bg-white/2
        px-6 py-12
        text-center
      "
    >

      <div
        className="
          mx-auto grid h-12 w-12
          place-items-center
          rounded-2xl
          bg-[#a3ff12]/10
          text-[#a3ff12]
        "
      >
        <Target className="h-5 w-5" />
      </div>


      <p className="mt-4 font-semibold">
        Todavía no tenés hábitos
      </p>

      <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-white/30">
        Creá tu primer hábito y empezá a construir constancia.
      </p>


      <Link
        href="/dashboard/habits/new"
        className="
          mt-5 inline-flex
          items-center gap-2
          rounded-full
          bg-[#a3ff12]
          px-5 py-2.5
          text-sm font-bold
          text-black
          transition
          hover:bg-[#b7ff45]
        "
      >
        <Plus className="h-4 w-4" />
        Crear hábito
      </Link>

    </div>
  );
}
