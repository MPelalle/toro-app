"use client";

import { useEffect, useState } from "react";
import { Menu, Play, RotateCcw, Square, Timer } from "lucide-react";
import Image from "next/image";
import ToroSidebar from "./SideBar";


interface ToroHeaderProps {
  onMenuClick?: () => void;
}

export default function ToroHeader({ onMenuClick }: ToroHeaderProps) {
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!running) return;

    const interval = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [running]);

  const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;

    return `${minutes.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const resetTimer = () => {
    setRunning(false);
    setSeconds(0);
  };

  const handleMenuClick = () => {
    setSidebarOpen(true);

    // Si además querés mantener el callback externo
    onMenuClick?.();
  };

  return (
    <>
      {/* HEADER */}
      <header className="fixed top-4 left-1/2 z-50 w-[calc(100%_-_24px)] max-w-7xl -translate-x-1/2">
  {/* Ambient shadow / gradient */}
  <div
    className="
      pointer-events-none
      absolute
      -inset-x-8
      top-0
      -z-10
      h-37.5
      rounded-[50px]
      bg-[radial-gradient(ellipse_at_top,rgba(0,0,0,0.65)_0%,rgba(0,0,0,0.35)_35%,rgba(0,0,0,0.12)_58%,transparent_80%)]
      blur-[18px]
    "
  />

  {/* Secondary soft shadow */}
  <div
    className="
      pointer-events-none
      absolute
      -inset-x-4
      top-10
      -z-10
      h-30
      bg-linear-to-b
      from-black/30
      via-black/10
      to-transparent
      blur-[20px]
    "
  />

  <div
    className="
      relative
      flex
      h-18
      items-center
      justify-between
      rounded-4xl
      border
      border-white/8
      bg-[#111111]/90
      px-3
      shadow-[0_12px_40px_rgba(0,0,0,0.45)]
      backdrop-blur-2xl
    "
  >
          {/* LEFT — MENU */}
          <button
            type="button"
            onClick={handleMenuClick}
            aria-label="Abrir menú"
            className="
              flex
              h-12
              w-12
              items-center
              justify-center
              rounded-full
              bg-white/6
              text-white
              transition-all
              duration-200
              hover:bg-white/10
              active:scale-95
            "
          >
            <Menu size={24} strokeWidth={2} />
          </button>

          {/* CENTER — TORO LOGO */}
          <div className="absolute left-1/2 -translate-x-1/2">
            <div
              className="
                flex
                h-12
                w-12
                items-center
                justify-center
              "
            >
              <Image
                src="/header.png"
                alt="Toro Logo"
                width={70}
                height={98}
              />
            </div>
          </div>

          {/* RIGHT — QUICK TIMER */}
          <div className="ml-auto flex items-center">
            <div
              className="
                flex
                h-12
                items-center
                gap-2
                rounded-full
                border
                border-white/[0.07]
                bg-white/4.5
                px-2
                pl-3
              "
            >
              <Timer
                size={21}
                strokeWidth={2}
                className="text-[#B7FF00]"
              />

              <span
                className="
                  min-w-12
                  text-center
                  font-mono
                  text-[14px]
                  font-medium
                  tracking-tight
                  text-white
                "
              >
                {formatTime(seconds)}
              </span>

              <button
                type="button"
                onClick={() => setRunning((prev) => !prev)}
                aria-label={
                  running
                    ? "Pausar cronómetro"
                    : "Iniciar cronómetro"
                }
                className="
                  flex
                  h-9
                  w-9
                  items-center
                  justify-center
                  rounded-full
                  bg-[#B7FF00]
                  text-black
                  shadow-[0_0_18px_rgba(183,255,0,0.18)]
                  transition-all
                  duration-200
                  hover:scale-105
                  hover:bg-[#c4ff33]
                  active:scale-95
                "
              >
                {running ? (
                  <Square
                    size={15}
                    fill="currentColor"
                  />
                ) : (
                  <Play
                    size={15}
                    fill="currentColor"
                    className="ml-0.5"
                  />
                )}
              </button>

              {seconds > 0 && (
                <button
                  type="button"
                  onClick={resetTimer}
                  aria-label="Reiniciar cronómetro"
                  className="
                    mr-1
                    flex
                    h-8
                    w-8
                    items-center
                    justify-center
                    rounded-full
                    text-white/40
                    transition
                    hover:bg-white/6
                    hover:text-white
                  "
                >
                  <RotateCcw size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* SIDEBAR */}
      <ToroSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
    </>
  );
}
