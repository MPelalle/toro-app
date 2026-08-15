"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, ChevronLeft, Dumbbell, Images, LayoutTemplate, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { ExerciseThumbnail } from "@/components/workout/ExerciseThumbnail";
import { ExerciseVideoModal } from "@/components/workout/ExerciseVideoModal";
import { exerciseOptions, muscleGroups, type ExerciseOption } from "@/lib/exercise-catalog";
import { createRoutineOfflineFirst } from "@/lib/routines";

type DraftExercise = {
  id: string;
  catalogId: string;
  name: string;
  muscle: string;
  muscleId: string;
  sets: number;
  reps: number;
};
type CreateScreen = "choice" | "templates" | "builder";
type BuilderStep = "select" | "targets";

const days = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const seriesOptions = [2, 3, 4, 5, 6];
const repsOptions = [6, 8, 10, 12, 15, 20];
const templates = [
  { name: "Fullbody esencial", description: "Una base simple para entrenar todo el cuerpo.", days: ["Lun", "Mié", "Vie"], exercises: ["sentadilla_barra", "press_banca_barra", "remo_barra", "press_militar_barra"] },
  { name: "Push / Pull / Legs", description: "Separá empuje, tirón y piernas a tu ritmo.", days: ["Lun", "Mar", "Mié", "Vie", "Sáb"], exercises: ["press_inclinado_barra", "aperturas_mancuernas", "fondos_pecho", "elevaciones_laterales_mancuernas"] },
  { name: "Torso / Pierna", description: "Alterná torso y piernas con una estructura equilibrada.", days: ["Lun", "Mar", "Jue", "Vie"], exercises: ["press_banca_barra", "dominadas_pronas", "sentadilla_barra", "peso_muerto_rumano"] },
];

