import { getCurrentUser } from "@/lib/auth";
import {
  ensureProgressPhotoBucket,
  getProgressPhotoStorageConfig,
  profilePhotoUploadUrl,
  progressPhotoSignedUrl,
} from "@/lib/profile-photo-storage";
import { appDateKey, dateAtNoonUTC } from "@/lib/app-date";
import { getPrisma } from "@/lib/prisma";
import { hasTrustedOrigin, isUuid, isValidDateKey, originError } from "@/lib/security";

const MAX_UPLOAD_BYTES = 1_500 * 1024;

function dateFromKey(value: unknown) {
  const key = String(value || "");
  return isValidDateKey(key) ? dateAtNoonUTC(key) : null;
}
function keyFor(date: Date) {
  return date.toISOString().slice(0, 10);
}
function isJpeg(bytes: Uint8Array) {
  return (
    bytes.length > 4 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes.at(-2) === 0xff &&
    bytes.at(-1) === 0xd9
  );
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });
  const config = getProgressPhotoStorageConfig();
  if (!config)
    return Response.json(
      { photos: [] },
      { headers: { "Cache-Control": "no-store" } },
    );
  const photos = await getPrisma().progressPhoto.findMany({
    where: { userId: user.id },
    orderBy: { date: "asc" },
  });
  const signed = await Promise.all(
    photos.map(async (photo) => ({
      id: photo.id,
      date: keyFor(photo.date),
      view: photo.view,
      url: await progressPhotoSignedUrl(config, photo.objectPath),
    })),
  );
  return Response.json(
    {
      photos: signed.filter((photo): photo is typeof photo & { url: string } =>
        Boolean(photo.url),
      ),
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return originError();
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });
  const config = getProgressPhotoStorageConfig();
  if (!config)
    return Response.json(
      { error: "La carga de fotos privadas no está configurada." },
      { status: 503 },
    );
  const form = await request.formData().catch(() => null);
  const photo = form?.get("photo");
  const date = dateFromKey(form?.get("date"));
  const view = String(form?.get("view") || "OTHER");
  if (
    !(photo instanceof File) ||
    photo.type !== "image/jpeg" ||
    photo.size < 1 ||
    photo.size > MAX_UPLOAD_BYTES ||
    !date ||
    keyFor(date) > appDateKey() ||
    !["FRONT", "SIDE", "BACK", "OTHER"].includes(view)
  )
    return Response.json(
      { error: "La foto o sus datos no son válidos." },
      { status: 400 },
    );
  const bytes = new Uint8Array(await photo.arrayBuffer());
  if (!isJpeg(bytes))
    return Response.json(
      { error: "La foto debe ser un JPEG válido." },
      { status: 400 },
    );
  if (!(await ensureProgressPhotoBucket(config)))
    return Response.json(
      { error: "No se pudo preparar el almacenamiento privado." },
      { status: 502 },
    );
  const objectPath = `${user.id}/${crypto.randomUUID()}.jpg`;
  const upload = await fetch(profilePhotoUploadUrl(config, objectPath), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.serviceKey}`,
      apikey: config.serviceKey,
      "Content-Type": "image/jpeg",
      "Cache-Control": "private, max-age=31536000",
      "x-upsert": "false",
    },
    body: bytes,
  });
  if (!upload.ok)
    return Response.json(
      { error: "No se pudo guardar la foto privada." },
      { status: 502 },
    );
  const saved = await getPrisma().progressPhoto.create({
    data: {
      userId: user.id,
      objectPath,
      date,
      view: view as "FRONT" | "SIDE" | "BACK" | "OTHER",
    },
  });
  return Response.json(
    {
      id: saved.id,
      date: keyFor(saved.date),
      view: saved.view,
      url: await progressPhotoSignedUrl(config, objectPath),
    },
    { status: 201 },
  );
}

export async function DELETE(request: Request) {
  if (!hasTrustedOrigin(request)) return originError();
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id") || "";
  if (!isUuid(id))
    return Response.json({ error: "Foto no válida." }, { status: 400 });
  const photo = await getPrisma().progressPhoto.findFirst({
    where: { id, userId: user.id },
  });
  if (!photo) return new Response(null, { status: 204 });
  const config = getProgressPhotoStorageConfig();
  if (config)
    await fetch(new URL(`/storage/v1/object/${config.bucket}`, config.url), {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${config.serviceKey}`,
        apikey: config.serviceKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prefixes: [photo.objectPath] }),
    });
  await getPrisma().progressPhoto.delete({ where: { id } });
  return new Response(null, { status: 204 });
}
