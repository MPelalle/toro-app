/**
 * Limits that keep the social surface useful without turning normal use into a
 * moderation problem. They are deliberately grouped here so route handlers do
 * not grow unrelated magic numbers.
 */
export const SOCIAL_LIMITS = {
  friendRequestsPerDay: 20,
  pendingFriendRequests: 50,
  statusesPerFifteenMinutes: 5,
  profileMessagesPerFifteenMinutes: 12,
  repostsPerDay: 20,
  reactionsPerMinute: 40,
  commentsPerFifteenMinutes: 20,
  reportsPerDay: 10,
  blocksPerDay: 50,
  statusMaxLength: 280,
  profileMessageMaxLength: 280,
  commentMaxLength: 500,
  reportDetailMaxLength: 1_000,
} as const;

export const SOCIAL_REPORT_REASONS = [
  "SPAM",
  "HARASSMENT",
  "INAPPROPRIATE",
  "OTHER",
] as const;

export type SocialReportReason = (typeof SOCIAL_REPORT_REASONS)[number];

export function isSocialReportReason(value: unknown): value is SocialReportReason {
  return (
    typeof value === "string" &&
    SOCIAL_REPORT_REASONS.includes(value as SocialReportReason)
  );
}

/** Treat all social text as plain text and normalize invisible whitespace. */
export function normalizeSocialText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return null;
  const text = value.trim().replace(/\s+/g, " ");
  return text && text.length <= maxLength ? text : null;
}
