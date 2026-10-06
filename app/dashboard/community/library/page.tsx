"use client";

import Link from "next/link";
import { ArrowLeft, Bookmark, BookOpen, CalendarDays, Check, Copy, Dumbbell, ExternalLink, Search, SlidersHorizontal, X } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { UserAvatar } from "@/components/user/UserAvatar";

type Creator = { id: string | null; name: string; nickname: string | null; avatarUrl: string | null };
type RoutineCard = { id: string; name: string; type: string; days: string[]; createdAt: string; publishedAt: string | null; exerciseCount: number; setCount: number; creator: Creator; importCount?: number; isOwn?: boolean; importedRoutineId?: string | null; sourceRoutineId?: string | null };
type DiscoveryFilters = { query: string; type: string; days: number | null; sort: "recent" | "popular"; types: string[] };
type Library = { discoveries: RoutineCard[]; imports: RoutineCard[]; nextCursor: string | null; filters: DiscoveryFilters };
type FilterDraft = Pick<DiscoveryFilters, "query" | "type" | "days" | "sort">;

const initialFilters: FilterDraft = { query: "", type: "", days: null, sort: "recent" };

function date(value: string | null) { return value ? new Date(value).toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" }) : "Sin fecha"; }

function libraryUrl(filters: FilterDraft, cursor?: string | null) {
  const params = new URLSearchParams();
  if (filters.query.trim()) params.set("q", filters.query.trim());
  if (filters.type) params.set("type", filters.type);
  if (filters.days) params.set("days", String(filters.days));
  if (filters.sort !== "recent") params.set("sort", filters.sort);
  if (cursor) params.set("cursor", cursor);
  const query = params.toString();
  return `/api/community/library${query ? `?${query}` : ""}`;
}

async function requestLibrary(filters: FilterDraft, cursor?: string | null) {
  const response = await fetch(libraryUrl(filters, cursor), { cache: "no-store" });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || "No pudimos cargar la biblioteca.");
  return body as Library;
}

