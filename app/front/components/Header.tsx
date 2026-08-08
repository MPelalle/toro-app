"use client";

import { CircleDot, Flame, Menu } from "lucide-react";
import { useEffect, useState } from "react";
import ToroSidebar from "./SideBar";

interface ToroHeaderProps {
  onMenuClick?: () => void;
  stats: { streak: number; progress: number };
}

export default function ToroHeader({ onMenuClick, stats }: ToroHeaderProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentStats, setCurrentStats] = useState(stats);
  const [workoutInProgress, setWorkoutInProgress] = useState(false);

  useEffect(() => {
    const refresh = () => {
      void fetch("/api/dashboard/header-stats", { cache: "no-store" })
        .then((response) => response.ok ? response.json() : null)
        .then((next) => { if (next) setCurrentStats(next); })
        .catch(() => null);
    };
    refresh();
    const interval = window.setInterval(refresh, 60_000);
    window.addEventListener("focus", refresh);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  useEffect(() => {
    const updateWorkoutStatus = (event: Event) => setWorkoutInProgress(Boolean((event as CustomEvent<{ active?: boolean }>).detail?.active));
    window.addEventListener("toro-workout-status-change", updateWorkoutStatus);
    return () => {
      window.removeEventListener("toro-workout-status-change", updateWorkoutStatus);
    };
  }, []);

  const handleMenuClick = () => {
    setSidebarOpen(true);
    onMenuClick?.();
  };

  return (
    <>
      <header className="fixed left-1/2 z-50 w-[calc(100%-24px)] max-w-7xl -translate-x-1/2" style={{ top: "max(1rem, calc(env(safe-area-inset-top) + 0.5rem))" }}>
        <div className="pointer-events-none absolute -inset-x-8 top-0 -z-10 h-37.5 rounded-[50px] bg-[radial-gradient(ellipse_at_top,rgba(0,0,0,0.65)_0%,rgba(0,0,0,0.35)_35%,rgba(0,0,0,0.12)_58%,transparent_80%)] blur-[18px]" />
        <div className="pointer-events-none absolute -inset-x-4 top-10 -z-10 h-30 bg-linear-to-b from-black/30 via-black/10 to-transparent blur-[20px]" />

        <div className="relative flex h-18 items-center justify-between rounded-4xl border border-white/8 bg-[#111111]/90 px-3 shadow-[0_12px_40px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
          <button type="button" onClick={handleMenuClick} aria-label="Abrir menu" className="flex h-12 w-12 items-center justify-center rounded-full bg-white/6 text-white transition-all duration-200 hover:bg-white/10 active:scale-95">
            <Menu size={24} strokeWidth={2} />
          </button>

          <div className="absolute left-1/2 -translate-x-1/2">
            {workoutInProgress && <div role="status" aria-label="Entrenamiento en progreso" className="flex items-center gap-2 whitespace-nowrap rounded-full border border-red-400/20 bg-red-400/[.08] px-3 py-2 text-[10px] font-bold tracking-[.12em] text-red-200">
              <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" /><span className="relative inline-flex h-2 w-2 rounded-full bg-red-400" /></span>
              ENTRENAMIENTO EN PROGRESO
            </div>}
          </div>

          <div className={`ml-auto ${workoutInProgress ? "hidden sm:flex" : "flex"} items-center`}>
            <div className="flex h-12 items-center gap-4 rounded-full border border-white/[0.07] bg-white/4.5 px-4 text-sm font-semibold text-white">
              <span className="inline-flex items-center gap-1.5" title="Racha de ingresos diarios">
                <Flame size={19} className="text-orange-400" fill="currentColor" />
                <span>{currentStats.streak}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 border-l border-white/10 pl-4" title="Progreso diario general">
                <CircleDot size={18} className="text-[#B7FF00]" />
                <span>{currentStats.progress}%</span>
              </span>
            </div>
          </div>
        </div>
      </header>

      <ToroSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
    </>
  );
}
