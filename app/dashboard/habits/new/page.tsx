import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createHabit } from "../actions";
import { HabitForm } from "../habit-form";

export default function NewHabitPage() {
  return (
    <main className="relative min-h-dvh overflow-hidden bg-[#070807] px-5 py-8 text-white mt-20 sm:px-8">
      {/* ============================================================
          LIVING BACKGROUND
      ============================================================ */}

      {/* Main lime atmosphere */}
      <div
        className="
          pointer-events-none
          fixed
          -left-48
          -top-40
          -z-10
          h-125
          w-125
          rounded-full
          bg-[#a3ff12]/4.5
          blur-[140px]
          toro-breathe
        "
      />

      {/* Secondary atmosphere */}
      <div
        className="
          pointer-events-none
          fixed
          -bottom-64
          -right-56
          -z-10
          h-140
          w-140
          rounded-full
          bg-[#a3ff12]/2.5
          blur-[150px]
          toro-breathe-reverse
        "
      />

      {/* Central soft light */}
      <div
        className="
          pointer-events-none
          fixed
          left-1/2
          top-[40%]
          -z-10
          h-112.5
          w-112.5
          -translate-x-1/2
          rounded-full
          bg-white/[0.012]
          blur-[150px]
          toro-pulse
        "
      />

      {/* Top atmosphere */}
      <div
        className="
          pointer-events-none
          fixed
          inset-x-0
          top-0
          -z-10
          h-100
          bg-[radial-gradient(ellipse_at_top,rgba(163,255,18,.055),transparent_68%)]
        "
      />

      {/* Grain */}
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

      {/* ============================================================
          CONTENT
      ============================================================ */}

      <div className="relative z-10 mx-auto max-w-xl">
        {/* Back */}

        <Link
          href="/dashboard/habits"
          className="
            group
            inline-flex
            items-center
            gap-2
            rounded-full
            border
            border-white/[0.07]
            bg-white/2.5
            px-3.5
            py-2
            text-[12px]
            font-medium
            text-white/45
            backdrop-blur-xl
            transition-all
            duration-300
            hover:border-white/12
            hover:bg-white/5
            hover:text-white
          "
        >
          <ArrowLeft
            className="
              h-3.5
              w-3.5
              transition-transform
              duration-300
              group-hover:-translate-x-0.5
            "
          />

          Volver a hábitos
        </Link>

        {/* ============================================================
            HEADER
        ============================================================ */}

        <div className="mt-10">
          {/* Eyebrow */}

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
                text-[9px]
                font-bold
                uppercase
                tracking-[.24em]
                text-[#a3ff12]/75
              "
            >
              Nuevo hábito
            </p>
          </div>

          {/* Title */}

          <h1
            className="
              mt-3
              text-[38px]
              font-semibold
              leading-[0.98]
              tracking-[-.055em]
              text-white
              sm:text-[44px]
            "
          >
            Definí tu
            <br />
            próximo paso.
          </h1>

          {/* Description */}

          <div className="mt-4 flex items-center gap-2">
            <div className="h-px w-6 bg-[#a3ff12]/40" />

            <p className="text-[12px] font-medium tracking-[-.01em] text-white/30">
              Podés editarlo o pausarlo cuando quieras.
            </p>
          </div>
        </div>

        {/* ============================================================
            FORM CONTAINER
        ============================================================ */}

        <div
          className="
            relative
            mt-9
            overflow-hidden
            rounded-[28px]
            border
            border-white/8
            bg-white/2.5
            p-1
            shadow-[0_25px_80px_rgba(0,0,0,0.25)]
            backdrop-blur-2xl
          "
        >
          {/* Soft internal glow */}

          <div
            className="
              pointer-events-none
              absolute
              -right-24
              -top-24
              h-52
              w-52
              rounded-full
              bg-[#a3ff12]/[0.035]
              blur-[80px]
            "
          />

          {/* Top glass highlight */}

          <div
            className="
              pointer-events-none
              absolute
              left-[12%]
              right-[12%]
              top-0
              h-px
              bg-linear-to-r
              from-transparent
              via-white/[0.14]
              to-transparent
            "
          />

          <div className="relative rounded-3xl bg-[#0b0c0b]/60 p-5 sm:p-6">
            <HabitForm
              action={createHabit}
              submitLabel="Crear hábito"
            />
          </div>
        </div>
      </div>
    </main>
  );
}