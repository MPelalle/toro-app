"use client";

import { Check, Copy, Gift, LockKeyhole, Trophy } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type { ToroRewards } from "@/lib/reward-types";

export function RewardsPanel({ rewards }: { rewards: ToroRewards }) {
  const [copied, setCopied] = useState(false);
  const active = rewards.highestUnlocked;
  const copy = async () => {
    if (!active) return;
    await navigator.clipboard.writeText(active.code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };
  return <section className="rounded-[28px] border border-[#b7ff00]/18 bg-[#10110e]/95 p-5 sm:p-7"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-[10px] font-bold tracking-[.2em] text-[#b7ff00]/70">RECOMPENSAS TORO</p><h1 className="mt-2 text-3xl font-semibold tracking-[-.05em]">Tu constancia tiene premio.</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-white/45">Los códigos son universales y se usa uno por compra: los descuentos no se acumulan.</p></div><div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#b7ff00] text-black"><Gift size={21}/></div></div>{active ? <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#b7ff00]/25 bg-[#b7ff00]/[.08] p-4"><div><p className="text-sm font-semibold">Desbloqueaste {active.discount}% OFF</p><p className="mt-1 text-xs text-white/50">Tu mejor recompensa activa: {active.title}.</p></div><button type="button" onClick={() => void copy()} className="inline-flex items-center gap-2 rounded-xl bg-[#b7ff00] px-4 py-3 text-sm font-bold text-black">{copied ? <Check size={16}/> : <Copy size={16}/>} {copied ? "Código copiado" : active.code}</button></div> : <p className="mt-6 rounded-2xl bg-black/20 p-4 text-sm text-white/45">Completá una meta para recibir tu primer código universal.</p>}<div className="mt-6 grid gap-3 sm:grid-cols-2">{rewards.rewards.map((reward) => <article key={reward.id} className={`rounded-2xl border p-4 ${reward.unlocked ? "border-[#b7ff00]/25 bg-[#b7ff00]/[.055]" : "border-white/[.08] bg-black/15"}`}><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold">{reward.title}</p><p className="mt-1 text-xs leading-5 text-white/40">{reward.description}</p></div><span className={`inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold ${reward.unlocked ? "bg-[#b7ff00] text-black" : "bg-white/[.07] text-white/55"}`}>{reward.unlocked ? <Trophy size={13}/> : <LockKeyhole size={13}/>} {reward.discount}%</span></div><div className="mt-5 h-2 overflow-hidden rounded-full bg-white/[.07]"><span className="block h-full rounded-full bg-[#b7ff00] transition-[width]" style={{ width: `${reward.progress}%` }}/></div><div className="mt-2 flex justify-between gap-3 text-[11px]"><span className="text-white/40">{reward.progressLabel}</span><span className={reward.unlocked ? "font-bold text-[#b7ff00]" : "text-white/35"}>{reward.unlocked ? "Desbloqueada" : `${reward.progress}%`}</span></div></article>)}</div></section>;
}

export function RewardsTeaser({ rewards }: { rewards: ToroRewards | null }) {
  if (!rewards) return null;
  const next = rewards.rewards.find((reward) => !reward.unlocked) || rewards.highestUnlocked;
  if (!next) return null;
  return <section className="mt-6 rounded-[28px] border border-[#b7ff00]/15 bg-[#10110e]/90 p-5"><div className="flex items-center justify-between gap-4"><div><p className="text-[10px] font-bold tracking-[.18em] text-[#b7ff00]/70">RECOMPENSAS</p><h2 className="mt-1 text-xl font-semibold">{rewards.highestUnlocked ? `${rewards.highestUnlocked.discount}% OFF desbloqueado` : next.title}</h2><p className="mt-2 text-xs text-white/40">{rewards.highestUnlocked ? `Código ${rewards.highestUnlocked.code} · no acumulable` : next.progressLabel}</p></div><span className="rounded-xl bg-[#b7ff00]/10 px-3 py-2 text-sm font-bold text-[#b7ff00]">{rewards.highestUnlocked ? rewards.highestUnlocked.code : `${next.progress}%`}</span></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-white/[.07]"><span className="block h-full rounded-full bg-[#b7ff00]" style={{ width: `${next.progress}%` }}/></div><Link href="/dashboard/rewards" className="mt-4 inline-flex text-xs font-bold text-[#b7ff00] hover:text-white">Ver todas las recompensas →</Link></section>;
}
