"use client";

import { CheckCircle2, CloudOff, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useOfflineReady } from "@/lib/offline/hooks";

export default function OfflineReadiness({ user }: { user: { id: string; email: string | null; name: string | null; username: string | null } }) {
  const result = useOfflineReady(user);
  const messageKey = `${result.state}:${result.message}`;
  const [dismissedMessage, setDismissedMessage] = useState("");

  useEffect(() => {
    if (result.state === "idle") return;
    const timeout = window.setTimeout(
      () => setDismissedMessage(messageKey),
      result.state === "failed" ? 5000 : 3500,
    );
    return () => window.clearTimeout(timeout);
  }, [messageKey, result.state]);

  if (result.state === "idle" || dismissedMessage === messageKey) return null;
  const color = result.state === "ready" ? "border-[#b7ff00]/20 text-[#b7ff00]" : result.state === "failed" ? "border-amber-300/20 text-amber-200" : "border-white/10 text-white/60";
  const icon = result.state === "ready" ? <CheckCircle2 size={14} /> : result.state === "failed" ? <CloudOff size={14} /> : <LoaderCircle size={14} className="animate-spin" />;
  return <aside className={`fixed inset-x-4 bottom-25 z-50 mx-auto flex w-fit max-w-[calc(100vw-2rem)] items-center gap-2 rounded-full border bg-[#10110e]/95 px-3 py-2 text-[11px] font-semibold shadow-lg backdrop-blur ${color}`} role="status">{icon}<span>{result.message}</span></aside>;
}
