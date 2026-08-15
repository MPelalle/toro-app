"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Copy, Dumbbell, MessageCircle, Repeat2, Send, Trash2, Trophy } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { BadgeShowcase, UserBadgeStrip } from "@/components/badges/UserBadges";
import { UserAvatar } from "@/components/user/UserAvatar";
import type { UserBadge } from "@/lib/badges";

type Routine = { id: string; name: string; type: string; days: string[]; exerciseCount: number; setCount: number };
type WorkoutActivity = { id: string; type: "workout"; sourceType: "WORKOUT"; sourceId: string; date: string; routineName: string; durationSeconds: number; volume: number; exerciseCount: number };
type RecordActivity = { id: string; type: "record"; sourceType: "RECORD"; sourceId: string; date: string; exercise: string; weight: number; reps: number };
type RoutineActivity = { id: string; type: "routine"; sourceType: "ROUTINE"; sourceId: string; date: string; routine: Routine };
type StatusActivity = { id: string; type: "status"; sourceType: "STATUS"; sourceId: string; date: string; content: string };
type BaseActivity = WorkoutActivity | RecordActivity | RoutineActivity | StatusActivity;
type RepostActivity = { id: string; type: "repost"; date: string; originalAuthor: { name: string; nickname: string | null; avatarUrl: string | null }; original: BaseActivity };
type Activity = BaseActivity | RepostActivity;
type ProfileMessage = { id: string; content: string; createdAt: string; canDelete: boolean; author: { id: string; name: string; nickname: string | null } };
type Profile = { isOwnProfile: boolean; user: { name: string; nickname: string; avatarUrl: string | null; bio: string | null; joinedAt: string }; stats: { workouts: number; volume: number; records: number }; badges: UserBadge[]; records: Array<{ date: string; exercise: string; estimatedOneRepMax: number; weight: number; reps: number }>; routines: Routine[]; activity: Activity[]; canPostMessage: boolean; messages: ProfileMessage[] };

