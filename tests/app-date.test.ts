import { describe, expect, it } from "vitest";
import {
  appCalendarDate,
  appDateKey,
  dateAtNoonUTC,
  storedDateKey,
} from "@/lib/app-date";
import { isValidDateKey } from "@/lib/security";

describe("calendar date handling", () => {
  it("keeps Argentina's calendar day when UTC has already crossed midnight", () => {
    expect(appDateKey("2026-08-10T01:30:00.000Z")).toBe("2026-08-09");
    expect(appCalendarDate("2026-08-10T01:30:00.000Z").toISOString()).toBe(
      "2026-08-09T12:00:00.000Z",
    );
  });

  it("rejects impossible calendar days instead of rolling them into another month", () => {
    expect(isValidDateKey("2026-02-29")).toBe(false);
    expect(isValidDateKey("2026-02-30")).toBe(false);
    expect(isValidDateKey("2028-02-29")).toBe(true);
  });

  it("uses the product timezone for the current calendar day", () => {
    expect(appDateKey(new Date("2026-10-07T02:30:00.000Z"))).toBe("2026-10-06");
    expect(storedDateKey(dateAtNoonUTC("2026-10-06"))).toBe("2026-10-06");
  });
});