function makeExercise(option: ExerciseOption): DraftExercise {
  return {
    id: `${option.id}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    catalogId: option.id,
    name: option.name,
    muscle: option.muscle,
    muscleId: option.muscleId,
    sets: 3,
    reps: 10,
  };
}

export default function NewRoutinePage() {
  const router = useRouter();
  const [screen, setScreen] = useState<CreateScreen>("choice");
  const [builderStep, setBuilderStep] = useState<BuilderStep>("select");
  const [name, setName] = useState("Nueva rutina");
  const [selectedDays, setSelectedDays] = useState(["Lun"]);
  const [activeDay, setActiveDay] = useState("Lun");
  const [byDay, setByDay] = useState<Record<string, DraftExercise[]>>({ Lun: [] });
  const [search, setSearch] = useState("");
  const [muscleFilter, setMuscleFilter] = useState("all");
  const [error, setError] = useState("");
  const exercises = byDay[activeDay] ?? [];

  const exerciseGroups = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("es");
    return muscleGroups
      .filter((group) => muscleFilter === "all" || group.id === muscleFilter)
      .map((group) => ({
        ...group,
        exercises: {
          multiarticulares: group.exercises.multiarticulares.filter((exercise) => !query || exercise.name.toLocaleLowerCase("es").includes(query) || group.name.toLocaleLowerCase("es").includes(query)),
          uniarticulares: group.exercises.uniarticulares.filter((exercise) => !query || exercise.name.toLocaleLowerCase("es").includes(query) || group.name.toLocaleLowerCase("es").includes(query)),
        },
      }))
      .filter((group) => group.exercises.multiarticulares.length || group.exercises.uniarticulares.length);
  }, [muscleFilter, search]);

  const updateExercises = (next: DraftExercise[]) => {
    setByDay((current) => ({ ...current, [activeDay]: next }));
  };

  const openCustomBuilder = () => {
    setName("Nueva rutina");
    setSelectedDays(["Lun"]);
    setActiveDay("Lun");
    setByDay({ Lun: [] });
    setSearch("");
    setMuscleFilter("all");
    setBuilderStep("select");
    setError("");
    setScreen("builder");
  };

  const toggleDay = (day: string) => {
    if (selectedDays.includes(day)) {
      if (selectedDays.length === 1) return;
      const next = selectedDays.filter((item) => item !== day);
      setSelectedDays(next);
      if (activeDay === day) {
        setActiveDay(next[0]);
        if (!(byDay[next[0]]?.length)) setBuilderStep("select");
      }
      return;
    }
    setSelectedDays((current) => [...current, day]);
    setByDay((current) => ({ ...current, [day]: current[day] ?? [] }));
    setActiveDay(day);
    setBuilderStep("select");
  };

  const toggleExercise = (option: ExerciseOption) => {
    const exists = exercises.some((exercise) => exercise.catalogId === option.id);
    updateExercises(exists ? exercises.filter((exercise) => exercise.catalogId !== option.id) : [...exercises, makeExercise(option)]);
  };

  const applyTemplate = (template: typeof templates[number]) => {
    const templateExercises = template.exercises
      .map((catalogId) => exerciseOptions.find((option) => option.id === catalogId))
      .filter((option): option is ExerciseOption => Boolean(option));
    setName(template.name);
    setSelectedDays(template.days);
    setActiveDay(template.days[0]);
    setByDay(Object.fromEntries(template.days.map((day) => [day, templateExercises.map(makeExercise)])));
    setSearch("");
    setMuscleFilter("all");
    setError("");
    setBuilderStep("targets");
    setScreen("builder");
  };

  const continueToTargets = () => {
    if (!exercises.length) {
      setError(`Elegí al menos un ejercicio para ${activeDay}.`);
      return;
    }
    setError("");
    setBuilderStep("targets");
  };

  const selectDay = (day: string) => {
    setActiveDay(day);
    if (!(byDay[day]?.length)) setBuilderStep("select");
  };

  const saveRoutine = async () => {
    const missingDay = selectedDays.find((day) => !(byDay[day]?.length));
    if (!name.trim()) {
      setError("Poné un nombre para la rutina.");
      return;
    }
    if (missingDay) {
      setActiveDay(missingDay);
      setBuilderStep("select");
      setError(`Elegí ejercicios para ${missingDay} antes de crear la rutina.`);
      return;
    }
    const routineExercises = selectedDays.flatMap((day) => (byDay[day] ?? []).map((exercise) => ({
      catalogExerciseId: exercise.catalogId,
      name: exercise.name,
      muscle: exercise.muscle,
      sets: exercise.sets,
      reps: exercise.reps,
      // Se mantienen sólo por compatibilidad con el modelo actual. Se completan al entrenar.
      weight: 0,
      technique: "Normal",
      completed: null,
      actualReps: null,
      note: "",
      trainingDay: day,
    })));
    setError("");
    try {
      const routine = await createRoutineOfflineFirst({ name, type: "Personalizada", days: selectedDays, exercises: routineExercises });
      router.push(`/dashboard/routine/${routine.id}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo crear la rutina.");
    }
  };

  if (screen === "choice") return <CreateChoice onCustom={openCustomBuilder} onTemplates={() => { setError(""); setScreen("templates"); }} />;
  if (screen === "templates") return <TemplateChoice onBack={() => setScreen("choice")} onChoose={applyTemplate} />;

  return (
    <main className="min-h-dvh bg-[#090a08] px-4 pb-36 pt-28 text-white sm:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/dashboard/routine" className="inline-flex items-center gap-2 text-xs text-white/45 hover:text-white"><ArrowLeft size={15} /> Volver a rutinas</Link>
          <button type="button" onClick={() => { setError(""); setScreen("choice"); }} className="inline-flex items-center gap-1 text-xs font-semibold text-white/45 hover:text-white"><ChevronLeft size={15} /> Elegir otra base</button>
        </div>
        <header className="mt-8 flex flex-wrap items-end justify-between gap-4">
          <div><p className="text-[10px] font-bold tracking-[.22em] text-[#b7ff00]/70">NUEVA RUTINA</p><h1 className="mt-2 text-3xl font-semibold tracking-[-.05em] sm:text-4xl">{builderStep === "select" ? "Elegí tus ejercicios." : "Ajustá tu plan."}</h1><p className="mt-2 text-sm text-white/40">Sin tipos rígidos: armala como vos entrenás.</p></div>
          <span className="rounded-xl border border-[#b7ff00]/20 bg-[#b7ff00]/[.06] px-3 py-2 text-xs font-semibold text-[#d7ff78]">{selectedDays.reduce((total, day) => total + (byDay[day]?.length || 0), 0)} ejercicios</span>
        </header>

        <section className="mt-7 rounded-[28px] border border-white/[.08] bg-[#10110e] p-5 sm:p-7">
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <Label text="Nombre de la rutina"><input className="input" value={name} maxLength={80} onChange={(event) => setName(event.target.value)} /></Label>
            <div className="flex rounded-xl bg-black/20 p-1 text-xs font-semibold"><button type="button" onClick={() => setBuilderStep("select")} className={`rounded-lg px-3 py-2 ${builderStep === "select" ? "bg-[#b7ff00] text-black" : "text-white/45"}`}>1. Ejercicios</button><button type="button" onClick={continueToTargets} className={`rounded-lg px-3 py-2 ${builderStep === "targets" ? "bg-[#b7ff00] text-black" : "text-white/45"}`}>2. Series y reps</button></div>
          </div>
          <div className="mt-6"><p className="mb-2 text-xs font-medium text-white/55">Días que querés entrenar</p><div className="flex flex-wrap gap-2">{days.map((day) => <button key={day} type="button" onClick={() => toggleDay(day)} className={`rounded-xl px-3 py-2 text-xs font-semibold ${selectedDays.includes(day) ? "bg-[#b7ff00] text-black" : "border border-white/10 text-white/45"}`}>{day}</button>)}</div></div>
          <div role="tablist" aria-label="Día de entrenamiento" className="mt-5 flex gap-2 overflow-x-auto border-t border-white/[.07] pt-5 pb-1">{selectedDays.map((day) => <button key={day} type="button" role="tab" aria-selected={activeDay === day} onClick={() => selectDay(day)} className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold ${activeDay === day ? "bg-[#b7ff00] text-black" : "bg-white/[.05] text-white/55"}`}>{day} <span className="ml-1 opacity-60">{(byDay[day] ?? []).length}</span></button>)}</div>

          {error && <p role="alert" className="mt-5 rounded-xl border border-red-400/20 bg-red-400/[.08] p-3 text-sm text-red-200">{error}</p>}
          {builderStep === "select" ? <ExerciseGallery groups={exerciseGroups} selected={exercises} search={search} muscleFilter={muscleFilter} activeDay={activeDay} onSearch={setSearch} onMuscleFilter={setMuscleFilter} onToggle={toggleExercise} onContinue={continueToTargets} /> : <ExerciseTargetsStep exercises={exercises} activeDay={activeDay} onBack={() => setBuilderStep("select")} onChange={(exerciseId, patch) => updateExercises(exercises.map((item) => item.id === exerciseId ? { ...item, ...patch } : item))} onRemove={(exerciseId) => updateExercises(exercises.filter((item) => item.id !== exerciseId))} onSave={() => void saveRoutine()} />}
        </section>
      </div>
    </main>
  );
}

function CreateChoice({ onCustom, onTemplates }: { onCustom: () => void; onTemplates: () => void }) {
  return <main className="min-h-dvh bg-[#090a08] px-4 pb-36 pt-28 text-white sm:px-8"><div className="mx-auto max-w-4xl"><Link href="/dashboard/routine" className="inline-flex items-center gap-2 text-xs text-white/45 hover:text-white"><ArrowLeft size={15} /> Volver a rutinas</Link><header className="mt-8"><p className="text-[10px] font-bold tracking-[.22em] text-[#b7ff00]/70">NUEVA RUTINA</p><h1 className="mt-2 text-3xl font-semibold tracking-[-.05em] sm:text-4xl">¿Cómo querés empezar?</h1><p className="mt-2 text-sm text-white/40">Elegí una opción. Después podés dejarla totalmente a tu manera.</p></header><div className="mt-8 grid gap-4 sm:grid-cols-2"><button type="button" onClick={onCustom} className="group rounded-[28px] border border-[#b7ff00]/25 bg-[#10110e] p-6 text-left transition hover:border-[#b7ff00]/60 hover:bg-[#b7ff00]/[.05]"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#b7ff00] text-black"><Dumbbell size={22} /></span><h2 className="mt-7 text-xl font-semibold">Crear desde cero</h2><p className="mt-2 text-sm leading-6 text-white/40">Elegí los ejercicios de cada día y definí tus propias series y reps.</p><span className="mt-7 inline-flex text-sm font-bold text-[#b7ff00]">Empezar ahora →</span></button><button type="button" onClick={onTemplates} className="group rounded-[28px] border border-white/[.09] bg-[#10110e] p-6 text-left transition hover:border-white/25 hover:bg-white/[.035]"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-sky-300/15 text-sky-200"><LayoutTemplate size={22} /></span><h2 className="mt-7 text-xl font-semibold">Usar una prediseñada</h2><p className="mt-2 text-sm leading-6 text-white/40">Arrancá con una base ya organizada y cambiala cuando quieras.</p><span className="mt-7 inline-flex text-sm font-bold text-sky-200">Ver plantillas →</span></button></div></div></main>;
}

function TemplateChoice({ onBack, onChoose }: { onBack: () => void; onChoose: (template: typeof templates[number]) => void }) {
  return <main className="min-h-dvh bg-[#090a08] px-4 pb-36 pt-28 text-white sm:px-8"><div className="mx-auto max-w-4xl"><button type="button" onClick={onBack} className="inline-flex items-center gap-2 text-xs text-white/45 hover:text-white"><ChevronLeft size={15} /> Volver a las opciones</button><header className="mt-8"><p className="text-[10px] font-bold tracking-[.22em] text-[#b7ff00]/70">PLANTILLAS</p><h1 className="mt-2 text-3xl font-semibold tracking-[-.05em] sm:text-4xl">Elegí una base.</h1><p className="mt-2 text-sm text-white/40">No te ata a ningún formato: después podés editar ejercicios, series y reps.</p></header><div className="mt-8 grid gap-4">{templates.map((template) => <button key={template.name} type="button" onClick={() => onChoose(template)} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/[.08] bg-[#10110e] p-5 text-left transition hover:border-[#b7ff00]/35 hover:bg-[#b7ff00]/[.035]"><div><p className="text-lg font-semibold">{template.name}</p><p className="mt-1 max-w-xl text-sm text-white/40">{template.description}</p></div><div className="flex shrink-0 gap-2 text-xs"><span className="rounded-lg bg-white/[.06] px-2.5 py-1.5 text-white/60">{template.days.length} días</span><span className="rounded-lg bg-[#b7ff00]/[.08] px-2.5 py-1.5 font-semibold text-[#d7ff78]">{template.exercises.length} ejercicios</span></div></button>)}</div></div></main>;
}

function ExerciseGallery({ groups, selected, search, muscleFilter, activeDay, onSearch, onMuscleFilter, onToggle, onContinue }: { groups: Array<{ id: string; name: string; exercises: { multiarticulares: readonly { id: string; name: string; equipment: readonly string[] }[]; uniarticulares: readonly { id: string; name: string; equipment: readonly string[] }[] } }>; selected: DraftExercise[]; search: string; muscleFilter: string; activeDay: string; onSearch: (value: string) => void; onMuscleFilter: (value: string) => void; onToggle: (exercise: ExerciseOption) => void; onContinue: () => void }) {
  return <div className="mt-6">
  {/* HEADER */}
  <div className="flex flex-wrap items-end justify-between gap-3">
    <div>
      <p className="text-lg font-semibold text-white">
        Ejercicios para {activeDay}
      </p>

      <p className="mt-1 text-xs text-white/35">
        Tocalos para seleccionar varios. El número marca el orden en tu rutina.
      </p>
    </div>

    <span className="rounded-lg bg-[#b7ff00]/[.08] px-2.5 py-1.5 text-xs font-semibold text-[#d7ff78]">
      {selected.length} seleccionados
    </span>
  </div>

  {/* FILTROS MUSCULARES */}
  <div
    className="
      mt-5
      flex
      gap-2
      overflow-x-auto
      pb-1
      [scrollbar-width:none]
      [&::-webkit-scrollbar]:hidden
    "
  >
    {[
      { id: "all", name: "Todos" },
      ...muscleGroups.map((group) => ({
        id: group.id,
        name: group.name,
      })),
    ].map((group) => (
      <button
        key={group.id}
        type="button"
        onClick={() => onMuscleFilter(group.id)}
        className={`
          shrink-0
          rounded-full
          px-3
          py-2
          text-xs
          font-semibold
          transition
          ${
            muscleFilter === group.id
              ? "bg-[#b7ff00] text-black"
              : "bg-white/[.05] text-white/50 hover:bg-white/[.08] hover:text-white/70"
          }
        `}
      >
        {group.name}
      </button>
    ))}
  </div>

  {/* LISTA DE EJERCICIOS */}
  <div className="mt-6 space-y-7">
    {groups.map((group) => (
      <section key={group.id}>
        {/* NOMBRE DEL GRUPO */}
        <div className="mb-2 flex items-center gap-3 px-1">
          <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-white/40">
            {group.name}
          </h2>

          <span className="h-px flex-1 bg-white/[.07]" />
        </div>

        {/* CONTENEDOR TIPO HEVY */}
        <div
          className="
            overflow-hidden
            rounded-2xl
            border
            border-white/[.07]
            bg-white/[.02]
          "
        >
          {[
            ...group.exercises.multiarticulares,
            ...group.exercises.uniarticulares,
          ].map((exercise, exerciseIndex, allExercises) => {
            const selectedIndex = selected.findIndex(
              (item) => item.catalogId === exercise.id
            );

            const option: ExerciseOption = {
              id: exercise.id,
              name: exercise.name,
              equipment: [...exercise.equipment],
              muscle: group.name,
              muscleId: group.id,
              category: group.exercises.multiarticulares.some(
                (item) => item.id === exercise.id
              )
                ? "multiarticulares"
                : "uniarticulares",
            };

            return (
              <button
                key={exercise.id}
                type="button"
                aria-pressed={selectedIndex >= 0}
                onClick={() => onToggle(option)}
                className={`
                  group
                  relative
                  flex
                  min-h-[74px]
                  w-full
                  items-center
                  gap-3
                  px-3
                  py-2.5
                  text-left
                  transition
                  active:scale-[0.995]

                  ${
                    exerciseIndex !== allExercises.length - 1
                      ? "border-b border-white/[.06]"
                      : ""
                  }

                  ${
                    selectedIndex >= 0
                      ? "bg-[#b7ff00]/[.07]"
                      : "bg-transparent hover:bg-white/[.035]"
                  }
                `}
              >
                {/* MINIATURA */}
                <div
                  className={`
                    relative
                    shrink-0
                    overflow-hidden
                    rounded-xl
                    border
                    transition
                    ${
                      selectedIndex >= 0
                        ? "border-[#b7ff00]/40 bg-[#b7ff00]/[.05]"
                        : "border-white/[.06] bg-[#10110e]"
                    }
                  `}
                >
                  <ExerciseThumbnail
                    exerciseId={exercise.id}
                    muscleId={group.id}
                    name={exercise.name}
                    className="rounded-xl"
                  />
                </div>

                {/* TEXTO */}
                <div className="min-w-0 flex-1">
                  <span
                    className={`
                      block
                      truncate
                      text-sm
                      font-semibold
                      leading-5
                      transition
                      ${
                        selectedIndex >= 0
                          ? "text-white"
                          : "text-white/85 group-hover:text-white"
                      }
                    `}
                  >
                    {exercise.name}
                  </span>

                  <span className="mt-0.5 block truncate text-[11px] text-white/35">
                    {exercise.equipment.join(" · ")}
                  </span>
                </div>

                {/* INDICADOR DE SELECCIÓN */}
                <span
                  className={`
                    grid
                    h-8
                    w-8
                    shrink-0
                    place-items-center
                    rounded-full
                    text-xs
                    font-black
                    transition

                    ${
                      selectedIndex >= 0
                        ? "bg-[#b7ff00] text-black shadow-[0_0_18px_rgba(183,255,0,0.15)]"
                        : "border border-white/[.12] bg-white/[.03] text-white/30 group-hover:border-white/25 group-hover:text-white/60"
                    }
                  `}
                >
                  {selectedIndex >= 0 ? selectedIndex + 1 : "+"}
                </span>
              </button>
            );
          })}
        </div>
      </section>
    ))}
  </div>

  {/* SIN RESULTADOS */}
  {!groups.length && (
    <p className="mt-6 rounded-xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-white/35">
      No encontramos ejercicios con esa búsqueda.
    </p>
  )}

  {/* BARRA INFERIOR */}
  <div
    className="
      sticky
      bottom-3
      z-10
      mt-8
      flex
      flex-wrap
      items-center
      justify-between
      gap-3
      rounded-2xl
      border
      border-white/[.1]
      bg-[#151712]/95
      p-3
      shadow-2xl
      backdrop-blur-xl
    "
  >
    <p className="px-2 text-sm text-white/55">
      <span className="font-bold text-white">
        {selected.length}
      </span>{" "}
      ejercicios para {activeDay}
    </p>

    <button
      type="button"
      disabled={!selected.length}
      onClick={onContinue}
      className="
        inline-flex
        items-center
        gap-2
        rounded-xl
        bg-[#b7ff00]
        px-4
        py-3
        text-sm
        font-bold
        text-black
        transition
        active:scale-[0.97]
        disabled:cursor-not-allowed
        disabled:opacity-40
      "
    >
      <Check size={16} />
      Continuar
    </button>
  </div>
</div>
}

function ExerciseTargetsStep({ exercises, activeDay, onBack, onChange, onRemove, onSave }: { exercises: DraftExercise[]; activeDay: string; onBack: () => void; onChange: (exerciseId: string, patch: Partial<DraftExercise>) => void; onRemove: (exerciseId: string) => void; onSave: () => void }) {
  return <div className="mt-6"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-lg font-semibold">Series y reps de {activeDay}</p><p className="mt-1 text-xs text-white/35">Rápido y simple. El peso se carga recién cuando entrenás.</p></div><button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-xs font-bold text-[#b7ff00]"><Images size={15} /> Cambiar ejercicios</button></div>{exercises.length ? <div className="mt-5 space-y-3">{exercises.map((exercise, index) => <article key={exercise.id} className="rounded-2xl border border-white/[.08] bg-black/15 p-3 sm:p-4"><div className="flex flex-wrap items-start gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#b7ff00] text-xs font-black text-black">{index + 1}</span><ExerciseThumbnail exerciseId={exercise.catalogId} muscleId={exercise.muscleId} name={exercise.name} className="h-12 w-12 rounded-xl" /><div className="min-w-0 flex-1"><p className="truncate font-semibold">{exercise.name}</p><p className="mt-0.5 text-xs text-white/35">{exercise.muscle}</p><ExerciseVideoModal exerciseId={exercise.catalogId} exerciseName={exercise.name} className="mt-2"/></div><button type="button" onClick={() => onRemove(exercise.id)} className="grid h-8 w-8 place-items-center rounded-lg text-white/35 hover:bg-red-400/10 hover:text-red-300" aria-label={`Quitar ${exercise.name}`}><X size={15} /></button></div><div className="mt-4 grid gap-3 sm:grid-cols-2"><TargetPicker label="Series" value={exercise.sets} options={seriesOptions} onChange={(sets) => onChange(exercise.id, { sets })} /><TargetPicker label="Reps por serie" value={exercise.reps} options={repsOptions} onChange={(reps) => onChange(exercise.id, { reps })} /></div></article>)}</div> : <div className="mt-5 rounded-2xl border border-dashed border-white/10 px-5 py-10 text-center"><p className="text-sm text-white/45">No hay ejercicios para este día.</p><button type="button" onClick={onBack} className="mt-3 text-sm font-bold text-[#b7ff00]">Elegir ejercicios</button></div>}<div className="mt-6 flex flex-wrap justify-between gap-3 border-t border-white/[.07] pt-5"><button type="button" onClick={onBack} className="rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold text-white/65">Volver</button><button type="button" onClick={onSave} className="inline-flex items-center gap-2 rounded-xl bg-[#b7ff00] px-5 py-3 text-sm font-bold text-black"><Check size={16} /> Crear rutina</button></div></div>;
}

function TargetPicker({ label, value, options, onChange }: { label: string; value: number; options: number[]; onChange: (value: number) => void }) {
  return <fieldset><legend className="mb-2 text-xs font-semibold text-white/50">{label}</legend><div className={`grid gap-1.5 ${options.length === 5 ? "grid-cols-5" : "grid-cols-6"}`}>{options.map((option) => <button key={option} type="button" aria-pressed={value === option} onClick={() => onChange(option)} className={`min-h-9 rounded-lg text-xs font-bold transition ${value === option ? "bg-[#b7ff00] text-black" : "bg-white/[.055] text-white/55 hover:bg-white/[.1]"}`}>{option}</button>)}</div></fieldset>;
}

function Label({ text, children }: { text: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-2 block text-xs font-medium text-white/55">{text}</span>{children}</label>;
}
