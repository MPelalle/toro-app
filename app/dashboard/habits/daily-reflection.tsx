"use client";

import { useState, useTransition } from "react";
import { MessageSquareText } from "lucide-react";
import { saveHabitDayComment } from "./actions";

export function DailyReflection({ habitId, date, initialComment, completed }: { habitId: string; date: string; initialComment?: string | null; completed: boolean }) {
  const [comment, setComment] = useState(initialComment || "");
  const [saved, setSaved] = useState(Boolean(initialComment));
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      await saveHabitDayComment(habitId, date, comment);
      setSaved(Boolean(comment.trim()));
    });
  }

  return <div className="rounded-2xl border border-white/[.07] bg-black/20 p-3"><div className="mb-2 flex items-center gap-2 text-xs text-white/45"><MessageSquareText className="h-3.5 w-3.5 text-[#a3ff12]" /><span>{completed ? "Completaste el hábito" : "No completado"}</span>{saved && <span className="ml-auto text-[#a3ff12]">Guardado</span>}</div><textarea value={comment} onChange={(event) => { setComment(event.target.value); setSaved(false); }} onBlur={save} maxLength={1000} rows={2} placeholder="¿Cómo te sentiste? ¿Qué te costó o ayudó?" className="w-full resize-none bg-transparent text-sm leading-5 text-white/80 outline-none placeholder:text-white/25 disabled:opacity-50" disabled={pending} /><p className="mt-1 text-[11px] text-white/30">{pending ? "Guardando…" : "Se guarda al salir del campo"}</p></div>;
}
