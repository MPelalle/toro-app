"use client";

function safeFileName(workoutName: string, completedAt: Date | string) {
  const date = new Date(completedAt);
  const day = Number.isNaN(date.getTime()) ? "entrenamiento" : date.toISOString().slice(0, 10);
  const slug = workoutName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "entrenamiento";
  return `toro-${slug}-${day}.png`;
}

async function createPng(element: HTMLElement) {
  if (document.fonts) await document.fonts.ready;
  const { toPng } = await import("html-to-image");
  const dataUrl = await toPng(element, { backgroundColor: "transparent", cacheBust: true, pixelRatio: 2, width: 1080 });
  return { dataUrl, blob: await (await fetch(dataUrl)).blob() };
}

export async function exportWorkoutImage(element: HTMLElement, workoutName: string, completedAt: Date | string, action: "share" | "download") {
  const fileName = safeFileName(workoutName, completedAt);
  const { dataUrl, blob } = await createPng(element);
  const file = new File([blob], fileName, { type: "image/png" });
  if (action === "share" && navigator.share && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: "Mi entrenamiento en TORO" });
      return "shared" as const;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return "cancelled" as const;
      throw error;
    }
  }
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  return "downloaded" as const;
}
