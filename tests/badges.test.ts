import { describe, expect, it } from "vitest";
import { buildUserBadges, withBadgeTier } from "@/lib/badges";

describe("user badges", () => {
  it("uses the requested first unlock thresholds", () => {
    const badges = buildUserBadges({ streak: 10, routine: 1, diet: 1, habits: 5 });
    expect(badges.map((badge) => badge.tier)).toEqual([1, 1, 1, 1]);
  });

  it("awards the violet tier at the maximum repeated milestone", () => {
    const badges = buildUserBadges({ streak: 70, routine: 10, diet: 10, habits: 50 });
    expect(badges.every((badge) => badge.tier === 4)).toBe(true);
  });

  it("keeps a previously awarded tier visible", () => {
    const streak = buildUserBadges({ streak: 0, routine: 0, diet: 0, habits: 0 })[0];
    expect(withBadgeTier(streak, 3)).toMatchObject({ tier: 3, tierName: "ORO", unlocked: true });
  });
});
