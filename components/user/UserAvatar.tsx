"use client";

import { useState } from "react";

type UserAvatarProps = {
  src?: string | null;
  name?: string | null;
  nickname?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizes = { sm: "h-8 w-8 text-xs", md: "h-10 w-10 text-sm", lg: "h-20 w-20 text-2xl" };
function AvatarFallback({ label, size, className }: { label: string; size: UserAvatarProps["size"]; className: string }) {
  return <div role="img" aria-label={`Avatar de ${label}`} className={`grid shrink-0 place-items-center rounded-full bg-[#b7ff00]/10 font-bold text-[#b7ff00] ring-1 ring-[#b7ff00]/15 ${sizes[size || "md"]} ${className}`}>{label.trim().slice(0, 1).toLocaleUpperCase() || "T"}</div>;
}

function AvatarImage({ src, label, size, className }: { src: string; label: string; size: NonNullable<UserAvatarProps["size"]>; className: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <AvatarFallback label={label} size={size} className={className} />;
  // A native image can render the configured public Storage URL without a client key.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={`Foto de perfil de ${label}`} onError={() => setFailed(true)} loading="lazy" decoding="async" width={size === "lg" ? 80 : size === "md" ? 40 : 32} height={size === "lg" ? 80 : size === "md" ? 40 : 32} className={`shrink-0 rounded-full object-cover ring-1 ring-white/10 ${sizes[size]} ${className}`} />;
}

export function UserAvatar({ src, name, nickname, size = "md", className = "" }: UserAvatarProps) {
  const label = nickname || name || "Usuario";
  if (src) return <AvatarImage key={src} src={src} label={label} size={size} className={className} />;
  return <AvatarFallback label={label} size={size} className={className} />;
}
