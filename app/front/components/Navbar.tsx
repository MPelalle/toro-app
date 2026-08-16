"use client";

import Link from "next/link";
import {
  Apple,
  CheckCircle2,
  Dumbbell,
  Home,
  User,
  UsersRound,
} from "lucide-react";
import { usePathname } from "next/navigation";

const routes = {
  home: "/dashboard",
  training: "/dashboard/routine",
  diet: "/dashboard/diet",
  habits: "/dashboard/habits",
  profile: "/dashboard/user",
  community: "/dashboard/community",
};

export default function ToroBottomNav() {
  const pathname = usePathname();

  const homeActive = pathname === routes.home;
  const trainingActive = pathname.startsWith(routes.training);
  const dietActive = pathname.startsWith(routes.diet);
  const habitsActive = pathname.startsWith(routes.habits);
  const profileActive = pathname.startsWith(routes.profile);
  const communityActive = pathname.startsWith(routes.community);

  return (
    <>
      {/* =====================================================
          BOTTOM IOS GRADIENT
      ===================================================== */}
      <div
        className="
          toro-bottom-nav__veil
          pointer-events-none
          fixed
          inset-x-0
          bottom-0
          z-40
          h-44
          bg-linear-to-t
          from-[#050505]
          via-[#050505]/75
          to-transparent
        "
      />

      {/* =====================================================
          NAVBAR FLOATING ITEMS
      ===================================================== */}
      <div
        className="
          toro-bottom-nav
          fixed
          inset-x-0
          bottom-5
          z-50
          flex
          items-center
          justify-center
          gap-2
          px-4
          max-[380px]:gap-1
          max-[380px]:px-2
          pb-[env(safe-area-inset-bottom)]
          sm:gap-3
        "
      >
        {/* =================================================
            HOME (Flotante independiente)
        ================================================= */}
        <SideButton href={routes.home} active={homeActive} label="Inicio">
          <Home
            className="h-5.25 w-5.25"
            strokeWidth={homeActive ? 2.5 : 1.8}
          />
        </SideButton>

        {/* =================================================
            CENTER GROUP (Cápsula contenedora)
        ================================================= */}
        <div
          className="
            toro-bottom-nav__center
            relative
            flex
            h-14.5
            items-center
            justify-center
            rounded-full
            border
            border-white/5
            bg-[#11120f]/70
            px-2
            max-[380px]:px-1
            shadow-[0_20px_60px_rgba(0,0,0,.65)]
            backdrop-blur-[20px]
            backdrop-saturate-150
          "
        >
          {/* Subtle center illumination */}
          <div
            className="
              pointer-events-none
              absolute
              inset-0
              rounded-full
              bg-[radial-gradient(circle_at_center,rgba(163,255,18,.055),transparent_68%)]
            "
          />

          <CenterButton href={routes.diet} active={dietActive} label="Dieta">
            <Apple
              className="h-4.75 w-4.75"
              strokeWidth={dietActive ? 2.4 : 1.8}
            />
          </CenterButton>

          <CenterButton href={routes.training} active={trainingActive} label="Entrenamiento">
            <Dumbbell
              className="h-5 w-5"
              strokeWidth={trainingActive ? 2.4 : 1.8}
            />
          </CenterButton>

          <CenterButton href={routes.habits} active={habitsActive} label="Hábitos">
            <CheckCircle2
              className="h-4.75 w-4.75"
              strokeWidth={habitsActive ? 2.4 : 1.8}
            />
          </CenterButton>
        </div>

        {/* =================================================
            COMMUNITY + PROFILE (Flotantes independientes)
        ================================================= */}
        <SideButton href={routes.community} active={communityActive} label="Comunidad">
          <UsersRound
            className="h-5.25 w-5.25"
            strokeWidth={communityActive ? 2.5 : 1.8}
          />
        </SideButton>

        <SideButton href={routes.profile} active={profileActive} label="Perfil">
          <User
            className="h-5.25 w-5.25"
            strokeWidth={profileActive ? 2.5 : 1.8}
          />
        </SideButton>
      </div>
    </>
  );
}

/* ============================================================
   SIDE BUTTON (Inicio y Perfil)
============================================================ */

function SideButton({
  href,
  active,
  label,
  children,
}: {
  href: string;
  active: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      data-active={active || undefined}
      className={`
        toro-bottom-nav__side
        group
        relative
        z-10
        flex
        h-14.5
        w-14.5
        max-[380px]:h-12
        max-[380px]:w-12
        shrink-0
        items-center
        justify-center
        rounded-full
        border
        shadow-[0_20px_60px_rgba(0,0,0,.65)]
        backdrop-blur-[20px]
        backdrop-saturate-150
        transition-all
        duration-300
        active:scale-90
        ${
          active
            ? `
              border-[#a3ff12]/20
              bg-[#a3ff12]/8
              shadow-[0_0_22px_rgba(163,255,18,.08)]
            `
            : `
              border-white/5
              bg-[#11120f]/70
              hover:border-white/[.07]
              hover:bg-white/4
            `
        }
      `}
    >
      {/* Icon */}
      <span
        className={`
          relative
          z-10
          transition-all
          duration-300
          ${active ? "scale-105 text-[#a3ff12]" : "scale-100 text-white/35 group-hover:scale-105 group-hover:text-white/75"}
        `}
      >
        {children}
      </span>

      {/* Tiny active indicator */}
      <span
        className={`
          absolute
          -bottom-1
          left-1/2
          h-0.75
          -translate-x-1/2
          rounded-full
          bg-[#a3ff12]
          shadow-[0_0_9px_rgba(163,255,18,.7)]
          transition-all
          duration-300
          ${active ? "w-1 opacity-100" : "w-0 opacity-0"}
        `}
      />
    </Link>
  );
}

/* ============================================================
   CENTER BUTTON (Botones dentro de la cápsula)
============================================================ */

function CenterButton({
  href,
  active,
  label,
  children,
}: {
  href: string;
  active: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      data-active={active || undefined}
      className="
        toro-bottom-nav__item
        group
        relative
        z-10
        flex
        h-12
        w-13
        max-[380px]:w-11
        items-center
        justify-center
        rounded-full
        transition-all
        duration-200
        active:scale-90
      "
    >
      {/* Active pill background */}
      <span
        className={`
          absolute
          inset-0.75
          rounded-full
          transition-all
          duration-300
          ${
            active
              ? `
                bg-[#a3ff12]/10
                shadow-[0_0_20px_rgba(163,255,18,.08)]
              `
              : `
                bg-transparent
                group-hover:bg-white/[.035]
              `
          }
        `}
      />

      {/* Icon */}
      <span
        className={`
          relative
          z-10
          transition-all
          duration-300
          ${
            active
              ? "text-[#a3ff12]"
              : "text-white/35 group-hover:text-white/75"
          }
        `}
      >
        {children}
      </span>

      {/* Active indicator bar */}
      <span
        className={`
          absolute
          bottom-px
          left-1/2
          h-0.5
          -translate-x-1/2
          rounded-full
          bg-[#a3ff12]
          shadow-[0_0_8px_rgba(163,255,18,.7)]
          transition-all
          duration-300
          ${active ? "w-3.5 opacity-100" : "w-0 opacity-0"}
        `}
      />
    </Link>
  );
}
