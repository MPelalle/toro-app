import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  Copy,
  Dumbbell,
  ExternalLink,
  Layers3,
} from "lucide-react";
import { SharePublicLinkButton } from "@/components/community/SharePublicLinkButton";
import { getPublicRoutine } from "@/lib/public-routine";

export const dynamic = "force-dynamic";

function siteUrl() {
  const configured =
    process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "https://toro.app";
  try {
    return new URL(configured);
  } catch {
    return new URL("https://toro.app");
  }
}

function routineDescription(
  routine: NonNullable<Awaited<ReturnType<typeof getPublicRoutine>>>,
) {
  const creator = routine.creator.nickname
    ? ` por @${routine.creator.nickname}`
    : "";
  return `${routine.name}${creator}: ${routine.days.length || 1} dias, ${routine.exerciseCount} ejercicios y ${routine.setCount} series. Descubrila e importa una copia editable en TORO.`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const routine = await getPublicRoutine(id);
  if (!routine) return { title: "Rutina no disponible" };
  const url = new URL(`/routine/${routine.id}`, siteUrl());
  const description = routineDescription(routine);
  const image = new URL("/icons/toro-icon-1024.png", siteUrl());
  return {
    title: `${routine.name} | Rutina TORO`,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      siteName: "TORO",
      title: `${routine.name} | TORO`,
      description,
      url,
      images: [{ url: image, width: 1024, height: 1024, alt: "TORO" }],
    },
    twitter: {
      card: "summary",
      title: `${routine.name} | TORO`,
      description,
      images: [image],
    },
  };
}

export default async function PublicRoutinePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const routine = await getPublicRoutine(id);
  if (!routine) notFound();

  const exercisesByDay = new Map<string, typeof routine.exercises>();
  for (const exercise of routine.exercises) {
    exercisesByDay.set(exercise.trainingDay, [
      ...(exercisesByDay.get(exercise.trainingDay) || []),
      exercise,
    ]);
  }
  const dayOrder = [
    ...routine.days,
    ...[...exercisesByDay.keys()].filter((day) => !routine.days.includes(day)),
  ];
  const routinePath = `/routine/${routine.id}`;
  const creatorLabel = routine.creator.nickname
    ? `@${routine.creator.nickname}`
    : routine.creator.name;

  return (
    <main className="min-h-dvh bg-[#090a08] px-4 py-8 text-white sm:px-8 sm:py-12">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-bold tracking-[.16em] text-[#b7ff00] hover:text-white"
        >
          TORO
        </Link>
        <header className="mt-8 overflow-hidden rounded-[30px] border border-[#b7ff00]/20 bg-[radial-gradient(circle_at_top_right,rgba(183,255,0,.12),transparent_40%),#10110e] p-5 sm:p-8">
          <p className="text-[10px] font-bold tracking-[.22em] text-[#b7ff00]/75">
            RUTINA PUBLICA
          </p>
          <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold tracking-[-.055em] sm:text-5xl">
                {routine.name}
              </h1>
              <p className="mt-3 text-sm text-white/55">
                {routine.type} · {routine.exerciseCount} ejercicios · {routine.setCount} series
              </p>
            </div>
            <Dumbbell size={27} className="shrink-0 text-[#b7ff00]" />
          </div>
          <div className="mt-6 flex items-center gap-3 border-t border-white/[.08] pt-5">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-[#b7ff00]/12 text-sm font-black text-[#b7ff00]">
              {routine.creator.name.slice(0, 1).toUpperCase()}
            </div>
            <p className="text-xs text-white/55">
              Creada por{" "}
              {routine.creator.profilePath ? (
                <Link
                  href={routine.creator.profilePath}
                  className="font-bold text-white hover:text-[#b7ff00]"
                >
                  {creatorLabel}
                </Link>
              ) : (
                <span className="font-bold text-white">{creatorLabel}</span>
              )}
            </p>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {routine.days.length ? (
              routine.days.map((day) => (
                <span
                  key={day}
                  className="rounded-lg bg-white/[.06] px-2.5 py-1.5 text-xs font-semibold text-white/65"
                >
                  {day}
                </span>
              ))
            ) : (
              <span className="rounded-lg bg-white/[.06] px-2.5 py-1.5 text-xs font-semibold text-white/65">
                Plan flexible
              </span>
            )}
          </div>
          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            <Link
              href={`/dashboard/community/library/${routine.id}`}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#b7ff00] px-4 py-3 text-sm font-bold text-black"
            >
              <Copy size={16} /> Importar rutina <ArrowRight size={15} />
            </Link>
            <SharePublicLinkButton
              path={routinePath}
              title={`${routine.name} | TORO`}
              text={`Mira esta rutina de entrenamiento en TORO: ${routine.name}.`}
            />
          </div>
          <p className="mt-3 text-center text-[11px] text-white/30">
            Al importarla se crea una copia independiente que podes editar.
          </p>
        </header>

        <section className="mt-10">
          <div className="flex items-center gap-2">
            <Layers3 size={17} className="text-[#b7ff00]" />
            <div>
              <p className="text-[10px] font-bold tracking-[.18em] text-[#b7ff00]/70">
                ESTRUCTURA
              </p>
              <h2 className="mt-1 text-xl font-semibold">Dias, ejercicios y series</h2>
            </div>
          </div>
          <div className="mt-5 space-y-7">
            {dayOrder
              .filter((day) => exercisesByDay.has(day))
              .map((day) => {
                const exercises = exercisesByDay.get(day) || [];
                return (
                  <section key={day}>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="rounded-lg bg-[#b7ff00]/12 px-2.5 py-1 text-xs font-bold text-[#b7ff00]">
                        {day}
                      </span>
                      <span className="text-xs text-white/35">
                        {exercises.length} ejercicios ·{" "}
                        {exercises.reduce((total, exercise) => total + exercise.sets, 0)} series
                      </span>
                    </div>
                    <div className="mt-3 space-y-2">
                      {exercises.map((exercise) => (
                        <article
                          key={exercise.id}
                          className="flex items-start justify-between gap-4 rounded-2xl border border-white/[.08] bg-[#10110e] p-4"
                        >
                          <div>
                            <h3 className="font-semibold">{exercise.name}</h3>
                            <p className="mt-1 text-xs text-white/40">
                              {exercise.muscle} · {exercise.technique}
                            </p>
                          </div>
                          <p className="shrink-0 text-right text-sm font-bold text-[#b7ff00]">
                            {exercise.sets} × {exercise.reps}
                            <span className="mt-1 block text-[11px] font-medium text-white/40">
                              {exercise.weight > 0 ? `${exercise.weight} kg` : "Sin carga"}
                            </span>
                          </p>
                        </article>
                      ))}
                    </div>
                  </section>
                );
              })}
          </div>
        </section>

        <footer className="mt-12 rounded-2xl border border-white/[.08] bg-white/[.025] p-5 text-center">
          <p className="text-sm font-semibold">Entrena con tu propia copia.</p>
          <p className="mt-2 text-sm text-white/40">
            TORO guarda tu progreso sin modificar la rutina original.
          </p>
          <Link
            href={`/dashboard/community/library/${routine.id}`}
            className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-[#b7ff00]"
          >
            Abrir en TORO <ExternalLink size={15} />
          </Link>
        </footer>
      </div>
    </main>
  );
}
