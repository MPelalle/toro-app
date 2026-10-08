"use client";

import { useState, useTransition } from "react";
import { Check, X } from "lucide-react";
import { appDateKey } from "@/lib/app-date";
import { toggleHabitCheckIn, type HabitFeelingValue } from "./actions";

type Props = { id: string; status: string; done: boolean; date?: string; compact?: boolean };
const feelings: Array<{ value: HabitFeelingValue; label: string; detail: string; icon: string }> = [
  { value: "VERY_DIFFICULT", label: "Muy difícil", detail: "Me exigió mucho", icon: "😮‍💨" },
  { value: "DIFFICULT", label: "Costó", detail: "Lo hice con esfuerzo", icon: "😓" },
  { value: "NEUTRAL", label: "Normal", detail: "Como esperaba", icon: "🙂" },
  { value: "EASY", label: "Fácil", detail: "Fluyó bien", icon: "😊" },
  { value: "VERY_EASY", label: "Muy fácil", detail: "Salió sin esfuerzo", icon: "⚡" },
];

export function CheckInButton({ id, status, done, date, compact = false }: Props) {
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const completedAt = date || appDateKey();
  const complete = (feeling: HabitFeelingValue | null) => startTransition(async () => { await toggleHabitCheckIn(id, completedAt, feeling); setOpen(false); });
  const toggleDone = () => startTransition(() => toggleHabitCheckIn(id, completedAt));
  const size = compact ? "h-9 w-9 rounded-xl" : "h-12 w-12 rounded-2xl";

  return <><button type="button" disabled={status !== "ACTIVE" || pending} onClick={() => done ? toggleDone() : setOpen(true)} className={"grid shrink-0 place-items-center border transition disabled:cursor-not-allowed " + size + " " + (done ? "border-[#a3ff12] bg-[#a3ff12] text-black" : "border-white/12 bg-white/4 text-white/45 hover:border-[#a3ff12]/50")} aria-label={done ? "Desmarcar hábito" : "Completar hábito"}>{done ? <Check className={compact ? "h-4 w-4" : "h-5 w-5"} strokeWidth={3} /> : <span className={compact ? "text-sm" : "text-lg"}>{pending ? "…" : "✓"}</span>}</button>
    {open && <div className="fixed inset-0 z-[100] grid place-items-end bg-black/70 p-3 backdrop-blur-sm sm:place-items-center sm:p-5" role="dialog" aria-modal="true" aria-label="Cómo te resultó el hábito"><section className="w-full max-w-md rounded-[28px] border border-white/10 bg-[#11120f] p-5 shadow-2xl"><header className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-bold tracking-[.18em] text-[#a3ff12]/75">REGISTRO DIARIO</p><h2 className="mt-1 text-xl font-semibold">¿Cómo te resultó hoy?</h2><p className="mt-2 text-sm text-white/45">Guardamos esta sensación junto al hábito de hoy.</p></div><button type="button" onClick={() => setOpen(false)} aria-label="Cerrar" className="grid h-9 w-9 place-items-center rounded-full border border-white/10 text-white/60"><X size={17}/></button></header><div className="mt-5 space-y-2">{feelings.map((feeling) => <button key={feeling.value} type="button" disabled={pending} onClick={() => complete(feeling.value)} className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[.025] p-3 text-left transition hover:border-[#a3ff12]/50 hover:bg-[#a3ff12]/[.06] disabled:opacity-50"><span className="grid h-10 w-10 place-items-center rounded-lg bg-black/20 text-xl">{feeling.icon}</span><span><span className="block text-sm font-semibold">{feeling.label}</span><span className="mt-0.5 block text-xs text-white/40">{feeling.detail}</span></span></button>)}</div><button type="button" disabled={pending} onClick={() => complete(null)} className="mt-4 w-full py-2 text-xs font-semibold text-white/45 hover:text-white disabled:opacity-50">Completar sin registrar sensación</button></section></div>}
  </>;
}
