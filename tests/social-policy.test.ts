import { describe, expect, it } from "vitest";
import {
  isSocialReportReason,
  normalizeSocialText,
  SOCIAL_LIMITS,
} from "@/lib/social-policy";
import { rateLimitByKey } from "@/lib/security";

describe("social policy", () => {
  it("accepts only supported report reasons and plain bounded text", () => {
    expect(isSocialReportReason("HARASSMENT")).toBe(true);
    expect(isSocialReportReason("UNKNOWN")).toBe(false);
    expect(normalizeSocialText("  buen\n\t entrenamiento  ", 50)).toBe(
      "buen entrenamiento",
    );
    expect(normalizeSocialText("x".repeat(SOCIAL_LIMITS.commentMaxLength + 1), SOCIAL_LIMITS.commentMaxLength)).toBeNull();
  });

  it("applies a social limit to the signed-in identity, not only its IP", () => {
    const scope = `social-test-${crypto.randomUUID()}`;
    expect(rateLimitByKey("user-a", scope, 2, 60_000).ok).toBe(true);
    expect(rateLimitByKey("user-a", scope, 2, 60_000).ok).toBe(true);
    expect(rateLimitByKey("user-a", scope, 2, 60_000).ok).toBe(false);
    expect(rateLimitByKey("user-b", scope, 2, 60_000).ok).toBe(true);
  });
});
