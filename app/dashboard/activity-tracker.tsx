"use client";

import { useEffect } from "react";

export default function ActivityTracker() {
  useEffect(() => {
    let last = Date.now();
    let timer: number | null = null;
    const track = (heartbeat = false) => {
      const seconds = Math.min(300, Math.floor((Date.now() - last) / 1000));
      last = Date.now();
      if ((seconds > 0 || heartbeat) && document.visibilityState === "visible") void fetch("/api/user/activity", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ seconds }), keepalive: true });
    };
    const stop = () => {
      if (timer !== null) window.clearInterval(timer);
      timer = null;
    };
    const start = () => {
      if (document.visibilityState !== "visible" || timer !== null) return;
      track(true);
      timer = window.setInterval(() => track(), 60_000);
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") start();
      else { stop(); last = Date.now(); }
    };
    const onPageHide = () => track();
    start();
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", onPageHide);
      track();
    };
  }, []);
  return null;
}
