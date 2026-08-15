"use client";

import Link from "next/link";
import { ArrowLeft, Bookmark, BookOpen, CalendarDays, Check, Copy, Dumbbell, ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
import { UserAvatar } from "@/components/user/UserAvatar";

type Creator = { id: string | null; name: string; nickname: string | null; avatarUrl: string | null };
type RoutineCard = { id: string; name: string; type: string; days: string[]; createdAt: string; publishedAt: string | null; exerciseCount: number; setCount: number; creator: Creator; importCount?: number; isOwn?: boolean; importedRoutineId?: string | null; sourceRoutineId?: string | null };
type Library = { discoveries: RoutineCard[]; imports: RoutineCard[]; nextCursor: string | null };

function date(value: string | null) { return value ? new Date(value).toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" }) : "Sin fecha"; }

export default function CommunityRoutineLibraryPage() {
  const [library, setLibrary] = useState<Library | null>(null);
  const [tab, setTab] = useState<"discover" | "saved">("discover");
  const [importingId, setImportingId] = useState("");
  const [loadingMore, setLoadingMore] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  async function load() {
    const response = await fetch("/api/community/library", { cache: "no-store" });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || "No pudimos cargar la biblioteca.");
    setLibrary(body);
  }

  async function loadMore() {
    if (!library?.nextCursor || loadingMore) return;
    setLoadingMore(true); setError("");
    try {
      const response = await fetch(`/api/community/library?cursor=${encodeURIComponent(library.nextCursor)}`, { cache: "no-store" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "No pudimos cargar más rutinas.");
      setLibrary((current) => current ? { ...current, discoveries: [...current.discoveries, ...(body.discoveries || [])], nextCursor: body.nextCursor || null } : current);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No pudimos cargar más rutinas."); }
    finally { setLoadingMore(false); }
  }

  useEffect(() => {
    let active = true;
    void fetch("/api/community/library", { cache: "no-store" })
      .then(async (response) => { const body = await response.json().catch(() => ({})); if (!response.ok) throw new Error(body.error || "No pudimos cargar la biblioteca."); return body as Library; })
      .then((nextLibrary) => { if (active) setLibrary(nextLibrary); })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "No pudimos cargar la biblioteca."); });
    return () => { active = false; };
  }, []);

  async function importRoutine(id: string) {
    setImportingId(id); setError(""); setFeedback("");
    try {
      const response = await fetch(`/api/community/library/${id}/import`, { method: "POST" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "No se pudo importar la rutina.");
      setFeedback(body.created ? "Rutina guardada en tu biblioteca." : "Esta rutina ya estaba guardada en tu biblioteca.");
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo importar la rutina."); }
    finally { setImportingId(""); }
  }

  const cards = tab === "discover" ? library?.discoveries || [] : library?.imports || [];
  return <main className="min-h-dvh bg-[#090a08] px-4 pb-36 pt-28 text-white sm:px-8"><div className="mx-auto max-w-5xl"><Link href="/dashboard/community" className="inline-flex items-center gap-2 text-xs text-white/45 hover:text-white"><ArrowLeft size={15}/> Comunidad</Link>
    <header className="mt-7 flex flex-wrap items-end justify-between gap-4"><div><p className="text-[10px] font-bold tracking-[.22em] text-[#b7ff00]/70">PLAYLIST DE RUTINAS</p><h1 className="mt-2 text-3xl font-semibold tracking-[-.05em] sm:text-4xl">Biblioteca TORO</h1><p className="mt-2 max-w-xl text-sm text-white/40">Descubrí planes publicados, mirá cada estructura y guardá una copia que podés modificar sin afectar al creador.</p></div><Link href="/dashboard/routine" className="inline-flex items-center gap-2 rounded-xl border border-[#b7ff00]/30 px-4 py-3 text-sm font-bold text-[#b7ff00]"><Dumbbell size={16}/> Mis rutinas</Link></header>
    <div className="mt-7 flex gap-2 border-b border-white/[.08]"><button type="button" onClick={() => setTab("discover")} className={`px-4 py-3 text-sm font-bold ${tab === "discover" ? "border-b-2 border-[#b7ff00] text-[#b7ff00]" : "text-white/40"}`}><BookOpen size={15} className="mr-2 inline"/>Descubrir</button><button type="button" onClick={() => setTab("saved")} className={`px-4 py-3 text-sm font-bold ${tab === "saved" ? "border-b-2 border-[#b7ff00] text-[#b7ff00]" : "text-white/40"}`}><Bookmark size={15} className="mr-2 inline"/>Guardadas</button></div>
    {feedback && <p className="mt-5 rounded-xl border border-[#b7ff00]/20 bg-[#b7ff00]/[.07] p-3 text-sm text-[#b7ff00]">{feedback}</p>}{error && <p role="alert" className="mt-5 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-200">{error}</p>}
    {!library ? <p className="mt-8 text-sm text-white/40">Cargando biblioteca…</p> : !cards.length ? <Empty saved={tab === "saved"}/> : <><div className="mt-6 grid gap-3 md:grid-cols-2">{cards.map((routine) => <RoutineLibraryCard key={routine.id} routine={routine} importing={importingId === routine.id} onImport={importRoutine}/>)}</div>{tab === "discover" && library.nextCursor && <button type="button" onClick={() => void loadMore()} disabled={loadingMore} className="mx-auto mt-6 block rounded-xl border border-white/10 px-4 py-3 text-xs font-bold text-white/65 hover:border-[#b7ff00]/35 hover:text-[#b7ff00] disabled:opacity-50">{loadingMore ? "Cargando…" : "Ver más rutinas"}</button>}</>}
  </div></main>;
}

function RoutineLibraryCard({ routine, importing, onImport }: { routine: RoutineCard; importing: boolean; onImport: (id: string) => Promise<void> }) {
  const savedRoutineId = routine.importedRoutineId || (routine.sourceRoutineId ? routine.id : null);
  return <article className="flex flex-col rounded-[24px] border border-white/[.08] bg-[#10110e] p-5"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-[10px] font-bold tracking-[.16em] text-[#b7ff00]/70">{routine.sourceRoutineId ? "IMPORTADA" : "RUTINA PÚBLICA"}</p><h2 className="mt-2 truncate text-lg font-semibold">{routine.name}</h2></div><Dumbbell size={18} className="shrink-0 text-[#b7ff00]"/></div><div className="mt-4 flex items-center gap-2"><UserAvatar src={routine.creator.avatarUrl} name={routine.creator.name} nickname={routine.creator.nickname} size="sm"/><div className="min-w-0"><p className="truncate text-xs font-semibold">{routine.creator.name}</p><p className="truncate text-[11px] text-white/35">{routine.creator.nickname ? `@${routine.creator.nickname}` : routine.sourceRoutineId ? "Creador original" : "Creador"}</p></div></div><div className="mt-5 flex flex-wrap gap-x-3 gap-y-2 text-xs text-white/45"><span>{routine.exerciseCount} ejercicios</span><span>{routine.setCount} series</span><span>{routine.type}</span></div><p className="mt-2 flex items-center gap-1.5 text-[11px] text-white/30"><CalendarDays size={13}/>{routine.days.length ? routine.days.join(" · ") : "Sin días"} · {date(routine.publishedAt || routine.createdAt)}</p>{typeof routine.importCount === "number" && <p className="mt-2 text-[11px] text-white/30">{routine.importCount} {routine.importCount === 1 ? "persona la guardó" : "personas la guardaron"}</p>}<div className="mt-5 flex flex-wrap gap-3 border-t border-white/[.07] pt-4"><Link href={`/dashboard/community/library/${routine.id}`} className="inline-flex items-center gap-1.5 text-xs font-bold text-white/70 hover:text-white"><ExternalLink size={14}/> Ver detalles</Link>{routine.sourceRoutineId ? <Link href={`/dashboard/routine/${routine.id}`} className="inline-flex items-center gap-1.5 text-xs font-bold text-[#b7ff00]"><PencilIcon/> Abrir mi copia</Link> : routine.isOwn ? <span className="inline-flex items-center gap-1.5 text-xs font-bold text-white/40"><Check size={14}/> Es tu rutina</span> : savedRoutineId ? <Link href={`/dashboard/routine/${savedRoutineId}`} className="inline-flex items-center gap-1.5 text-xs font-bold text-[#b7ff00]"><Check size={14}/> Guardada</Link> : <button type="button" disabled={importing} onClick={() => void onImport(routine.id)} className="inline-flex items-center gap-1.5 text-xs font-bold text-[#b7ff00] disabled:opacity-50"><Copy size={14}/>{importing ? "Guardando…" : "Importar rutina"}</button>}</div></article>;
}

function PencilIcon() { return <Copy size={14}/>; }
function Empty({ saved }: { saved: boolean }) { return <div className="mt-7 rounded-[28px] border border-dashed border-white/10 bg-white/[.02] p-8 text-center"><BookOpen size={25} className="mx-auto text-[#b7ff00]"/><p className="mt-4 font-semibold">{saved ? "Todavía no guardaste rutinas." : "Todavía no hay rutinas publicadas."}</p><p className="mt-2 text-sm text-white/35">{saved ? "Cuando importes una, va a aparecer acá como una copia independiente." : "Publicá una rutina desde su edición para que aparezca en la biblioteca."}</p></div>; }
