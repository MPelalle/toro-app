"use client";

/* eslint-disable @next/next/no-img-element */
import { Camera, Scale, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  bodyMeasurementFields,
  bodyMeasurementLabels,
  type BodyMeasurementField,
} from "@/lib/body-progress";

type Weight = { date: string; weight: number; trend: number | null };
type Measurement = {
  id: string;
  date: string;
  unit: string;
  note: string | null;
} & Record<BodyMeasurementField, number | null>;
type Photo = {
  id: string;
  date: string;
  view: "FRONT" | "SIDE" | "BACK" | "OTHER";
  url: string;
};
type Response = {
  weight: {
    latest: { date: string; weight: number } | null;
    trend: number | null;
    change30Days: number | null;
    points: Weight[];
  };
  measurements: Measurement[];
};

const today = () => new Date().toISOString().slice(0, 10);
const viewLabels = {
  FRONT: "Frontal",
  SIDE: "Lateral",
  BACK: "Espalda",
  OTHER: "Libre",
};

async function compressPhoto(source: File) {
  const image = await createImageBitmap(source);
  const scale = Math.min(1, 1600 / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(image.width * scale);
  canvas.height = Math.round(image.height * scale);
  canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.82),
  );
  image.close();
  if (!blob || blob.size > 1_500 * 1024)
    throw new Error("La foto comprimida supera 1.5 MB.");
  return new File([blob], "progreso.jpg", { type: "image/jpeg" });
}

