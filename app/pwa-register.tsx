"use client";

import { useEffect, useRef, useState } from "react";
import { rememberInstallPrompt, type BeforeInstallPromptEvent } from "@/lib/pwa-install";

export default function PwaRegister() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const shouldReload = useRef(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const onControllerChange = () => {
      if (shouldReload.current) window.location.reload();
    };

    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        const setWaiting = () => setWaitingWorker(registration.waiting);
        if (registration.waiting) setWaiting();
        registration.addEventListener("updatefound", () => {
          const installing = registration.installing;
          if (!installing) return;
          installing.addEventListener("statechange", () => {
            if (installing.state === "installed" && navigator.serviceWorker.controller) setWaiting();
          });
        });
        navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
        const updateInterval = window.setInterval(() => void registration.update(), 60 * 60 * 1000);
        const readyRegistration = await navigator.serviceWorker.ready;
        const assets = performance
          .getEntriesByType("resource")
          .map((entry) => entry.name)
          .filter((resource) => {
            const url = new URL(resource);
            return url.origin === window.location.origin && url.pathname.startsWith("/_next/static/");
          });
        readyRegistration.active?.postMessage({ type: "CACHE_APP_SHELL", assets });

        return () => window.clearInterval(updateInterval);
      } catch {
        // It remains a normal website if the browser cannot register a worker.
        return undefined;
      }
    };

    let dispose: (() => void) | undefined;
    void register().then((cleanup) => {
      dispose = cleanup;
    });
    return () => {
      dispose?.();
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      const installEvent = event as BeforeInstallPromptEvent;
      installEvent.preventDefault();
      rememberInstallPrompt(installEvent);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  }, []);

  if (!waitingWorker) return null;

  return (
    <div className="fixed inset-x-4 bottom-4 z-[100] mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-white/10 bg-[#161813]/95 p-3 text-sm text-white shadow-2xl backdrop-blur" role="status">
      <p className="min-w-0 flex-1 text-white/75">Hay una nueva versión de TORO disponible.</p>
      <button
        type="button"
        className="shrink-0 rounded-xl bg-[#b7ff00] px-3 py-2 text-xs font-extrabold text-[#080a06] transition hover:bg-[#c7ff42]"
        onClick={() => {
          shouldReload.current = true;
          waitingWorker.postMessage({ type: "SKIP_WAITING" });
        }}
      >
        Actualizar
      </button>
    </div>
  );
}
