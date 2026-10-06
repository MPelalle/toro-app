"use client";

import { Check, Copy, Share2 } from "lucide-react";
import { useState } from "react";

type SharePublicLinkButtonProps = {
  path: string;
  title: string;
  text: string;
  className?: string;
};

/** Web Share first; clipboard keeps a useful fallback on desktop browsers. */
export function SharePublicLinkButton({ path, title, text, className = "" }: SharePublicLinkButtonProps) {
  const [state, setState] = useState<"idle" | "shared" | "copied" | "error">("idle");

  async function share() {
    const url = new URL(path, window.location.origin).toString();
    try {
      if (navigator.share) {
        await navigator.share({ title, text, url });
        setState("shared");
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setState("copied");
      } else {
        setState("error");
      }
    } catch (error) {
      // Cancelling the native sheet is not an error that should be surfaced.
      if (error instanceof DOMException && error.name === "AbortError") return;
      setState("error");
    }
  }

  const label = state === "copied" ? "Link copiado" : state === "shared" ? "Compartido" : state === "error" ? "No se pudo compartir" : "Compartir";
  const Icon = state === "copied" || state === "shared" ? Check : state === "error" ? Copy : Share2;
  return <button type="button" onClick={() => void share()} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/15 px-4 py-3 text-sm font-bold text-white/80 transition hover:border-[#b7ff00]/45 hover:text-[#b7ff00] ${className}`} aria-label={`${label}: ${title}`}><Icon size={16}/>{label}</button>;
}
