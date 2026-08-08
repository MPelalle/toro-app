import { Apple, Check, Dumbbell, Flame } from "lucide-react";
import type { UserBadge } from "@/lib/badges";

const icons = {
  streak: Flame,
  routine: Dumbbell,
  diet: Apple,
  habits: Check,
};

const tones = {
  0: "border-white/10 bg-white/[.035] text-white/25 opacity-45 grayscale",
  1: "border-[#d18a48]/70 bg-[#d18a48]/15 text-[#edb276] shadow-[0_0_16px_rgba(209,138,72,.14)]",
  2: "border-[#cbd5e1]/75 bg-[#cbd5e1]/15 text-[#e2e8f0] shadow-[0_0_16px_rgba(203,213,225,.16)]",
  3: "border-[#f4c95d]/80 bg-[#f4c95d]/15 text-[#ffe49a] shadow-[0_0_18px_rgba(244,201,93,.2)]",
  4: "border-violet-300/90 bg-violet-400/20 text-violet-100 shadow-[0_0_24px_rgba(192,132,252,.42)]",
};

const shapes = {
  streak: "rounded-[52%_48%_52%_22%] -rotate-12",
  routine: "rounded-[26%]",
  diet: "rotate-[-35deg] rounded-[100%_0_100%_0]",
  habits: "[clip-path:polygon(50%_0%,61%_12%,77%_7%,83%_23%,100%_30%,91%_47%,100%_62%,82%_69%,78%_88%,61%_84%,50%_100%,39%_85%,22%_90%,18%_72%,0%_64%,9%_48%,1%_31%,18%_24%,22%_7%,39%_13%)]",
};

export function UserBadgeMark({ badge, size = "sm" }: { badge: UserBadge; size?: "sm" | "md" | "lg" }) {
  const Icon = icons[badge.id];
  const dimensions = {
    sm: "h-6 w-6 [&_svg]:h-3 [&_svg]:w-3",
    md: "h-9 w-9 [&_svg]:h-[18px] [&_svg]:w-[18px]",
    lg: "h-12 w-12 [&_svg]:h-6 [&_svg]:w-6",
  }[size];

  return <span title={`${badge.name} · ${badge.tierName}`} className={`relative inline-grid shrink-0 place-items-center border ${dimensions} ${shapes[badge.id]} ${tones[badge.tier]} ${badge.tier === 4 ? "scale-110" : ""}`}>
    {badge.id === "routine" && <><i className="absolute -left-1 h-[60%] w-1.5 rounded-sm border border-current bg-inherit" /><i className="absolute -right-1 h-[60%] w-1.5 rounded-sm border border-current bg-inherit" /></>}
    {badge.id === "habits" && <><i className="absolute -bottom-1 left-1 h-2 w-1.5 -rotate-12 bg-current/80" /><i className="absolute -bottom-1 right-1 h-2 w-1.5 rotate-12 bg-current/80" /></>}
    <Icon className={`relative z-10 ${badge.id === "diet" ? "rotate-[35deg]" : ""}`} strokeWidth={2.5} />
    {badge.tier === 4 && <span className="absolute -right-1 -top-1 text-[9px] leading-none text-violet-100">✦</span>}
  </span>;
}

export function UserBadgeStrip({ badges, showLocked = false, size = "sm" }: { badges: UserBadge[]; showLocked?: boolean; size?: "sm" | "md" | "lg" }) {
  const visible = (showLocked ? badges : badges.filter((badge) => badge.unlocked)).slice(0, 4);
  if (!visible.length) return null;
  return <div className="flex items-center gap-1.5">{visible.map((badge) => <UserBadgeMark key={badge.id} badge={badge} size={size} />)}</div>;
}

export function BadgeShowcase({ badges }: { badges: UserBadge[] }) {
  return <section className="mt-6 rounded-[28px] border border-white/8 bg-[#10110e]/90 p-5 sm:p-6">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div><p className="text-[10px] font-bold tracking-[.18em] text-[#b7ff00]/70">INSIGNIAS</p><h2 className="mt-2 text-xl font-semibold">Tu vitrina de logros.</h2></div>
      <p className="text-xs text-white/35">Bronce · Plata · Oro · Violeta</p>
    </div>
    <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {badges.map((badge) => <article key={badge.id} className={`rounded-2xl border border-white/[.07] bg-black/15 p-4 transition ${badge.unlocked ? "" : "opacity-55"}`}>
        <div className="flex items-start justify-between gap-3"><UserBadgeMark badge={badge} size="lg" /><span className={`text-[9px] font-bold tracking-[.16em] ${badge.tier === 4 ? "text-violet-200" : badge.unlocked ? "text-[#b7ff00]" : "text-white/25"}`}>{badge.tierName}</span></div>
        <p className="mt-4 text-sm font-semibold">{badge.name}</p>
        <p className="mt-1 text-xs leading-5 text-white/38">{badge.description}</p>
        <p className="mt-4 text-[11px] font-semibold text-white/55">{badge.nextTarget ? `${badge.current}/${badge.nextTarget}` : "Nivel maximo"}</p>
      </article>)}
    </div>
  </section>;
}
