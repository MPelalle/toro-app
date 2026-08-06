export type ConnectivityStatus = "unknown" | "online" | "offline";
export type ConnectivityReason = "startup" | "online-event" | "offline-event" | "foreground" | "resume" | "interval" | "network-error" | "manual";
export type ConnectivitySnapshot = { status: ConnectivityStatus; reachable: boolean; checkedAt: string | null; reason: ConnectivityReason };

const CHECK_INTERVAL_MS = 120_000;
const CHECK_THROTTLE_MS = 12_000;
const CHECK_TIMEOUT_MS = 3_500;

let snapshot: ConnectivitySnapshot = { status: "unknown", reachable: typeof navigator !== "undefined" ? navigator.onLine : false, checkedAt: null, reason: "startup" };
let checkPromise: Promise<boolean> | null = null;
let lastCheckAt = 0;
let monitorUsers = 0;
let monitorInterval: number | null = null;
const listeners = new Set<(snapshot: ConnectivitySnapshot) => void>();

function publish(next: ConnectivitySnapshot) {
  snapshot = next;
  listeners.forEach((listener) => listener(snapshot));
}

export function getConnectivitySnapshot() {
  return snapshot;
}

export function subscribeConnectivity(listener: (next: ConnectivitySnapshot) => void) {
  listeners.add(listener);
  listener(snapshot);
  return () => listeners.delete(listener);
}

export async function verifyConnectivity(reason: ConnectivityReason = "manual", force = false): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (!navigator.onLine) {
    publish({ status: "offline", reachable: false, checkedAt: new Date().toISOString(), reason: "offline-event" });
    return false;
  }
  if (!force && checkPromise) return checkPromise;
  if (!force && Date.now() - lastCheckAt < CHECK_THROTTLE_MS) return snapshot.status === "online";

  lastCheckAt = Date.now();
  checkPromise = new Promise<boolean>((resolve) => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), CHECK_TIMEOUT_MS);
    void fetch("/api/health", { method: "GET", cache: "no-store", credentials: "same-origin", signal: controller.signal })
      .then((response) => response.ok || response.status === 204)
      .catch(() => false)
      .then((reachable) => {
        publish({ status: reachable ? "online" : "offline", reachable, checkedAt: new Date().toISOString(), reason });
        resolve(reachable);
      })
      .finally(() => {
        window.clearTimeout(timeout);
        checkPromise = null;
      });
  });
  return checkPromise;
}

export function reportNetworkFailure(error: unknown) {
  if (error instanceof TypeError && typeof window !== "undefined") {
    publish({ status: "offline", reachable: false, checkedAt: new Date().toISOString(), reason: "network-error" });
  }
}

export function reportNetworkSuccess() {
  if (typeof window !== "undefined" && snapshot.status !== "online") {
    publish({ status: "online", reachable: true, checkedAt: new Date().toISOString(), reason: "manual" });
  }
}

const checkForeground = () => { if (document.visibilityState === "visible") void verifyConnectivity("foreground", true); };
const checkResume = () => void verifyConnectivity("resume", true);
const online = () => void verifyConnectivity("online-event", true);
const offline = () => publish({ status: "offline", reachable: false, checkedAt: new Date().toISOString(), reason: "offline-event" });

export function startConnectivityMonitoring() {
  if (typeof window === "undefined") return () => undefined;
  monitorUsers += 1;
  if (monitorUsers === 1) {
    window.addEventListener("online", online);
    window.addEventListener("offline", offline);
    window.addEventListener("pageshow", checkResume);
    document.addEventListener("visibilitychange", checkForeground);
    monitorInterval = window.setInterval(() => { if (document.visibilityState === "visible") void verifyConnectivity("interval"); }, CHECK_INTERVAL_MS);
    void verifyConnectivity("startup", true);
  }

  return () => {
    monitorUsers -= 1;
    if (monitorUsers > 0) return;
    window.removeEventListener("online", online);
    window.removeEventListener("offline", offline);
    window.removeEventListener("pageshow", checkResume);
    document.removeEventListener("visibilitychange", checkForeground);
    if (monitorInterval !== null) window.clearInterval(monitorInterval);
    monitorInterval = null;
  };
}