export function BodyProgressPanel() {
  const [data, setData] = useState<Response | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [weight, setWeight] = useState("");
  const [date, setDate] = useState(today);
  const [measurementDate, setMeasurementDate] = useState(today);
  const [values, setValues] = useState<Record<BodyMeasurementField, string>>({
    waist: "",
    chest: "",
    arm: "",
    thigh: "",
    hip: "",
    calf: "",
  });
  const [photoView, setPhotoView] = useState<Photo["view"]>("FRONT");
  const [comparison, setComparison] = useState<[string, string]>(["", ""]);
  const [error, setError] = useState("");
  const load = async () => {
    const [body, gallery] = await Promise.all([
      fetch("/api/progress/body"),
      fetch("/api/progress/photos"),
    ]);
    if (!body.ok) throw new Error("No pudimos cargar tus datos corporales.");
    setData((await body.json()) as Response);
    if (gallery.ok)
      setPhotos(((await gallery.json()) as { photos: Photo[] }).photos);
  };
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load().catch((cause) =>
        setError(
          cause instanceof Error
            ? cause.message
            : "No pudimos cargar tus datos.",
        ),
      );
    });
    return () => window.clearTimeout(timer);
  }, []);
  const maximum = Math.max(
    ...(data?.weight.points.map((point) => point.weight) || [1]),
  );
  const saveWeight = async () => {
    const response = await fetch("/api/progress/body", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "weight", date, weight: Number(weight) }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.error || "No pudimos registrar el peso.");
      return;
    }
    setWeight("");
    void load();
  };
  const saveMeasurement = async () => {
    const response = await fetch("/api/progress/body", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "measurement",
        date: measurementDate,
        ...Object.fromEntries(
          bodyMeasurementFields.map((field) => [field, values[field] || null]),
        ),
      }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.error || "No pudimos guardar las medidas.");
      return;
    }
    setValues({ waist: "", chest: "", arm: "", thigh: "", hip: "", calf: "" });
    void load();
  };
  const upload = async (file: File | undefined) => {
    if (!file) return;
    try {
      const form = new FormData();
      form.set("photo", await compressPhoto(file));
      form.set("date", today());
      form.set("view", photoView);
      const response = await fetch("/api/progress/photos", {
        method: "POST",
        body: form,
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error || "No pudimos guardar la foto.");
      }
      void load();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "No pudimos procesar la foto.",
      );
    }
  };
  const selected = useMemo(
    () =>
      comparison
        .map((id) => photos.find((photo) => photo.id === id))
        .filter(Boolean) as Photo[],
    [comparison, photos],
  );
  return (
    <section className="mt-7 grid gap-6 lg:grid-cols-2">
      <article className="rounded-[28px] border border-white/[.08] bg-[#10110e]/95 p-5 sm:p-6">
        <p className="text-[10px] font-bold tracking-[.2em] text-[#b7ff00]/70">
          PESO CORPORAL · PRIVADO
        </p>
        <div className="mt-3 flex items-end justify-between gap-3">
          <div>
            <p className="text-3xl font-semibold">
              {data?.weight.latest ? `${data.weight.latest.weight} kg` : "—"}
            </p>
            <p className="mt-1 text-xs text-white/40">
              {data?.weight.trend
                ? `Tendencia: ${data.weight.trend} kg (media móvil)`
                : "Registrá 3 pesajes para ver tendencia."}
            </p>
          </div>
          <p className="text-right text-xs text-white/45">
            {data?.weight.change30Days === null ||
            data?.weight.change30Days === undefined
              ? ""
              : `${data.weight.change30Days > 0 ? "+" : ""}${data.weight.change30Days} kg en 30 días`}
          </p>
        </div>
        <div
          className="mt-5 flex h-20 items-end gap-1"
          aria-label="Historial de peso corporal"
        >
          {data?.weight.points.slice(-20).map((point) => (
            <span
              key={point.date}
              title={`${point.date}: ${point.weight} kg`}
              className="min-w-2 flex-1 rounded-t bg-sky-300/75"
              style={{
                height: `${Math.max(8, (point.weight / maximum) * 80)}px`,
              }}
            />
          ))}
        </div>
        <div className="mt-5 grid grid-cols-[1fr_7rem_auto] gap-2">
          <input
            className="input"
            value={weight}
            onChange={(event) => setWeight(event.target.value)}
            inputMode="decimal"
            placeholder="Peso (kg)"
          />
          <input
            className="input"
            type="date"
            value={date}
            max={today()}
            onChange={(event) => setDate(event.target.value)}
          />
          <button
            type="button"
            onClick={() => void saveWeight()}
            className="rounded-xl bg-[#b7ff00] px-3 text-black"
            aria-label="Registrar peso"
          >
            <Scale size={16} />
          </button>
        </div>
      </article>
      <article className="rounded-[28px] border border-white/[.08] bg-[#10110e]/95 p-5 sm:p-6">
        <p className="text-[10px] font-bold tracking-[.2em] text-[#b7ff00]/70">
          MEDIDAS · PRIVADAS
        </p>
        <p className="mt-2 text-xs text-white/40">
          Centímetros. Una entrada por fecha; se puede actualizar.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {bodyMeasurementFields.map((field) => (
            <label key={field} className="text-xs text-white/45">
              {bodyMeasurementLabels[field]}
              <input
                className="input mt-1"
                inputMode="decimal"
                value={values[field]}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    [field]: event.target.value,
                  }))
                }
              />
            </label>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <input
            className="input"
            type="date"
            value={measurementDate}
            max={today()}
            onChange={(event) => setMeasurementDate(event.target.value)}
          />
          <button
            type="button"
            onClick={() => void saveMeasurement()}
            className="rounded-xl border border-[#b7ff00]/30 px-3 text-xs font-bold text-[#d7ff78]"
          >
            Guardar
          </button>
        </div>
        <p className="mt-4 text-xs text-white/35">
          {data?.measurements.length
            ? `${data.measurements.length} registro${data.measurements.length === 1 ? "" : "s"} guardado${data.measurements.length === 1 ? "" : "s"}.`
            : "Todavía no registraste medidas."}
        </p>
      </article>
      <article className="rounded-[28px] border border-white/[.08] bg-[#10110e]/95 p-5 sm:p-6 lg:col-span-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold tracking-[.2em] text-[#b7ff00]/70">
              FOTOS DE PROGRESO · PRIVADAS
            </p>
            <p className="mt-2 text-xs text-white/40">
              Sólo vos podés verlas. Se almacenan en un bucket privado.
            </p>
          </div>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#b7ff00] px-4 py-3 text-sm font-bold text-black">
            <Camera size={16} /> Subir foto
            <select
              value={photoView}
              onChange={(event) =>
                setPhotoView(event.target.value as Photo["view"])
              }
              className="sr-only"
            >
              <option value="FRONT">Frontal</option>
              <option value="SIDE">Lateral</option>
              <option value="BACK">Espalda</option>
              <option value="OTHER">Libre</option>
            </select>
            <input
              type="file"
              accept="image/jpeg,image/png"
              className="sr-only"
              onChange={(event) => void upload(event.target.files?.[0])}
            />
          </label>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {photos.map((photo) => (
            <figure
              key={photo.id}
              className="overflow-hidden rounded-2xl border border-white/[.08] bg-black/15"
            >
              <img
                src={photo.url}
                alt={`Foto ${viewLabels[photo.view]} del ${photo.date}`}
                className="aspect-[3/4] w-full object-cover"
              />
              <figcaption className="flex items-center justify-between gap-2 p-2 text-[11px] text-white/50">
                <button
                  type="button"
                  onClick={() =>
                    setComparison((current) => [current[1], photo.id])
                  }
                >
                  {photo.date} · {viewLabels[photo.view]}
                </button>
                <button
                  type="button"
                  aria-label="Eliminar foto"
                  onClick={() =>
                    void fetch(`/api/progress/photos?id=${photo.id}`, {
                      method: "DELETE",
                    }).then(load)
                  }
                >
                  <Trash2 size={14} />
                </button>
              </figcaption>
            </figure>
          ))}
        </div>
        {selected.length === 2 && (
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <img
              src={selected[0].url}
              alt="Foto de progreso antes"
              className="aspect-[3/4] w-full rounded-2xl object-cover"
            />
            <img
              src={selected[1].url}
              alt="Foto de progreso ahora"
              className="aspect-[3/4] w-full rounded-2xl object-cover"
            />
          </div>
        )}
      </article>
      {error && (
        <p role="alert" className="lg:col-span-2 text-sm text-red-300">
          {error}
        </p>
      )}
    </section>
  );
}
