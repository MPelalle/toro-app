"use client";

import { useEffect } from "react";

export default function ActivityTracker() {
  useEffect(() => { let last = Date.now(); const track = () => { const seconds = Math.min(300, Math.floor((Date.now() - last) / 1000)); last = Date.now(); if (seconds > 0 && document.visibilityState === "visible") void fetch("/api/user/activity", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ seconds }), keepalive: true }); }; const timer = window.setInterval(track, 60_000); window.addEventListener("pagehide", track); return () => { window.clearInterval(timer); window.removeEventListener("pagehide", track); track(); }; }, []); return null;
}
