"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, LoaderCircle, Trash2, Upload } from "lucide-react";
import { UserAvatar } from "@/components/user/UserAvatar";

const OUTPUT_SIZE = 512;
const MAX_SOURCE_BYTES = 15 * 1024 * 1024;
const TARGET_MAX_BYTES = 500 * 1024;

type ImageSource = { image: HTMLImageElement; width: number; height: number };

type ProfilePhotoUploaderProps = {
  currentUrl: string | null;
  name?: string | null;
  nickname?: string | null;
  onChange: (url: string | null) => void;
};

function loadImage(file: File) {
  return new Promise<ImageSource>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => { URL.revokeObjectURL(url); resolve({ image, width: image.naturalWidth, height: image.naturalHeight }); };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error("No pudimos leer esa imagen. Probá con JPG, PNG o WebP.")); };
    image.src = url;
  });
}

function drawPhoto(canvas: HTMLCanvasElement, source: ImageSource, zoom: number, horizontal: number, vertical: number) {
  const context = canvas.getContext("2d");
  if (!context) return;
  canvas.width = OUTPUT_SIZE;
  canvas.height = OUTPUT_SIZE;
  const baseScale = Math.max(OUTPUT_SIZE / source.width, OUTPUT_SIZE / source.height);
  const width = source.width * baseScale * zoom;
  const height = source.height * baseScale * zoom;
  const x = (OUTPUT_SIZE - width) / 2 + (horizontal / 100) * Math.max(0, (width - OUTPUT_SIZE) / 2);
  const y = (OUTPUT_SIZE - height) / 2 + (vertical / 100) * Math.max(0, (height - OUTPUT_SIZE) / 2);
  context.clearRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
  context.drawImage(source.image, x, y, width, height);
}

function jpegBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
}

async function compressedJpeg(source: ImageSource, zoom: number, horizontal: number, vertical: number) {
  const canvas = document.createElement("canvas");
  drawPhoto(canvas, source, zoom, horizontal, vertical);
  let quality = 0.88;
  let blob = await jpegBlob(canvas, quality);
  while (blob && blob.size > TARGET_MAX_BYTES && quality > 0.52) { quality -= 0.08; blob = await jpegBlob(canvas, quality); }
  if (!blob) throw new Error("No pudimos preparar la foto.");
  return blob;
}

export function ProfilePhotoUploader({ currentUrl, name, nickname, onChange }: ProfilePhotoUploaderProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const previewCanvas = useRef<HTMLCanvasElement>(null);
  const [source, setSource] = useState<ImageSource | null>(null);
  const [zoom, setZoom] = useState(1);
  const [horizontal, setHorizontal] = useState(0);
  const [vertical, setVertical] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => { if (source && previewCanvas.current) drawPhoto(previewCanvas.current, source, zoom, horizontal, vertical); }, [source, zoom, horizontal, vertical]);

  async function selectPhoto(file?: File) {
    if (!file) return;
    setMessage("");
    if (!file.type.startsWith("image/")) return setMessage("Elegí una imagen JPG, PNG o WebP.");
    if (file.size > MAX_SOURCE_BYTES) return setMessage("La foto original no puede superar 15 MB.");
    try { setSource(await loadImage(file)); setZoom(1); setHorizontal(0); setVertical(0); }
    catch (error) { setMessage(error instanceof Error ? error.message : "No pudimos leer esa imagen."); }
  }

  async function savePhoto() {
    if (!source) return;
    setBusy(true); setMessage("");
    try {
      const blob = await compressedJpeg(source, zoom, horizontal, vertical);
      const body = new FormData();
      body.set("photo", new File([blob], "foto-perfil.jpg", { type: "image/jpeg" }));
      const response = await fetch("/api/user/profile-photo", { method: "POST", body });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.avatarUrl) throw new Error(payload?.error || "No se pudo subir la foto.");
      onChange(payload.avatarUrl); setSource(null); setMessage("Foto actualizada.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "No se pudo subir la foto."); }
    finally { setBusy(false); }
  }

  async function removePhoto() {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/user/profile-photo", { method: "DELETE" });
      if (!response.ok) throw new Error("No se pudo quitar la foto.");
      onChange(null); setSource(null); setMessage("Vas a ver tu inicial hasta que subas otra foto.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "No se pudo quitar la foto."); }
    finally { setBusy(false); }
  }

  return <div className="mt-6 border-t border-white/[.07] pt-5">
    <div className="flex items-center gap-3"><UserAvatar src={currentUrl} name={name} nickname={nickname} size="md" /><div><p className="text-sm font-semibold">Foto de perfil</p><p className="text-xs text-white/35">Se adapta a 512 × 512 y se comprime antes de subir.</p></div></div>
    {source ? <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4"><div className="flex flex-col gap-4 sm:flex-row sm:items-start"><canvas ref={previewCanvas} width={OUTPUT_SIZE} height={OUTPUT_SIZE} className="h-40 w-40 rounded-full border border-white/10 object-cover" aria-label="Vista previa de la foto" /><div className="min-w-0 flex-1 space-y-3"><label className="block text-xs text-white/55">Zoom<input aria-label="Zoom de la foto" type="range" min="1" max="2.5" step="0.01" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} className="mt-2 w-full accent-[#b7ff00]" /></label><label className="block text-xs text-white/55">Encuadre horizontal<input aria-label="Encuadre horizontal" type="range" min="-100" max="100" value={horizontal} onChange={(event) => setHorizontal(Number(event.target.value))} className="mt-2 w-full accent-[#b7ff00]" /></label><label className="block text-xs text-white/55">Encuadre vertical<input aria-label="Encuadre vertical" type="range" min="-100" max="100" value={vertical} onChange={(event) => setVertical(Number(event.target.value))} className="mt-2 w-full accent-[#b7ff00]" /></label></div></div><div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={savePhoto} disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-[#b7ff00] px-4 py-2 text-xs font-bold text-black disabled:opacity-50">{busy ? <LoaderCircle size={15} className="animate-spin" /> : <Upload size={15} />}Guardar foto</button><button type="button" onClick={() => setSource(null)} disabled={busy} className="rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold text-white/65">Cancelar</button></div></div> : <button type="button" onClick={() => fileInput.current?.click()} disabled={busy} className="mt-4 inline-flex items-center gap-2 rounded-xl border border-dashed border-[#b7ff00]/35 px-4 py-3 text-xs font-bold text-[#b7ff00] hover:bg-[#b7ff00]/[.06] disabled:opacity-50"><Camera size={16} />Elegir una foto</button>}
    <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => { void selectPhoto(event.target.files?.[0]); event.currentTarget.value = ""; }} />
    {currentUrl && !source && <button type="button" onClick={removePhoto} disabled={busy} className="ml-3 mt-4 inline-flex items-center gap-2 text-xs font-semibold text-white/45 hover:text-red-300 disabled:opacity-50"><Trash2 size={14} />Usar inicial</button>}
    {message && <p className={`mt-3 text-xs ${message === "Foto actualizada." ? "text-[#b7ff00]" : "text-red-300"}`}>{message}</p>}
  </div>;
}
