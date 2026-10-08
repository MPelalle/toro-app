"use client";

import Link from "next/link";
import { CircleCheck, Dumbbell, FolderPlus, Layers3, Plus, TrendingUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  activateRoutineOfflineFirst,
  getRoutinesOfflineFirst,
  Routine,
} from "@/lib/routines";

type TrainingFolder = {
  id: string;
  name: string;
  kind: "PLAN" | "MESOCYCLE" | "SIX_MONTH_CYCLE";
  routineIds: string[];
};

export default function RoutinePage() {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [folders, setFolders] = useState<TrainingFolder[]>([]);
  const [error, setError] = useState("");
  const [folderFormOpen, setFolderFormOpen] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [folderKind, setFolderKind] = useState<TrainingFolder["kind"]>("PLAN");
  const [savingFolder, setSavingFolder] = useState(false);
  const load = async () => {
    const result = await getRoutinesOfflineFirst(setRoutines);
    setRoutines(result.routines);
    if (!result.routines.length && result.source === "cache")
      setError("No hay rutinas guardadas todavía para usar sin conexión.");
  };
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    });
    return () => window.clearTimeout(timer);
  }, []);

  const loadFolders = async () => {
    try {
      const response = await fetch("/api/training-folders", { cache: "no-store" });
      if (!response.ok) throw new Error("No pudimos cargar tus carpetas.");
      setFolders(await response.json() as TrainingFolder[]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No pudimos cargar tus carpetas.");
    }
  };

  useEffect(() => { const timer = window.setTimeout(() => void loadFolders()); return () => window.clearTimeout(timer); }, []);

  const active = routines.find((routine) => routine.active) || routines[0];
  const complete =
    active?.exercises.filter((exercise) => exercise.completed).length || 0;
  const plannedSets = useMemo(
    () =>
      active?.exercises.reduce((total, exercise) => total + exercise.sets, 0) ||
      0,
    [active],
  );
  const activate = async (id: string) => {
    try {
      const updated = await activateRoutineOfflineFirst(id);
      setRoutines((items) =>
        items.map((item) =>
          item.id === updated.id ? updated : { ...item, active: false },
        ),
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No pudimos activar la rutina.",
      );
    }
  };

  const createFolder = async () => {
    if (!folderName.trim() || savingFolder) return;
    setSavingFolder(true);
    setError("");
    try {
      const response = await fetch("/api/training-folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: folderName, kind: folderKind }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "No pudimos crear la carpeta.");
      setFolders((items) => [{ ...body, routineIds: [] }, ...items]);
      setFolderName("");
      setFolderFormOpen(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No pudimos crear la carpeta.");
    } finally {
      setSavingFolder(false);
    }
  };

  const assignFolder = async (routineId: string, folderId: string | null) => {
    setError("");
    try {
      const response = await fetch("/api/training-folders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ routineId, folderId }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "No pudimos mover la rutina.");
      setFolders((items) => items.map((folder) => ({
        ...folder,
        routineIds: folder.id === folderId
          ? [...folder.routineIds.filter((id) => id !== routineId), routineId]
          : folder.routineIds.filter((id) => id !== routineId),
      })));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No pudimos mover la rutina.");
    }
  };

  return (
    <main className="relative min-h-dvh overflow-hidden bg-[#090a08] px-4 pb-36 pt-28 text-white sm:px-8">
      <div className="pointer-events-none absolute -right-24 top-20 h-80 w-80 rounded-full bg-sky-400/[.09] blur-3xl toro-breathe" />
      <div className="pointer-events-none absolute -left-24 top-[28rem] h-80 w-80 rounded-full bg-fuchsia-500/[.07] blur-3xl toro-breathe-reverse" />
      <div className="relative mx-auto max-w-5xl">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold tracking-[.22em] text-[#b7ff00]/70">
              ENTRENAMIENTO
            </p>
            <h1 className="mt-2 text-4xl font-semibold tracking-[-.06em] sm:text-5xl">
              Tus rutinas
            </h1>
            <p className="mt-3 text-sm text-white/40">
              Entrená a tu manera, sin formatos rígidos.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard/routine/free"
              className="inline-flex items-center gap-2 rounded-2xl border border-[#b7ff00]/35 px-4 py-3 text-sm font-bold text-[#d7ff78]"
            >
              <Dumbbell size={17} /> Entrenamiento libre
            </Link>
            <Link
              href="/dashboard/routine/new"
              className="inline-flex items-center gap-2 rounded-2xl bg-[#b7ff00] px-4 py-3 text-sm font-bold text-black"
            >
              <Plus size={17} /> Nueva rutina
            </Link>
            <button
              type="button"
              onClick={() => setFolderFormOpen((value) => !value)}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 px-4 py-3 text-sm font-bold text-white/70 hover:bg-white/[.05]"
            >
              <FolderPlus size={17} /> Carpeta
            </button>
          </div>
        </header>
        {folderFormOpen && (
          <section className="mt-5 rounded-2xl border border-[#b7ff00]/20 bg-[#10110e] p-4">
            <div className="flex flex-wrap items-end gap-3">
              <label className="min-w-48 flex-1">
                <span className="mb-2 block text-xs font-semibold text-white/55">Nombre de carpeta</span>
                <input value={folderName} onChange={(event) => setFolderName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void createFolder(); }} className="input" maxLength={80} placeholder="Ej.: Bloque fuerza octubre" />
              </label>
              <label>
                <span className="mb-2 block text-xs font-semibold text-white/55">Tipo</span>
                <select value={folderKind} onChange={(event) => setFolderKind(event.target.value as TrainingFolder["kind"])} className="input h-11">
                  <option value="PLAN">Plan</option><option value="MESOCYCLE">Mesociclo</option><option value="SIX_MONTH_CYCLE">Ciclo de 6 meses</option>
                </select>
              </label>
              <button type="button" onClick={() => void createFolder()} disabled={savingFolder || !folderName.trim()} className="h-11 rounded-xl bg-[#b7ff00] px-4 text-sm font-bold text-black disabled:opacity-50">{savingFolder ? "Creando…" : "Crear"}</button>
            </div>
          </section>
        )}
        {error && (
          <p
            role="alert"
            className="mt-5 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-200"
          >
            {error}
          </p>
        )}
        {!active ? (
          <Empty />
        ) : (
          <>
            <section className="mt-8 overflow-hidden rounded-[28px] border border-[#b7ff00]/15 bg-[#10110e] p-5 sm:p-7">
              <p className="text-[10px] font-bold tracking-[.2em] text-[#b7ff00]/70">
                RUTINA ACTIVA
              </p>
              <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight">
                    {active.name}
                  </h2>
                  <p className="mt-2 text-sm text-white/40">
                    {active.days.join(", ")} · {active.exercises.length}{" "}
                    ejercicios · {plannedSets} series.
                  </p>
                </div>
                <Link
                  href={`/dashboard/routine/${active.id}`}
                  className="rounded-xl bg-[#b7ff00] px-4 py-2.5 text-sm font-bold text-black"
                >
                  Entrenar
                </Link>
              </div>
            </section>
            {routines.length > 1 && !folders.length && (
              <section className="mt-6">
                <p className="mb-3 text-xs font-bold uppercase tracking-[.18em] text-white/35">
                  Otras rutinas
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {routines
                    .filter((routine) => routine.id !== active.id)
                    .map((routine) => (
                      <article
                        key={routine.id}
                        className="rounded-2xl border border-white/[.07] bg-white/[.025] p-4"
                      >
                        <p className="font-semibold">{routine.name}</p>
                        <p className="mt-1 text-xs text-white/35">
                          {routine.days.join(", ")} · {routine.exercises.length}{" "}
                          ejercicios
                        </p>
                        <div className="mt-4 flex gap-3">
                          <button
                            type="button"
                            onClick={() => void activate(routine.id)}
                            className="text-xs font-bold text-[#b7ff00]"
                          >
                            Hacer activa
                          </button>
                          <Link
                            href={`/dashboard/routine/${routine.id}`}
                            className="text-xs font-bold text-white/50 hover:text-white"
                          >
                            Ver rutina
                          </Link>
                        </div>
                      </article>
                    ))}
                </div>
              </section>
            )}
            <TrainingFolders
              routines={routines}
              folders={folders}
              activeId={active.id}
              onActivate={activate}
              onAssign={assignFolder}
            />
            <section className="mt-8 grid gap-3 border-t border-white/[.07] pt-6 sm:grid-cols-3">
              <Metric
                icon={<Dumbbell size={18} />}
                label="Series planificadas"
                value={`${plannedSets}`}
                detail={`${active.days.length} días de entrenamiento`}
              />
              <Metric
                icon={<CircleCheck size={18} />}
                label="Sesión registrada"
                value={`${complete}/${active.exercises.length}`}
                detail="Ejercicios con resultado guardado"
              />
              <Metric
                icon={<TrendingUp size={18} />}
                label="Cumplimiento"
                value={`${Math.round((complete / Math.max(active.exercises.length, 1)) * 100)}%`}
                detail="Progreso de la rutina activa"
              />
            </section>
          </>
        )}
      </div>
    </main>
  );
}

function Empty() {
  return (
    <section className="mt-8 rounded-[30px] border border-dashed border-white/10 bg-white/[.02] px-6 py-14 text-center">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#b7ff00]/10 text-[#b7ff00]">
        <Dumbbell size={25} />
      </div>
      <h2 className="mt-5 text-xl font-semibold">
        Todavía no tenés una rutina.
      </h2>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-white/35">
        Creá un plan, organizá los días y guardá el progreso de cada ejercicio.
      </p>
      <Link
        href="/dashboard/routine/new"
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#b7ff00] px-4 py-3 text-sm font-bold text-black"
      >
        <Plus size={16} /> Crear rutina
      </Link>
    </section>
  );
}

function TrainingFolders({
  routines,
  folders,
  activeId,
  onActivate,
  onAssign,
}: {
  routines: Routine[];
  folders: TrainingFolder[];
  activeId: string;
  onActivate: (id: string) => Promise<void>;
  onAssign: (routineId: string, folderId: string | null) => Promise<void>;
}) {
  const assigned = new Set(folders.flatMap((folder) => folder.routineIds));
  const unassigned = routines.filter((routine) => !assigned.has(routine.id));
  return (
    <section className="mt-7">
      <div className="flex items-center gap-2">
        <Layers3 size={17} className="text-[#b7ff00]" />
        <div>
          <p className="text-[10px] font-bold tracking-[.18em] text-[#b7ff00]/70">ORGANIZACIÓN</p>
          <h2 className="mt-1 text-lg font-semibold">Planes y ciclos</h2>
        </div>
      </div>
      {!folders.length && !unassigned.length ? null : (
        <div className="mt-4 space-y-4">
          {folders.map((folder) => {
            const items = routines.filter((routine) => folder.routineIds.includes(routine.id));
            return (
              <article key={folder.id} className="rounded-[24px] border border-white/[.08] bg-[#10110e]/85 p-4 sm:p-5">
                <div className="flex items-center justify-between gap-3">
                  <div><p className="font-semibold">{folder.name}</p><p className="mt-1 text-[11px] font-bold uppercase tracking-[.12em] text-white/35">{folderLabel(folder.kind)} · {items.length} rutina{items.length === 1 ? "" : "s"}</p></div>
                </div>
                {!items.length ? <p className="mt-4 rounded-xl bg-black/20 px-3 py-3 text-xs text-white/40">Mové una rutina a esta carpeta desde el selector.</p> : <div className="mt-4 grid gap-2 sm:grid-cols-2">{items.map((routine) => <FolderRoutineCard key={routine.id} routine={routine} folders={folders} activeId={activeId} onActivate={onActivate} onAssign={onAssign} />)}</div>}
              </article>
            );
          })}
          {unassigned.length > 0 && <article className="rounded-[24px] border border-dashed border-white/10 bg-white/[.02] p-4 sm:p-5"><p className="text-xs font-bold uppercase tracking-[.14em] text-white/35">Sin carpeta</p><div className="mt-3 grid gap-2 sm:grid-cols-2">{unassigned.map((routine) => <FolderRoutineCard key={routine.id} routine={routine} folders={folders} activeId={activeId} onActivate={onActivate} onAssign={onAssign} />)}</div></article>}
        </div>
      )}
    </section>
  );
}

function FolderRoutineCard({
  routine,
  folders,
  activeId,
  onActivate,
  onAssign,
}: {
  routine: Routine;
  folders: TrainingFolder[];
  activeId: string;
  onActivate: (id: string) => Promise<void>;
  onAssign: (routineId: string, folderId: string | null) => Promise<void>;
}) {
  const currentFolderId = folders.find((folder) => folder.routineIds.includes(routine.id))?.id || "";
  return <article className="rounded-2xl border border-white/[.07] bg-black/20 p-3"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-semibold">{routine.name}</p><p className="mt-1 text-xs text-white/40">{routine.days.join(", ")} · {routine.exercises.length} ejercicios</p></div>{routine.id === activeId && <span className="shrink-0 rounded-full bg-[#b7ff00]/10 px-2 py-1 text-[10px] font-bold text-[#b7ff00]">ACTIVA</span>}</div><div className="mt-3 flex items-center gap-2"><select value={currentFolderId} onChange={(event) => void onAssign(routine.id, event.target.value || null)} aria-label={`Mover ${routine.name} a una carpeta`} className="min-w-0 flex-1 rounded-lg border border-white/10 bg-[#151712] px-2 py-2 text-[11px] text-white/65"><option value="">Sin carpeta</option>{folders.map((folder) => <option key={folder.id} value={folder.id}>{folder.name}</option>)}</select>{routine.id !== activeId && <button type="button" onClick={() => void onActivate(routine.id)} className="shrink-0 text-xs font-bold text-[#b7ff00]">Activar</button>}<Link href={`/dashboard/routine/${routine.id}`} className="shrink-0 text-xs font-bold text-white/50 hover:text-white">Abrir</Link></div></article>;
}

function folderLabel(kind: TrainingFolder["kind"]) {
  return kind === "MESOCYCLE" ? "Mesociclo" : kind === "SIX_MONTH_CYCLE" ? "Ciclo 6 meses" : "Plan";
}

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
    <article className="rounded-2xl border border-white/[.07] bg-white/[.025] p-4">
      <div className="text-[#b7ff00]">{icon}</div>
      <p className="mt-5 text-xl font-semibold">{value}</p>
      <p className="mt-1 text-xs text-white/35">{label}</p>
      <p className="mt-3 border-t border-white/[.06] pt-3 text-[11px] text-white/25">
        {detail}
      </p>
    </article>
  );
}
