import { getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { getPrisma } from "@/lib/prisma";
import { getProfilePhotoStorageConfig, profilePhotoObjectUrl, profilePhotoUploadUrl } from "@/lib/profile-photo-storage";
import { hasTrustedOrigin, originError } from "@/lib/security";

const MAX_UPLOAD_BYTES = 650 * 1024;
const MAX_REQUEST_BYTES = 700 * 1024;
const MAX_IMAGE_DIMENSION = 2_048;
const MAX_IMAGE_PIXELS = 4_000_000;

function jpegDimensions(bytes: Uint8Array) {
  if (bytes.length < 10 || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes.at(-2) !== 0xff || bytes.at(-1) !== 0xd9) return null;
  let offset = 2;
  while (offset + 3 < bytes.length) {
    if (bytes[offset] !== 0xff) return null;
    while (bytes[offset] === 0xff) offset += 1;
    const marker = bytes[offset++];
    if (marker === 0xd9 || marker === 0xda) break;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (offset + 1 >= bytes.length) return null;
    const length = (bytes[offset] << 8) | bytes[offset + 1];
    if (length < 2 || offset + length > bytes.length) return null;
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
      if (length < 8) return null;
      const height = (bytes[offset + 3] << 8) | bytes[offset + 4];
      const width = (bytes[offset + 5] << 8) | bytes[offset + 6];
      return width > 0 && height > 0 && width <= MAX_IMAGE_DIMENSION && height <= MAX_IMAGE_DIMENSION && width * height <= MAX_IMAGE_PIXELS ? { width, height } : null;
    }
    offset += length;
  }
  return null;
}

function isJpeg(bytes: Uint8Array) {
  return Boolean(jpegDimensions(bytes));
}

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return originError();
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });

  const config = getProfilePhotoStorageConfig();
  if (!config) return Response.json({ error: "La subida de fotos todavía no está configurada." }, { status: 503 });

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) return Response.json({ error: "La foto es demasiado grande." }, { status: 413 });

  const data = await request.formData().catch(() => null);
  const photo = data?.get("photo");
  if (!(photo instanceof File) || photo.type !== "image/jpeg" || !/\.jpe?g$/i.test(photo.name) || photo.size === 0 || photo.size > MAX_UPLOAD_BYTES) {
    return Response.json({ error: "La foto procesada debe ser un JPEG de hasta 650 KB." }, { status: 400 });
  }

  const bytes = new Uint8Array(await photo.arrayBuffer());
  if (!isJpeg(bytes)) return Response.json({ error: "El archivo de foto no es válido." }, { status: 400 });

  const objectPath = `${user.id}/${crypto.randomUUID()}.jpg`;
  const upload = await fetch(profilePhotoUploadUrl(config, objectPath), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.serviceKey}`,
      apikey: config.serviceKey,
      "Content-Type": "image/jpeg",
      "Cache-Control": "public, max-age=31536000, immutable",
      "x-upsert": "false",
    },
    body: bytes,
  });

  if (!upload.ok) return Response.json({ error: "No se pudo guardar la foto. Revisá la configuración del bucket." }, { status: 502 });

  const avatarUrl = profilePhotoObjectUrl(config, objectPath);
  await getPrisma().user.update({ where: { id: user.id }, data: { avatarUrl } });
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/user");
  if (user.nickname) revalidatePath(`/dashboard/community/${user.nickname}`);
  return Response.json({ avatarUrl }, { status: 201 });
}

export async function DELETE(request: Request) {
  if (!hasTrustedOrigin(request)) return originError();
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });
  await getPrisma().user.update({ where: { id: user.id }, data: { avatarUrl: null } });
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/user");
  if (user.nickname) revalidatePath(`/dashboard/community/${user.nickname}`);
  return new Response(null, { status: 204 });
}
