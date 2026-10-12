import { describe, expect, it } from "vitest";
import {
  buildProgressAnalytics,
  compareSummary,
  previousRangeStart,
  rangeStart,
} from "@/lib/progress-analytics";
import { bodyWeightTrend } from "@/lib/body-progress";

describe("progress analytics", () => {
  it("excludes warmups and distinguishes weight from e1RM records", () => {
    const result = buildProgressAnalytics(
      [
        {
          id: "a",
          finishedAt: "2026-01-01T12:00:00Z",
          durationSeconds: 3600,
          exercises: [
            {
              name: "Press banca",
              muscle: "Pecho",
              sets: [
                { completed: true, weight: 20, reps: 10, kind: "WARMUP" },
                { completed: true, weight: 100, reps: 8, kind: "NORMAL" },
              ],
            },
          ],
        },
        {
          id: "b",
          finishedAt: "2026-01-08T12:00:00Z",
          durationSeconds: 3600,
          exercises: [
            {
              name: "Press banca",
              muscle: "Pecho",
              sets: [{ completed: true, weight: 105, reps: 8, kind: "NORMAL" }],
            },
          ],
        },
      ],
      1,
    );
    expect(result.summary.volume).toBe(1640);
    expect(result.muscles[0]).toMatchObject({ name: "Pecho", sets: 2 });
    expect(result.records.map((record) => record.type)).toEqual([
      "WEIGHT",
      "E1RM",
    ]);
    expect(result.consistency.completedWeeks).toBe(2);
  });

  it("returns a shared range boundary", () => {
    expect(
      rangeStart("3M", new Date("2026-08-16T12:00:00Z"))
        ?.toISOString()
        .slice(0, 10),
    ).toBe("2026-05-16");
    expect(rangeStart("ALL")).toBeNull();
  });

  it("clamps rolling period boundaries at month ends", () => {
    const now = new Date("2026-03-31T12:00:00Z");
    expect(rangeStart("1M", now)?.toISOString()).toBe("2026-02-28T12:00:00.000Z");
    expect(previousRangeStart("1M", now)?.toISOString()).toBe("2026-01-28T12:00:00.000Z");
  });

  it("counts the actual current week and includes weeks without training in consistency", () => {
    const result = buildProgressAnalytics(
      [
        {
          id: "a",
          finishedAt: "2026-01-12T12:00:00Z",
          durationSeconds: 3600,
          exercises: [],
        },
      ],
      2,
      {
        periodStart: new Date("2026-01-05T12:00:00Z"),
        now: new Date("2026-01-19T12:00:00Z"),
      },
    );

    expect(result.consistency).toMatchObject({
      currentWeekSessions: 0,
      completedWeeks: 0,
      totalWeeks: 3,
      rate: 0,
      streakWeeks: 0,
    });
  });

  it("assigns late Sunday sessions to the Argentina calendar week", () => {
    const result = buildProgressAnalytics(
      [
        { id: "a", finishedAt: "2026-01-05T15:00:00Z", durationSeconds: 3600, exercises: [] },
        { id: "b", finishedAt: "2026-01-11T23:30:00-03:00", durationSeconds: 3600, exercises: [] },
      ],
      2,
      {
        periodStart: new Date("2026-01-05T12:00:00Z"),
        now: new Date("2026-01-11T23:45:00-03:00"),
      },
    );

    expect(result.consistency.currentWeekSessions).toBe(2);
    expect(result.calendar.map((day) => day.date)).toContain("2026-01-11");
  });

  it("compares periods and does not infer a weight trend from two measurements", () => {
    expect(
      compareSummary(
        { sessions: 6, volume: 12_000, records: 3 },
        { sessions: 4, volume: 10_000, records: 1 },
      ),
    ).toEqual({ sessions: 50, volume: 20, records: 2 });
    expect(
      bodyWeightTrend([
        { date: "2026-08-01", weight: 80 },
        { date: "2026-08-08", weight: 79.5 },
      ]).trend,
    ).toBeNull();
  });

  it("detects an objective e1RM plateau only with enough observations", () => {
    const sessions = Array.from({ length: 6 }, (_, index) => ({
      id: String(index),
      finishedAt: new Date(Date.UTC(2026, 0, 1 + index * 10)).toISOString(),
      durationSeconds: 3600,
      exercises: [
        {
          name: "Press banca",
          muscle: "Pecho",
          sets: [{ completed: true, weight: 100, reps: 8, kind: "NORMAL" }],
        },
      ],
    }));
    expect(
      buildProgressAnalytics(sessions, 1).insights.some((insight) =>
        insight.includes("sin cambios significativos"),
      ),
    ).toBe(true);
  });
});
