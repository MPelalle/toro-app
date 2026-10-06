"use client";

import Link from "next/link";
import {
  Dumbbell,
  Heart,
  LoaderCircle,
  MessageCircle,
  Send,
  Trophy,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { UserAvatar } from "@/components/user/UserAvatar";

type Actor = {
  id: string;
  name: string;
  nickname: string | null;
  avatarUrl: string | null;
};

type Activity = {
  id: string;
  type: string;
  createdAt: string;
  actor: Actor;
  workout: {
    routineName: string;
    durationSeconds: number;
    volume: number;
    setCount: number;
    exerciseCount: number;
    highlightExercise: string | null;
  } | null;
  routine: {
    id: string;
    name: string;
    type: string;
    days: string[];
    exerciseCount: number;
    setCount: number;
    publishedAt: string | null;
  } | null;
  status: { id: string; content: string } | null;
  reactionCount: number;
  commentCount: number;
  reactedByViewer: boolean;
};

type Comment = {
  id: string;
  content: string;
  createdAt: string;
  canDelete: boolean;
  author: Actor;
};

type FeedResponse = { activities: Activity[]; nextCursor: string | null };
type CommentsResponse = { comments: Comment[]; nextCursor: string | null };

async function request<T>(path: string, init?: RequestInit) {
  const response = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof body.error === "string" ? body.error : "No pudimos completar la acción.");
  }
  return body as T;
}

function relativeTime(value: string) {
  const seconds = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 1_000));
  if (seconds < 60) return "ahora";
  if (seconds < 3_600) return `hace ${Math.floor(seconds / 60)} min`;
  if (seconds < 86_400) return `hace ${Math.floor(seconds / 3_600)} h`;
  if (seconds < 172_800) return "ayer";
  return new Date(value).toLocaleDateString("es-AR", { day: "numeric", month: "short" });
}

function formatDuration(seconds: number) {
  const hours = Math.floor(seconds / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);
  return hours ? `${hours} h ${minutes} min` : `${Math.max(1, minutes)} min`;
}

function formatVolume(volume: number) {
  return new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(volume);
}

function activityHeading(activity: Activity) {
  if (activity.type === "WORKOUT_COMPLETED") return "terminó un entrenamiento";
  if (activity.type === "ROUTINE_PUBLISHED") return "publicó una rutina";
  if (activity.type === "STATUS") return "compartió una actualización";
  if (activity.type === "REPOST") return "reposteó una actividad";
  return "compartió actividad";
}

