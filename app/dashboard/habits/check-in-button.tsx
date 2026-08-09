"use client";

import { useTransition } from "react";
import { Check } from "lucide-react";
import { appDateKey } from "@/lib/app-date";
import { toggleHabitCheckIn } from "./actions";

type Props = {
  id: string;
  status: string;
  done: boolean;
  date?: string;
  compact?: boolean;
};

export function CheckInButton({ id, status, done, date, compact = false }: Props) {
  const [pending, startTransition] = useTransition();
  const completedAt = date || appDateKey();

  return (
    <button
      type="button"
      disabled={status !== "ACTIVE" || pending}
      onClick={() => startTransition(() => toggleHabitCheckIn(id, completedAt))}
      className={`grid shrink-0 place-items-center border transition disabled:cursor-not-allowed ${compact ? "h-9 w-9 rounded-xl" : "h-12 w-12 rounded-2xl"} ${done ? "border-[#a3ff12] bg-[#a3ff12] text-black" : "border-white/12 bg-white/4 text-white/45 hover:border-[#a3ff12]/50"}`}
      aria-label={done ? "Desmarcar hábito" : "Completar hábito"}
    >
      {done ? <Check className={compact ? "h-4 w-4" : "h-5 w-5"} strokeWidth={3} /> : <span className={compact ? "text-sm" : "text-lg"}>{pending ? "…" : "✓"}</span>}
    </button>
  );
}
