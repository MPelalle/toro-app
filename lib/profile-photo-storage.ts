import "server-only";

import { isAvatarUrl } from "@/lib/avatars";

const DEFAULT_BUCKET = "profile-photos";

type StorageConfig = {
  url: URL;
  serviceKey: string;
  bucket: string;
};

export function getProfilePhotoStorageConfig(): StorageConfig | null {
  const rawUrl = process.env.SUPABASE_URL?.trim();
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY)?.trim();
  const bucket = (process.env.SUPABASE_STORAGE_BUCKET || DEFAULT_BUCKET).trim();
  if (!rawUrl || !serviceKey || !/^[a-z0-9][a-z0-9-]{1,62}$/i.test(bucket)) return null;

  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return { url, serviceKey, bucket };
  } catch {
    return null;
  }
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
