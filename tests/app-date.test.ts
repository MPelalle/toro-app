import { describe, expect, it } from "vitest";
import { appCalendarDate, appDateKey, dateAtNoonUTC, storedDateKey } from "@/lib/app-date";

describe("calendario de TORO", () => {
  it("mantiene el día argentino cuando UTC ya pasó la medianoche", () => {
    expect(appDateKey("2026-08-10T01:30:00.000Z")).toBe("2026-08-09");
  });

  it("guarda las fechas de calendario al mediodía UTC sin desplazar el día", () => {
    const date = dateAtNoonUTC("2026-08-09");
    expect(storedDateKey(date)).toBe("2026-08-09");
    expect(appCalendarDate("2026-08-10T01:30:00.000Z").toISOString()).toBe("2026-08-09T12:00:00.000Z");
  });
});
