"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Award,
  ChevronRight,
  CircleHelp,
  Download,
  Gift,
  Mail,
  Medal,
  Trophy,
  X,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { isPwaInstallAvailable, isPwaInstalled, requestPwaInstall } from "@/lib/pwa-install";

interface ToroSidebarProps {
  open: boolean;
  onClose: () => void;
}

const sections = [
  {
    title: "TORO",
    eyebrow: "IDENTIDAD",
    items: [
      {
        label: "Panel de hoy",
        description: "Tu resumen y próximos pasos",
        href: "/dashboard",
        icon: null,
      },
      {
        label: "Nutrición",
        description: "Planes y seguimiento de comidas",
        href: "/dashboard/diet",
        icon: Gift,
      },
      {
        label: "Entrenamiento",
        description: "Tus rutinas y progreso",
        href: "/dashboard/routine",
        icon: Mail,
      },
      {
        label: "Hábitos",
        description: "Constancia diaria y reflexiones",
        href: "/dashboard/habits",
        icon: CircleHelp,
      },
    ],
  },
  {
    title: "CUENTA",
    eyebrow: "TU ESPACIO",
    items: [
      {
        label: "Mi perfil",
        description: "Tu información y progreso",
        href: "/dashboard/user",
        icon: Trophy,
      },
      {
        label: "Contacto",
        description: "Escribinos por correo",
        href: "mailto:hola@toro.app",
        icon: Medal,
      },
      {
        label: "Preguntas frecuentes",
        description: "Ayuda y soporte de Toro",
        href: "mailto:hola@toro.app?subject=Consulta%20sobre%20Toro",
        icon: Award,
      },
    ],
  },
];

