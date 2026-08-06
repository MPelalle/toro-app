"use client";

import { AlertTriangle, Check, CloudOff, RefreshCw } from "lucide-react";
import { useEffect } from "react";
import { useConnectivity, useSyncStatus } from "@/lib/offline/hooks";

export default function OfflineSyncIndicator() {
  const { isOnline } = useConnectivity();
  const { pendingOperations, failedOperations, unsyncedOperations, isSynchronizing, lastError, lastSyncedAt, syncAvailable, syncNow } = useSyncStatus();

  useEffect(() => {
    if (isOnline && pendingOperations > 0) void syncAvailable();
  }, [isOnline, pendingOperations, syncAvailable]);

  if (isOnline && unsyncedOperations === 0 && !isSynchronizing) return null;
  const retry = () => void syncNow();
  const hasProblem = failedOperations > 0 || Boolean(lastError);
  const label = !isOnline
    ? "Sin conexión · cambios guardados"
    : hasProblem
      ? `${failedOperations || 1} cambio${failedOperations === 1 ? "" : "s"} necesita${failedOperations === 1 ? "" : "n"} atención`
      : isSynchronizing
        ? `Sincronizando ${unsyncedOperations} cambio${unsyncedOperations === 1 ? "" : "s"}`
        : `${unsyncedOperations} cambio${unsyncedOperations === 1 ? "" : "s"} pendiente${unsyncedOperations === 1 ? "" : "s"}`;
  const tooltip = lastError || (lastSyncedAt ? `Última sincronización: ${new Date(lastSyncedAt).toLocaleString("es-AR")}` : undefined);

  return <div className={`fixed right-4 top-24 z-60 inline-flex max-w-[calc(100vw-2rem)] items-center gap-2 rounded-full border px-3 py-2 text-[11px] font-semibold shadow-lg backdrop-blur-xl ${!isOnline ? "border-amber-300/25 bg-[#18150d]/90 text-amber-200" : hasProblem ? "border-red-300/25 bg-[#241313]/90 text-red-100" : "border-[#b7ff00]/25 bg-[#10110e]/90 text-[#b7ff00]"}`} role="status" title={tooltip}>
    {!isOnline ? <CloudOff size={14} /> : hasProblem ? <AlertTriangle size={14} /> : isSynchronizing ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />}
    <span>{label}</span>
    {isOnline && (hasProblem || unsyncedOperations > 0) && <button type="button" onClick={retry} className="rounded-full bg-white/10 px-2 py-1 text-[10px] font-bold hover:bg-white/15">Sincronizar</button>}
  </div>;
}