export function ClubFeed() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [postingStatus, setPostingStatus] = useState(false);
  const [openComments, setOpenComments] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [commentInput, setCommentInput] = useState<Record<string, string>>({});
  const [commentLoading, setCommentLoading] = useState<Record<string, boolean>>({});
  const [submittingComment, setSubmittingComment] = useState<string | null>(null);

  const load = useCallback(async (cursor?: string | null) => {
    const isMore = Boolean(cursor);
    if (isMore) setLoadingMore(true);
    else setLoading(true);
    try {
      const feed = await request<FeedResponse>(`/api/community/feed${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`);
      setActivities((current) => isMore ? [...current, ...feed.activities] : feed.activities);
      setNextCursor(feed.nextCursor);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No pudimos cargar TORO CLUB.");
    } finally {
      if (isMore) setLoadingMore(false);
      else setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => { void load(); });
    return () => window.clearTimeout(initialLoad);
  }, [load]);

  const react = async (activity: Activity) => {
    const reactedByViewer = !activity.reactedByViewer;
    setActivities((current) => current.map((item) => item.id === activity.id
      ? { ...item, reactedByViewer, reactionCount: Math.max(0, item.reactionCount + (reactedByViewer ? 1 : -1)) }
      : item));
    try {
      const result = await request<{ reacted: boolean; reactionCount: number }>(
        `/api/community/activities/${activity.id}/reaction`,
        { method: reactedByViewer ? "PUT" : "DELETE" },
      );
      setActivities((current) => current.map((item) => item.id === activity.id
        ? { ...item, reactedByViewer: result.reacted, reactionCount: result.reactionCount }
        : item));
    } catch (cause) {
      setActivities((current) => current.map((item) => item.id === activity.id ? activity : item));
      setError(cause instanceof Error ? cause.message : "No se pudo actualizar la reacción.");
    }
  };

  const toggleComments = async (activityId: string) => {
    if (openComments === activityId) {
      setOpenComments(null);
      return;
    }
    setOpenComments(activityId);
    if (comments[activityId]) return;
    setCommentLoading((current) => ({ ...current, [activityId]: true }));
    try {
      const result = await request<CommentsResponse>(`/api/community/activities/${activityId}/comments`);
      setComments((current) => ({ ...current, [activityId]: result.comments }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudieron cargar los comentarios.");
    } finally {
      setCommentLoading((current) => ({ ...current, [activityId]: false }));
    }
  };

  const postComment = async (activityId: string) => {
    const content = (commentInput[activityId] || "").trim();
    if (!content) return;
    setSubmittingComment(activityId);
    try {
      const comment = await request<Comment>(`/api/community/activities/${activityId}/comments`, {
        method: "POST",
        body: JSON.stringify({ content }),
      });
      setComments((current) => ({ ...current, [activityId]: [...(current[activityId] || []), comment] }));
      setCommentInput((current) => ({ ...current, [activityId]: "" }));
      setActivities((current) => current.map((item) => item.id === activityId
        ? { ...item, commentCount: item.commentCount + 1 }
        : item));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo publicar el comentario.");
    } finally {
      setSubmittingComment(null);
    }
  };

  const removeComment = async (activityId: string, commentId: string) => {
    try {
      await request(`/api/community/activities/${activityId}/comments?commentId=${encodeURIComponent(commentId)}`, { method: "DELETE" });
      setComments((current) => ({ ...current, [activityId]: (current[activityId] || []).filter((item) => item.id !== commentId) }));
      setActivities((current) => current.map((item) => item.id === activityId
        ? { ...item, commentCount: Math.max(0, item.commentCount - 1) }
        : item));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo eliminar el comentario.");
    }
  };

  const publishStatus = async () => {
    const content = status.trim();
    if (!content) return;
    setPostingStatus(true);
    try {
      await request("/api/community/statuses", { method: "POST", body: JSON.stringify({ content }) });
      setStatus("");
      // The activity projection is intentionally asynchronous, so a short
      // refresh is preferable to pretending a failed projection was posted.
      window.setTimeout(() => { void load(); }, 250);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo publicar la actualización.");
    } finally {
      setPostingStatus(false);
    }
  };

  return <section className="mt-8" aria-labelledby="club-feed-title">
    <div className="flex items-end justify-between gap-4">
      <div>
        <p className="text-[10px] font-bold tracking-[.2em] text-[#b7ff00]/70">TORO CLUB</p>
        <h2 id="club-feed-title" className="mt-1 text-2xl font-semibold tracking-[-.04em]">Lo que mueve a tu gente.</h2>
      </div>
      <Link href="/dashboard/community/library" className="text-xs font-bold text-[#b7ff00] hover:text-[#d3ff63]">Descubrir rutinas</Link>
    </div>

    <div className="mt-4 rounded-[24px] border border-white/[.08] bg-[#10110e] p-4">
      <label htmlFor="club-status" className="text-xs font-semibold text-white/75">¿Cómo viene tu entrenamiento?</label>
      <div className="mt-3 flex gap-2">
        <textarea id="club-status" value={status} onChange={(event) => setStatus(event.target.value)} maxLength={280} rows={2} placeholder="Un update corto para tus amigos…" className="input min-h-0 flex-1 resize-none py-3 text-sm" />
        <button type="button" aria-label="Publicar actualización" onClick={() => void publishStatus()} disabled={!status.trim() || postingStatus} className="grid h-11 w-11 shrink-0 place-items-center self-end rounded-xl bg-[#b7ff00] text-black disabled:opacity-45">
          {postingStatus ? <LoaderCircle size={17} className="animate-spin" /> : <Send size={17} />}
        </button>
      </div>
      <p className="mt-2 text-right text-[10px] text-white/25">{status.length}/280</p>
    </div>

    {error && <p role="alert" className="mt-4 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-200">{error}</p>}
    {loading ? <div className="mt-5 grid place-items-center rounded-[24px] border border-white/[.08] bg-[#10110e] py-12 text-sm text-white/45"><LoaderCircle size={20} className="mb-3 animate-spin text-[#b7ff00]"/>Cargando actividad…</div> : null}
    {!loading && !activities.length ? <div className="mt-5 rounded-[24px] border border-dashed border-white/15 bg-white/[.02] p-7 text-center"><div className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-[#b7ff00]/10 text-[#b7ff00]"><Dumbbell size={22}/></div><h3 className="mt-4 font-semibold">Tu Club está listo para arrancar.</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/40">Agregá amigos, compartí una rutina o publicá un update. Tus próximos entrenamientos aparecerán acá automáticamente.</p><Link href="/dashboard/community/library" className="mt-5 inline-flex rounded-xl border border-[#b7ff00]/30 px-4 py-2.5 text-xs font-bold text-[#b7ff00]">Explorar rutinas públicas</Link></div> : null}
    <div className="mt-5 space-y-4">{activities.map((activity) => <article key={activity.id} className="overflow-hidden rounded-[24px] border border-white/[.08] bg-[#10110e]">
      <div className="p-5">
        <div className="flex items-start gap-3"><UserAvatar src={activity.actor.avatarUrl} name={activity.actor.name} nickname={activity.actor.nickname} size="md"/><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{activity.actor.name}</p><p className="mt-0.5 text-xs text-white/40">{activity.actor.nickname ? `@${activity.actor.nickname} · ` : ""}{relativeTime(activity.createdAt)}</p></div></div>
        <p className="mt-4 text-sm text-white/70"><span className="font-semibold text-white">{activity.actor.name}</span> {activityHeading(activity)}</p>
        {activity.workout ? <WorkoutCard workout={activity.workout} /> : null}
        {activity.routine ? <RoutineCard routine={activity.routine} /> : null}
        {activity.status ? <p className="mt-4 whitespace-pre-wrap text-[15px] leading-7 text-white/80">{activity.status.content}</p> : null}
        <div className="mt-5 flex items-center gap-1 border-t border-white/[.07] pt-3">
          <button type="button" aria-label={activity.reactedByViewer ? "Quitar reacción" : "Reaccionar"} aria-pressed={activity.reactedByViewer} onClick={() => void react(activity)} className={`inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-xs font-bold transition ${activity.reactedByViewer ? "bg-[#b7ff00]/12 text-[#b7ff00]" : "text-white/45 hover:bg-white/[.05] hover:text-white"}`}><Heart size={16} fill={activity.reactedByViewer ? "currentColor" : "none"}/>{activity.reactionCount || ""}<span className="sr-only">reacciones</span></button>
          <button type="button" aria-label="Ver comentarios" aria-expanded={openComments === activity.id} onClick={() => void toggleComments(activity.id)} className="inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-xs font-bold text-white/45 hover:bg-white/[.05] hover:text-white"><MessageCircle size={16}/>{activity.commentCount || ""}<span className="sr-only">comentarios</span></button>
        </div>
        {openComments === activity.id ? <Comments activityId={activity.id} comments={comments[activity.id] || []} loading={Boolean(commentLoading[activity.id])} value={commentInput[activity.id] || ""} submitting={submittingComment === activity.id} onChange={(value) => setCommentInput((current) => ({ ...current, [activity.id]: value }))} onSubmit={postComment} onDelete={removeComment} /> : null}
      </div>
    </article>)}</div>
    {nextCursor ? <button type="button" onClick={() => void load(nextCursor)} disabled={loadingMore} className="mx-auto mt-5 flex min-h-11 items-center gap-2 rounded-xl border border-white/10 px-4 text-xs font-bold text-white/65 hover:border-[#b7ff00]/30 hover:text-[#b7ff00] disabled:opacity-45">{loadingMore && <LoaderCircle size={15} className="animate-spin"/>}{loadingMore ? "Cargando…" : "Cargar más actividad"}</button> : null}
  </section>;
}

function WorkoutCard({ workout }: { workout: NonNullable<Activity["workout"]> }) {
  return <div className="mt-4 rounded-2xl border border-[#b7ff00]/15 bg-[#b7ff00]/[.045] p-4"><div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-bold tracking-[.16em] text-[#b7ff00]/75">ENTRENAMIENTO COMPLETADO</p><h3 className="mt-1 text-lg font-semibold">{workout.routineName}</h3></div><Dumbbell size={20} className="text-[#b7ff00]"/></div><div className="mt-5 grid grid-cols-3 gap-2"><Metric label="VOLUMEN" value={`${formatVolume(workout.volume)} kg`}/><Metric label="DURACIÓN" value={formatDuration(workout.durationSeconds)}/><Metric label="SERIES" value={String(workout.setCount)}/></div>{workout.highlightExercise ? <p className="mt-4 flex items-center gap-2 text-xs text-white/55"><Trophy size={14} className="text-[#b7ff00]"/>Ejercicio destacado: <span className="font-semibold text-white/80">{workout.highlightExercise}</span></p> : null}</div>;
}

function RoutineCard({ routine }: { routine: NonNullable<Activity["routine"]> }) {
  return <div className="mt-4 rounded-2xl border border-white/[.1] bg-black/20 p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-bold tracking-[.16em] text-[#b7ff00]/75">RUTINA PÚBLICA</p><h3 className="mt-1 text-lg font-semibold">{routine.name}</h3><p className="mt-1 text-xs text-white/40">{routine.type} · {routine.days.length} días · {routine.exerciseCount} ejercicios</p></div><Link href={`/dashboard/community/library/${routine.id}`} className="shrink-0 rounded-lg border border-[#b7ff00]/30 px-3 py-2 text-[11px] font-bold text-[#b7ff00]">Ver rutina</Link></div></div>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div><p className="text-[9px] font-bold tracking-[.12em] text-white/35">{label}</p><p className="mt-1 text-sm font-semibold text-white">{value}</p></div>;
}

function Comments({ activityId, comments, loading, value, submitting, onChange, onSubmit, onDelete }: { activityId: string; comments: Comment[]; loading: boolean; value: string; submitting: boolean; onChange: (value: string) => void; onSubmit: (activityId: string) => Promise<void>; onDelete: (activityId: string, commentId: string) => Promise<void> }) {
  return <div className="mt-4 border-t border-white/[.07] pt-4"><div className="space-y-3">{loading ? <p className="text-xs text-white/35">Cargando comentarios…</p> : comments.map((comment) => <div key={comment.id} className="flex gap-2"><UserAvatar src={comment.author.avatarUrl} name={comment.author.name} nickname={comment.author.nickname} size="sm"/><div className="min-w-0 flex-1 rounded-xl bg-white/[.045] px-3 py-2"><p className="text-xs font-semibold text-white/80">{comment.author.name} <span className="font-normal text-white/30">{relativeTime(comment.createdAt)}</span></p><p className="mt-1 break-words text-xs leading-5 text-white/65">{comment.content}</p>{comment.canDelete ? <button type="button" onClick={() => void onDelete(activityId, comment.id)} className="mt-1 text-[10px] font-bold text-white/30 hover:text-red-300">Eliminar</button> : null}</div></div>)}</div><div className="mt-4 flex gap-2"><input value={value} onChange={(event) => onChange(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void onSubmit(activityId); } }} maxLength={500} placeholder="Sumá algo útil…" className="input min-w-0 flex-1 py-2 text-xs"/><button type="button" aria-label="Enviar comentario" onClick={() => void onSubmit(activityId)} disabled={!value.trim() || submitting} className="grid h-10 w-10 place-items-center rounded-xl bg-[#b7ff00] text-black disabled:opacity-45">{submitting ? <LoaderCircle size={15} className="animate-spin"/> : <Send size={15}/>}</button></div></div>;
}
