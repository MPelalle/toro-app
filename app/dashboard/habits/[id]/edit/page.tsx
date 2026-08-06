
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ChevronRight,
  Info,
  Trash2,
} from "lucide-react";

import { getHabit } from "@/lib/habits";
import {
  deleteHabit,
  updateHabit,
} from "../../actions";
import { HabitForm } from "../../habit-form";

export default async function EditHabitPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const habit = await getHabit(id);

  if (!habit) {
    notFound();
  }

  const update = updateHabit.bind(
    null,
    id
  );

  const remove = deleteHabit.bind(
    null,
    id
  );

  return (
    <main className="min-h-dvh bg-[#080908] text-white mt-25">

      {/* ======================================================
          AMBIENT BACKGROUND
      ====================================================== */}

      <div
        className="
          pointer-events-none fixed inset-x-0 top-0
          h-90
          bg-[radial-gradient(ellipse_at_top,rgba(163,255,18,.08),transparent_65%)]
        "
      />


      <div className="relative mx-auto max-w-2xl px-4 pb-16 pt-5 sm:px-6 sm:pt-8">

        {/* ====================================================
            HEADER
        ==================================================== */}

        <header className="flex items-center justify-between">

          <Link
            href={`/dashboard/habits/${id}`}
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
            Hábito
          </Link>

        </header>


        {/* ====================================================
            TITLE
        ==================================================== */}

        <section className="mt-9">

          <p className="text-[10px] font-semibold uppercase tracking-[.2em] text-[#a3ff12]">
            Configuración
          </p>

          <h1 className="mt-2 text-[34px] font-semibold tracking-[-.045em]">
            Editar hábito
          </h1>

          <p className="mt-2 text-sm leading-6 text-white/35">
            Ajustá los detalles de tu hábito.
          </p>

        </section>


        {/* ====================================================
            HABIT PREVIEW
        ==================================================== */}

        <section
          className="
            mt-7
            flex items-center gap-4
            rounded-[26px]
            border border-white/5.5
            bg-white/3
            p-4
          "
        >

          <div
            className="
              grid h-11 w-11
              shrink-0
              place-items-center
              rounded-2xl
              bg-[#a3ff12]/10
              text-[#a3ff12]
            "
          >

            <span className="h-2.5 w-2.5 rounded-full bg-[#a3ff12]" />

          </div>


          <div className="min-w-0 flex-1">

            <p className="truncate font-semibold">
              {habit.name}
            </p>

            <p className="mt-1 text-xs text-white/30">
              {habit.status === "ACTIVE"
                ? "Hábito activo"
                : "Hábito pausado"}
            </p>

          </div>

        </section>


        {/* ====================================================
            FORM
        ==================================================== */}

        <section className="mt-5">

          <div
            className="
              overflow-hidden
              rounded-[28px]
              border border-white/5.5
              bg-white/3
            "
          >

            <div className="border-b border-white/5 px-5 py-4 sm:px-6">

              <p className="text-[10px] font-semibold uppercase tracking-[.17em] text-white/25">
                Información
              </p>

              <h2 className="mt-1 text-base font-semibold">
                Detalles del hábito
              </h2>

            </div>


            <div className="p-5 sm:p-6">

              <HabitForm
                action={update}
                submitLabel="Guardar cambios"
                values={habit}
              />

            </div>

          </div>

        </section>


        {/* ====================================================
            INFORMATION
        ==================================================== */}

        <section
          className="
            mt-4
            flex gap-3
            rounded-[22px]
            border border-white/4.5
            bg-white/2
            px-4 py-4
          "
        >

          <Info
            className="
              mt-0.5
              h-4 w-4
              shrink-0
              text-white/25
            "
          />

          <p className="text-xs leading-5 text-white/30">
            Los cambios se aplicarán al hábito
            inmediatamente. Tus registros
            anteriores no se modificarán.
          </p>

        </section>


        {/* ====================================================
            DANGER ZONE
        ==================================================== */}

        <section className="mt-12">

          <p className="text-[10px] font-semibold uppercase tracking-[.2em] text-red-300/50">
            Zona de peligro
          </p>

          <div
            className="
              mt-3
              overflow-hidden
              rounded-[26px]
              border border-red-400/10
              bg-red-400/2.5
            "
          >

            <form action={remove}>

              <button
                type="submit"
                className="
                  group
                  flex w-full
                  items-center
                  justify-between
                  gap-4
                  px-5 py-4
                  text-left
                  transition
                  hover:bg-red-400/5
                  sm:px-6
                "
              >

                <div className="flex items-center gap-4">

                  <div
                    className="
                      grid h-10 w-10
                      shrink-0
                      place-items-center
                      rounded-xl
                      bg-red-400/8
                      text-red-300
                    "
                  >

                    <Trash2 className="h-4 w-4" />

                  </div>


                  <div>

                    <p className="text-sm font-semibold text-red-200">
                      Eliminar hábito
                    </p>

                    <p className="mt-0.5 text-xs text-red-200/35">
                      Esta acción no se puede deshacer.
                    </p>

                  </div>

                </div>


                <ChevronRight
                  className="
                    h-4 w-4
                    text-red-300/30
                    transition-transform
                    group-hover:translate-x-0.5
                  "
                />

              </button>

            </form>

          </div>

        </section>


        {/* ====================================================
            BACK
        ==================================================== */}

        <Link
          href={`/dashboard/habits/${id}`}
          className="
            mt-6
            flex h-12
            items-center
            justify-center
            rounded-2xl
            text-sm
            font-medium
            text-white/30
            transition
            hover:bg-white/[.035]
            hover:text-white/60
          "
        >
          Cancelar
        </Link>

      </div>

    </main>
  );
}