export default function ToroSidebar({
  open,
  onClose,
}: ToroSidebarProps) {
  const [canInstall, setCanInstall] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [installHint, setInstallHint] = useState("");

  useEffect(() => {
    const refresh = () => {
      setCanInstall(isPwaInstallAvailable());
      setInstalled(isPwaInstalled());
    };
    refresh();
    window.addEventListener("toro-pwa-install-change", refresh);
    return () => window.removeEventListener("toro-pwa-install-change", refresh);
  }, []);

  async function installApp() {
    setInstallHint("");
    const outcome = await requestPwaInstall();
    if (outcome === "unavailable") setInstallHint("En Safari: Compartir → Agregar a inicio.");
    if (outcome === "accepted") setInstalled(true);
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* ========================================================= */}
          {/* BACKDROP                                                   */}
          {/* ========================================================= */}

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45 }}
            onClick={onClose}
            className="
              fixed
              inset-0
              z-90
              bg-black/60
              backdrop-blur-2xl
            "
          />

          {/* ========================================================= */}
          {/* SIDEBAR                                                     */}
          {/* ========================================================= */}

          <motion.aside
            initial={{
              x: "-105%",
              scale: 0.97,
              opacity: 0,
            }}
            animate={{
              x: 0,
              scale: 1,
              opacity: 1,
            }}
            exit={{
              x: "-105%",
              scale: 0.97,
              opacity: 0,
            }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 32,
              mass: 0.8,
            }}
            className="
              fixed
              left-3
              top-3
              bottom-3
              z-100

              flex
              w-[min(400px,calc(100vw-24px))]
              flex-col

              overflow-hidden

              rounded-[34px]

              border
              border-white/10

              bg-[#0c0d0d]/75

              shadow-[0_30px_120px_rgba(0,0,0,0.75)]

              backdrop-blur-2xl
            "
          >
            {/* ======================================================= */}
            {/* LIVING BACKGROUND                                        */}
            {/* ======================================================= */}

            {/* Main ambient glow */}
            <motion.div
              animate={{
                x: [-20, 25, -10, -20],
                y: [-10, 25, 5, -10],
                scale: [1, 1.15, 0.95, 1],
                opacity: [0.55, 0.75, 0.5, 0.55],
              }}
              transition={{
                duration: 14,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="
                pointer-events-none
                absolute
                -left-24
                -top-28
                h-72
                w-72
                rounded-full
                bg-[#B7FF00]/9
                blur-[90px]
              "
            />

            {/* Secondary glow */}
            <motion.div
              animate={{
                x: [20, -20, 30, 20],
                y: [10, -30, 20, 10],
                scale: [1, 0.9, 1.15, 1],
                opacity: [0.25, 0.4, 0.2, 0.25],
              }}
              transition={{
                duration: 18,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="
                pointer-events-none
                absolute
                -bottom-28
                -right-28
                h-80
                w-80
                rounded-full
                bg-[#B7FF00]/[0.07]
                blur-[100px]
              "
            />

            {/* Soft white ambient light */}
            <motion.div
              animate={{
                opacity: [0.02, 0.06, 0.02],
                scale: [1, 1.1, 1],
              }}
              transition={{
                duration: 9,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="
                pointer-events-none
                absolute
                left-1/2
                top-1/3
                h-96
                w-96
                -translate-x-1/2
                rounded-full
                bg-white
                blur-[140px]
              "
            />

            {/* ======================================================= */}
            {/* TOP EDGE LIGHT                                           */}
            {/* ======================================================= */}

            <motion.div
              animate={{
                opacity: [0.25, 0.6, 0.25],
              }}
              transition={{
                duration: 5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="
                pointer-events-none
                absolute
                left-[12%]
                right-[12%]
                top-0
                h-px
                bg-linear-to-r
                from-transparent
                via-[#B7FF00]/60
                to-transparent
              "
            />

            {/* ======================================================= */}
            {/* HEADER                                                     */}
            {/* ======================================================= */}

            <div className="relative z-10 flex items-center justify-between px-7 pb-6 pt-7">
              <div>
                <div className="flex items-center gap-3">
                  {/* Logo mark */}
                  <div
                    className="
                      relative
                      flex
                      h-10
                      w-10
                      items-center
                      justify-center
                    "
                  >
                    <Image
                    src={"/header.png"}
                    alt="Logo de toro"
                    height={90}
                    width={90}
                    />
                  </div>

                  <div>
                 

                    <p className="mt-0.5 text-[9px] font-semibold tracking-[0.22em] text-[#B7FF00]/60">
                      FITNESS SYSTEM
                    </p>
                  </div>
                </div>

                <p className="mt-4 text-[11px] leading-relaxed text-white/30">
                  Build your best version.
                </p>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar menú"
                className="
                  group
                  flex
                  h-11
                  w-11
                  items-center
                  justify-center
                  rounded-full

                  border
                  border-white/8

                  bg-white/[0.035]

                  text-white/45

                  transition-all
                  duration-300

                  hover:border-white/[0.14]
                  hover:bg-white/8
                  hover:text-white

                  active:scale-95
                "
              >
                <X
                  size={18}
                  className="transition-transform duration-300 group-hover:rotate-90"
                />
              </button>
            </div>

            {/* divider */}
            <div className="relative z-10 mx-7 h-px bg-linear-to-r from-white/10 via-white/4 to-transparent" />

            {/* ======================================================= */}
            {/* CONTENT                                                    */}
            {/* ======================================================= */}

            <div className="relative z-10 flex-1 overflow-y-auto px-4 py-7 scrollbar-none">
              {sections.map((section, sectionIndex) => (
                <div
                  key={section.title}
                  className={sectionIndex > 0 ? "mt-10" : ""}
                >
                  {/* SECTION TITLE */}

                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      delay: 0.15 + sectionIndex * 0.08,
                    }}
                    className="mb-4 px-3"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="
                          text-[10px]
                          font-bold
                          tracking-[0.25em]
                          text-[#B7FF00]/70
                        "
                      >
                        {section.eyebrow}
                      </span>

                      <div className="h-px flex-1 bg-linear-to-r from-[#B7FF00]/20 to-transparent" />
                    </div>

                    <h2
                      className="
                        mt-1.5
                        text-[23px]
                        font-semibold
                        tracking-[-0.035em]
                        text-white
                      "
                    >
                      {section.title}
                    </h2>
                  </motion.div>

                  {/* ITEMS */}

                  <div className="space-y-1">
                    {section.items.map((item, index) => {
                      const Icon = item.icon;

                      return (
                        <motion.a
                          key={item.label}
                          initial={{
                            opacity: 0,
                            x: -15,
                          }}
                          animate={{
                            opacity: 1,
                            x: 0,
                          }}
                          transition={{
                            delay:
                              0.2 +
                              sectionIndex * 0.08 +
                              index * 0.045,
                          }}
                          href={item.href}
                          onClick={onClose}
                          className="
                            group
                            relative
                            flex
                            w-full
                            items-center
                            gap-3
                            overflow-hidden
                            rounded-[20px]
                            px-3
                            py-3
                            text-left

                            transition-all
                            duration-300

                            hover:bg-white/4.5
                            active:scale-[0.985]
                          "
                        >
                          {/* hover glow */}
                          <div
                            className="
                              pointer-events-none
                              absolute
                              -left-10
                              top-1/2
                              h-16
                              w-16
                              -translate-y-1/2
                              rounded-full
                              bg-[#B7FF00]/0
                              blur-2xl
                              transition-all
                              duration-500

                              group-hover:bg-[#B7FF00]/10
                            "
                          />

                          {/* icon */}

                          <div
                            className="
                              relative
                              flex
                              h-11
                              w-11
                              shrink-0
                              items-center
                              justify-center
                              rounded-[15px]

                              border
                              border-white/6

                              bg-white/[0.035]

                              text-white/45

                              transition-all
                              duration-300

                              group-hover:border-[#B7FF00]/20
                              group-hover:bg-[#B7FF00]/8
                              group-hover:text-[#B7FF00]
                            "
                          >
                            {Icon ? (
                              <Icon
                                size={18}
                                strokeWidth={1.8}
                              />
                            ) : (
                              <motion.div
                                animate={{
                                  scale: [1, 1.15, 1],
                                }}
                                transition={{
                                  duration: 2.5,
                                  repeat: Infinity,
                                  ease: "easeInOut",
                                }}
                                className="
                                  h-2
                                  w-2
                                  rounded-full
                                  bg-[#B7FF00]/60
                                  shadow-[0_0_12px_rgba(183,255,0,0.35)]
                                "
                              />
                            )}
                          </div>

                          {/* text */}

                          <div className="relative min-w-0 flex-1">
                            <p
                              className="
                                text-[14px]
                                font-medium
                                text-white/80

                                transition-colors
                                duration-300

                                group-hover:text-white
                              "
                            >
                              {item.label}
                            </p>

                            <p className="mt-0.5 truncate text-[11px] text-white/25 transition-colors duration-300 group-hover:text-white/40">
                              {item.description}
                            </p>
                          </div>

                          {/* arrow */}

                          <ChevronRight
                            size={16}
                            className="
                              relative
                              shrink-0
                              text-white/10

                              transition-all
                              duration-300

                              group-hover:translate-x-1
                              group-hover:text-[#B7FF00]/70
                            "
                          />
                        </motion.a>
                      );
                    })}
                  </div>
                </div>
              ))}

              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.46 }} className="mt-10">
                <div className="mb-4 px-3">
                  <div className="flex items-center gap-3"><span className="text-[10px] font-bold tracking-[0.25em] text-[#B7FF00]/70">APLICACIÓN</span><div className="h-px flex-1 bg-linear-to-r from-[#B7FF00]/20 to-transparent" /></div>
                </div>
                <button type="button" onClick={() => void installApp()} disabled={installed} className="group flex w-full items-center gap-3 rounded-[20px] border border-[#B7FF00]/15 bg-[#B7FF00]/[0.035] p-3 text-left transition-all duration-300 hover:border-[#B7FF00]/30 hover:bg-[#B7FF00]/[0.07] disabled:cursor-default disabled:opacity-60">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px] border border-[#B7FF00]/15 bg-[#B7FF00]/8 text-[#B7FF00]"><Download size={18} strokeWidth={1.8} /></div>
                  <div className="min-w-0 flex-1"><p className="text-[14px] font-medium text-white/85">{installed ? "TORO está instalada" : "Instalar la app"}</p><p className="mt-0.5 truncate text-[11px] text-white/30">{installed ? "Abrila desde la pantalla de inicio" : canInstall ? "Entrená aun sin conexión" : installHint || "Disponible para tu dispositivo"}</p></div>
                  <ChevronRight size={16} className="text-[#B7FF00]/40 transition-all duration-300 group-hover:translate-x-1 group-hover:text-[#B7FF00]" />
                </button>
              </motion.div>

              {/* ===================================================== */}
              {/* ECOSYSTEM                                               */}
              {/* ===================================================== */}

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="mt-10"
              >
                <div className="mb-4 px-3">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold tracking-[0.25em] text-white/25">
                      ECOSISTEMA
                    </span>

                    <div className="h-px flex-1 bg-linear-to-r from-white/[0.07] to-transparent" />
                  </div>
                </div>

                {/* EXORA */}

                <button
                  type="button"
                  className="
                    group
                    flex
                    w-full
                    items-center
                    gap-3
                    rounded-[20px]
                    border
                    border-white/6
                    bg-white/2.5
                    p-3
                    text-left

                    transition-all
                    duration-300

                    hover:border-white/12
                    hover:bg-white/5.5
                  "
                >
                   <Image
                    src={"/exora.png"}
                    alt="Logo de toro"
                    height={50}
                    width={50}
                    className="rounded-[15px]"
                    />
                

                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-semibold text-white/80">
                      EXORA
                    </p>

                    <p className="mt-0.5 text-[11px] text-white/25">
                      Tecnología detrás de TORO
                    </p>
                  </div>

                  <ChevronRight
                    size={16}
                    className="
                      text-white/15
                      transition-all
                      duration-300

                      group-hover:translate-x-1
                      group-hover:text-white/60
                    "
                  />
                </button>

                {/* KULTURISM */}

                <button
                  type="button"
                  className="
                    group
                    relative
                    mt-3
                    flex
                    w-full
                    items-center
                    gap-3
                    overflow-hidden
                    rounded-[20px]
                    border
                    border-[#B7FF00]/10
                    bg-[#B7FF00]/[0.035]
                    p-3
                    text-left

                    transition-all
                    duration-300

                    hover:border-[#B7FF00]/25
                    hover:bg-[#B7FF00]/6
                  "
                >
                  <motion.div
                    animate={{
                      x: [-20, 20, -20],
                      y: [0, 10, 0],
                      opacity: [0.25, 0.4, 0.25],
                    }}
                    transition={{
                      duration: 8,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    className="
                      pointer-events-none
                      absolute
                      -right-8
                      -top-8
                      h-24
                      w-24
                      rounded-full
                      bg-[#B7FF00]/10
                      blur-3xl
                    "
                  />

                  <Image
                    src={"/kultur.png"}
                    alt="Logo de toro"
                    height={50}
                    width={50}
                    className="rounded-[15px]"
                    />

                  <div className="relative min-w-0 flex-1">
                    <p className="text-[14px] font-semibold text-white/90">
                      KULTURISM
                    </p>

                    <p className="mt-0.5 text-[11px] text-white/30">
                      La línea de ropa de TORO
                    </p>
                  </div>

                  <ChevronRight
                    size={16}
                    className="
                      relative
                      text-[#B7FF00]/40

                      transition-all
                      duration-300

                      group-hover:translate-x-1
                      group-hover:text-[#B7FF00]
                    "
                  />
                </button>
              </motion.div>
            </div>

            {/* ======================================================= */}
            {/* FOOTER                                                     */}
            {/* ======================================================= */}

            <div className="relative z-10 px-7 pb-6 pt-3">
              <div className="h-px bg-linear-to-r from-white/8 via-white/3 to-transparent" />

              <div className="flex items-center justify-between pt-4">
                <div>
                  <p className="text-[10px] font-medium text-white/20">
                    TORO
                  </p>

                  <p className="mt-0.5 text-[10px] text-white/10">
                    Build your best version.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <motion.div
                    animate={{
                      opacity: [0.35, 1, 0.35],
                    }}
                    transition={{
                      duration: 2.5,
                      repeat: Infinity,
                    }}
                    className="
                      h-1.5
                      w-1.5
                      rounded-full
                      bg-[#B7FF00]
                    "
                  />

                  <span className="text-[9px] font-medium tracking-[0.2em] text-white/15">
                    ACTIVE
                  </span>
                </div>
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
