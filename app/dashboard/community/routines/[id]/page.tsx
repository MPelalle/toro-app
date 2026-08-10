"use client";

import Link from "next/link";
import { ArrowLeft, Dumbbell, Pencil, UsersRound } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { UserAvatar } from "@/components/user/UserAvatar";

type Dashboard = {
  routine: { id: string; name: string; days: string[] };
  members: Array<{
    id: string;
    name: string;
    nickname: string | null;
    avatarUrl: string | null;
    metrics: { sessions: number; volume: number; sets: number; prs: number };
  }>;
  exercises: Array<{
    name: string;
    members: Array<{ userId: string; current: number; previous: number; progress: number | null }>;
  }>;
  activity: Array<{ id: string; name: string; nickname: string | null; avatarUrl: string | null; date: string; text: string }>;
};

const number = (value: number) => value.toLocaleString("es-AR", { maximumFractionDigits: 0 });

export default function SharedRoutineDashboardPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void fetch(`/api/community/routines/${id}/dashboard`)
      .then(async (response) => {
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.error || "No pudimos abrir esta rutina.");
        return body as Dashboard;
      })
      .then((dashboard) => { if (active) setData(dashboard); })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "No pudimos abrir esta rutina."); });
    return () => { active = false; };
  }, [id]);

  if (!data) {
    return <main className="min-h-dvh bg-[#090a08] px-4 pb-36 pt-28 text-white"><div className="mx-auto max-w-4xl text-sm text-white/45">{error || "Cargando rutina compartida…"}</div></main>;
  }

  return <main className="min-h-dvh bg-[#090a08] px-4 pb-36 pt-28 text-white sm:px-8"><div className="mx-auto max-w-4xl">
    <Link href="/dashboard/community" className="inline-flex items-center gap-2 text-xs text-white/45 hover:text-white"><ArrowLeft size={15}/> Comunidad</Link>
    <header className="mt-8 flex flex-wrap items-end justify-between gap-4"><div><p className="text-[10px] font-bold tracking-[.22em] text-[#b7ff00]/70">RUTINA COMPARTIDA</p><h1 className="mt-2 text-3xl font-semibold tracking-[-.05em] sm:text-4xl">{data.routine.name}</h1><p className="mt-2 text-sm text-white/40">{data.routine.days.length ? data.routine.days.join(", ") : "Sin días definidos"}</p></div><div className="flex flex-wrap gap-2"><Link href={`/dashboard/routine/${id}`} className="inline-flex items-center gap-2 rounded-xl bg-[#b7ff00] px-4 py-3 text-sm font-bold text-black"><Dumbbell size={16}/> Entrenar</Link><Link href={`/dashboard/routine/${id}/edit`} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold text-white/70"><Pencil size={15}/> Editar plan</Link></div></header>
    {error && <p role="alert" className="mt-5 text-sm text-red-300">{error}</p>}

    <section className="mt-7 rounded-[28px] border border-[#b7ff00]/15 bg-[#10110e] p-5 sm:p-7"><div className="flex items-center gap-2"><UsersRound size={17} className="text-[#b7ff00]"/><p className="text-sm font-semibold">Esta semana</p></div><p className="mt-2 text-xs leading-5 text-white/35">Como creador, cualquier cambio de estructura que guardes se actualiza para todo el equipo. Las sesiones ya registradas se conservan.</p><div className="mt-5 grid gap-3 sm:grid-cols-2">{data.members.map((member) => <article key={member.id} className="rounded-2xl border border-white/[.07] bg-black/20 p-4"><div className="flex items-center gap-3"><UserAvatar src={member.avatarUrl} name={member.name} nickname={member.nickname} size="md"/><div><p className="font-semibold">{member.name}</p><p className="text-xs text-white/40">@{member.nickname}</p></div></div><div className="mt-4 grid grid-cols-2 gap-3"><Metric label="Entrenamientos" value={String(member.metrics.sessions)}/><Metric label="Volumen" value={`${number(member.metrics.volume)} kg`}/><Metric label="Series" value={String(member.metrics.sets)}/><Metric label="Nuevos PR" value={String(member.metrics.prs)}/></div></article>)}</div></section>

    <section className="mt-7"><p className="text-[10px] font-bold tracking-[.18em] text-[#b7ff00]/70">PROGRESO POR EJERCICIO</p>{!data.exercises.length ? <p className="mt-3 text-sm text-white/35">Cuando completen sesiones, el progreso individual aparecerá acá.</p> : <div className="mt-4 space-y-3">{data.exercises.map((exercise) => <article key={exercise.name} className="rounded-2xl border border-white/[.07] bg-white/[.025] p-4"><p className="font-semibold">{exercise.name}</p><div className="mt-4 grid gap-3 sm:grid-cols-2">{exercise.members.map((metric) => { const member = data.members.find((item) => item.id === metric.userId); return <div key={metric.userId} className="rounded-xl bg-black/20 p-3"><div className="flex items-center gap-2"><UserAvatar src={member?.avatarUrl} name={member?.name} nickname={member?.nickname} size="sm"/><p className="text-xs font-semibold">{member?.name}</p></div><p className="mt-2 text-xs text-white/40">Semana anterior: {metric.previous ? `${metric.previous} e1RM` : "Sin referencia"}</p><p className="mt-1 text-xs text-white/60">Esta semana: {metric.current ? `${metric.current} e1RM` : "Sin registro"}</p><p className="mt-2 text-sm font-bold text-[#b7ff00]">{metric.progress === null ? "Primer registro" : `${metric.progress >= 0 ? "+" : ""}${metric.progress}%`}</p></div>; })}</div></article>)}</div>}</section>

    <section className="mt-7"><p className="text-[10px] font-bold tracking-[.18em] text-[#b7ff00]/70">ACTIVIDAD</p>{!data.activity.length ? <p className="mt-3 text-sm text-white/35">Todavía no hay actividad en esta rutina.</p> : <div className="mt-3 space-y-2">{data.activity.map((item) => <div key={item.id} className="flex items-center gap-3 rounded-xl border border-white/[.06] bg-white/[.02] px-4 py-3"><UserAvatar src={item.avatarUrl} name={item.name} nickname={item.nickname} size="sm"/><div><p className="text-sm text-white/75">{item.text}</p><p className="mt-1 text-[11px] text-white/25">{new Date(item.date).toLocaleString("es-AR")}</p></div></div>)}</div>}</section>
  </div></main>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div><p className="text-lg font-semibold">{value}</p><p className="text-[11px] text-white/35">{label}</p></div>;
}
