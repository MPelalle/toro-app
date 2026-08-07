"use client";

import { calculatePersonalRecords, calculateWorkoutDuration, calculateWorkoutVolume } from "@/lib/workout-share/calculations";
import { formatExercisePerformance } from "@/lib/workout-share/format-exercise-performance";
import type { CompletedWorkoutShareData } from "@/types/workout-share";

const WIDTH = 1080;
const CARD_WIDTH = WIDTH;

function safeFileName(workoutName: string, completedAt: Date | string) {
  const date = new Date(completedAt);
  const day = Number.isNaN(date.getTime()) ? "entrenamiento" : date.toISOString().slice(0, 10);
  const slug = workoutName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "entrenamiento";
  return `toro-${slug}-${day}.png`;
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("No se pudo cargar el logo de TORO."));
    image.src = src;
  });
}

function fitText(context: CanvasRenderingContext2D, text: string, maxWidth: number) {
  if (context.measureText(text).width <= maxWidth) return text;
  let end = text.length;
  while (end > 0 && context.measureText(`${text.slice(0, end)}…`).width > maxWidth) end -= 1;
  return `${text.slice(0, end)}…`;
}

function drawRule(context: CanvasRenderingContext2D, x1: number, x2: number, y: number) {
  context.save();
  context.shadowColor = "transparent";
  context.shadowBlur = 0;
  context.shadowOffsetX = 0;
  context.shadowOffsetY = 0;
  context.strokeStyle = "rgba(255,255,255,.28)";
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(x1, y);
  context.lineTo(x2, y);
  context.stroke();
  context.restore();
}

async function createPng(workout: CompletedWorkoutShareData) {
  await document.fonts?.ready;

  const exercises = workout.exercises.filter((exercise) => formatExercisePerformance(exercise.sets));
  const visibleExercises = exercises.slice(0, 8);
  const extraExercises = exercises.length - visibleExercises.length;
  const records = calculatePersonalRecords(workout.exercises);
  const height = Math.max(740, 570 + visibleExercises.length * 58 + (extraExercises > 0 ? 40 : 0));
  const canvas = document.createElement("canvas");
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = WIDTH * ratio;
  canvas.height = height * ratio;
  const context = canvas.getContext("2d", { alpha: true });
  if (!context) throw new Error("Este navegador no permite generar imágenes.");
  context.scale(ratio, ratio);
  context.clearRect(0, 0, WIDTH, height);

  // A new canvas starts transparent. Do not paint a card background or shadow:
  // the exported PNG must preserve that alpha when it is shared elsewhere.
  const cardX = 0;
  const cardY = 0;
  const cardHeight = height;

  const contentX = cardX + 24;
  const contentRight = cardX + CARD_WIDTH - 24;
  const logo = await loadImage("/header.png");
  context.drawImage(logo, contentRight - 116, cardY + 31, 92, 92);

  // The canvas itself remains transparent. The shadow is painted only around
  // glyphs, so the information stays legible on a photo without adding a box.
  context.shadowColor = "rgba(0,0,0,.9)";
  context.shadowBlur = 12;
  context.shadowOffsetX = 2;
  context.shadowOffsetY = 5;

  context.fillStyle = "#ffffff";
  context.font = "900 64px Inter, Arial, sans-serif";
  context.fillText("TORO", contentX, cardY + 77);
  context.fillStyle = "#b7ff00";
  context.font = "700 15px Inter, Arial, sans-serif";
  context.letterSpacing = "5px";
  context.fillText("BUILD YOUR BEST VERSION", contentX, cardY + 108);
  context.letterSpacing = "0px";
  drawRule(context, contentX, contentRight, cardY + 137);

  let y = cardY + 180;
  context.fillStyle = "rgba(255,255,255,.75)";
  context.font = "700 16px Inter, Arial, sans-serif";
  context.letterSpacing = "4px";
  context.fillText("RUTINA DE HOY", contentX, y);
  context.letterSpacing = "0px";
  y += 50;
  context.fillStyle = "#ffffff";
  context.font = "900 42px Inter, Arial, sans-serif";
  context.fillText(fitText(context, workout.workoutName.toUpperCase(), contentRight - contentX), contentX, y);

  y += 62;
  context.font = "600 25px Inter, Arial, sans-serif";
  if (visibleExercises.length) {
    for (const exercise of visibleExercises) {
      const value = formatExercisePerformance(exercise.sets) ?? "";
      context.fillStyle = "#ffffff";
      const valueWidth = context.measureText(value).width;
      const valueX = contentRight - valueWidth;
      context.fillText(fitText(context, exercise.name, valueX - contentX - 42), contentX, y);
      context.strokeStyle = "rgba(255,255,255,.45)";
      context.beginPath();
      context.moveTo(Math.max(contentX + 8, valueX - 92), y - 8);
      context.lineTo(valueX - 20, y - 8);
      context.stroke();
      context.fillStyle = "#d8ff76";
      context.fillText(value, valueX, y);
      y += 58;
    }
  } else {
    context.fillStyle = "rgba(255,255,255,.75)";
    context.font = "600 22px Inter, Arial, sans-serif";
    context.fillText("Sin series completadas", contentX, y);
    y += 42;
  }
  if (extraExercises > 0) {
    context.fillStyle = "rgba(255,255,255,.7)";
    context.font = "700 18px Inter, Arial, sans-serif";
    context.letterSpacing = "3px";
    context.fillText(`+ ${extraExercises} EJERCICIOS MÁS`, contentX, y);
    context.letterSpacing = "0px";
    y += 40;
  }

  const statsY = Math.min(y + 20, cardY + cardHeight - 118);
  drawRule(context, contentX, contentRight, statsY);
  const stats = [
    ["VOLUMEN TOTAL", `${Math.round(calculateWorkoutVolume(workout.exercises)).toLocaleString("es-AR")} KG`],
    ["DURACIÓN", calculateWorkoutDuration(workout.startedAt, workout.completedAt)],
    ...(records > 0 ? [["RÉCORDS PERSONALES", `${records} PR`]] : []),
  ];
  const columnWidth = (contentRight - contentX) / stats.length;
  stats.forEach(([label, value], index) => {
    const x = contentX + index * columnWidth;
    context.fillStyle = "rgba(255,255,255,.7)";
    context.font = "700 14px Inter, Arial, sans-serif";
    context.letterSpacing = "2px";
    context.fillText(label, x, statsY + 30);
    context.fillStyle = "#d8ff76";
    context.font = "900 26px Inter, Arial, sans-serif";
    context.letterSpacing = "0px";
    context.fillText(value, x, statsY + 66);
  });
  drawRule(context, contentX, contentRight, cardY + cardHeight - 54);
  context.fillStyle = "rgba(255,255,255,.75)";
  context.font = "700 13px Inter, Arial, sans-serif";
  context.letterSpacing = "3px";
  context.fillText("ENTRENAMIENTO REGISTRADO EN TORO", contentX, cardY + cardHeight - 24);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("No se pudo crear el archivo PNG.");
  return blob;
}

export async function exportWorkoutImage(workout: CompletedWorkoutShareData, action: "share" | "download") {
  const fileName = safeFileName(workout.workoutName, workout.completedAt);
  const blob = await createPng(workout);
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
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
  return "downloaded" as const;
}
