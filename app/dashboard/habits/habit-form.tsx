"use client";

import { BookOpen, Brain, Droplets, Dumbbell, Footprints, HeartPulse, Leaf, Lightbulb, Moon, Target } from "lucide-react";
import { useFormStatus } from "react-dom";

const icons = ["Target", "Brain", "BookOpen", "Droplets", "Dumbbell", "Footprints", "HeartPulse", "Leaf", "Lightbulb", "Moon"];
const iconMap = { Target, Brain, BookOpen, Droplets, Dumbbell, Footprints, HeartPulse, Leaf, Lightbulb, Moon };

type Values = { name?: string; icon?: string; importance?: string; durationValue?: number; durationUnit?: string; status?: string; notes?: string | null };

export function HabitForm({ action, values = {}, submitLabel }: { action: (formData: FormData) => void | Promise<void>; values?: Values; submitLabel: string }) {
  return (
    <form action={action} className="mt-7 space-y-5 rounded-3xl border border-white/8 bg-white/[.035] p-5 sm:p-7">
      <label className="block text-sm font-medium text-white/70">Nombre del hábito
        <input name="name" required maxLength={120} defaultValue={values.name} placeholder="Ej. Leer 20 minutos" className="mt-2 h-12 w-full rounded-xl border border-white/10 bg-black/20 px-4 outline-none placeholder:text-white/25 focus:border-[#a3ff12]/60" />
      </label>
      <fieldset><legend className="text-sm font-medium text-white/70">Ícono</legend><div className="mt-2 grid grid-cols-5 gap-2">
        {icons.map((name) => { const Icon = iconMap[name as keyof typeof iconMap]; return <label key={name} className="cursor-pointer"><input className="peer sr-only" type="radio" name="icon" value={name} defaultChecked={(values.icon || "Target") === name} /><span className="grid h-11 place-items-center rounded-xl border border-white/10 bg-black/20 text-white/55 transition peer-checked:border-[#a3ff12] peer-checked:bg-[#a3ff12] peer-checked:text-black"><Icon className="h-5 w-5" /></span></label>; })}
      </div></fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium text-white/70">Importancia<select name="importance" defaultValue={values.importance || "MEDIUM"} className="mt-2 h-12 w-full rounded-xl border border-white/10 bg-black/20 px-3 outline-none"><option value="HIGH">Alta</option><option value="MEDIUM">Media</option><option value="LOW">Baja</option></select></label>
        <label className="text-sm font-medium text-white/70">Estado<select name="status" defaultValue={values.status || "ACTIVE"} className="mt-2 h-12 w-full rounded-xl border border-white/10 bg-black/20 px-3 outline-none"><option value="ACTIVE">Activo</option><option value="PAUSED">Pausado</option><option value="INACTIVE">Inactivo</option></select></label>
      </div>
      <div className="grid grid-cols-[120px_1fr] gap-3"><label className="text-sm font-medium text-white/70">Cantidad<input name="durationValue" type="number" min="1" required defaultValue={values.durationValue || 30} className="mt-2 h-12 w-full rounded-xl border border-white/10 bg-black/20 px-3 outline-none" /></label><label className="text-sm font-medium text-white/70">Duración<select name="durationUnit" defaultValue={values.durationUnit || "DAYS"} className="mt-2 h-12 w-full rounded-xl border border-white/10 bg-black/20 px-3 outline-none"><option value="DAYS">Días</option><option value="MONTHS">Meses</option></select></label></div>
      <label className="block text-sm font-medium text-white/70">Comentarios <span className="font-normal text-white/35">(opcional)</span><textarea name="notes" defaultValue={values.notes || ""} rows={4} placeholder="Qué querés recordar o medir" className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-black/20 p-4 outline-none placeholder:text-white/25 focus:border-[#a3ff12]/60" /></label>
      <SubmitButton label={submitLabel} />
    </form>
  );
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return <button disabled={pending} className="h-12 w-full rounded-xl bg-[#a3ff12] text-sm font-bold text-black transition hover:bg-[#b8ff47] active:scale-[.99] disabled:cursor-wait disabled:opacity-60">{pending ? "Guardando…" : label}</button>;
}
