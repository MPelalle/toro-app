import { describe, expect, it } from "vitest";
import { isSocialPostType } from "@/lib/social";

describe("referencias sociales", () => {
  it("solo admite tipos de publicaciones originales", () => {
    expect(isSocialPostType("WORKOUT")).toBe(true);
    expect(isSocialPostType("STATUS")).toBe(true);
    expect(isSocialPostType("REPOST")).toBe(false);
    expect(isSocialPostType("LIKE")).toBe(false);
  });
});
