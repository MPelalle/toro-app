export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

let deferredPrompt: BeforeInstallPromptEvent | null = null;

function notifyAvailability() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event("toro-pwa-install-change"));
}

export function rememberInstallPrompt(event: BeforeInstallPromptEvent) {
  deferredPrompt = event;
  notifyAvailability();
}

export function isPwaInstalled() {
  if (typeof window === "undefined") return false;
  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || navigatorWithStandalone.standalone === true;
}

export function isPwaInstallAvailable() {
  return Boolean(deferredPrompt) && !isPwaInstalled();
}

export async function requestPwaInstall() {
  if (!deferredPrompt) return "unavailable" as const;
  await deferredPrompt.prompt();
  const choice = await deferredPrompt.userChoice;
  if (choice.outcome === "accepted") deferredPrompt = null;
  notifyAvailability();
  return choice.outcome;
}
