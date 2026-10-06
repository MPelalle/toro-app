export type BodyWeightPoint = { date: string; weight: number };

export function bodyWeightTrend(points: BodyWeightPoint[]) {
  const ordered = [...points]
    .filter(
      (point) =>
        Number.isFinite(point.weight) &&
        point.weight >= 25 &&
        point.weight <= 500,
    )
    .sort((left, right) => left.date.localeCompare(right.date));
  const latest = ordered.at(-1) ?? null;
  if (!latest)
    return {
      latest: null,
      trend: null,
      change30Days: null,
      points: [] as Array<BodyWeightPoint & { trend: number | null }>,
    };
  const dated = ordered.map((point, index) => {
    const window = ordered.slice(Math.max(0, index - 6), index + 1);
    const trend =
      window.length >= 3
        ? Math.round(
            (window.reduce((sum, item) => sum + item.weight, 0) /
              window.length) *
              10,
          ) / 10
        : null;
    return { ...point, trend };
  });
  const cutoff = new Date(`${latest.date}T12:00:00Z`);
  cutoff.setUTCDate(cutoff.getUTCDate() - 30);
  const baseline =
    ordered.find((point) => new Date(`${point.date}T12:00:00Z`) >= cutoff) ??
    ordered[0];
  return {
    latest,
    trend: dated.at(-1)?.trend ?? null,
    change30Days:
      baseline && baseline !== latest
        ? Math.round((latest.weight - baseline.weight) * 10) / 10
        : null,
    points: dated,
  };
}

export const bodyMeasurementFields = [
  "waist",
  "chest",
  "arm",
  "thigh",
  "hip",
  "calf",
] as const;
export type BodyMeasurementField = (typeof bodyMeasurementFields)[number];
export const bodyMeasurementLabels: Record<BodyMeasurementField, string> = {
  waist: "Cintura",
  chest: "Pecho",
  arm: "Brazo",
  thigh: "Muslo",
  hip: "Cadera",
  calf: "Pantorrilla",
};
