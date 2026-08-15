export const SOCIAL_POST_TYPES = ["WORKOUT", "RECORD", "ROUTINE", "STATUS"] as const;
export type SocialPostType = (typeof SOCIAL_POST_TYPES)[number];

export function isSocialPostType(value: unknown): value is SocialPostType {
  return typeof value === "string" && SOCIAL_POST_TYPES.includes(value as SocialPostType);
}