function formatNumber(value: number) { return value.toLocaleString("es-AR", { maximumFractionDigits: 0 }); }
function duration(seconds: number) { const minutes = Math.max(0, Math.round(seconds / 60)); return minutes >= 60 ? `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, "0")} m` : `${minutes} min`; }
function date(value: string) { return new Date(value).toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" }); }

export default function CommunityProfilePage() {
  const { nickname } = useParams<{ nickname: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [copyingId, setCopyingId] = useState("");
  const [copiedId, setCopiedId] = useState("");
  const [repostingId, setRepostingId] = useState("");
  const [profileMessage, setProfileMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [deletingMessageId, setDeletingMessageId] = useState("");

  const requestProfile = useCallback(async () => {
    const response = await fetch(`/api/community/profiles/${encodeURIComponent(nickname)}`, { cache: "no-store" });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || "No pudimos abrir este perfil.");
    return body as Profile;
  }, [nickname]);

  const load = async () => setProfile(await requestProfile());

  useEffect(() => {
    let active = true;
    void requestProfile()
      .then((nextProfile) => { if (active) setProfile(nextProfile); })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "No pudimos abrir este perfil."); });
    return () => { active = false; };
  }, [requestProfile]);

  const publishStatus = async () => {
    if (!status.trim()) return;
    setPublishing(true); setError("");
    try {
      const response = await fetch("/api/community/statuses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: status }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "No se pudo publicar el mensaje.");
      setStatus("");
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo publicar el mensaje."); }
    finally { setPublishing(false); }
  };

  const sendProfileMessage = async () => {
    if (!profileMessage.trim()) return;
    setSendingMessage(true); setError("");
    try {
      const response = await fetch(`/api/community/profiles/${encodeURIComponent(nickname)}/messages`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: profileMessage }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "No se pudo enviar el mensaje.");
      setProfileMessage("");
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo enviar el mensaje."); }
    finally { setSendingMessage(false); }
  };

  const deleteProfileMessage = async (id: string) => {
    if (!window.confirm("¿Eliminar este mensaje?")) return;
    setDeletingMessageId(id); setError("");
    try {
      const response = await fetch(`/api/community/profiles/${encodeURIComponent(nickname)}/messages?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "No se pudo eliminar el mensaje.");
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo eliminar el mensaje."); }
    finally { setDeletingMessageId(""); }
  };

  const copyRoutine = async (routineId: string) => {
    setCopyingId(routineId); setError("");
    try {
      const response = await fetch(`/api/community/profiles/${encodeURIComponent(nickname)}/routines/${routineId}/copy`, { method: "POST" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "No se pudo guardar la rutina.");
      setCopiedId(routineId);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo guardar la rutina."); }
    finally { setCopyingId(""); }
  };

  const repost = async (item: BaseActivity) => {
    setRepostingId(item.id); setError("");
    try {
      const response = await fetch("/api/community/reposts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nickname, originalType: item.sourceType, originalId: item.sourceId }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "No se pudo repostear la publicación.");
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo repostear la publicación."); }
    finally { setRepostingId(""); }
  };

  const deleteActivity = async (item: Activity) => {
    const url = item.type === "repost"
      ? `/api/community/reposts?id=${encodeURIComponent(item.id.replace(/^repost:/, ""))}`
      : item.type === "status" ? `/api/community/statuses?id=${encodeURIComponent(item.sourceId)}` : null;
    if (!url || !window.confirm("¿Eliminar esta publicación?")) return;
    setError("");
    try {
      const response = await fetch(url, { method: "DELETE" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "No se pudo eliminar la publicación.");
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo eliminar la publicación."); }
  };

  if (!profile) return <main className="min-h-dvh bg-[#090a08] px-4 pb-36 pt-28 text-white"><div className="mx-auto max-w-4xl text-sm text-white/45">{error || "Cargando perfil…"}</div></main>;

  return <main className="min-h-dvh bg-[#090a08] px-4 pb-36 pt-28 text-white sm:px-8"><div className="mx-auto max-w-4xl"><Link href="/dashboard/community" className="inline-flex items-center gap-2 text-xs text-white/45 hover:text-white"><ArrowLeft size={15} /> Comunidad</Link>
    <header className="mt-7 rounded-[30px] border border-[#b7ff00]/15 bg-[radial-gradient(circle_at_top_right,rgba(183,255,0,.11),transparent_44%),#10110e] p-5 sm:p-7"><div className="flex flex-wrap items-start justify-between gap-5"><div className="flex min-w-0 items-center gap-4"><UserAvatar src={profile.user.avatarUrl} name={profile.user.name} nickname={profile.user.nickname} size="lg"/><div className="min-w-0"><p className="text-[10px] font-bold tracking-[.2em] text-[#b7ff00]/70">PERFIL TORO</p><h1 className="mt-1 truncate text-3xl font-semibold tracking-[-.05em] sm:text-4xl">{profile.user.name}</h1><p className="mt-1 text-sm text-white/45">@{profile.user.nickname}</p></div></div><UserBadgeStrip badges={profile.badges} size="md"/></div>{profile.user.bio && <p className="mt-5 max-w-2xl text-sm leading-6 text-white/60">{profile.user.bio}</p>}<p className="mt-5 text-[11px] text-white/30">En TORO desde {new Date(profile.user.joinedAt).toLocaleDateString("es-AR", { month: "long", year: "numeric" })}</p><div className="mt-6 grid grid-cols-3 gap-2 border-t border-white/[.08] pt-5"><Metric value={String(profile.stats.workouts)} label="Entrenamientos"/><Metric value={`${formatNumber(profile.stats.volume)} kg`} label="Volumen"/><Metric value={String(profile.stats.records)} label="Récords"/></div></header>
    {error && <p role="alert" className="mt-5 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-200">{error}</p>}
    {profile.isOwnProfile && <section className="mt-6 rounded-[28px] border border-white/[.08] bg-[#10110e] p-5"><div className="flex items-center gap-2"><MessageCircle size={16} className="text-[#b7ff00]"/><p className="text-sm font-semibold">Compartí un estado</p></div><div className="mt-4 flex gap-2"><input value={status} onChange={(event) => setStatus(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void publishStatus(); }} className="input min-w-0 flex-1" maxLength={280} placeholder="Hoy toca piernas."/><button type="button" onClick={() => void publishStatus()} disabled={publishing || !status.trim()} className="inline-flex items-center gap-2 rounded-xl bg-[#b7ff00] px-4 text-sm font-bold text-black disabled:opacity-50"><Send size={15}/>{publishing ? "Publicando…" : "Publicar"}</button></div><p className="mt-2 text-right text-[11px] text-white/30">{status.length}/280</p></section>}
    <section className="mt-7 rounded-[28px] border border-white/[.08] bg-[#10110e] p-5"><div className="flex items-center gap-2"><MessageCircle size={16} className="text-[#b7ff00]"/><div><p className="text-sm font-semibold">Mensajes</p><p className="text-xs text-white/35">Notas breves, sin fotos ni adjuntos.</p></div></div>{profile.canPostMessage && <div className="mt-4 flex gap-2"><input value={profileMessage} onChange={(event) => setProfileMessage(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void sendProfileMessage(); }} className="input min-w-0 flex-1" maxLength={280} placeholder={`Dejale un mensaje a @${profile.user.nickname}`}/><button type="button" onClick={() => void sendProfileMessage()} disabled={sendingMessage || !profileMessage.trim()} className="inline-flex items-center gap-2 rounded-xl bg-[#b7ff00] px-4 text-sm font-bold text-black disabled:opacity-50"><Send size={15}/>{sendingMessage ? "Enviando…" : "Enviar"}</button></div>}{profile.canPostMessage && <p className="mt-2 text-right text-[11px] text-white/30">{profileMessage.length}/280</p>}{!profile.messages.length ? <p className="mt-5 text-sm text-white/35">Todavía no hay mensajes.</p> : <div className="mt-5 space-y-3">{profile.messages.map((message) => <article key={message.id} className="rounded-2xl border border-white/[.07] bg-black/20 p-4"><div className="flex items-start justify-between gap-3"><p className="text-xs font-bold text-[#b7ff00]">{message.author.nickname ? `@${message.author.nickname}` : message.author.name}</p>{message.canDelete && <button type="button" onClick={() => void deleteProfileMessage(message.id)} disabled={deletingMessageId === message.id} aria-label="Eliminar mensaje" className="text-white/30 hover:text-red-300 disabled:opacity-45"><Trash2 size={15}/></button>}</div><p className="mt-2 text-sm leading-6 text-white/80">{message.content}</p><p className="mt-3 text-[11px] text-white/25">{date(message.createdAt)}</p></article>)}</div>}</section>
    <section className="mt-7"><div><p className="text-[10px] font-bold tracking-[.18em] text-[#b7ff00]/70">ACTIVIDAD RECIENTE</p><h2 className="mt-1 text-xl font-semibold">Lo último de @{profile.user.nickname}</h2></div>{!profile.activity.length ? <Empty text="Todavía no hay actividad para mostrar."/> : <div className="mt-4 space-y-3">{profile.activity.map((item) => <div key={item.id}><ActivityCard item={item} onRepost={profile.isOwnProfile ? undefined : repost} repostingId={repostingId}/>{profile.isOwnProfile && (item.type === "status" || item.type === "repost") && <button type="button" onClick={() => void deleteActivity(item)} className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-white/35 hover:text-red-300"><Trash2 size={14}/> Eliminar publicación</button>}</div>)}</div>}</section>
    <section className="mt-9"><div><p className="text-[10px] font-bold tracking-[.18em] text-[#b7ff00]/70">RUTINAS PUBLICADAS</p><h2 className="mt-1 text-xl font-semibold">Programas para guardar</h2></div>{!profile.routines.length ? <Empty text="Todavía no publicó rutinas."/> : <div className="mt-4 grid gap-3 sm:grid-cols-2">{profile.routines.map((routine) => <article key={routine.id} className="rounded-2xl border border-white/[.08] bg-[#10110e] p-4"><Dumbbell size={17} className="text-[#b7ff00]"/><h3 className="mt-4 font-semibold">{routine.name}</h3><p className="mt-1 text-xs text-white/40">{routine.exerciseCount} ejercicios · {routine.setCount} series</p><p className="mt-1 text-[11px] text-white/25">{routine.type}{routine.days.length ? ` · ${routine.days.join(", ")}` : ""}</p><div className="mt-4 flex flex-wrap items-center gap-3"><Link href={`/dashboard/community/library/${routine.id}`} className="text-xs font-bold text-white/60 hover:text-white">Ver detalles</Link>{profile.isOwnProfile ? <p className="text-xs font-semibold text-white/40">Esta rutina está publicada.</p> : copiedId === routine.id ? <p className="inline-flex items-center gap-2 text-xs font-bold text-[#b7ff00]"><Check size={14}/> Guardada en tus rutinas</p> : <button type="button" onClick={() => void copyRoutine(routine.id)} disabled={copyingId === routine.id} className="inline-flex items-center gap-2 text-xs font-bold text-[#b7ff00] disabled:opacity-50"><Copy size={14}/>{copyingId === routine.id ? "Guardando…" : "Guardar rutina"}</button>}</div></article>)}</div>}</section>
    <section className="mt-9"><div><p className="text-[10px] font-bold tracking-[.18em] text-[#b7ff00]/70">RÉCORDS</p><h2 className="mt-1 text-xl font-semibold">Mejores marcas recientes</h2></div>{!profile.records.length ? <Empty text="Los récords aparecerán cuando haya progreso registrado."/> : <div className="mt-4 grid gap-3 sm:grid-cols-2">{profile.records.map((record) => <article key={`${record.date}-${record.exercise}`} className="flex items-center gap-3 rounded-2xl border border-white/[.08] bg-[#10110e] p-4"><Trophy size={18} className="text-[#b7ff00]"/><div><p className="font-semibold">{record.exercise}</p><p className="mt-1 text-xs text-white/45">{record.weight} kg × {record.reps} · e1RM {record.estimatedOneRepMax} kg</p></div></article>)}</div>}</section>
    <BadgeShowcase badges={profile.badges}/>
  </div></main>;
}

function ActivityCard({ item, onRepost, repostingId }: { item: Activity; onRepost?: (item: BaseActivity) => void; repostingId: string }) {
  const original = item.type === "repost" ? item.original : item;
  return <article className={`rounded-2xl border p-4 ${original.type === "record" ? "border-[#b7ff00]/20 bg-[#b7ff00]/[.045]" : "border-white/[.08] bg-[#10110e]"}`}>{item.type === "repost" && <div className="mb-3 flex items-center gap-2 text-xs font-bold text-[#b7ff00]"><Repeat2 size={14}/> Compartió una publicación de @{item.originalAuthor.nickname || item.originalAuthor.name}</div>}<ActivityContent item={original}/>{item.type !== "repost" && onRepost && <button type="button" onClick={() => onRepost(original)} disabled={repostingId === original.id} className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-white/45 hover:text-[#b7ff00] disabled:opacity-50"><Repeat2 size={14}/>{repostingId === original.id ? "Reposteando…" : "Repost"}</button>}</article>;
}

function ActivityContent({ item }: { item: BaseActivity }) {
  if (item.type === "workout") return <div className="flex items-start gap-3"><Dumbbell size={18} className="mt-0.5 shrink-0 text-[#b7ff00]"/><div><p className="text-sm text-white/75">Completó <span className="font-semibold text-white">{item.routineName}</span></p><div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-white/45"><span>{duration(item.durationSeconds)}</span><span>{formatNumber(item.volume)} kg de volumen</span><span>{item.exerciseCount} ejercicios</span></div><p className="mt-3 text-[11px] text-white/25">{date(item.date)}</p></div></div>;
  if (item.type === "record") return <div className="flex items-start gap-3"><Trophy size={18} className="mt-0.5 shrink-0 text-[#b7ff00]"/><div><p className="text-[10px] font-bold tracking-[.16em] text-[#b7ff00]/75">NUEVO RÉCORD</p><p className="mt-1 text-sm font-semibold">{item.exercise}</p><p className="mt-1 text-xs text-white/55">{item.weight} kg × {item.reps} reps</p><p className="mt-3 text-[11px] text-white/25">{date(item.date)}</p></div></div>;
  if (item.type === "routine") return <div className="flex items-start gap-3"><Copy size={18} className="mt-0.5 shrink-0 text-[#b7ff00]"/><div><p className="text-sm text-white/75">Publicó la rutina <Link href={`/dashboard/community/library/${item.routine.id}`} className="font-semibold text-white underline decoration-[#b7ff00]/60 underline-offset-4 hover:text-[#b7ff00]">{item.routine.name}</Link></p><p className="mt-2 text-xs text-white/45">{item.routine.exerciseCount} ejercicios · {item.routine.setCount} series</p><Link href={`/dashboard/community/library/${item.routine.id}`} className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-[#b7ff00]">Ver e importar rutina <ArrowRight size={13}/></Link><p className="mt-3 text-[11px] text-white/25">{date(item.date)}</p></div></div>;
  return <div className="flex items-start gap-3"><MessageCircle size={18} className="mt-0.5 shrink-0 text-sky-200"/><div><p className="text-sm leading-6 text-white/80">{item.content}</p><p className="mt-3 text-[11px] text-white/25">{date(item.date)}</p></div></div>;
}

function Metric({ value, label }: { value: string; label: string }) { return <div className="rounded-xl bg-black/20 px-2 py-3 text-center"><p className="text-base font-semibold">{value}</p><p className="mt-1 text-[10px] text-white/35">{label}</p></div>; }
function Empty({ text }: { text: string }) { return <p className="mt-4 rounded-2xl border border-dashed border-white/10 bg-white/[.02] p-5 text-center text-sm text-white/35">{text}</p>; }
