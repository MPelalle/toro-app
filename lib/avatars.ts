export const AVATAR_OPTIONS = [
  "/avatares/1.png",
  "/avatares/2.png",
  "/avatares/3.png",
  "/avatares/4.png",
  "/avatares/5.png",
  "/avatares/6.png",
  "/avatares/7.png",
  "/avatares/8.png",
] as const;

export type AvatarUrl = (typeof AVATAR_OPTIONS)[number];

export function isAvatarUrl(value: unknown): value is AvatarUrl {
  return typeof value === "string" && (AVATAR_OPTIONS as readonly string[]).includes(value);
}