export default function CommunityRoutineLibraryPage() {
  const [library, setLibrary] = useState<Library | null>(null);
  const [tab, setTab] = useState<"discover" | "saved">("discover");
  const [filters, setFilters] = useState<FilterDraft>(initialFilters);
  const [importingId, setImportingId] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  async function load(nextFilters: FilterDraft = filters) {
    setLoading(true); setError("");
    try {
      const nextLibrary = await requestLibrary(nextFilters);
      setLibrary(nextLibrary);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No pudimos cargar la biblioteca.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    void requestLibrary(initialFilters)
      .then((nextLibrary) => { if (active) setLibrary(nextLibrary); })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "No pudimos cargar la biblioteca."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function loadMore() {
    if (!library?.nextCursor || loadingMore) return;
    setLoadingMore(true); setError("");
    try {
      const body = await requestLibrary(filters, library.nextCursor);
      setLibrary((current) => current ? { ...body, discoveries: [...current.discoveries, ...body.discoveries], imports: current.imports } : body);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No pudimos cargar más rutinas.");
    } finally {
      setLoadingMore(false);
    }
  }

  async function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback("");
    await load(filters);
  }

  async function clearFilters() {
    setFilters(initialFilters);
    setFeedback("");
    await load(initialFilters);
  }

  async function importRoutine(id: string) {
    setImportingId(id); setError(""); setFeedback("");
    try {
      const response = await fetch(`/api/community/library/${id}/import`, { method: "POST" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "No se pudo importar la rutina.");
      setFeedback(body.created ? "Rutina guardada en tu biblioteca." : "Esta rutina ya estaba guardada en tu biblioteca.");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo importar la rutina.");
    } finally {
      setImportingId("");
    }
  }

  const cards = tab === "discover" ? library?.discoveries || [] : library?.imports || [];
  const hasFilters = Boolean(filters.query || filters.type || filters.days || filters.sort !== "recent");
  const typeOptions = useMemo(() => library?.filters.types || [], [library?.filters.types]);

  return <main className="min-h-dvh bg-[#090a08] px-4 pb-36 pt-28 text-white sm:px-8"><div className="mx-auto max-w-5xl">
    <Link href="/dashboard/community" className="inline-flex items-center gap-2 text-xs text-white/45 hover:text-white"><ArrowLeft size={15}/> TORO CLUB</Link>
    <header className="mt-7 flex flex-wrap items-end justify-between gap-4"><div><p className="text-[10px] font-bold tracking-[.22em] text-[#b7ff00]/70">DESCUBRIR RUTINAS</p><h1 className="mt-2 text-3xl font-semibold tracking-[-.05em] sm:text-4xl">Biblioteca TORO</h1><p className="mt-2 max-w-xl text-sm text-white/40">Explorá programas públicos, encontrá una estructura que te sirva e importá una copia totalmente editable.</p></div><Link href="/dashboard/routine" className="inline-flex items-center gap-2 rounded-xl border border-[#b7ff00]/30 px-4 py-3 text-sm font-bold text-[#b7ff00]"><Dumbbell size={16}/> Mis rutinas</Link></header>
    <div className="mt-7 flex gap-2 border-b border-white/[.08]"><button type="button" onClick={() => setTab("discover")} className={`px-4 py-3 text-sm font-bold ${tab === "discover" ? "border-b-2 border-[#b7ff00] text-[#b7ff00]" : "text-white/40"}`}><BookOpen size={15} className="mr-2 inline"/>Descubrir</button><button type="button" onClick={() => setTab("saved")} className={`px-4 py-3 text-sm font-bold ${tab === "saved" ? "border-b-2 border-[#b7ff00] text-[#b7ff00]" : "text-white/40"}`}><Bookmark size={15} className="mr-2 inline"/>Guardadas</button></div>
    {tab === "discover" && <form onSubmit={(event) => void applyFilters(event)} className="mt-5 rounded-2xl border border-white/[.08] bg-white/[.025] p-3 sm:p-4"><div className="flex items-center gap-2 text-xs font-bold text-white/60"><SlidersHorizontal size={15} className="text-[#b7ff00]"/> Encontrá una rutina</div><div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto]"><label className="relative block"><Search aria-hidden size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/35"/><input value={filters.query} onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))} className="input w-full pl-9" maxLength={60} placeholder="Nombre, ejercicio o grupo muscular" aria-label="Buscar rutinas"/></label><select value={filters.type} onChange={(event) => setFilters((current) => ({ ...current, type: event.target.value }))} className="input min-h-11 bg-[#10110e] text-sm" aria-label="Filtrar por objetivo"><option value="">Todos los objetivos</option>{typeOptions.map((type) => <option key={type} value={type}>{type}</option>)}</select><select value={filters.days || ""} onChange={(event) => setFilters((current) => ({ ...current, days: event.target.value ? Number(event.target.value) : null }))} className="input min-h-11 bg-[#10110e] text-sm" aria-label="Filtrar por cantidad de días"><option value="">Todos los días</option>{[1, 2, 3, 4, 5, 6, 7].map((day) => <option key={day} value={day}>{day} {day === 1 ? "día" : "días"}</option>)}</select><select value={filters.sort} onChange={(event) => setFilters((current) => ({ ...current, sort: event.target.value === "popular" ? "popular" : "recent" }))} className="input min-h-11 bg-[#10110e] text-sm" aria-label="Ordenar rutinas"><option value="recent">Más recientes</option><option value="popular">Más importadas</option></select></div><div className="mt-3 flex items-center justify-between gap-3"><p className="text-[11px] text-white/30">Las importaciones cuentan una sola copia por atleta y rutina.</p><div className="flex items-center gap-3"><button type="submit" disabled={loading} className="text-xs font-bold text-[#b7ff00] disabled:opacity-50">Aplicar</button>{hasFilters && <button type="button" onClick={() => void clearFilters()} disabled={loading} className="inline-flex items-center gap-1 text-xs font-bold text-white/50 hover:text-white disabled:opacity-50"><X size={14}/> Limpiar</button>}</div></div></form>}
    {feedback && <p role="status" className="mt-5 rounded-xl border border-[#b7ff00]/20 bg-[#b7ff00]/[.07] p-3 text-sm text-[#b7ff00]">{feedback}</p>}{error && <p role="alert" className="mt-5 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-200">{error}</p>}
    {loading ? <p className="mt-8 text-sm text-white/40">Cargando biblioteca…</p> : !cards.length ? <Empty saved={tab === "saved"} filtered={tab === "discover" && hasFilters}/> : <><div className="mt-6 grid gap-3 md:grid-cols-2">{cards.map((routine) => <RoutineLibraryCard key={routine.id} routine={routine} importing={importingId === routine.id} onImport={importRoutine}/>)}</div>{tab === "discover" && library?.nextCursor && <button type="button" onClick={() => void loadMore()} disabled={loadingMore} className="mx-auto mt-6 block rounded-xl border border-white/10 px-4 py-3 text-xs font-bold text-white/65 hover:border-[#b7ff00]/35 hover:text-[#b7ff00] disabled:opacity-50">{loadingMore ? "Cargando…" : "Ver más rutinas"}</button>}</>}
  </div></main>;
}

