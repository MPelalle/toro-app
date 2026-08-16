import "server-only";

import { isAvatarUrl } from "@/lib/avatars";

const DEFAULT_BUCKET = "profile-photos";

type StorageConfig = {
  url: URL;
  serviceKey: string;
  bucket: string;
};

function readEnvironmentValue(...names: string[]) {
  for (const name of names) {
    const rawValue = process.env[name]?.trim();
    if (!rawValue) continue;
    // Deployment dashboards expect values without quotes, but accepting a
    // pasted quoted value avoids rejecting otherwise valid credentials.
    return rawValue.replace(/^(?:"|')|(?:"|')$/g, "").trim();
  }
  return "";
}

type StorageConfigResult = { config: StorageConfig; issue: null } | { config: null; issue: string };

function resolveProfilePhotoStorageConfig(): StorageConfigResult {
  // Existing Supabase projects use different names for the project URL and
  // service key. Never accept an anon key here: uploading requires a secret.
  const rawUrl = readEnvironmentValue("SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_PROJECT_URL");
  const serviceKey = readEnvironmentValue("SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SECRET_KEY", "SUPABASE_SERVICE_KEY");
  const bucket = readEnvironmentValue("SUPABASE_STORAGE_BUCKET") || DEFAULT_BUCKET;
  if (!rawUrl) return { config: null, issue: "No se recibió la URL de Supabase en el servidor." };
  if (!serviceKey) return { config: null, issue: "No se recibió una clave de servicio de Supabase en el servidor." };
  if (!/^[a-z0-9][a-z0-9-]{1,62}$/i.test(bucket)) return { config: null, issue: "El nombre del bucket de fotos no es válido." };

  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "https:" && url.protocol !== "http:") return { config: null, issue: "La URL de Supabase debe comenzar con https://." };
    return { config: { url, serviceKey, bucket }, issue: null };
  } catch {
    return { config: null, issue: "La URL de Supabase no es válida." };
  }
}

export function getProfilePhotoStorageConfig(): StorageConfig | null {
  return resolveProfilePhotoStorageConfig().config;
}

export function getProfilePhotoStorageConfigIssue() {
  return resolveProfilePhotoStorageConfig().issue;
}

export function isManagedProfilePhotoUrl(value: unknown) {
  if (typeof value !== "string") return false;
  const config = getProfilePhotoStorageConfig();
  if (!config) return false;

  try {
    const imageUrl = new URL(value);
    const publicPrefix = new URL(`/storage/v1/object/public/${config.bucket}/`, config.url).pathname;
    return imageUrl.origin === config.url.origin && imageUrl.pathname.startsWith(publicPrefix);
  } catch {
    return false;
  }
}

/** A Storage URL may only be assigned to the user whose folder owns it. */
export function isManagedProfilePhotoUrlForUser(value: unknown, userId: string) {
  if (!isManagedProfilePhotoUrl(value) || !/^[0-9a-f-]{36}$/i.test(userId)) return false;
  const config = getProfilePhotoStorageConfig();
  if (!config) return false;
  try {
    const imageUrl = new URL(value as string);
    const publicPrefix = new URL(`/storage/v1/object/public/${config.bucket}/`, config.url).pathname;
    return imageUrl.pathname.startsWith(`${publicPrefix}${userId}/`);
  } catch {
    return false;
  }
}

/** Keeps legacy TORO avatars valid while new profile photos use Supabase Storage. */
export function isKnownProfileImageUrl(value: unknown) {
  return isAvatarUrl(value) || isManagedProfilePhotoUrl(value);
}

export function isKnownProfileImageUrlForUser(value: unknown, userId: string) {
  return isAvatarUrl(value) || isManagedProfilePhotoUrlForUser(value, userId);
}

export function profilePhotoObjectUrl(config: StorageConfig, objectPath: string) {
  return new URL(`/storage/v1/object/public/${config.bucket}/${objectPath}`, config.url).toString();
}

export function profilePhotoUploadUrl(config: StorageConfig, objectPath: string) {
  return new URL(`/storage/v1/object/${config.bucket}/${objectPath}`, config.url).toString();
}

/** Provision the public profile-photo bucket on its first use. */
export async function ensureProfilePhotoBucket(config: StorageConfig) {
  const headers = {
    Authorization: `Bearer ${config.serviceKey}`,
    apikey: config.serviceKey,
  };
  const existing = await fetch(new URL(`/storage/v1/bucket/${config.bucket}`, config.url), { headers });
  if (existing.ok) return true;
  if (existing.status !== 404) return false;

  const response = await fetch(new URL("/storage/v1/bucket", config.url), {
    method: "POST",
    headers: {
      ...headers,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id: config.bucket,
      name: config.bucket,
      public: true,
      file_size_limit: 650 * 1024,
      allowed_mime_types: ["image/jpeg"],
    }),
  });

  // A concurrent request may have created the bucket after the check above.
  return response.ok || response.status === 409;
}
