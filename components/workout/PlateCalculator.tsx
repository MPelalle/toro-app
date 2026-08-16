"use client";

import { Calculator, Minus, Plus, X } from "lucide-react";
import { useMemo, useState } from "react";

const plateOptions = [25, 20, 15, 10, 5, 2.5, 1.25] as const;

function formatWeight(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.00$/, "");
}

/** A small, on-demand plate calculator for barbell working sets. */
export function PlateCalculator() {
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState(60);
  const [barWeight, setBarWeight] = useState(20);

  const result = useMemo(() => {
    const perSide = Math.max(0, (target - barWeight) / 2);
    const breakdown = plateOptions.reduce<{ remaining: number; plates: Array<{ plate: number; count: number }> }>((current, plate) => {
      const count = Math.floor((current.remaining + 0.001) / plate);
      return {
        remaining: Math.round((current.remaining - count * plate) * 100) / 100,
        plates: count ? [...current.plates, { plate, count }] : current.plates,
      };
    }, { remaining: Math.round(perSide * 100) / 100, plates: [] });
    return { perSide, plates: breakdown.plates, remaining: Math.max(0, breakdown.remaining) };
  }, [barWeight, target]);

  return <>
    <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs text-white/65 transition hover:border-[#b7ff00]/30 hover:text-[#d7ff78]" aria-haspopup="dialog">
      <Calculator size={14} /> Discos
    </button>
    {open && <div role="dialog" aria-modal="true" aria-labelledby="plate-calculator-title" className="fixed inset-0 z-[120] grid place-items-end bg-black/70 p-3 sm:place-items-center sm:p-6">
      <button type="button" aria-label="Cerrar calculadora" className="absolute inset-0 cursor-default" onClick={() => setOpen(false)} />
      <section className="relative w-full max-w-md rounded-[28px] border border-white/10 bg-[#10110e] p-5 shadow-2xl sm:p-6">
        <div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-bold tracking-[.18em] text-[#b7ff00]/70">HERRAMIENTA DE ENTRENAMIENTO</p><h2 id="plate-calculator-title" className="mt-1 text-xl font-semibold">Calculadora de discos</h2><p className="mt-1 text-xs text-white/45">Cantidad por lado para una barra olímpica.</p></div><button type="button" onClick={() => setOpen(false)} className="grid h-9 w-9 place-items-center rounded-full border border-white/10 text-white/60 hover:bg-white/[.06]" aria-label="Cerrar"><X size={17} /></button></div>
        <div className="mt-6 grid grid-cols-2 gap-3"><WeightControl label="Peso total" value={target} onChange={setTarget} min={barWeight} /><WeightControl label="Peso de barra" value={barWeight} onChange={setBarWeight} min={0} /></div>
        <div className="mt-5 rounded-2xl border border-[#b7ff00]/20 bg-[#b7ff00]/[.06] p-4"><div className="flex items-end justify-between gap-3"><div><p className="text-xs text-[#d7ff78]/75">Por lado</p><p className="mt-1 text-3xl font-semibold text-[#d7ff78]">{formatWeight(result.perSide)} <span className="text-base">kg</span></p></div><p className="text-right text-xs text-white/45">Total<br /><span className="font-semibold text-white">{formatWeight(target)} kg</span></p></div><div className="mt-4 flex flex-wrap gap-2">{result.plates.length ? result.plates.map(({ plate, count }) => <span key={plate} className="rounded-lg border border-white/10 bg-black/20 px-2.5 py-1.5 text-xs font-semibold text-white"><span className="text-[#b7ff00]">{count}×</span> {formatWeight(plate)} kg</span>) : <span className="text-xs text-white/45">Sólo la barra.</span>}</div>{result.remaining > 0.01 && <p className="mt-3 text-xs text-amber-200">Quedan {formatWeight(result.remaining)} kg por lado sin cubrir con estos discos.</p>}</div>
      </section>
    </div>}
  </>;
}

function WeightControl({ label, value, min, onChange }: { label: string; value: number; min: number; onChange: (value: number) => void }) {
  const change = (delta: number) => onChange(Math.max(min, Math.min(500, Math.round((value + delta) * 100) / 100)));
  return <label className="rounded-xl border border-white/[.08] bg-black/15 p-3"><span className="block text-[11px] text-white/45">{label}</span><div className="mt-2 flex items-center justify-between gap-2"><button type="button" onClick={() => change(-2.5)} className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 text-white/60" aria-label={`Restar 2,5 kg a ${label}`}><Minus size={14} /></button><input value={value} onChange={(event) => { const next = Number(event.target.value); if (Number.isFinite(next)) onChange(Math.max(min, Math.min(500, next))); }} className="w-full bg-transparent text-center text-sm font-semibold text-white outline-none" type="number" min={min} max={500} step="2.5" inputMode="decimal" aria-label={label} /><button type="button" onClick={() => change(2.5)} className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 text-white/60" aria-label={`Sumar 2,5 kg a ${label}`}><Plus size={14} /></button></div></label>;
}
