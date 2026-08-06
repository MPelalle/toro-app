
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  Flame,
  Pencil,
  Target,
  TrendingUp,
} from "lucide-react";

import {
  checkInKey,
  completedOn,
  currentStreak,
  dateForWeekday,
  dateKey,
  daysBetween,
  formatHabitStatus,
  getHabit,
} from "@/lib/habits";

import { CheckInButton } from "../check-in-button";
import { DailyReflection } from "../daily-reflection";

const days = ["L", "M", "X", "J", "V", "S", "D"];

export default async function HabitDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const habit = await getHabit(id);

  if (!habit) {
    notFound();
  }

  /*
   * ============================================================
   * DATE
   * ============================================================
   */

  const today = new Date();

  today.setHours(0, 0, 0, 0);

  const week = Array.from(
    { length: 7 },
    (_, index) => dateForWeekday(index)
  ).filter(
    (date) =>
      date <= today &&
      dateKey(date) >= dateKey(habit.startsAt) &&
      (!habit.endsAt ||
        dateKey(date) <= dateKey(habit.endsAt))
  );

  /*
   * ============================================================
   * HABIT METRICS
   * ============================================================
   */

  const todayDone = completedOn(
    habit.checkIns,
    today
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

  const elapsedDays = Math.max(
    0,
    Math.min(
      totalDays,
      daysBetween(
        habit.startsAt,
        today
      )
    )
  );

  const challengeProgress = Math.min(
    100,
    Math.round(
      (elapsedDays / totalDays) * 100
    )
  );

  const completedCount =
    habit.checkIns.filter(
      (item) => item.completed
    ).length;

  const totalCheckIns =
    habit.checkIns.length;

  const completionRate =
    totalCheckIns > 0
      ? Math.round(
          (completedCount /
            totalCheckIns) *
            100
        )
      : 0;

  const importance =
    habit.importance === "HIGH"
      ? "Alta"
      : habit.importance === "MEDIUM"
        ? "Media"
        : "Baja";

  return (
    <main className="min-h-dvh bg-[#080908] text-white mt-25">

      {/* ======================================================
          AMBIENT BACKGROUND
      ====================================================== */}

      <div
        className="
          pointer-events-none fixed inset-x-0 top-0
          h-105
          bg-[radial-gradient(ellipse_at_top,rgba(163,255,18,.11),transparent_65%)]
        "
      />


      <div className="relative mx-auto max-w-2xl px-4 pb-16 pt-5 sm:px-6 sm:pt-8">

        {/* ====================================================
            HEADER
        ==================================================== */}

        <header className="flex items-center justify-between">

          <Link
            href="/dashboard/habits"
            className="
              inline-flex h-10
              items-center gap-2
              rounded-full
              px-2
              text-sm
              text-white/40
              transition
              hover:bg-white/5
              hover:text-white
            "
          >
            <ArrowLeft className="h-4 w-4" />
            Hábitos
          </Link>


          <Link
            href={`/dashboard/habits/${habit.id}/edit`}
            className="
              grid h-10 w-10
              place-items-center
              rounded-full
              bg-white/5.5
              text-white/45
              transition-all
              hover:bg-white/9
              hover:text-white
              active:scale-95
            "
            aria-label="Editar hábito"
          >
            <Pencil className="h-4 w-4" />
          </Link>

        </header>


        {/* ====================================================
            HERO
        ==================================================== */}

        <section className="mt-9">

          <div className="flex items-start gap-4">

            <div className="min-w-0 flex-1">

              <div className="flex items-center gap-2">

                <span className="h-2 w-2 rounded-full bg-[#a3ff12] shadow-[0_0_10px_rgba(163,255,18,.45)]" />

                <p className="text-[10px] font-semibold uppercase tracking-[.18em] text-[#a3ff12]">
                  {formatHabitStatus(habit.status)}
                </p>

              </div>


              <h1 className="mt-3 text-[34px] font-semibold leading-[1.05] tracking-[-.045em] sm:text-4xl">
                {habit.name}
              </h1>


              <p className="mt-3 text-sm text-white/35">
                {habit.durationValue}{" "}
                {habit.durationUnit === "DAYS"
                  ? "días"
                  : "meses"}
                <span className="mx-2 text-white/15">
                  ·
                </span>
                Prioridad {importance}
              </p>

            </div>

          </div>

        </section>


        {/* ====================================================
            TODAY — PRIMARY ACTION
        ==================================================== */}

        <section className="mt-7">

          <div
            className={`
              overflow-hidden
              rounded-[30px]
              border
              ${
                todayDone
                  ? "border-[#a3ff12]/20 bg-[#a3ff12]/5.5"
                  : "border-white/6 bg-white/[.035]"
              }
            `}
          >

            <div className="p-5 sm:p-6">

              <div className="flex items-center justify-between gap-4">

                <div>

                  <p className="text-[10px] font-semibold uppercase tracking-[.17em] text-white/30">
                    Hoy
                  </p>

                  <h2 className="mt-1 text-xl font-semibold tracking-tight">
                    {todayDone
                      ? "Objetivo completado"
                      : "¿Listo para hacerlo?"}
                  </h2>

                  <p className="mt-1 text-sm text-white/35">
                    {todayDone
                      ? "Excelente. Mantené el impulso."
                      : "Una acción más para mantener la constancia."}
                  </p>

                </div>


                <div
                  className={`
                    grid h-14 w-14
                    shrink-0
                    place-items-center
                    rounded-full
                    ${
                      todayDone
                        ? "bg-[#a3ff12] text-black"
                        : "bg-white/6 text-white/25"
                    }
                  `}
                >

                  <Check
                    className="h-6 w-6"
                    strokeWidth={
                      todayDone ? 3 : 2
                    }
                  />

                </div>

              </div>


              <div className="mt-6">

                <CheckInButton
                  id={habit.id}
                  status={habit.status}
                  done={todayDone}
                />

              </div>

            </div>


            {/* NOTE */}

            {habit.notes && (
              <div className="border-t border-white/5.5 px-5 py-4 sm:px-6">

                <p className="text-sm leading-6 text-white/40">
                  {habit.notes}
                </p>

              </div>
            )}

          </div>

        </section>


        {/* ====================================================
            METRICS
        ==================================================== */}

        <section className="mt-10">

          <SectionHeader
            eyebrow="Rendimiento"
            title="Tu progreso"
          />


          <div className="mt-4 grid grid-cols-2 gap-2">

            {/* STREAK */}

            <MetricCard
              icon={<Flame />}
              label="Racha"
              value={`${streak} días`}
              detail={
                streak > 0
                  ? "consecutivos"
                  : "Empezá hoy"
              }
            />


            {/* COMPLETION */}

            <MetricCard
              icon={<TrendingUp />}
              label="Cumplimiento"
              value={`${completionRate}%`}
              detail={`${completedCount} completados`}
            />

          </div>


          {/* CHALLENGE */}

          <div
            className="
              mt-2
              rounded-[26px]
              border border-white/5.5
              bg-white/3
              p-5
            "
          >

            <div className="flex items-center justify-between">

              <div>

                <p className="text-sm font-medium text-white/60">
                  Progreso del desafío
                </p>

                <p className="mt-1 text-xs text-white/25">
                  Día {elapsedDays} de{" "}
                  {totalDays}
                </p>

              </div>


              <span className="text-lg font-semibold text-white/70">
                {challengeProgress}%
              </span>

            </div>


            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/5.5">

              <div
                className="
                  h-full
                  rounded-full
                  bg-[#a3ff12]
                  shadow-[0_0_12px_rgba(163,255,18,.2)]
                "
                style={{
                  width: `${challengeProgress}%`,
                }}
              />

            </div>

          </div>

        </section>


        {/* ====================================================
            WEEK
        ==================================================== */}

        <section className="mt-10">

          <SectionHeader
            eyebrow="Actividad"
            title="Esta semana"
          />


          <div
            className="
              mt-4
              rounded-[28px]
              border border-white/5.5
              bg-white/3
              p-5
            "
          >

            <div className="flex items-center justify-between">

              <div>

                <p className="text-sm font-medium">
                  Tu constancia
                </p>

                <p className="mt-1 text-xs text-white/25">
                  Últimos días disponibles
                </p>

              </div>

              <CalendarDays className="h-4 w-4 text-white/20" />

            </div>


            <div className="mt-6 flex items-end justify-between gap-2">

              {week.map(
                (date, index) => {

                  const key =
                    dateKey(date);

                  const item =
                    habit.checkIns.find(
                      (checkIn) =>
                        checkInKey(
                          checkIn
                        ) === key
                    );

                  const completed =
                    item?.completed ??
                    false;

                  const isToday =
                    dateKey(date) ===
                    dateKey(today);

                  return (
                    <div
                      key={key}
                      className="
                        flex flex-1
                        flex-col
                        items-center
                        gap-2
                      "
                    >

                      <span
                        className={`
                          text-[10px]
                          font-semibold
                          ${
                            isToday
                              ? "text-[#a3ff12]"
                              : "text-white/25"
                          }
                        `}
                      >
                        {days[index]}
                      </span>


                      <div
                        className={`
                          grid h-9 w-9
                          place-items-center
                          rounded-full
                          transition-all
                          ${
                            completed
                              ? "bg-[#a3ff12] text-black shadow-[0_0_14px_rgba(163,255,18,.18)]"
                              : isToday
                                ? "border border-[#a3ff12]/40 bg-[#a3ff12]/5"
                                : "bg-white/5.5"
                          }
                        `}
                      >

                        {completed && (
                          <Check
                            className="h-3.5 w-3.5"
                            strokeWidth={3}
                          />
                        )}

                      </div>

                    </div>
                  );
                }
              )}

            </div>

          </div>

        </section>


        {/* ====================================================
            REFLECTION
        ==================================================== */}

        <section className="mt-10">

          <SectionHeader
            eyebrow="Reflexión"
            title="Cómo fue tu semana"
          />


          <p className="mt-2 text-sm leading-6 text-white/30">
            Escribí una pequeña nota sobre lo que
            te ayudó, lo que costó o cómo te
            sentiste.
          </p>


          <div className="mt-4 space-y-2">

            {week.map((date) => {

              const key =
                dateKey(date);

              const item =
                habit.checkIns.find(
                  (checkIn) =>
                    checkInKey(
                      checkIn
                    ) === key
                );

              return (
                <div
                  key={key}
                  className="
                    overflow-hidden
                    rounded-3xl
                    border border-white/5.5
                    bg-white/2.5
                  "
                >

                  <div className="flex items-center justify-between px-4 pt-4">

                    <p className="text-sm font-medium capitalize text-white/55">
                      {date.toLocaleDateString(
                        "es-AR",
                        {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                        }
                      )}
                    </p>


                    {item?.completed && (
                      <span
                        className="
                          flex items-center
                          gap-1.5
                          text-[10px]
                          font-semibold
                          text-[#a3ff12]
                        "
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-[#a3ff12]" />
                        Completado
                      </span>
                    )}

                  </div>


                  <div className="px-4 pb-4 pt-3">

                    <DailyReflection
                      habitId={habit.id}
                      date={key}
                      initialComment={
                        item?.comment
                      }
                      completed={
                        item?.completed ||
                        false
                      }
                    />

                  </div>

                </div>
              );
            })}

          </div>

        </section>


        {/* ====================================================
            HISTORY
        ==================================================== */}

        <section className="mt-10">

          <SectionHeader
            eyebrow="Historial"
            title="Registros anteriores"
          />


          {habit.checkIns.length ? (

            <div className="mt-4 overflow-hidden rounded-[26px] border border-white/5.5 bg-white/2.5">

              {habit.checkIns
                .slice(0, 14)
                .map(
                  (item, index) => (

                    <div
                      key={item.id}
                      className={`
                        flex items-center gap-4
                        px-4 py-4
                        ${
                          index !==
                          Math.min(
                            habit.checkIns.length,
                            14
                          ) -
                            1
                            ? "border-b border-white/4.5"
                            : ""
                        }
                      `}
                    >

                      <div
                        className={`
                          grid h-9 w-9
                          shrink-0
                          place-items-center
                          rounded-full
                          ${
                            item.completed
                              ? "bg-[#a3ff12]/10 text-[#a3ff12]"
                              : "bg-white/5 text-white/20"
                          }
                        `}
                      >

                        {item.completed ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Clock3 className="h-4 w-4" />
                        )}

                      </div>


                      <div className="min-w-0 flex-1">

                        <p className="text-sm capitalize text-white/60">
                          {item.completedAt.toLocaleDateString(
                            "es-AR",
                            {
                              weekday: "long",
                              day: "numeric",
                              month: "long",
                            }
                          )}
                        </p>


                        {item.comment && (
                          <p className="mt-1 truncate text-xs text-white/25">
                            {item.comment}
                          </p>
                        )}

                      </div>


                      <span
                        className={`
                          shrink-0
                          text-[10px]
                          font-semibold
                          ${
                            item.completed
                              ? "text-[#a3ff12]"
                              : "text-white/20"
                          }
                        `}
                      >
                        {item.completed
                          ? "Hecho"
                          : "Pendiente"}
                      </span>

                    </div>

                  )
                )}

            </div>

          ) : (

            <div
              className="
                mt-4
                rounded-[26px]
                border border-dashed
                border-white/10
                bg-white/2
                px-5 py-10
                text-center
              "
            >

              <div
                className="
                  mx-auto grid h-11 w-11
                  place-items-center
                  rounded-2xl
                  bg-white/4
                  text-white/20
                "
              >
                <Target className="h-5 w-5" />
              </div>


              <p className="mt-4 text-sm font-medium text-white/45">
                Todavía no hay registros
              </p>

              <p className="mt-1 text-xs text-white/25">
                Tus progresos aparecerán acá.
              </p>

            </div>

          )}

        </section>


        {/* ====================================================
            EDIT
        ==================================================== */}

        <Link
          href={`/dashboard/habits/${habit.id}/edit`}
          className="
            mt-10
            flex h-12
            items-center
            justify-between
            rounded-2xl
            border border-white/5.5
            bg-white/2.5
            px-4
            text-sm
            text-white/40
            transition
            hover:bg-white/5
            hover:text-white
          "
        >

          <span className="flex items-center gap-3">

            <Pencil className="h-4 w-4" />

            Editar hábito

          </span>


          <ChevronRight className="h-4 w-4" />

        </Link>

      </div>

    </main>
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
    <div>

      <p className="text-[10px] font-semibold uppercase tracking-[.18em] text-white/25">
        {eyebrow}
      </p>

      <h2 className="mt-1 text-xl font-semibold tracking-tight">
        {title}
      </h2>

    </div>
  );
}


/*
|--------------------------------------------------------------------------
| METRIC CARD
|--------------------------------------------------------------------------
*/

function MetricCard({
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


      <p className="mt-4 text-2xl font-semibold tracking-tight">
        {value}
      </p>

      <p className="mt-1 text-xs text-white/25">
        {detail}
      </p>

    </div>
  );
}