function RoutineLibraryCard({ routine, importing, onImport }: { routine: RoutineCard; importing: boolean; onImport: (id: string) => Promise<void> }) {
  const savedRoutineId = routine.importedRoutineId || (routine.sourceRoutineId ? routine.id : null);
  return <article className="flex flex-col rounded-[24px] border border-white/[.08] bg-[#10110e] p-5"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-[10px] font-bold tracking-[.16em] text-[#b7ff00]/70">{routine.sourceRoutineId ? "IMPORTADA" : "RUTINA PÚBLICA"}</p><h2 className="mt-2 truncate text-lg font-semibold">{routine.name}</h2></div><Dumbbell size={18} className="shrink-0 text-[#b7ff00]"/></div><div className="mt-4 flex items-center gap-2"><UserAvatar src={routine.creator.avatarUrl} name={routine.creator.name} nickname={routine.creator.nickname} size="sm"/><div className="min-w-0"><p className="truncate text-xs font-semibold">{routine.creator.name}</p><p className="truncate text-[11px] text-white/35">{routine.creator.nickname ? `@${routine.creator.nickname}` : routine.sourceRoutineId ? "Creador original" : "Creador"}</p></div></div><div className="mt-5 flex flex-wrap gap-x-3 gap-y-2 text-xs text-white/45"><span>{routine.exerciseCount} ejercicios</span><span>{routine.setCount} series</span><span>{routine.type}</span></div><p className="mt-2 flex items-center gap-1.5 text-[11px] text-white/30"><CalendarDays size={13}/>{routine.days.length ? routine.days.join(" · ") : "Sin días"} · {date(routine.publishedAt || routine.createdAt)}</p>{typeof routine.importCount === "number" && <p className="mt-2 text-[11px] text-white/30">{routine.importCount} {routine.importCount === 1 ? "persona la guardó" : "personas la guardaron"}</p>}<div className="mt-5 flex flex-wrap gap-3 border-t border-white/[.07] pt-4"><Link href={`/dashboard/community/library/${routine.id}`} className="inline-flex items-center gap-1.5 text-xs font-bold text-white/70 hover:text-white"><ExternalLink size={14}/> Ver detalles</Link>{!routine.sourceRoutineId && <Link href={`/routine/${routine.id}`} target="_blank" className="inline-flex items-center gap-1.5 text-xs font-bold text-white/45 hover:text-white"><ExternalLink size={14}/> Link público</Link>}{routine.sourceRoutineId ? <Link href={`/dashboard/routine/${routine.id}`} className="inline-flex items-center gap-1.5 text-xs font-bold text-[#b7ff00]"><Copy size={14}/> Abrir mi copia</Link> : routine.isOwn ? <span className="inline-flex items-center gap-1.5 text-xs font-bold text-white/40"><Check size={14}/> Es tu rutina</span> : savedRoutineId ? <Link href={`/dashboard/routine/${savedRoutineId}`} className="inline-flex items-center gap-1.5 text-xs font-bold text-[#b7ff00]"><Check size={14}/> Guardada</Link> : <button type="button" disabled={importing} onClick={() => void onImport(routine.id)} className="inline-flex items-center gap-1.5 text-xs font-bold text-[#b7ff00] disabled:opacity-50"><Copy size={14}/>{importing ? "Guardando…" : "Importar rutina"}</button>}</div></article>;
}

function Empty({ saved, filtered }: { saved: boolean; filtered?: boolean }) { return <div className="mt-7 rounded-[28px] border border-dashed border-white/10 bg-white/[.02] p-8 text-center"><BookOpen size={25} className="mx-auto text-[#b7ff00]"/><p className="mt-4 font-semibold">{saved ? "Todavía no guardaste rutinas." : filtered ? "No encontramos rutinas con esos filtros." : "Todavía no hay rutinas publicadas."}</p><p className="mt-2 text-sm text-white/35">{saved ? "Cuando importes una, va a aparecer acá como una copia independiente." : filtered ? "Probá otro ejercicio, objetivo o cantidad de días." : "Publicá una rutina desde su edición para que aparezca en la biblioteca."}</p></div>; }
