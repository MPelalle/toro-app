import { isAvatarUrl } from "@/lib/avatars";
import Image from "next/image";

type UserAvatarProps = {
  src?: string | null;
  name?: string | null;
  nickname?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizes = { sm: "h-8 w-8 text-xs", md: "h-10 w-10 text-sm", lg: "h-20 w-20 text-2xl" };
const dimensions = { sm: 32, md: 40, lg: 80 };

export function UserAvatar({ src, name, nickname, size = "md", className = "" }: UserAvatarProps) {
  const label = nickname || name || "Usuario";
  if (isAvatarUrl(src)) return <Image src={src} alt={`Avatar de ${label}`} width={dimensions[size]} height={dimensions[size]} className={`shrink-0 rounded-full object-cover ring-1 ring-white/10 ${sizes[size]} ${className}`} />;
  return <div role="img" aria-label={`Avatar de ${label}`} className={`grid shrink-0 place-items-center rounded-full bg-[#b7ff00]/10 font-bold text-[#b7ff00] ring-1 ring-[#b7ff00]/15 ${sizes[size]} ${className}`}>{label.trim().slice(0, 1).toLocaleUpperCase() || "T"}</div>;
}
